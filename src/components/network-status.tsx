'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'

export function NetworkStatus() {
  const { isOnline, setIsOnline, mode } = useAppStore()

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Set initial status
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setIsOnline])

  if (mode === 'peacetime') return null

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 py-2 px-4 text-center font-bold text-sm ${
        isOnline
          ? 'bg-safe text-safe-foreground'
          : 'bg-warning text-warning-foreground offline-blink'
      }`}
    >
      {isOnline ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-safe-foreground" />
          オンライン - 送信可能
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-warning-foreground" />
          オフライン - QRリレーモード
        </span>
      )}
    </div>
  )
}
