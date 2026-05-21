'use client'

import { useState } from 'react'
import { useAppStore, generateId, type UserProfile } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ShieldCheck, Heart, Send, AlertTriangle, ChevronRight, User } from 'lucide-react'
import { LineConnect } from './line-connect'

const bloodTypes = ['A型', 'B型', 'O型', 'AB型', 'わからない']

export function RegistrationForm() {
  const { profile, setProfile, setMode, setCurrentView } = useAppStore()
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    bloodType: profile?.bloodType || '',
    medicalConditions: profile?.medicalConditions || '',
    emergencyName: profile?.emergencyContact.name || '',
    emergencyEmail: profile?.emergencyContact.email || '',
    emergencyLineId: profile?.emergencyContact.lineId || '',
  })
  const [isEditing, setIsEditing] = useState(!profile)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const newProfile: UserProfile = {
      id: profile?.id || generateId(),
      name: formData.name,
      bloodType: formData.bloodType,
      medicalConditions: formData.medicalConditions,
      emergencyContact: {
        name: formData.emergencyName,
        email: formData.emergencyEmail,
        lineId: formData.emergencyLineId,
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

          {/* ID Display Card */}
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

          {/* LINE Connection */}
          <LineConnect />

          {/* Profile Summary */}
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
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  緊急連絡先
                </p>
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{profile.emergencyContact.name}</p>
                  {profile.emergencyContact.email && (
                    <p className="text-muted-foreground">{profile.emergencyContact.email}</p>
                  )}
                </div>
              </div>
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
            災害時に大切な人へあなたの無事を届けます
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</span>
          <span>あなたの情報</span>
          <ChevronRight className="w-4 h-4" />
          <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">2</span>
          <span>連絡先</span>
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

          {/* Step 2: Emergency Contact - Most Important */}
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Send className="w-5 h-5 text-primary" />
                SOSを届ける人
              </CardTitle>
              <CardDescription>
                災害時にあなたの安否を知らせたい人
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyName">名前</Label>
                <Input
                  id="emergencyName"
                  value={formData.emergencyName}
                  onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
                  placeholder="例: 母、配偶者の名前など"
                  required
                  className="tap-target"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyEmail">メールアドレス</Label>
                <Input
                  id="emergencyEmail"
                  type="email"
                  value={formData.emergencyEmail}
                  onChange={(e) => setFormData({ ...formData, emergencyEmail: e.target.value })}
                  placeholder="example@email.com"
                  className="tap-target"
                />
                <p className="text-xs text-muted-foreground">
                  SOSはこのアドレスに送信されます
                </p>
              </div>
            </CardContent>
          </Card>

          {/* LINE Connection - Show after basic registration for new users */}
          {profile && <LineConnect />}

          {/* Optional: Medical Info - Collapsed by default */}
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
              disabled={!formData.name || !formData.emergencyName}
            >
              登録する
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
