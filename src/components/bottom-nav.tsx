'use client'

import { useAppStore, type ViewMode } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { 
  User, 
  AlertTriangle, 
  QrCode, 
  Scan, 
  Send,
  Home,
  Shield
} from 'lucide-react'

const peacetimeNav: { view: ViewMode; label: string; icon: React.ReactNode }[] = [
  { view: 'registration', label: 'ホーム', icon: <Home className="w-5 h-5" /> },
  { view: 'scanner', label: 'スキャン', icon: <Scan className="w-5 h-5" /> },
  { view: 'queue', label: '送信', icon: <Send className="w-5 h-5" /> },
]

const emergencyNav: { view: ViewMode; label: string; icon: React.ReactNode }[] = [
  { view: 'sos-input', label: 'SOS作成', icon: <AlertTriangle className="w-6 h-6" /> },
  { view: 'qr-display', label: '表示', icon: <QrCode className="w-6 h-6" /> },
  { view: 'scanner', label: 'スキャン', icon: <Scan className="w-6 h-6" /> },
  { view: 'queue', label: 'キュー', icon: <Send className="w-6 h-6" /> },
]

export function BottomNav() {
  const { currentView, setCurrentView, mode, setMode, queue } = useAppStore()
  
  const isEmergencyMode = mode === 'emergency'
  const navItems = isEmergencyMode ? emergencyNav : peacetimeNav
  const pendingCount = queue.filter(q => q.status === 'pending').length

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-40 ${
      isEmergencyMode 
        ? 'bg-card border-t-2 border-border' 
        : 'bg-card/95 backdrop-blur border-t border-border'
    }`}>
      <div className="max-w-md mx-auto px-2 py-2">
        <div className={`grid ${isEmergencyMode ? 'grid-cols-4' : 'grid-cols-3'} gap-1`}>
          {navItems.map((item) => {
            const isActive = currentView === item.view
            const showBadge = item.view === 'queue' && pendingCount > 0
            
            return (
              <Button
                key={item.view}
                variant="ghost"
                onClick={() => setCurrentView(item.view)}
                className={`
                  flex flex-col items-center justify-center gap-1 h-16 relative
                  ${isEmergencyMode ? 'tap-target-xl' : 'tap-target'}
                  ${isActive 
                    ? isEmergencyMode 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                {item.icon}
                <span className={`text-xs font-medium ${isEmergencyMode ? 'text-sm' : ''}`}>
                  {item.label}
                </span>
                
                {showBadge && (
                  <span className="absolute top-1 right-1/4 w-5 h-5 bg-emergency text-emergency-foreground text-xs font-bold rounded-full flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </Button>
            )
          })}
        </div>
        
        {/* Mode toggle */}
        {isEmergencyMode && (
          <div className="mt-2 pt-2 border-t border-border">
            <Button
              variant="ghost"
              onClick={() => {
                setMode('peacetime')
                setCurrentView('registration')
              }}
              className="w-full h-10 text-sm text-muted-foreground"
            >
              <Shield className="w-4 h-4 mr-2" />
              平時モードに戻る
            </Button>
          </div>
        )}
      </div>
    </nav>
  )
}
