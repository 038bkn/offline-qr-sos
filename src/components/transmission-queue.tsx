'use client'

import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  Send,
  User,
  Users,
  Wifi,
  WifiOff,
  Trash2,
  AlertTriangle,
  Ambulance,
  MapPin
} from 'lucide-react'

const injuryLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  safe: { label: '無事', icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-safe' },
  minor: { label: '軽傷', icon: <AlertTriangle className="w-5 h-5" />, color: 'text-warning' },
  severe: { label: '重傷', icon: <Ambulance className="w-5 h-5" />, color: 'text-emergency' },
}

export function TransmissionQueue() {
  const { queue, removeFromQueue, setCurrentView, mode, isOnline, sendAllPendingItems } = useAppStore()
  
  const isEmergencyMode = mode === 'emergency'

  const ownSOS = queue.filter(q => q.isOwn)
  const relayedSOS = queue.filter(q => !q.isOwn)

  const handleSendAll = () => {
    sendAllPendingItems()
  }

  const pendingCount = queue.filter(q => q.status === 'pending').length
  const sentCount = queue.filter(q => q.status === 'sent').length

  return (
    <div className={`min-h-screen p-4 pb-32 ${isEmergencyMode ? 'bg-background pt-12' : 'bg-background'}`}>
      <div className="max-w-md mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => setCurrentView(isEmergencyMode ? 'qr-display' : 'registration')}
          className="tap-target"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          戻る
        </Button>

        {/* Header */}
        <div className="text-center">
          <h1 className={`font-bold ${isEmergencyMode ? 'text-3xl' : 'text-2xl'}`}>
            送信キュー
          </h1>
          <p className={`mt-2 text-muted-foreground`}>
            通信回復時に自動送信されます
          </p>
        </div>

        {/* Status Summary */}
        <Card className={`${isEmergencyMode ? 'border-2' : ''} ${isOnline ? 'border-safe/50' : 'border-warning/50'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOnline ? (
                  <>
                    <Wifi className="w-6 h-6 text-safe" />
                    <div>
                      <p className="font-bold text-safe">オンライン</p>
                      <p className="text-sm text-muted-foreground">送信可能</p>
                    </div>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-6 h-6 text-warning offline-blink" />
                    <div>
                      <p className="font-bold text-warning">オフライン</p>
                      <p className="text-sm text-muted-foreground">通信回復待ち</p>
                    </div>
                  </>
                )}
              </div>
              
              <div className="text-right">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{pendingCount}</p>
                    <p className="text-xs text-muted-foreground">待機中</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-safe">{sentCount}</p>
                    <p className="text-xs text-muted-foreground">送信済</p>
                  </div>
                </div>
              </div>
            </div>

            {isOnline && pendingCount > 0 && (
              <Button
                onClick={handleSendAll}
                className="w-full mt-4 bg-safe hover:bg-safe/90 text-safe-foreground tap-target"
              >
                <Send className="w-5 h-5 mr-2" />
                すべて送信
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Own SOS */}
        {ownSOS.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <User className="w-5 h-5" />
              自分のSOS ({ownSOS.length})
            </h2>
            
            {ownSOS.map(item => {
              const injury = injuryLabels[item.sosData.injuryStatus]
              return (
                <Card key={item.id} className={item.status === 'sent' ? 'border-safe/50 bg-safe/5' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className={`flex items-center gap-1 ${injury.color}`}>
                            {injury.icon}
                            <span className="font-medium">{injury.label}</span>
                          </span>
                        </div>
                        
                        {item.sosData.location && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span className="font-mono text-xs">
                              {item.sosData.location.latitude.toFixed(4)}, {item.sosData.location.longitude.toFixed(4)}
                            </span>
                          </div>
                        )}
                        
                        <p className="text-xs text-muted-foreground">
                          作成: {new Date(item.createdAt).toLocaleString('ja-JP')}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {item.status === 'pending' ? (
                          <span className="flex items-center gap-1 text-warning text-sm">
                            <Clock className="w-4 h-4" />
                            待機中
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-safe text-sm">
                            <CheckCircle2 className="w-4 h-4" />
                            送信済
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Relayed SOS */}
        {relayedSOS.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Users className="w-5 h-5" />
              預かったSOS ({relayedSOS.length})
            </h2>
            
            {relayedSOS.map(item => {
              const injury = injuryLabels[item.sosData.injuryStatus]
              return (
                <Card key={item.id} className={item.status === 'sent' ? 'border-safe/50 bg-safe/5' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{item.sosData.userName}</span>
                          <span className="text-xs font-mono text-muted-foreground">
                            ({item.sosData.userId})
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className={`flex items-center gap-1 ${injury.color}`}>
                            {injury.icon}
                            <span className="font-medium text-sm">{injury.label}</span>
                          </span>
                        </div>
                        
                        {item.sosData.location && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span className="font-mono text-xs">
                              {item.sosData.location.latitude.toFixed(4)}, {item.sosData.location.longitude.toFixed(4)}
                            </span>
                          </div>
                        )}
                        
                        <p className="text-xs text-muted-foreground">
                          受信: {new Date(item.createdAt).toLocaleString('ja-JP')}
                        </p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        {item.status === 'pending' ? (
                          <span className="flex items-center gap-1 text-warning text-sm">
                            <Clock className="w-4 h-4" />
                            待機中
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-safe text-sm">
                            <CheckCircle2 className="w-4 h-4" />
                            代理送信済
                          </span>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromQueue(item.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Empty state */}
        {queue.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <Send className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                送信キューは空です
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                SOSを作成するか、他の人のQRコードをスキャンしてください
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}