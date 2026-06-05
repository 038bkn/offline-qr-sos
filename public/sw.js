// Service WorkerでもDexieを動かせるようにWEBからインポート
importScripts('https://unpkg.com/dexie@4.0.1/dist/dexie.js');

// アプリ側（db.ts）と同じ名前、同じ構造でローカルDBを開く
const db = new Dexie('SOSRelayDatabase'); 
db.version(1).stores({
  myProfile: '++id',
  sosQueue: 'id, status'
});

// Service Workerを常に最新状態にする
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// スマホが通信復帰を検知したら、OSが自動で発火してくれる
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-sos-queue') {
    event.waitUntil(sendQueueInBackground());
  }
});

async function sendQueueInBackground() {
  try {
    // スマホ内のDexieから、まだ送信されていない「pending」のデータを全部引っ張り出す
    const pendingItems = await db.sosQueue.where('status').equals('pending').toArray();
    
    if (pendingItems.length === 0) return;

    for (const item of pendingItems) {
      // APIへfetchでデータを投げる
      const response = await fetch('https://us-central1-sos-relay-app.cloudfunctions.net/uploadSOSApi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'sos-relay-secret-key-2026' // 合言葉
        },
        body: JSON.stringify(item)
      });

      if (response.ok) {
        // 送信が成功したら、スマホ内のDexie倉庫のステータスを「sent（送信済）」に書き換える
        await db.sosQueue.update(item.id, {
          status: 'sent',
          sentAt: new Date().toISOString()
        });
        console.log(`[裏側同期] ID: ${item.id} のバックグラウンド送信に完全成功！`);
      } else {
        throw new Error('サーバー側のエラーです');
      }
    }
  } catch (error) {
    console.error('[裏側同期] 失敗（次回通信が安定した時にOSが自動で再リトライします）:', error);
    // エラーをthrowにすることで、また電波が良くなった時にOSが自動で再実行
    throw error;
  }
}