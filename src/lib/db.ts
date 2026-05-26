import Dexie, { type Table } from 'dexie'
import type { UserProfile, QueuedSOS } from './store'

// データベースのクラスを定義
export class SOSRelayDatabase extends Dexie {
  // テーブルの型を宣言
  myProfile!: Table<UserProfile, string>
  sosQueue!: Table<QueuedSOS, string>

  constructor() {
    super('SOSRelayDB') // データベース名

    // スキーマ定義
    // 検索に使いたいインデックスのみをカンマ区切りで書く
    this.version(1).stores({
      myProfile: 'id', // idを主キーとして登録
      sosQueue: 'id, status, createAt' // id(主キー)と、検索に使うstatus、先入先出のためのcreateAt
    })
  }
}

// アプリ全体で使いまわすためにインスタンス化してエクスポート
export const db = new SOSRelayDatabase()
