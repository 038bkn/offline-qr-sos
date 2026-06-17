import { create } from 'zustand'
import { db } from './db'
import { fDB, fAuth } from './firebase'
import { signInAnonymously } from 'firebase/auth'
import { collection, doc, setDoc } from 'firebase/firestore'

const FUNCTIONS_API_URL = "https://us-central1-sos-relay-app.cloudfunctions.net/exchangeLineCodeApi";

export type InjuryStatus = 'safe' | 'minor' | 'severe'
export type SituationType = 'trapped' | 'immobile' | 'needsRescue' | 'needsMedical' | 'needsWater' | 'needsFood'

export interface LineConnection {
  linkedId: string 
  linkedAt: string
  displayName?: string
}

export interface UserProfile {
  id: string
  name: string
  bloodType: string
  medicalConditions: string
  emergencyContact: { name: string; email: string; lineId: string }
  lineConnection?: LineConnection
  registeredAt: string
}

export interface SOSData {
  userId: string
  userName: string
  location: { latitude: number; longitude: number; accuracy: number; timestamp: string } | null
  injuryStatus: InjuryStatus
  situations: SituationType[]
  memo: string
  createdAt: string
}

export interface QueuedSOS {
  id: string
  sosData: SOSData
  status: 'pending' | 'sent' | 'failed'
  isOwn: boolean
  relayedFrom?: string
  createdAt: string
  sentAt?: string
}

export type AppMode = 'peacetime' | 'emergency'
export type ViewMode = 'registration' | 'sos-input' | 'qr-display' | 'scanner' | 'queue'

interface AppState {
  mode: AppMode; setMode: (mode: AppMode) => void
  currentView: ViewMode; setCurrentView: (view: ViewMode) => void
  profile: UserProfile | null
  setProfile: (profile: UserProfile) => Promise<void>
  clearProfile: () => Promise<void>
  setLineConnection: (connection: LineConnection) => Promise<void>
  clearLineConnection: () => Promise<void>
  linkLineAccount: (code: string, redirectUrl: string) => Promise<void>
  
  // 招待された人が「参加」した時に、FirebaseのDBに繋がりを記録する関数
  acceptInvite: (senderId: string) => Promise<void>

  currentSOS: SOSData | null; setCurrentSOS: (sos: SOSData | null) => void; updateCurrentSOS: (updates: Partial<SOSData>) => void
  queue: QueuedSOS[]; addToQueue: (sos: QueuedSOS) => Promise<void>; updateQueueItem: (id: string, updates: Partial<QueuedSOS>) => Promise<void>; removeFromQueue: (id: string) => Promise<void>
  isOnline: boolean; setIsOnline: (online: boolean) => void
  initFromDB: () => Promise<void> 
  sendAllPendingItems: () => Promise<void> 
}

export const generateId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `U-${code}`
}

export const generateQueueId = () => `Q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export const useAppStore = create<AppState>()((set, get) => ({
  mode: 'peacetime', setMode: (mode) => set({ mode }),
  currentView: 'registration', setCurrentView: (view) => set({ currentView: view }),
  profile: null,
  setProfile: async (profile) => { await db.myProfile.put(profile); set({ profile }) },
  clearProfile: async () => { await db.myProfile.clear(); set({ profile: null }) },
  setLineConnection: async (connection) => {
    const profile = get().profile
    if (profile) { const updated = { ...profile, lineConnection: connection }; await db.myProfile.put(updated); set({ profile: updated }) }
  },
  clearLineConnection: async () => {
    const profile = get().profile
    if (profile) { const updated = { ...profile, lineConnection: undefined }; await db.myProfile.put(updated); set({ profile: updated }) }
  },

  linkLineAccount: async (code, redirectUrl) => {
    const res = await fetch(FUNCTIONS_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, redirectUrl }) })
    if (!res.ok) throw new Error('LINE連携の通信に失敗しました')
    const data = await res.json() as { userId: string; displayName: string }
    const connection: LineConnection = { linkedId: data.userId, linkedAt: new Date().toISOString(), displayName: data.displayName }
    const profile = get().profile
    if (profile) {
      const updated = { ...profile, lineConnection: connection, name: profile.name || data.displayName }
      await db.myProfile.put(updated); set({ profile: updated })
    }
  },

  // ★【追加】ここでFirebaseの「sos_connections」に宛先を保存します
  acceptInvite: async (senderId) => {
    const profile = get().profile
    if (!profile?.lineConnection) throw new Error("LINE連携がされていません")
    await setDoc(doc(collection(fDB, "sos_connections"), senderId), {
      lineId: profile.lineConnection.linkedId,
      receiverName: profile.lineConnection.displayName || profile.name,
      createdAt: new Date().toISOString()
    })
  },

  currentSOS: null, setCurrentSOS: (sos) => set({ currentSOS: sos }),
  updateCurrentSOS: (updates) => set((state) => ({ currentSOS: state.currentSOS ? { ...state.currentSOS, ...updates } : null })),
  queue: [],
  addToQueue: async (sos) => {
    await db.sosQueue.put(sos); set((state) => ({ queue: [...state.queue, sos] }))
    if (get().isOnline) { get().sendAllPendingItems() }
  },
  updateQueueItem: async (id, updates) => {
    await db.sosQueue.update(id, updates)
    set((state) => ({ queue: state.queue.map((item) => item.id === id ? { ...item, ...updates } : item) }))
  },
  removeFromQueue: async (id) => {
    await db.sosQueue.delete(id)
    set((state) => ({ queue: state.queue.filter((item) => item.id !== id) }))
  },
  
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  setIsOnline: (online) => {
    const wasOffline = !get().isOnline; set({ isOnline: online })
    if (online && wasOffline) { get().sendAllPendingItems() }
  },

  initFromDB: async () => {
    const profiles = await db.myProfile.toArray(); const profile = profiles.length > 0 ? profiles[0] : null
    const queue = await db.sosQueue.toArray()
    set({ profile, queue, currentView: 'registration' })
    try { await signInAnonymously(fAuth) } catch (err) { console.error(err) }
    if (navigator.onLine && queue.some(q => q.status === 'pending')) { get().sendAllPendingItems() }
  },

  sendAllPendingItems: async () => {
    const { queue, updateQueueItem } = get()
    const pendingItems = queue.filter(item => item.status === 'pending')
    if (pendingItems.length === 0) return

    for (const item of pendingItems) {
      try {
        await setDoc(doc(collection(fDB, "sos_signals"), item.id), {
          id: item.id, status: "sent", isOwn: item.isOwn, relayedFrom: item.relayedFrom || "unknown", 
          createdAt: item.createdAt, sentAt: new Date().toISOString(), sosData: item.sosData
        })
        await new Promise(resolve => setTimeout(resolve, 1200))
        await updateQueueItem(item.id, { status: 'sent', sentAt: new Date().toISOString() })
      } catch (error) { console.error(error) }
    }
  }
}))
