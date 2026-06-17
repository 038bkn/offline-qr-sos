'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore, type SOSData, type InjuryStatus, type SituationType, generateQueueId } from '@/lib/store'
import { detectEnvironment } from '@/lib/detect-environment'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Navigation,
  User,
  Home,
  Ambulance,
  Droplets,
  UtensilsCrossed,
  ArrowRight,
  RefreshCw,
  RefreshCcw,
  Info,
} from 'lucide-react'

const injuryOptions: { value: InjuryStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'safe', label: '無事', icon: <CheckCircle2 className="w-8 h-8" />, color: 'bg-safe text-safe-foreground' },
  { value: 'minor', label: '軽傷', icon: <AlertTriangle className="w-8 h-8" />, color: 'bg-warning text-warning-foreground' },
  { value: 'severe', label: '重傷', icon: <Ambulance className="w-8 h-8" />, color: 'bg-emergency text-emergency-foreground' },
]

const situationOptions: { value: SituationType; label: string; icon: React.ReactNode }[] = [
  { value: 'trapped', label: '閉じ込め', icon: <Home className="w-6 h-6" /> },
  { value: 'immobile', label: '移動不可', icon: <User className="w-6 h-6" /> },
  { value: 'needsRescue', label: '救助必要', icon: <AlertTriangle className="w-6 h-6" /> },
  { value: 'needsMedical', label: '医療必要', icon: <Ambulance className="w-6 h-6" /> },
  { value: 'needsWater', label: '水が必要', icon: <Droplets className="w-6 h-6" /> },
  { value: 'needsFood', label: '食料必要', icon: <UtensilsCrossed className="w-6 h-6" /> },
]

