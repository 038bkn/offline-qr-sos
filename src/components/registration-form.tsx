'use client'

import { useState, useEffect } from 'react'
import { useAppStore, generateId, type UserProfile } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ShieldCheck, Heart, AlertTriangle, ChevronRight, User, Copy, Link as LinkIcon, HeartHandshake, Loader2, CheckCircle2 } from 'lucide-react'
import { LineConnect } from './line-connect'

const bloodTypes = ['A型', 'B型', 'O型', 'AB型', 'わからない']

export function RegistrationForm() {
  const { profile, setProfile, setMode, setCurrentView, acceptInvite } = useAppStore()

  // フォームの状態
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    bloodType: profile?.bloodType || '',
    medicalConditions: profile?.medicalConditions || '',
    // 手動入力の宛先は使わなくなったので空でOK
    emergencyName: '',
    emergencyEmail: '',
    emergencyLineId: '',
  })
  const [isEditing, setIsEditing] = useState(!profile)

  // 💡 URLから招待情報を読み取る（エラー回避の書き方）
  const [inviteInfo] = useState<{ id: string; name: string } | null>(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search)
      const senderId = searchParams.get('invite_id')
      const senderName = searchParams.get('sender_name')
      if (senderId && senderName) {
        return { id: senderId, name: decodeURIComponent(senderName) }
      }
    }
    return null
  })

  const [isAccepting, setIsAccepting] = useState(false)
  const [isAccepted, setIsAccepted] = useState(false)

  // URLを綺麗にする処理
  useEffect(() => {
    if (inviteInfo) {
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [inviteInfo])

  // 受信者が「参加する」を押した時の処理
  const handleAcceptInvite = async () => {
    if (!inviteInfo || !profile?.lineConnection) return
    setIsAccepting(true)
    try {
      await acceptInvite(inviteInfo.id)
      setIsAccepted(true)
    } catch {
      alert("エラーが発生しました。一度LINE連携をやり直してください。")
    } finally {
      setIsAccepting(false)
    }
  }

  // 送信者が「招待リンクをコピー」を押した時の処理
  const handleCopyInviteLink = () => {
    if (!profile) return
    const inviteUrl = `${window.location.origin}${window.location.pathname}?invite_id=${profile.id}&sender_name=${encodeURIComponent(profile.name)}`

    navigator.clipboard.writeText(inviteUrl).then(() => {
      alert('招待リンクをコピーしました！\nこれをLINEやメールで、SOSを受信してほしい人に送ってください。')
    }).catch(() => alert('コピーに失敗しました。'))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newProfile: UserProfile = {
      id: profile?.id || generateId(),
      name: formData.name,
      bloodType: formData.bloodType,
      medicalConditions: formData.medicalConditions,
      emergencyContact: {
        name: '', email: '', lineId: '' // 手入力は廃止したため空
      },
      registeredAt: profile?.registeredAt || new Date().toISOString(),
    }
    setProfile(newProfile)
    setIsEditing(false)
  }

  const handleEmergencyMode = () => {
    setMode('emergency')
    setCurrentView('sos-input')
  }

  // 📱 【特別画面】受信者（家族など）が招待リンクを踏んで開いた時の専用画面
  if (inviteInfo) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md border-primary/50">
          <CardHeader className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <HeartHandshake className="w-10 h-10 text-primary" />
            </div>
            <CardTitle className="text-xl text-primary">{inviteInfo.name} さんからの招待</CardTitle>
            <CardDescription className="text-base mt-2">
              災害時に「{inviteInfo.name}」さんから送られるSOSを受信してサポートするための招待です。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!profile?.lineConnection ? (
              <div className="space-y-4">
                <p className="text-sm font-bold text-center text-foreground">
                  Step 1: あなたのLINEを連携してください
                </p>
                <LineConnect />
              </div>
            ) : isAccepted ? (
              <div className="text-center space-y-4 py-4">
                <CheckCircle2 className="w-16 h-16 text-[#06C755] mx-auto" />
                <p className="font-bold text-lg">参加完了！</p>
                <p className="text-sm text-muted-foreground">これで完了です。この画面を閉じて構いません。</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground mb-1">あなたの連携アカウント</p>
                  <p className="font-bold">{profile.lineConnection.displayName}</p>
                </div>
                <Button onClick={handleAcceptInvite} disabled={isAccepting} className="w-full h-14 text-lg font-bold bg-[#06C755] hover:bg-[#06C755]/90 text-white">
                  {isAccepting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  招待を承諾して参加する
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // 📱 --- 閲覧モード（トップ画面） ---
  if (profile && !isEditing) {
    return (
      <div className="min-h-screen bg-background p-4 pb-24">
        <div className="max-w-md mx-auto space-y-6">
          {/* Header */}
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">SOS リレー</h1>
            <p className="text-muted-foreground mt-2">災害時の代理送信システム</p>
          </div>

          {/* ID Display Card（復活！） */}
          <Card className="border-2 border-primary bg-primary/5">
            <CardHeader className="text-center pb-2">
              <CardDescription>あなたの識別ID</CardDescription>
              <CardTitle className="text-4xl font-mono tracking-wider text-primary">
                {profile.id}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center text-sm text-muted-foreground">
              このIDが災害時にあなたを識別します
            </CardContent>
          </Card>

          {/* LINE Connection（復活！） */}
          <LineConnect />

          {/* 招待リンク機能 (新規追加分) */}
          <Card className="border-border">
            <CardContent className="pt-6">
              <p className="text-sm font-bold mb-2 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-primary" />
                SOSの受信者を招待する
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                災害時にあなたのSOSを受信してもらうための専用リンクを発行します。家族や担当者に送ってください。
              </p>
              <Button variant="outline" className="w-full" onClick={handleCopyInviteLink}>
                <Copy className="w-4 h-4 mr-2" /> 招待リンクをコピーして共有
              </Button>
            </CardContent>
          </Card>

          {/* Profile Summary（復活！） */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                登録情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">氏名</p>
                  <p className="font-medium">{profile.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">血液型</p>
                  <p className="font-medium">{profile.bloodType || '未登録'}</p>
                </div>
              </div>
              {profile.medicalConditions && (
                <div className="text-sm">
                  <p className="text-muted-foreground">持病・アレルギー</p>
                  <p className="font-medium">{profile.medicalConditions}</p>
                </div>
              )}
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => setIsEditing(true)}
              >
                情報を編集
              </Button>
            </CardContent>
          </Card>

          {/* Emergency Button */}
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6">
              <Button
                onClick={handleEmergencyMode}
                className="w-full h-16 text-lg font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground tap-target-xl"
              >
                <AlertTriangle className="w-6 h-6 mr-2" />
                緊急モードを起動
              </Button>
              <p className="text-center text-sm text-muted-foreground mt-3">
                災害時にSOSを送信する場合はタップ
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // 📱 --- 編集・登録フォーム ---
  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Heart className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">SOS リレー</h1>
          <p className="text-muted-foreground mt-2 text-balance">
            災害時に指定した連絡先へあなたの無事を届けます
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Your Name */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">あなたの名前</CardTitle>
              <CardDescription>
                SOSを受け取る人があなただとわかる名前
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例: 田中 太郎"
                required
                className="tap-target text-lg"
              />
            </CardContent>
          </Card>

          {/* LINE Connection */}
          {profile && <LineConnect />}

          {/* Medical Info */}
          <details className="group">
            <summary className="cursor-pointer list-none">
              <Card className="group-open:rounded-b-none">
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm">医療情報を追加（任意）</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform group-open:rotate-90" />
                </CardContent>
              </Card>
            </summary>
            <Card className="rounded-t-none border-t-0">
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bloodType">血液型</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {bloodTypes.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData({ ...formData, bloodType: type })}
                        className={`py-3 px-2 text-sm rounded-lg border transition-colors ${
                          formData.bloodType === type
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background border-border hover:border-primary/50'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medical">持病・アレルギー</Label>
                  <Textarea
                    id="medical"
                    value={formData.medicalConditions}
                    onChange={(e) => setFormData({ ...formData, medicalConditions: e.target.value })}
                    placeholder="例: 糖尿病、心臓病、薬アレルギーなど"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </details>

          <div className="space-y-3 pt-2">
            <Button
              type="submit"
              className="w-full h-14 text-lg font-bold tap-target"
              disabled={!formData.name}
            >
              保存する
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              入力した情報は端末内のみに保存されます
            </p>
            
            {profile && (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setIsEditing(false)}
              >
                キャンセル
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}