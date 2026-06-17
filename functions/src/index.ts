import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import * as logger from 'firebase-functions/logger'
import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { initializeApp } from 'firebase-admin/app'

const LINE_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN || "";
const TARGET_LINE_USER_ID = process.env.TARGET_LINE_USER_ID || "";

const LINE_LOGIN_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID || "";
const LINE_LOGIN_CHANNEL_SECRET = process.env.LINE_LOGIN_CHANNEL_SECRET || "";

// Firebase Adminの初期化
try {
  initializeApp();
} catch {
  logger.info("Firebase Admin already initialized.")
}
const adminDB = getFirestore()

// 新しいSOSが作成された時にLINEを飛ばす関数
export const onNewSOSCreated = onDocumentCreated("sos_signals/{signalId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    logger.error("データが存在しません");
    return;
  }

  // 届いたSOSデータの中身を解析
  const data = snapshot.data();
  const isOwn = data.isOwn;
  const sosData = data.sosData;

  const userName = sosData.userName || "匿名希望";
  const injuryStatus = sosData.injuryStatus === "severe" ? "🔴重傷" : sosData.injuryStatus === "minor" ? "🟡軽傷" : "🟢無事";
  const memo = sosData.memo || "なし";
  
  // 位置情報（GPS）の解析
  let locationText = "位置情報：未取得";
  if (sosData.location) {
    const lat = sosData.location.latitude;
    const lng = sosData.location.longitude;
    locationText = `位置情報（Google Mapsで確認）:\nhttps://www.google.com/maps/search/?api=1&query=$${lat},${lng}`;
  }

  const footerText = isOwn
    ? "※このメッセージは、被災者本人の端末から直接送信されました。"
    : `※このメッセージは、電波の復旧した第三者（${data.relayedFrom || '匿名'}）の端末を介して代理送信されました。`;

  const messageText = `🚨【SOSリレー通知】🚨\n\n被災者から安否情報が届きました！\n\n■ 氏名: ${userName}\n■ ケガの状況: ${injuryStatus}\n■ メモ: ${memo}\n\n${locationText}\n\n${footerText}`;

  logger.info(`LINE送信処理を開始します。判定： ${isOwn ? "直接" : "代理"}`);

  try {
    // LINE API のエンドポイント（送り先）へリクエストを飛ばす
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LINE_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to: TARGET_LINE_USER_ID,
        messages: [{ type: "text", text: messageText }]
      })
    });

    if (response.ok) {
      logger.info("LINEへのメッセージ送信に成功しました！");
    } else {
      const errText = await response.text();
      logger.error(`LINE APIエラー: ${errText}`);
    }
  } catch (error) {
    logger.error("LINE送信中にネットワークエラーが発生しました:", error);
  }
});

// アプリが閉じている時用のAPI
export const uploadSOSApi = onRequest({ cors: true }, async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== 'sos-relay-secret-key-2026') {
    res.status(403).send('Forbidden');
    return;
  }

  try {
    const item = req.body;
    await adminDB.collection('sos_signals').doc(item.id).set({
      id: item.id,
      status: 'sent',
      isOwn: item.isOwn,
      relayedFrom: item.relayedFrom || 'unknown',
      createdAt: item.createdAt,
      sentAt: new Date().toISOString(),
      sosData: item.sosData
    });

    res.status(200).send({ success: true });
  } catch (error) {
    logger.error("APIアップロードでエラーが発生しました：", error);
    res.status(500).send('Internal Server Error');
  }
});

// LINEログイン交換窓口
export const exchangeLineCodeApi = onRequest({ cors: true }, async (req, res) => {
  const { code, redirectUrl } = req.body as { code?: string; redirectUrl?: string };

  if (!code || !redirectUrl) {
    res.status(400).send("パラメータが足りません");
    return;
  }

  try {
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUrl,
      client_id: LINE_LOGIN_CHANNEL_ID,
      client_secret: LINE_LOGIN_CHANNEL_SECRET,
    });

    const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    const tokenData = await tokenResponse.json() as { access_token: string; error_description?: string };
    if (!tokenResponse.ok) {
      throw new Error(tokenData.error_description || "トークン交換失敗");
    }

    // シングルクォーテーションをバッククォート（`）に直して変数が埋め込まれるようにしました
    const profileResponse = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profileData = await profileResponse.json() as { userId: string; displayName: string; pictureUrl?: string };

    res.status(200).send({
      userId: profileData.userId,
      displayName: profileData.displayName,
      pictureUrl: profileData.pictureUrl
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    logger.error("LINEログインエラー", error);
    res.status(500).send(errorMessage);
  }
});
