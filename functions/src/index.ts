import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import * as logger from 'firebase-functions/logger'

const LINE_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN || "";
const TARGET_LINE_USER_ID = process.env.LINE_ACCESS_TOKEN || "";

// Firestoreの「sos_signals」コレクションに新しいデータ（SOS）が作成された瞬間、自動起動する関数
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
    // LINEに届いたとき、タップするとすぐ地図が開くようにGoogle Mapsのリンクを自動生成する
    locationText = `位置情報（Google Mapsで確認）:\nhttps://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }

  // LINEに送るメッセージの文章を組み立てる
  const messageText = `🚨【SOSリレー通知】🚨\n\n被災者から安否情報が届きました！\n\n■ 氏名: ${userName}\n■ ケガの状況: ${injuryStatus}\n■ メモ: ${memo}\n\n${locationText}`;

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
        to: TARGET_LINE_USER_ID, // 家族（テストではあなた）のID
        messages: [
          {
            type: "text",
            text: messageText
          }
        ]
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