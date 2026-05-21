import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
    phone: string
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
  setProfile: (profile: UserProfile) => void
  clearProfile: () => void
  setLineConnection: (connection: LineConnection) => void
  clearLineConnection: () => void
  
  // Current SOS (being created)
  currentSOS: SOSData | null
  setCurrentSOS: (sos: SOSData | null) => void
  updateCurrentSOS: (updates: Partial<SOSData>) => void
  
  // SOS Queue (own + relayed)
  queue: QueuedSOS[]
  addToQueue: (sos: QueuedSOS) => void
  updateQueueItem: (id: string, updates: Partial<QueuedSOS>) => void
  removeFromQueue: (id: string) => void
  
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

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      mode: 'peacetime',
      setMode: (mode) => set({ mode }),
      
      currentView: 'registration',
      setCurrentView: (view) => set({ currentView: view }),
      
      profile: null,
      setProfile: (profile) => set({ profile }),
      clearProfile: () => set({ profile: null }),
      setLineConnection: (connection) => set((state) => ({
        profile: state.profile ? { ...state.profile, lineConnection: connection } : null
      })),
      clearLineConnection: () => set((state) => ({
        profile: state.profile ? { ...state.profile, lineConnection: undefined } : null
      })),
      
      currentSOS: null,
      setCurrentSOS: (sos) => set({ currentSOS: sos }),
      updateCurrentSOS: (updates) => set((state) => ({
        currentSOS: state.currentSOS ? { ...state.currentSOS, ...updates } : null
      })),
      
      queue: [],
      addToQueue: (sos) => set((state) => ({
        queue: [...state.queue, sos]
      })),
      updateQueueItem: (id, updates) => set((state) => ({
        queue: state.queue.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        )
      })),
      removeFromQueue: (id) => set((state) => ({
        queue: state.queue.filter((item) => item.id !== id)
      })),
      
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      setIsOnline: (online) => set({ isOnline: online }),
    }),
    {
      name: 'sos-relay-app-storage',
    }
  )
)
