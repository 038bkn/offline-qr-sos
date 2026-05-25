import { create } from 'zustand'
import { db } from './db'

export type InjuryStatus = 'safe' | 'minor' | 'severe'

export type SituationType = 
  | 'trapped'
  | 'immobile'
  | 'needsRescue'
  | 'needsMedical'
  | 'needsWater'
  | 'needsFood'

export interface LineConnection {
  linkedId: string // 暗号化されたショートID (サーバーから発行)
  linkedAt: string
  displayName?: string
}

export interface UserProfile {
  id: string
  name: string
  bloodType: string
  medicalConditions: string
  emergencyContact: {
    name: string
    email: string
    lineId: string
  }
  lineConnection?: LineConnection
  registeredAt: string
}

export interface SOSData {
  userId: string
  userName: string
  location: {
    latitude: number
    longitude: number
    accuracy: number
    timestamp: string
  } | null
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
  // App Mode
  mode: AppMode
  setMode: (mode: AppMode) => void
  
  // View/Navigation
  currentView: ViewMode
  setCurrentView: (view: ViewMode) => void
  
  // User Profile
  profile: UserProfile | null
  setProfile: (profile: UserProfile) => Promise<void>
  clearProfile: () => Promise<void>
  setLineConnection: (connection: LineConnection) => Promise<void>
  clearLineConnection: () => Promise<void>
  
  // Current SOS (being created)
  currentSOS: SOSData | null
  setCurrentSOS: (sos: SOSData | null) => void
  updateCurrentSOS: (updates: Partial<SOSData>) => void
  
  // SOS Queue (own + relayed)
  queue: QueuedSOS[]
  addToQueue: (sos: QueuedSOS) => Promise<void>
  updateQueueItem: (id: string, updates: Partial<QueuedSOS>) => Promise<void>
  removeFromQueue: (id: string) => Promise<void>
  
  // Network status
  isOnline: boolean
  setIsOnline: (online: boolean) => void
}

// Generate unique ID
export const generateId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const prefix = 'U'
  const code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `${prefix}-${code}`
}

export const generateQueueId = () => {
  return `Q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

interface AppState {
  mode: AppMode
  setMode: (mode: AppMode) => void
  currentView: ViewMode
  setCurrentView: (view: ViewMode) => void
  profile: UserProfile | null
  setProfile: (profile: UserProfile) => Promise<void> // Promiseに変更
  clearProfile: () => Promise<void>
  setLineConnection: (connection: LineConnection) => Promise<void>
  clearLineConnection: () => Promise<void>
  currentSOS: SOSData | null
  setCurrentSOS: (sos: SOSData | null) => void
  updateCurrentSOS: (updates: Partial<SOSData>) => void
  queue: QueuedSOS[]
  addToQueue: (sos: QueuedSOS) => Promise<void> // Promiseに変更
  updateQueueItem: (id: string, updates: Partial<QueuedSOS>) => Promise<void>
  removeFromQueue: (id: string) => Promise<void>
  isOnline: boolean
  setIsOnline: (online: boolean) => void
  initFromDB: () => Promise<void> // DBから読み込むための関数を追加
}

// useAppStore を persist なしで再定義し、内部で Dexie(db) を操作する
export const useAppStore = create<AppState>()((set, get) => ({
  mode: 'peacetime',
  setMode: (mode) => set({ mode }),
  
  currentView: 'registration',
  setCurrentView: (view) => set({ currentView: view }),
  
  profile: null,
  setProfile: async (profile) => {
    await db.myProfile.put(profile) // データベースに保存
    set({ profile }) // 画面にも反映
  },
  clearProfile: async () => {
    await db.myProfile.clear() // データベースから削除
    set({ profile: null })
  },
  setLineConnection: async (connection) => {
    const profile = get().profile
    if (profile) {
      const updated = { ...profile, lineConnection: connection }
      await db.myProfile.put(updated)
      set({ profile: updated })
    }
  },
  clearLineConnection: async () => {
    const profile = get().profile
    if (profile) {
      const updated = { ...profile, lineConnection: undefined }
      await db.myProfile.put(updated)
      set({ profile: updated })
    }
  },
  
  currentSOS: null,
  setCurrentSOS: (sos) => set({ currentSOS: sos }),
  updateCurrentSOS: (updates) => set((state) => ({
    currentSOS: state.currentSOS ? { ...state.currentSOS, ...updates } : null
  })),
  
  queue: [],
  addToQueue: async (sos) => {
    await db.sosQueue.put(sos) // データベースに保存
    set((state) => ({ queue: [...state.queue, sos] }))
  },
  updateQueueItem: async (id, updates) => {
    await db.sosQueue.update(id, updates) // データベースを更新
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    }))
  },
  removeFromQueue: async (id) => {
    await db.sosQueue.delete(id) // データベースから削除
    set((state) => ({
      queue: state.queue.filter((item) => item.id !== id)
    }))
  },
  
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  setIsOnline: (online) => set({ isOnline: online }),

  // アプリ起動時にDexieデータベースからデータを一気に読み込む関数
  initFromDB: async () => {
    const profiles = await db.myProfile.toArray()
    const profile = profiles.length > 0 ? profiles[0] : null
    const queue = await db.sosQueue.toArray()
    
    set({ 
      profile, 
      queue,
      // 登録の有無に関わらず、最初は共通のメイン画面（'registration'）を開く
      // (※コンポーネント側がprofileの有無を検知して、フォームかホームかを自動で出し分ける)
      currentView: profile ? 'registration' : 'registration' 
    })
  }
}))