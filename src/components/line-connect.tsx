'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore, type LineConnection } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { CheckCircle2, ExternalLink, Loader2, Link2, Unlink } from 'lucide-react'

// LINE公式アカウントの情報（実際の値に置き換え）
const LINE_OFFICIAL_ACCOUNT_URL = 'https://line.me/R/ti/p/@sos-relay'
const LINE_OFFICIAL_ACCOUNT_ID = '@sos-relay'

// 連携コードの生成（実際はサーバーで生成）
const generateLinkCode = () => {
  const chars = '0123456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// 暗号化されたショートIDの生成（実際はサーバーで生成）
const generateEncryptedShortId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

type LinkingStep = 'initial' | 'waiting' | 'verify' | 'complete'

export function LineConnect() {
  const { profile, setLineConnection, clearLineConnection } = useAppStore()
  const [step, setStep] = useState<LinkingStep>('initial')
  const [linkCode, setLinkCode] = useState('')
  const [inputCode, setInputCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState('')

  const isLinked = !!profile?.lineConnection

  // 連携開始
  const startLinking = useCallback(() => {
    const code = generateLinkCode()
    setLinkCode(code)
    setStep('waiting')
    setError('')
  }, [])

  // LINE公式アカウントを開く
  const openLineAccount = useCallback(() => {
    // 実際のアプリではLINEアプリを開く
    window.open(LINE_OFFICIAL_ACCOUNT_URL, '_blank')
  }, [])

  // コードを入力画面へ
  const goToVerify = useCallback(() => {
    setStep('verify')
  }, [])

  // 連携コードの確認（実際はサーバーで検証）
  const verifyCode = useCallback(async () => {
    setIsVerifying(true)
    setError('')

    // 実際はサーバーにコードを送信して検証
    // サーバーはLINE User IDから暗号化されたショートIDを生成して返す
    await new Promise(resolve => setTimeout(resolve, 1500))

    // デモ用：入力コードと生成コードが一致するか確認
    if (inputCode === linkCode) {
      const connection: LineConnection = {
        linkedId: generateEncryptedShortId(),
        linkedAt: new Date().toISOString(),
        displayName: profile?.name || 'LINE User',
      }
      setLineConnection(connection)
      setStep('complete')
    } else {
      setError('コードが一致しません。もう一度お試しください。')
    }
    
    setIsVerifying(false)
  }, [inputCode, linkCode, profile?.name, setLineConnection])

  // 連携解除
  const unlinkLine = useCallback(() => {
    clearLineConnection()
    setStep('initial')
    setLinkCode('')
    setInputCode('')
  }, [clearLineConnection])

  // 連携済みの場合
  if (isLinked && step !== 'complete') {
    return (
      <Card className="border-[#06C755]/50 bg-[#06C755]/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-[#06C755] flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">LINE連携済み</p>
              <p className="text-sm text-muted-foreground font-mono">
                ID: {profile.lineConnection?.linkedId.slice(0, 8)}...
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={unlinkLine}
            className="w-full text-muted-foreground"
          >
            <Unlink className="w-4 h-4 mr-2" />
            連携を解除
          </Button>
        </CardContent>
      </Card>
    )
  }

  // 連携完了画面
  if (step === 'complete') {
    return (
      <Card className="border-[#06C755]/50 bg-[#06C755]/5">
        <CardContent className="pt-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#06C755] flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-2">連携完了</h3>
          <p className="text-sm text-muted-foreground mb-4">
            LINEアカウントと連携しました。災害時にLINEでSOSを受信できます。
          </p>
          <div className="bg-background/50 rounded-lg p-3 mb-4">
            <p className="text-xs text-muted-foreground mb-1">あなたの識別ID</p>
            <p className="font-mono text-lg font-bold text-foreground">
              {profile?.lineConnection?.linkedId}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // コード入力画面
  if (step === 'verify') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#06C755] flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                <path d="M12 2C6.48 2 2 5.82 2 10.5c0 2.85 1.59 5.37 4.06 6.96L5 21.5l4.5-2.23c.82.15 1.64.23 2.5.23 5.52 0 10-3.82 10-8.5S17.52 2 12 2z"/>
              </svg>
            </div>
            連携コードを入力
          </CardTitle>
          <CardDescription>
            LINE公式アカウントに表示されたコードを入力してください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-xs text-muted-foreground mb-2">あなたの連携コード</p>
            <p className="text-3xl font-mono font-bold tracking-[0.3em] text-primary">
              {linkCode}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              このコードをLINEで送信してください
            </p>
          </div>

          <div className="space-y-2">
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))}
              placeholder="確認コード（6桁）"
              className="text-center text-2xl font-mono tracking-widest h-14"
            />
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setStep('waiting')}
              className="flex-1"
            >
              戻る
            </Button>
            <Button
              onClick={verifyCode}
              disabled={inputCode.length !== 6 || isVerifying}
              className="flex-1 bg-[#06C755] hover:bg-[#06C755]/90"
            >
              {isVerifying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                '確認'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 友だち追加待ち画面
  if (step === 'waiting') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#06C755] flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                <path d="M12 2C6.48 2 2 5.82 2 10.5c0 2.85 1.59 5.37 4.06 6.96L5 21.5l4.5-2.23c.82.15 1.64.23 2.5.23 5.52 0 10-3.82 10-8.5S17.52 2 12 2z"/>
              </svg>
            </div>
            LINE連携
          </CardTitle>
          <CardDescription>
            友だち追加してコードを送信してください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 手順 */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">1</span>
              <div className="flex-1">
                <p className="text-sm font-medium">公式アカウントを友だち追加</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openLineAccount}
                  className="mt-2 text-[#06C755] border-[#06C755]/30"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {LINE_OFFICIAL_ACCOUNT_ID} を開く
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">2</span>
              <div className="flex-1">
                <p className="text-sm font-medium">連携コードを送信</p>
                <div className="bg-muted/50 rounded-lg p-3 mt-2">
                  <p className="text-2xl font-mono font-bold tracking-[0.3em] text-center text-primary">
                    {linkCode}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">3</span>
              <p className="text-sm font-medium">返信されたコードを入力</p>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setStep('initial')}
              className="flex-1"
            >
              キャンセル
            </Button>
            <Button
              onClick={goToVerify}
              className="flex-1 bg-[#06C755] hover:bg-[#06C755]/90"
            >
              コードを入力
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 初期画面（未連携）
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#06C755] flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
              <path d="M12 2C6.48 2 2 5.82 2 10.5c0 2.85 1.59 5.37 4.06 6.96L5 21.5l4.5-2.23c.82.15 1.64.23 2.5.23 5.52 0 10-3.82 10-8.5S17.52 2 12 2z"/>
            </svg>
          </div>
          LINE連携
        </CardTitle>
        <CardDescription>
          連携すると、災害時にLINEでSOSを受信できます
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={startLinking}
          className="w-full h-12 bg-[#06C755] hover:bg-[#06C755]/90 text-white font-bold"
        >
          <Link2 className="w-5 h-5 mr-2" />
          LINEと連携する
        </Button>
      </CardContent>
    </Card>
  )
}
