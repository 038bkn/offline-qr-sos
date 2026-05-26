'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { RegistrationForm } from '@/components/registration-form'
import { SOSInput } from '@/components/sos-input'
import { QRDisplay } from '@/components/qr-display'
import { QRScanner } from '@/components/qr-scanner'
import { TransmissionQueue } from '@/components/transmission-queue'
import { BottomNav } from '@/components/bottom-nav'
import { NetworkStatus } from '@/components/network-status'

export default function SOSRelayApp() {
  const { currentView, mode, profile, initFromDB } = useAppStore()
  const [isLoading, setIsLoading] = useState(true)

  // アプリ起動時に IndexedDB からデータを読み込む
  useEffect(() => {
    initFromDB().then(() => {
      setIsLoading(false)
    })
  }, [initFromDB])

  // 緊急モードに応じてダークモードを切り替える
  useEffect(() => {
    if (mode === 'emergency') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [mode])

  // データベース読み込み中はローディング画面を表示
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground font-bold">データベースを読み込み中...</div>
      </div>
    )
  }

  // 画面の出し分け処理
  const renderView = () => {
    // 読み込み完了後、プロフィールが無ければ無条件で登録画面を出す
    if (!profile) {
      return <RegistrationForm />
    }

    switch (currentView) {
      case 'registration':
        return <RegistrationForm />
      case 'sos-input':
        return <SOSInput />
      case 'qr-display':
        return <QRDisplay />
      case 'scanner':
        return <QRScanner />
      case 'queue':
        return <TransmissionQueue />
      default:
        return <RegistrationForm />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <NetworkStatus />
      {renderView()}
      <BottomNav />
    </div>
  )
}
