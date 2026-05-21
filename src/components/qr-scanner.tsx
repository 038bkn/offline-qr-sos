'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { useAppStore, generateQueueId, type SOSData, type InjuryStatus, type SituationType } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ArrowLeft, 
  Camera, 
  CheckCircle2,
  AlertTriangle,
  Ambulance,
  XCircle,
  Scan,
  User,
  MapPin
} from 'lucide-react'

// QRコードからSOSデータを解読する
function decodeSOS(encoded: string): SOSData | null {
  try {
    if (!encoded.startsWith('SOS:')) return null

    const base64Data = encoded.slice(4)
    const binString = atob(base64Data)
    const bytes = Uint8Array.from(binString, (char) => char.charCodeAt(0))
    const json = new TextDecoder().decode(bytes)

    const data = JSON.parse(json)
    
    const situationMap: Record<number, SituationType> = {
      0: 'trapped', 1: 'immobile', 2: 'needsRescue',
      3: 'needsMedical', 4: 'needsWater', 5: 'needsFood'
    }
    
    const injuryMap: Record<number, InjuryStatus> = {
      0: 'safe', 1: 'minor', 2: 'severe'
    }
    
    return {
      userId: data.i,
      userName: data.n,
      location: data.l ? {
        latitude: data.l.a,
        longitude: data.l.o,
        accuracy: data.l.c,
        timestamp: new Date(data.c).toISOString(),
      } : null,
      injuryStatus: injuryMap[data.s] || 'safe',
      situations: (data.t || []).map((t: number) => situationMap[t]).filter(Boolean),
      memo: data.m || '',
      createdAt: new Date(data.c).toISOString(),
    }
  } catch (error) {
    console.error('[v0] Failed to decode SOS:', error)
    return null
  }
}

const injuryLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  safe: { label: '無事', icon: <CheckCircle2 className="w-6 h-6" />, color: 'text-safe' },
  minor: { label: '軽傷', icon: <AlertTriangle className="w-6 h-6" />, color: 'text-warning' },
  severe: { label: '重傷', icon: <Ambulance className="w-6 h-6" />, color: 'text-emergency' },
}

const situationLabels: Record<string, string> = {
  trapped: '閉じ込め',
  immobile: '移動不可',
  needsRescue: '救助必要',
  needsMedical: '医療必要',
  needsWater: '水が必要',
  needsFood: '食料必要',
}

