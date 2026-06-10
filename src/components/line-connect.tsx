'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Link2, Unlink } from 'lucide-react'

const LINE_LOGIN_CHANNEL_ID = import.meta.env.VITE_LINE_LOGIN_CHANNEL_ID || "";

export function LineConnect() {
  const { profile, clearLineConnection } = useAppStore()

  // 💡 【修正ポイント①】
  // 最初からURLをチェックし、LINEから戻ってきた直後なら最初から isLoading を true にしておく！
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search)
      return !!(searchParams.get('code') && searchParams.get('state') === 'sos-relay-login-state')
    }
    return false
  })
  const [error, setError] = useState('')

  const isLinked = !!profile?.lineConnection

  const handleLineLogin = useCallback(() => {
    setIsLoading(true)
    setError('')
    
    const redirectUrl = window.location.origin + window.location.pathname
    
    const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?` + new URLSearchParams({
      response_type: 'code',
      client_id: LINE_LOGIN_CHANNEL_ID,
      redirect_uri: redirectUrl, 
      state: 'sos-relay-login-state', 
      scope: 'profile openid',
    }).toString()

    window.location.href = lineAuthUrl
  }, [])

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (code && state === 'sos-relay-login-state') {
      // 💡 【修正ポイント②】
      // ここで setIsLoading(true) を呼ぶとエラーになるため削除。
      // 初期値ですでに true になっているので、そのまま処理を進めるだけでOK！
      
      const redirectUrl = window.location.origin + window.location.pathname
      window.history.replaceState({}, document.title, window.location.pathname)

      useAppStore.getState().linkLineAccount(code, redirectUrl)
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : '連携中にエラーが発生しました'
          setError(msg)
        })
        .finally(() => {
          // 終わったら false に戻す（これは非同期処理の後なのでエラーにならない）
          setIsLoading(false)
        })
    }
  }, [])

  const handleUnlink = useCallback(() => {
    clearLineConnection()
  }, [clearLineConnection])

  // --- 画面描画 ---

  if (isLinked) {
    return (
      <Card className="border-[#06C755]/50 bg-[#06C755]/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-[#06C755] flex items-center justify-center text-white font-bold text-xl">
              L
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">LINE連携完了</p>
              <p className="text-sm text-muted-foreground">
                連携名: <span className="font-bold">{profile?.lineConnection?.displayName}</span>
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUnlink}
            className="w-full text-muted-foreground hover:text-destructive"
          >
            <Unlink className="w-4 h-4 mr-2" />
            LINE連携を解除
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#06C755] flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
              <path d="M12 2C6.48 2 2 5.82 2 10.5c0 2.85 1.59 5.37 4.06 6.96L5 21.5l4.5-2.23c.82.15 1.64.23 2.5.23 5.52 0 10-3.82 10-8.5S17.52 2 12 2z"/>
            </svg>
          </div>
          本物のLINEと連携する
        </CardTitle>
        <CardDescription>
          連携すると、あなたのLINEアカウントの名前を自動取得し、通知と連動させます。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p className="text-sm text-destructive text-center">{error}</p>}
        <Button
          onClick={handleLineLogin}
          disabled={isLoading || !LINE_LOGIN_CHANNEL_ID}
          className="w-full h-12 bg-[#06C755] hover:bg-[#06C755]/90 text-white font-bold"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <Link2 className="w-5 h-5 mr-2" />
          )}
          LINEアカウントでカンタン連携
        </Button>
      </CardContent>
    </Card>
  )
}