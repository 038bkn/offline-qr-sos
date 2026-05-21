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
  const { currentView, mode, profile } = useAppStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Apply dark mode class based on app mode
  useEffect(() => {
    if (mode === 'emergency') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [mode])

  // Handle initial view based on profile status
  useEffect(() => {
    if (mounted && !profile && currentView !== 'registration') {
      useAppStore.getState().setCurrentView('registration')
    }
  }, [mounted, profile, currentView])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">読み込み中...</div>
      </div>
    )
  }

  const renderView = () => {
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
