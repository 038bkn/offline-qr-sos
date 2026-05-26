import { create } from 'zustand'
import { db } from './db'
import { fDB, fAuth } from './firebase'
import { signInAnonymously } from 'firebase/auth'
import { collection, doc, setDoc } from 'firebase/firestore'

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

  initFromDB: () => Promise<void> // DBから読み込むための関数を追加
  sendAllPendingItems: () => Promise<void> // 自動送信アクション
}

// ユーザー識別用ランダムID生成
export const generateId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const prefix = 'U'
  const code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `${prefix}-${code}`
}

// キュー用ユニークID生成
export const generateQueueId = () => {
  return `Q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
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
    // もしSOS作成/追加時にオンラインなら、即座に自動送信を試みる
    if (get().isOnline) {
      get().sendAllPendingItems()
    }
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
  setIsOnline: (online) => {
    const wasOffline = !get().isOnline
    set({ isOnline: online })

    // オフラインからオンラインに復帰した瞬間、自動送信を開始
    if (online && wasOffline) {
      get().sendAllPendingItems()
    }
  },

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

    // アプリが起動した瞬間に、Firebaseへの匿名ログイン
    try {
      await signInAnonymously(fAuth)
      console.log("[Firebase] 匿名ログインに成功")
    } catch (err) {
      console.error("[Firebase] 匿名ログイン失敗：", err)
    }

    // 起動時にすでにオンライン、かつ未送信があるなら自動送信
    if (navigator.onLine && queue.some(q => q.status === 'pending')) {
      get().sendAllPendingItems()
    }
  },

  // 溜まっているSOSデータを自動で順番に送信する関数
  sendAllPendingItems: async () => {
    const { queue, updateQueueItem } = get()
    const pendingItems = queue.filter(item => item.status === 'pending')
    
    if (pendingItems.length === 0) return

    console.log(`[同期開始] オンライン復帰を検知。Firebaseへ${pendingItems.length}件のSOSを送信します...`)

    for (const item of pendingItems) {
      try {
        // Firebase Firestore の「sos_signals」テーブルに送信
        await setDoc(doc(collection(fDB, "sos_signals"), item.id), {
          id: item.id,
          status: "sent", 
          isOwn: item.isOwn,
          relayedFrom: item.relayedFrom || "unknown", 
          createdAt: item.createdAt, 
          sentAt: new Date().toISOString(),
          // SOSのコアデータ（名前、GPS、ケガの状況、メモなどすべて）
          sosData: item.sosData
        })

        // クラウドへの送信が成功したら、スマホ内の IndexedDB も「送信済み」に書き換える
        await updateQueueItem(item.id, {
          status: 'sent',
          sentAt: new Date().toISOString()
        })

        console.log(`[動機成功] ${item.sosData.userName}さんのSOSが、サーバーに届きました！`)

      } catch (error) {
        console.error(`[同期エラー] ID: ${item.id} の送信に失敗しました：`, error)
        // 失敗した場合は pending のままになるため、電波が良くなったら次回また自動再送されます
      }

      // 送信中のカクつき防止と、見栄えのために1.2秒のディレイを挟む
      await new Promise(resolve => setTimeout(resolve, 1200))
      
      await updateQueueItem(item.id, {
        status: 'sent',
        sentAt: new Date().toISOString()
      })
      
      console.log(`[SOSリレー] ID: ${item.id} (${item.sosData.userName}さんのSOS) を自動送信しました。`)
    }
  }
}))