export function QRScanner() {
  const { setCurrentView, addToQueue, queue, mode, profile } = useAppStore()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scannedSOS, setScannedSOS] = useState<SOSData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cameraPermission, setCameraPermission] = useState<'pending' | 'granted' | 'denied'>('pending')
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)

  const isEmergencyMode = mode === 'emergency'

  useEffect(() => {
    return () => {
      // アンマウント時のクリーンアップ
      if (readerRef.current) {
        readerRef.current.reset?.()
      }
    }
  }, [])

  const startScanning = async () => {
    setError(null)
    setScannedSOS(null)
    setIsScanning(true)

    try {
      const codeReader = new BrowserMultiFormatReader()
      readerRef.current = codeReader
      
      const devices = await BrowserMultiFormatReader.listVideoInputDevices()
      
      if (devices.length === 0) {
        setError('カメラが見つかりません')
        setIsScanning(false)
        return
      }

      // 背面カメラを優先
      const backCamera = devices.find(d => 
        d.label.toLowerCase().includes('back') || 
        d.label.toLowerCase().includes('rear') ||
        d.label.toLowerCase().includes('環境')
      ) || devices[0]

      setCameraPermission('granted')

      await codeReader.decodeFromVideoDevice(
        backCamera.deviceId,
        videoRef.current!,
        (result, err) => {
          if (result) {
            const text = result.getText()
            const decoded = decodeSOS(text)
            
            if (decoded) {
              setScannedSOS(decoded)
              setIsScanning(false)
              codeReader.reset?.()
            }
          }
        }
      )
    } catch (err: unknown) {
      console.error('[v0] Scanner error:', err)
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setCameraPermission('denied')
        setError('カメラへのアクセスが拒否されました')
      } else {
        setError('カメラを起動できませんでした')
      }
      setIsScanning(false)
    }
  }

  const stopScanning = () => {
    if (readerRef.current) {
      readerRef.current.reset?.()
    }
    setIsScanning(false)
  }

  const handleSaveRelay = () => {
    if (!scannedSOS) return

    // すでにキューに入っているか確認する
    const alreadyExists = queue.some(
      q => q.sosData.userId === scannedSOS.userId && 
           q.sosData.createdAt === scannedSOS.createdAt
    )

    if (alreadyExists) {
      setError('このSOSは既に保存されています')
      return
    }

    addToQueue({
      id: generateQueueId(),
      sosData: scannedSOS,
      status: 'pending',
      isOwn: false,
      relayedFrom: profile?.name,
      createdAt: new Date().toISOString(),
    })

    setScannedSOS(null)
    setCurrentView('queue')
  }

  const handleScanAnother = () => {
    setScannedSOS(null)
    startScanning()
  }

  // スキャン結果の表示
  if (scannedSOS) {
    const injury = injuryLabels[scannedSOS.injuryStatus]
    
    return (
      <div className={`min-h-screen p-4 pb-32 ${isEmergencyMode ? 'bg-background pt-12' : 'bg-background'}`}>
        <div className="max-w-md mx-auto space-y-6">
          <Button
            variant="ghost"
            onClick={() => setScannedSOS(null)}
            className="tap-target"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            戻る
          </Button>

          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-safe/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-safe" />
            </div>
            <h1 className={`font-bold ${isEmergencyMode ? 'text-3xl' : 'text-2xl'}`}>
              SOSを読み取りました
            </h1>
          </div>

          <Card className={isEmergencyMode ? 'border-2' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                {scannedSOS.userName}
                <span className="text-sm font-mono text-muted-foreground">
                  ({scannedSOS.userId})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Location */}
              {scannedSOS.location && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-mono">
                    {scannedSOS.location.latitude.toFixed(5)}, {scannedSOS.location.longitude.toFixed(5)}
                  </span>
                </div>
              )}

              {/* Injury Status */}
              <div className={`flex items-center gap-3 ${injury.color}`}>
                {injury.icon}
                <span className="font-bold text-lg">{injury.label}</span>
              </div>

              {/* Situations */}
              {scannedSOS.situations.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {scannedSOS.situations.map(situation => (
                    <span
                      key={situation}
                      className="px-3 py-1 bg-muted rounded-full text-sm font-medium"
                    >
                      {situationLabels[situation]}
                    </span>
                  ))}
                </div>
              )}

              {/* Memo */}
              {scannedSOS.memo && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">{scannedSOS.memo}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {error && (
            <div className="p-4 bg-warning/20 text-warning rounded-lg text-center">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={handleSaveRelay}
              className={`w-full font-bold ${
                isEmergencyMode
                  ? 'h-20 text-xl bg-safe hover:bg-safe/90 text-safe-foreground tap-target-xl'
                  : 'h-14 text-lg tap-target'
              }`}
            >
              <CheckCircle2 className="w-6 h-6 mr-2" />
              このSOSを預かる
            </Button>
            
            <Button
              variant="outline"
              onClick={handleScanAnother}
              className={`w-full ${isEmergencyMode ? 'h-14 tap-target-xl' : 'h-12 tap-target'}`}
            >
              <Scan className="w-5 h-5 mr-2" />
              続けてスキャン
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Scanner view
  return (
    <div className={`min-h-screen p-4 pb-32 ${isEmergencyMode ? 'bg-background pt-12' : 'bg-background'}`}>
      <div className="max-w-md mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => {
            stopScanning()
            setCurrentView(isEmergencyMode ? 'qr-display' : 'registration')
          }}
          className="tap-target"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          戻る
        </Button>

        <div className="text-center">
          <h1 className={`font-bold ${isEmergencyMode ? 'text-3xl' : 'text-2xl'}`}>
            QRスキャン
          </h1>
          <p className={`mt-2 ${isEmergencyMode ? 'text-lg' : ''} text-muted-foreground`}>
            他の人のSOSコードを読み取ります
          </p>
        </div>

        {/* Camera View */}
        <Card className={`overflow-hidden ${isEmergencyMode ? 'border-2' : ''}`}>
          <CardContent className="p-0">
            <div className="relative aspect-square bg-black">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              
              {/* Scanning overlay */}
              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-3/4 h-3/4 border-4 border-white/50 rounded-2xl relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl" />
                  </div>
                </div>
              )}

              {/* Not scanning state */}
              {!isScanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <Camera className="w-16 h-16 text-muted-foreground" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <div className="p-4 bg-destructive/20 rounded-lg flex items-center gap-3">
            <XCircle className="w-5 h-5 text-destructive" />
            <span className="text-destructive">{error}</span>
          </div>
        )}

        {/* アクセス拒否のメッセージ */}
        {cameraPermission === 'denied' && (
          <Card className="bg-warning/10 border-warning">
            <CardContent className="pt-6 text-center">
              <p className="text-warning font-medium">
                カメラへのアクセスを許可してください
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                ブラウザの設定からカメラのアクセスを許可してから再度お試しください
              </p>
            </CardContent>
          </Card>
        )}

        {/* Scan button */}
        <Button
          onClick={isScanning ? stopScanning : startScanning}
          className={`w-full font-bold ${
            isEmergencyMode
              ? 'h-20 text-xl tap-target-xl'
              : 'h-14 text-lg tap-target'
          }`}
          variant={isScanning ? 'destructive' : 'default'}
        >
          {isScanning ? (
            <>
              <XCircle className="w-6 h-6 mr-2" />
              スキャンを停止
            </>
          ) : (
            <>
              <Camera className="w-6 h-6 mr-2" />
              スキャンを開始
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