function LocationDeniedContent({ onClose }: { onClose: () => void }) {
  const env = detectEnvironment()

  const steps: string[] = (() => {
    switch (env) {
      case 'ios-safari':
        return [
          'ホーム画面から「⚙️ 設定」アプリを開く',
          '「プライバシーとセキュリティ」をタップ',
          '「位置情報サービス」→「Safariのウェブサイト」をタップ',
          '「このアプリの使用中」を選ぶ',
        ]
      case 'ios-chrome':
        return [
          'ホーム画面から「⚙️ 設定」アプリを開く',
          '「プライバシーとセキュリティ」をタップ',
          '「位置情報サービス」→「Chrome」をタップ',
          '「このアプリの使用中」を選ぶ',
        ]
      case 'android-chrome':
        return [
          '画面上部のURLバー左側にある',
          '「権限」をタップ',
          '「位置情報」を「許可」にする',
          'ページを再読み込みする',
        ]
      case 'pc':
        return [
          'URLバー左側の',
          '「位置情報」のスイッチをオンにする',
          'ページを再読み込みする',
        ]
      default:
        return [
          'ブラウザの設定メニューから、このウェブサイトへの「位置情報」のアクセスを「許可」に変更してください。',
        ]
    }
  })()

  const shouldShowMapPinInStep = (step: string) =>
    env === 'android-chrome' && step.includes('URLバー')

  const shouldShowInfoInStep = (step: string) =>
    env === 'pc' && step.includes('URLバー')

  const canReload = env === 'android-chrome' || env === 'pc' || env === 'fallback'
  const canOpenSettings = env === 'ios-safari' || env === 'ios-chrome'

  const handleOpenSettings = () => {
    window.location.href = 'App-Prefs:root=Privacy&path=LOCATION'
  }

  const handleReload = () => {
    window.location.reload()
  }

  return (
    <>
      <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertTriangle className="w-10 h-10 text-destructive" />
      </div>

      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">
          位置情報がブロックされています
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          以下の手順で位置情報の使用を許可してください
        </p>
      </div>

      <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-sm text-foreground">
        {steps.map((step, i) => (
          <div key={step} className="flex items-start gap-2">
            {steps.length > 1 && (
              <span className="shrink-0 font-bold text-muted-foreground">
                {i + 1}.
              </span>
            )}
            <p>
              {shouldShowMapPinInStep(step) ? (
                <>
                  {step}
                  <MapPin className="inline-block w-4 h-4 mx-1 align-middle text-foreground" />
                  をタップ
                </>
              ) : shouldShowInfoInStep(step) ? (
                <>
                  {step}
                  <Info className="inline-block w-4 h-4 mx-1 align-middle text-foreground" />
                  をクリック
                </>
              ) : (
                step
              )}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {canOpenSettings && (
          <Button
            onClick={handleOpenSettings}
            className="w-full h-12 font-bold tap-target"
          >
            設定アプリを開く
          </Button>
        )}
        {canReload && (
          <Button
            onClick={handleReload}
            className="w-full h-12 font-bold tap-target"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            再読み込みする
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={onClose}
          className="w-full text-muted-foreground"
        >
          閉じる
        </Button>
      </div>
    </>
  )
}

export function SOSInput() {
  const { profile, setCurrentSOS, setCurrentView, addToQueue, mode } = useAppStore()
  const [injuryStatus, setInjuryStatus] = useState<InjuryStatus>('safe')
  const [situations, setSituations] = useState<SituationType[]>([])
  const [memo, setMemo] = useState('')
  const [location, setLocation] = useState<SOSData['location']>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [showLocationPrompt, setShowLocationPrompt] = useState(false)
  const [locationPermission, setLocationPermission] = useState<PermissionState | null>(null)

  const isEmergencyMode = mode === 'emergency'

  const getLocation = useCallback(async () => {
    setIsGettingLocation(true)
    setLocationError(null)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        })
      })

      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      const geoError = error as GeolocationPositionError
      if (geoError.code === 1) {
        setLocationPermission('denied')
        setShowLocationPrompt(true)
      } else {
        setLocationError('位置情報を取得できませんでした')
      }
    } finally {
      setIsGettingLocation(false)
    }
  }, [])

  useEffect(() => {
    if (!navigator.permissions) return
    navigator.permissions.query({ name: 'geolocation' }).then((result) => {
      setLocationPermission(result.state)
      result.addEventListener('change', () => setLocationPermission(result.state))
    })
  }, [])

  useEffect(() => {
    if (!isEmergencyMode || location || locationPermission === null) return
    const id = setTimeout(() => {
      if (locationPermission === 'granted') {
        getLocation()
      } else {
        setShowLocationPrompt(true)
      }
    }, 0)
    return () => clearTimeout(id)
  }, [isEmergencyMode, location, locationPermission, getLocation])

  const handleLocationPromptConfirm = () => {
    setShowLocationPrompt(false)
    getLocation()
  }

  const handleRequestLocation = () => {
    if (location) {
      getLocation()
      return
    }
    if (locationPermission === 'granted') {
      getLocation()
    } else {
      setShowLocationPrompt(true)
    }
  }

  const toggleSituation = (situation: SituationType) => {
    setSituations(prev =>
      prev.includes(situation)
        ? prev.filter(s => s !== situation)
        : [...prev, situation]
    )
  }

  const handleCreateSOS = () => {
    if (!profile) return

    const sosData: SOSData = {
      userId: profile.id,
      userName: profile.name,
      location,
      injuryStatus,
      situations,
      memo,
      createdAt: new Date().toISOString(),
    }

    setCurrentSOS(sosData)

    addToQueue({
      id: generateQueueId(),
      sosData,
      status: 'pending',
      isOwn: true,
      createdAt: new Date().toISOString(),
    })

    setCurrentView('qr-display')
  }

  return (
    <div className={`min-h-screen p-4 pb-48 ${isEmergencyMode ? 'bg-background pt-12' : 'bg-background'}`}>
      {/* Location Permission Prompt Modal */}
      {showLocationPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-card rounded-2xl max-w-sm w-full p-6 space-y-5 shadow-2xl border">
            {locationPermission === 'denied' ? (
              <LocationDeniedContent onClose={() => setShowLocationPrompt(false)} />
            ) : (
              <>
                {/* Icon */}
                <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-10 h-10 text-primary" />
                </div>

                {/* Title */}
                <div className="text-center">
                  <h2 className="text-xl font-bold text-foreground">
                    位置情報の許可が必要です
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    あなたの居場所を救助者に伝えるために使用します
                  </p>
                </div>

                {/* Instruction Box */}
                <div className="bg-safe/10 border border-safe/30 rounded-xl p-4">
                  <p className="text-center text-foreground mb-3">
                    このあと表示されるメッセージで
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <div className="bg-safe text-safe-foreground px-5 py-3 rounded-lg font-bold text-xl shadow-lg">
                      許可
                    </div>
                    <span className="text-foreground font-bold">をタップ</span>
                  </div>
                </div>

                {/* Visual hint - mock browser dialog */}
                <div className="bg-muted/50 rounded-lg p-3 border border-dashed">
                  <p className="text-xs text-muted-foreground text-center mb-2">こんなメッセージが出ます</p>
                  <div className="bg-background rounded border p-2 text-xs">
                    <p className="text-foreground mb-2">「位置情報の使用を許可しますか？」</p>
                    <div className="flex gap-2 justify-end">
                      <span className="px-2 py-1 bg-muted rounded text-muted-foreground">ブロック</span>
                      <span className="px-2 py-1 bg-safe text-safe-foreground rounded font-bold">許可</span>
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={handleLocationPromptConfirm}
                    className="w-full h-14 text-lg font-bold tap-target"
                  >
                    <Navigation className="w-5 h-5 mr-2" />
                    わかりました
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowLocationPrompt(false)}
                    className="w-full text-muted-foreground"
                  >
                    あとで設定する
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-4">
          <h1 className={`font-bold ${isEmergencyMode ? 'text-3xl text-foreground' : 'text-2xl'}`}>
            SOS 作成
          </h1>
          <p className={`mt-2 ${isEmergencyMode ? 'text-lg text-muted-foreground' : 'text-muted-foreground'}`}>
            状況を選択してください
          </p>
        </div>

        {/* Location */}
        <Card className={isEmergencyMode ? 'border-2' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              現在地
            </CardTitle>
          </CardHeader>
          <CardContent>
            {location ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-safe">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">位置情報を取得しました</span>
                </div>
                <p className="text-sm text-muted-foreground font-mono">
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </p>
                <p className="text-xs text-muted-foreground">
                  精度: 約{Math.round(location.accuracy)}m
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={getLocation}
                  disabled={isGettingLocation}
                  className="mt-2"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isGettingLocation ? 'animate-spin' : ''}`} />
                  再取得
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {locationError && (
                  <p className="text-destructive text-sm">{locationError}</p>
                )}
                <Button
                  onClick={handleRequestLocation}
                  disabled={isGettingLocation}
                  className={`w-full ${isEmergencyMode ? 'h-16 text-lg tap-target-xl' : 'h-12 tap-target'}`}
                  variant={isEmergencyMode ? 'default' : 'outline'}
                >
                  {isGettingLocation ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      取得中...
                    </>
                  ) : (
                    <>
                      <Navigation className="w-5 h-5 mr-2" />
                      位置情報を取得
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Injury Status */}
        <Card className={isEmergencyMode ? 'border-2' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">ケガの状況</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {injuryOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setInjuryStatus(option.value)}
                  className={`
                    p-4 rounded-xl flex flex-col items-center gap-2 transition-all
                    tap-target-xl border-2
                    ${injuryStatus === option.value
                      ? `${option.color} border-transparent scale-105 shadow-lg`
                      : 'bg-muted border-transparent hover:border-muted-foreground/20'
                    }
                  `}
                >
                  {option.icon}
                  <span className={`font-bold ${isEmergencyMode ? 'text-lg' : ''}`}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Situation */}
        <Card className={isEmergencyMode ? 'border-2' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">現在の状況（複数選択可）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {situationOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => toggleSituation(option.value)}
                  className={`
                    p-4 rounded-xl flex items-center gap-3 transition-all
                    tap-target border-2
                    ${situations.includes(option.value)
                      ? 'bg-primary text-primary-foreground border-transparent shadow-lg'
                      : 'bg-muted border-transparent hover:border-muted-foreground/20'
                    }
                  `}
                >
                  {option.icon}
                  <span className="font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Memo */}
        <Card className={isEmergencyMode ? 'border-2' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">ひとことメモ</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="現在の状況や伝えたいことがあれば..."
              rows={3}
              className={isEmergencyMode ? 'text-lg' : ''}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground mt-2 text-right">
              {memo.length}/100
            </p>
          </CardContent>
        </Card>

        {/* Create SOS Button */}
        <Button
          onClick={handleCreateSOS}
          className={`w-full font-bold ${
            isEmergencyMode
              ? 'h-20 text-xl bg-emergency hover:bg-emergency/90 text-emergency-foreground tap-target-xl emergency-pulse'
              : 'h-14 text-lg tap-target'
          }`}
        >
          QRコードを作成
          <ArrowRight className="w-6 h-6 ml-2" />
        </Button>
      </div>
    </div>
  )
}
