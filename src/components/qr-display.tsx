'use client'

import { useMemo } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useAppStore, type SOSData } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ArrowLeft, 
  Sun, 
  Scan,
  CheckCircle2,
  AlertTriangle,
  Ambulance,
  MapPin,
  User
} from 'lucide-react'

// Encode SOS data into minimal format for QR code
function encodeSOS(sosData: SOSData): string {
  const data = {
    i: sosData.userId,
    n: sosData.userName,
    l: sosData.location ? {
      a: sosData.location.latitude,
      o: sosData.location.longitude,
      c: Math.round(sosData.location.accuracy),
    } : null,
    s: sosData.injuryStatus === 'safe' ? 0 : sosData.injuryStatus === 'minor' ? 1 : 2,
    t: sosData.situations.map(s => {
      const map: Record<string, number> = {
        trapped: 0, immobile: 1, needsRescue: 2,
        needsMedical: 3, needsWater: 4, needsFood: 5
      }
      return map[s]
    }),
    m: sosData.memo || '',
    c: new Date(sosData.createdAt).getTime(),
  }
  
  const jsonStr = JSON.stringify(data);
  // 文字列をUTF-8のバイト配列に変換
  const bytes = new TextEncoder().encode(jsonStr);
  // バイト配列をバイナリ文字列に変換
  const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  
  return `SOS:${btoa(binString)}`;
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

export function QRDisplay() {
  const { currentSOS, setCurrentView, mode, profile } = useAppStore()
  
  const isEmergencyMode = mode === 'emergency'
  
  const qrData = useMemo(() => {
    if (!currentSOS) return ''
    return encodeSOS(currentSOS)
  }, [currentSOS])

  if (!currentSOS) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">SOSデータがありません</p>
            <Button
              onClick={() => setCurrentView('sos-input')}
              className="mt-4"
            >
              SOSを作成する
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const injury = injuryLabels[currentSOS.injuryStatus]

  return (
    <div className={`min-h-screen p-4 pb-32 ${isEmergencyMode ? 'bg-background pt-12' : 'bg-background'}`}>
      <div className="max-w-md mx-auto space-y-6">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => setCurrentView('sos-input')}
          className="tap-target"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          戻る
        </Button>

        {/* Header */}
        <div className="text-center">
          <h1 className={`font-bold ${isEmergencyMode ? 'text-3xl' : 'text-2xl'}`}>
            あなたのSOS
          </h1>
          <p className={`mt-2 ${isEmergencyMode ? 'text-lg text-warning' : 'text-muted-foreground'}`}>
            このQRコードを他の人に読み取ってもらってください
          </p>
        </div>

        {/* QR Code Display */}
        <Card className={`${isEmergencyMode ? 'border-4 border-foreground' : 'border-2'}`}>
          <CardContent className="pt-6">
            {/* Brightness indicator for dark environments */}
            <div className="flex items-center justify-center gap-2 mb-4 text-warning">
              <Sun className="w-5 h-5" />
              <span className="text-sm font-medium">画面を明るく保ってください</span>
            </div>
            
            {/* QR Code with white background for readability */}
            <div className="bg-white p-6 rounded-xl qr-bright mx-auto w-fit">
              <QRCodeSVG
                value={qrData}
                size={isEmergencyMode ? 280 : 240}
                level="M"
                includeMargin={false}
                bgColor="#FFFFFF"
                fgColor="#000000"
              />
            </div>

            {/* User ID */}
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">識別ID</p>
              <p className="text-2xl font-mono font-bold">{profile?.id}</p>
            </div>
          </CardContent>
        </Card>

        {/* SOS Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">送信内容</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name */}
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium">{currentSOS.userName}</span>
            </div>

            {/* Location */}
            {currentSOS.location && (
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-mono">
                  {currentSOS.location.latitude.toFixed(5)}, {currentSOS.location.longitude.toFixed(5)}
                </span>
              </div>
            )}

            {/* Injury Status */}
            <div className={`flex items-center gap-3 ${injury.color}`}>
              {injury.icon}
              <span className="font-bold text-lg">{injury.label}</span>
            </div>

            {/* Situations */}
            {currentSOS.situations.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {currentSOS.situations.map(situation => (
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
            {currentSOS.memo && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">{currentSOS.memo}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="space-y-3">
          <Button
            onClick={() => setCurrentView('scanner')}
            variant="outline"
            className={`w-full ${isEmergencyMode ? 'h-16 text-lg tap-target-xl' : 'h-12 tap-target'}`}
          >
            <Scan className="w-5 h-5 mr-2" />
            他の人のSOSをスキャン
          </Button>
        </div>
      </div>
    </div>
  )
}
