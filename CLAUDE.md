# 営業タスク管理ツール - 仕様書

## システム概要
営業チーム向けのタスク管理ツール「Buzzlog」。Firebase Hostingでデプロイされており、複数ユーザーでのタスク管理が可能。

## URL
- 本番環境: https://buzzlog-6fc74.web.app
- Firebase Console: https://console.firebase.google.com/project/buzzlog-6fc74/overview

## ログイン画面仕様（index.html）

### UI構造
- **ロゴデザイン**: 
  - 電球アイコン（💡）+ "Buzz"（オレンジ色）+ "log"（ダークグレー）
  - 大きく目立つブランドロゴで視認性重視
- **ログインフォーム**:
  - ユーザーID入力フィールド（プレースホルダー: "IDを入力"）
  - パスワード入力フィールド（プレースホルダー: "パスワードを入力"）
  - パスワード表示/非表示切り替えボタン（👁️/🙈アイコン）
  - ログインボタン
  - エラーメッセージ表示エリア

### デザイン仕様
- **背景**: グラデーション（紫から青のグラデーション：#667eea → #764ba2）
- **ログインボックス**: 白背景、角丸、ドロップシャドウで立体感
- **レスポンシブ**: 最大幅400px、中央配置
- **カラーテーマ**: 
  - プライマリ: #667eea（紫青）
  - ロゴオレンジ: #f59e0b
  - エラー: #e53e3e

### 認証機能
- **複数認証方式対応**:
  1. 新形式: loginId + 設定パスワード
  2. 旧形式: 名前 + 自動生成パスワード（後方互換性）
  3. 管理者: pialabuzz + pialabuzz1234（ハードコーディング）
- **パスワード自動生成ルール**: 名前の最初2文字（ひらがな→ローマ字変換）+ "123"
- **セッション管理**: sessionStorageにログイン状態、userId、userName、loginTime保存
- **エラーハンドリング**: 認証失敗時にエラーメッセージ表示、パスワードフィールドクリア

### デフォルト人員データ初期化
ブラウザの人員データが空の場合、以下8名のデフォルトユーザーを自動登録：
- 市村光希 (ichimura / ichimura_piala1234)
- 大谷凪沙 (ohtani / ohtani_piala1234)  
- 牧野風音 (makino / makino_1234)
- 青木海燈 (aoki / aoki_1234)
- 村山太洋 (murayama / murayama_1234)
- 井上舞 (inoue / inoue_1234)
- 長野由愛 (nagano / nagano_1234)
- 上谷朋輝 (kamiya / kamiya_1234)

### セキュリティ機能
- セッション有効性チェック
- ログイン済みユーザーのダッシュボード自動リダイレクト
- 未ログインユーザーのログインページ強制リダイレクト
- パスワード入力値のクリア機能

## ログイン情報

### 人員マスター連動ログイン
人員マスターに登録されている人のみログイン可能

| アカウント | ログインID | パスワード | 備考 |
|----------|----------|----------|------|
| pialabuzz | pialabuzz | pialabuzz1234 | 管理者用（ハードコーディング） |

### 人員管理方法

#### 人員追加
1. 管理者（pialabuzz）でログイン
2. 人員マスターで「追加」ボタンをクリック
3. 以下の情報を入力：
   - 名前（必須）
   - ログインID（必須）
   - パスワード（必須）
   - 部署（任意）
   - メールアドレス（任意）
4. **自動生成ボタン**でログインIDとパスワードを自動作成可能
   - 名前の漢字→ローマ字変換（例：長野→nagano）
   - パスワード形式：ログインID + 123

#### 人員編集・パスワード変更
1. 管理者（pialabuzz）でログイン
2. 人員マスターで該当人員の「編集」ボタンをクリック
3. 人員編集モーダルで情報を変更：
   - 名前、ログインID、パスワード、部署、メールアドレス
   - パスワード自動生成機能も利用可能
4. 「更新」ボタンで保存
5. 更新完了時に新しいログイン情報が表示される

**注意**: 編集・削除機能は管理者（pialabuzz）のみ利用可能

### デフォルト登録人員
以下の人員はシステムにデフォルトで登録されており、どのブラウザでもログイン可能です：

| 名前 | ログインID | パスワード |
|------|-----------|-----------|
| 市村光希 | ichimura | ichimura_piala1234 |
| 大谷凪沙 | ohtani | ohtani_piala1234 |
| 牧野風音 | makino | makino_1234 |
| 青木海燈 | aoki | aoki_1234 |
| 村山太洋 | murayama | murayama_1234 |
| 井上舞 | inoue | inoue_1234 |
| 長野由愛 | nagano | nagano_1234 |
| 上谷朋輝 | kamiya | kamiya_1234 |

## 主要機能

### 1. タスク管理
- **タスクタイプ**: 部署タスク、プロジェクトタスク、個人タスク
- **優先度設定**: 高（赤↑）、中（黄→）、低（青↓）
- **ステータス管理**: 未対応、処理中、処理完了、終了
- **担当者設定**: 全タスクタイプで複数担当者設定可能（チェックボックス形式）
- **期限管理**: 開始日・終了日の設定

### 2. 通知機能
- ダッシュボードのヘッダーにベルマークアイコン
- 自分が担当者のタスクに関する以下の場合に通知
  - **新規タスク作成時**: 他者が自分を担当者に設定してタスク作成
  - **タスク内容変更時**: ステータス、内容、期限、担当者の変更
  - **コメント追加時**: 他者からのコメント追加
- 通知クリックで該当タスク詳細へ遷移
- 変更箇所が2秒間ハイライト表示
- **重要**: 再ログインが必要（sessionStorageにuserName保存のため）

### 3. フィルタリング・ソート機能
- **カテゴリフィルタ**: タスクタイプ別表示
- **担当者フィルタ**: 担当者で絞り込み（複数担当者対応）
- **ステータスフィルタ**: 進捗状況で絞り込み
- **プロジェクトフィルタ**: プロジェクト名で絞り込み
- **並び替え**: 優先度順、開始日順、終了日順、ステータス順

### 4. マスター管理
- **人員マスター**: チームメンバーの管理（ログインユーザーと連動）
  - 管理者（pialabuzz）のみ編集・削除可能
  - 人員編集モーダルでパスワード変更機能
  - ログインID重複チェック機能
- **プロジェクトマスター**: プロジェクトの管理

### 5. タスク詳細機能
- **タスク情報の編集**: タスクタイプ、ステータス、担当者、プロジェクト、内容、期限の編集
- **タスクタイプ変更**: 部署タスク、プロジェクトタスク、個人タスクの変更可能
- **プロジェクト連動**: プロジェクトタスクに変更時、プロジェクト選択が自動表示
- **コメント機能**: 「見ました」ボタンで任意の既読マーク
- **変更履歴の自動記録**: 全ての変更を履歴として保存
- **担当者への通知**: コメント追加時に全担当者へ通知

### 6. タスクID機能
- **ランダム英数字形式**: T-YYYYMMDD-XXXXX形式（5文字のランダム英数字）
- **直接検索**: ダッシュボードの検索窓でタスクIDを直接入力して検索
- **重複防止**: 60,466,176通りの組み合わせで重複可能性が極めて低い
- **既存データ対応**: 既存タスクのIDは変更せず、新規作成時のみランダムID適用

### 7. 未読コメント表示
- **電球アイコン**: 未読コメントがあるタスクの最初の担当者名の右に💡マークを表示
- **表示ルール**: コメントなし→非表示、コメント全て既読→非表示、未読コメントあり→表示
- **アニメーション効果**: 電球アイコンは光るアニメーションで注意を引く
- **担当者バッジ色分け**: 動的な色割り当てで20色から自動選択（色重複を完全に回避）

### 8. 複数担当者機能
- **チェックボックス選択**: タスク作成・編集時に複数担当者を選択可能
- **カラーバッジ表示**: 担当者ごとに異なる色のバッジで表示
- **フィルタリング対応**: 複数担当者のいずれかで絞り込み検索可能
- **通知機能**: 全担当者に通知を送信
- **未読表示仕様**: 電球アイコンは最初の担当者のみに表示
- **アーカイブ機能**: ステータスが「終了」のタスクのみアーカイブ可能

### 9. アーカイブ機能
- **アーカイブ化**: ステータス「終了」のタスクを削除ではなくアーカイブ
- **データ保持**: アーカイブされたタスクはデータとして保持（非表示）
- **専用表示画面**: メインナビゲーションの「アーカイブ」タブで確認可能
- **復元機能**: アーカイブ済みタスクを元の状態に復元可能
- **アーカイブ日時表示**: アーカイブされた日時を記録・表示
- **視覚的区別**: グレーアウト表示でアーカイブ済みタスクを識別
- **誤削除防止**: 完全削除ではなくアーカイブによるデータ保護

## 表示仕様

### タスク一覧（コンパクト表示）
- 1タスクの高さを最小限に抑えた設計
- 横一列レイアウト: [タスクID] [タスク名] [優先度] [ステータス] [期限] [プロジェクト名] [複数担当者バッジ] [詳細/アーカイブ]
- 多数のタスクを一覧で確認可能
- プロジェクトタスクは紫色のバッジでプロジェクト名を表示
- 複数担当者は色分けされたバッジで横並び表示
- 未読コメントがあるタスクの最初の担当者に💡マークを表示

### アーカイブ一覧表示
- アーカイブされたタスクの専用表示画面
- グレーアウト表示でアーカイブ済みを視覚的に区別
- アーカイブ日時の表示
- 復元ボタンでアーカイブ解除可能
- アーカイブタスクが存在しない場合の適切なメッセージ表示

### 優先度表示
- **高**: 赤色の上矢印（↑）
- **中**: 黄色の右矢印（→）
- **低**: 青色の下矢印（↓）

### ステータス表示
- 色分けされたバッジ形式
- 視認性の高いデザイン

## 技術仕様

### フロントエンド
- HTML/CSS/JavaScript（バニラJS）
- LocalStorage でデータ管理
- レスポンシブデザイン対応

### ホスティング
- Firebase Hosting
- デプロイコマンド: `firebase deploy`

### ファイル構成
```
/
├── index.html                          # ログイン画面
├── dashboard.html                      # メイン画面（タスク管理・アーカイブ・マスター管理）
├── task-detail.html                   # タスク詳細画面
├── auth.js                            # 認証処理
├── app.js                             # メインアプリケーション
├── data.js                            # データ管理（LocalStorage + Chatwork通知）
├── task-detail.js                     # タスク詳細処理
├── styles.css                         # スタイルシート
├── firebase.json                      # Firebase設定
├── firebase-config.js                 # Firebase設定ファイル
├── chatwork-webhook-gas.js            # GAS Webhookサーバーコード
├── chatwork-webhook-gas-cors-fixed.js # CORS対応版GASコード
├── data-localStorage-backup.js        # LocalStorageバックアップ版
└── favicon.svg                        # ファビコン
```

## Chatwork通知機能の設定方法（2025年版）

### 🎯 設定完了の流れ
1. **Chatwork準備**: APIトークン・ルームID・アカウントID取得
2. **GAS作成**: Webhookサーバーのコード配置・設定・デプロイ
3. **Buzzlog設定**: Webhook URLの設定、人員マスターにChatworkアカウントID設定
4. **動作確認**: テスト通知の実行

---

### 1. Chatwork APIトークンとルームIDの取得

#### 📝 APIトークンの取得
1. Chatworkにログイン
2. 右上のユーザーアイコン → **「サービス連携」**
3. **「API Token」** タブをクリック
4. **「新しいトークンを作成する」** をクリック
5. 用途：「Buzzlog通知」等の名前で作成
6. 生成されたトークンをコピー（**後で使用**）
   - 現在設定済み: `cc946d7f6eeeb7efd4aad5554aa938cb`

#### 🏠 ルームIDの取得
1. 通知したいChatworkルームを開く
2. URLを確認：`https://www.chatwork.com/rid123456789`
3. 数字部分（例：`123456789`）がルームID（**後で使用**）
   - 現在設定済み: `407398913`

---

### 2. Google Apps Script (GAS) Webhookサーバーの設定

#### ステップ1: 新しいGASプロジェクトを作成
1. https://script.google.com にアクセス
2. **「新しいプロジェクト」** をクリック
3. プロジェクト名を「Buzzlog Chatwork Webhook」等に変更
4. **完全なコードを貼り付け**（下記参照）

#### ステップ2: 完全なGASコード
**⚠️重要**: 以下のコードを `Code.gs` に **全て置き換え** してください
**📌 注**: APIトークンとルームIDは既に設定済みです

```javascript
// Buzzlog Chatwork通知用 Google Apps Script Webhookサーバー
// 2025年版 - 最新のAPIに対応

// 初期設定関数（最初に1回実行）
function setupProperties() {
  const scriptProperties = PropertiesService.getScriptProperties();
  
  // 実際の情報を設定済み
  scriptProperties.setProperties({
    'CHATWORK_API_TOKEN': 'cc946d7f6eeeb7efd4aad5554aa938cb',
    'CHATWORK_ROOM_ID': '407398913'
  });
  
  Logger.log('スクリプトプロパティが設定されました');
}

// メイン関数：Webhookの受信処理
function doPost(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    Logger.log('受信データ:', requestData);
    
    if (requestData.type === 'task_created') {
      sendTaskCreatedNotification(requestData);
    } else if (requestData.type === 'comment_added') {
      sendCommentAddedNotification(requestData);
    } else {
      Logger.log('未対応のデータタイプ:', requestData.type);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('エラーが発生しました:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: 'error', 
        message: error.toString() 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// タスク作成通知の送信
function sendTaskCreatedNotification(data) {
  const message = buildTaskCreatedMessage(data);
  sendChatworkMessage(message);
}

// コメント追加通知の送信
function sendCommentAddedNotification(data) {
  const message = buildCommentAddedMessage(data);
  sendChatworkMessage(message);
}

// タスク作成メッセージの構築
function buildTaskCreatedMessage(data) {
  const priorityMap = {
    'high': '🔴高',
    'medium': '🟡中', 
    'low': '🔵低'
  };
  
  const priority = priorityMap[data.priority] || '🟡中';
  const assignees = Array.isArray(data.assignees) ? data.assignees.join(', ') : (data.assignees || '未設定');
  const endDate = data.endDate || '未設定';
  const taskDetailUrl = `https://buzzlog-6fc74.web.app/task-detail.html?id=${data.id || data.taskId}`;
  
  let message = `[info][title]📋 新しいタスクが作成されました[/title]`;
  message += `🆔 タスクID: ${data.taskId}\n`;
  message += `📝 タスク名: ${data.taskName}\n`;
  message += `⭐ 優先度: ${priority}\n`;
  message += `👤 担当者: ${assignees}\n`;
  message += `📅 期限: ${endDate}\n`;
  message += `👷 作成者: ${data.createdBy}\n`;
  message += `🔗 詳細を見る: ${taskDetailUrl}`;
  message += `[/info]`;
  
  return message;
}

// コメント追加メッセージの構築
function buildCommentAddedMessage(data) {
  const taskDetailUrl = `https://buzzlog-6fc74.web.app/task-detail.html?id=${data.id || data.taskId}`;
  
  let message = `[info][title]💬 タスクにコメントが追加されました[/title]`;
  message += `🆔 タスクID: ${data.taskId}\n`;
  message += `📝 タスク名: ${data.taskName}\n`;
  message += `💭 コメント: ${data.comment}\n`;
  message += `👤 投稿者: ${data.commentedBy}\n`;
  message += `🔗 詳細を見る: ${taskDetailUrl}`;
  message += `[/info]`;
  
  return message;
}

// Chatworkメッセージの送信
function sendChatworkMessage(message) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const apiToken = scriptProperties.getProperty('CHATWORK_API_TOKEN');
  const roomId = scriptProperties.getProperty('CHATWORK_ROOM_ID');
  
  if (!apiToken || !roomId) {
    throw new Error('Chatwork APIトークンまたはルームIDが設定されていません');
  }
  
  const url = `https://api.chatwork.com/v2/rooms/${roomId}/messages`;
  
  const payload = {
    'body': message
  };
  
  const options = {
    'method': 'POST',
    'headers': {
      'X-ChatWorkToken': apiToken,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    'payload': Object.keys(payload).map(key => key + '=' + encodeURIComponent(payload[key])).join('&')
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      Logger.log('Chatworkメッセージ送信成功');
      return JSON.parse(response.getContentText());
    } else {
      Logger.log('Chatworkメッセージ送信失敗:', responseCode, response.getContentText());
      throw new Error(`Chatwork API エラー: ${responseCode}`);
    }
  } catch (error) {
    Logger.log('Chatworkメッセージ送信中にエラー:', error);
    throw error;
  }
}

// 設定確認用関数
function checkConfiguration() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const apiToken = scriptProperties.getProperty('CHATWORK_API_TOKEN');
  const roomId = scriptProperties.getProperty('CHATWORK_ROOM_ID');
  
  Logger.log('=== 設定確認 ===');
  Logger.log('APIトークン:', apiToken ? '設定済み' : '未設定');
  Logger.log('ルームID:', roomId ? roomId : '未設定');
  
  if (!apiToken || !roomId) {
    Logger.log('⚠️ setupProperties()関数を実行して初期設定を行ってください');
  } else {
    Logger.log('✅ 設定完了済み');
  }
}

// テスト用関数：タスク作成通知のテスト
function testTaskCreatedNotification() {
  const testData = {
    type: 'task_created',
    taskId: 'T-20250112-TEST1',
    taskName: 'テストタスク',
    assignees: ['山田太郎', '佐藤花子'],
    priority: 'high',
    endDate: '2025-01-15',
    createdBy: 'テストユーザー'
  };
  
  sendTaskCreatedNotification(testData);
  Logger.log('タスク作成通知テスト完了');
}

// テスト用関数：コメント追加通知のテスト
function testCommentAddedNotification() {
  const testData = {
    type: 'comment_added',
    taskId: 'T-20250112-TEST1',
    taskName: 'テストタスク',
    comment: 'これはテストコメントです。',
    commentedBy: 'テストユーザー'
  };
  
  sendCommentAddedNotification(testData);
  Logger.log('コメント追加通知テスト完了');
}
```

#### ステップ3: APIトークンとルームIDの設定
1. コード内の `setupProperties()` 関数は既に設定済み
2. 上部メニューから **「実行」** → **setupProperties** を選択して実行
3. 初回実行時は権限承認が必要です

#### ステップ4: 設定確認とテスト
1. **checkConfiguration** 関数を実行して設定を確認
2. **testTaskCreatedNotification** 関数でテスト通知を実行
3. Chatworkにテストメッセージが届くことを確認

#### ステップ5: Webアプリとしてデプロイ
1. **「デプロイ」** → **「新しいデプロイ」** をクリック
2. **種類**: 「ウェブアプリ」を選択
3. **アクセスできるユーザー**: 「全員」を選択
4. **デプロイ** をクリック
5. 生成された **「ウェブアプリURL」** をコピー（**Buzzlog設定で使用**）

---

### 3. Buzzlog側の設定

#### ブラウザ設定（一度のみ実行）
1. Buzzlogにログインしてダッシュボードを開く
2. ブラウザの開発者ツール（F12キー）を開く
3. **「Console」** タブをクリック
4. 以下のコマンドを実行（GAS WebアプリURLを使用）：

```javascript
// Chatwork通知を有効化
localStorage.setItem('chatworkEnabled', 'true');
localStorage.setItem('chatworkWebhookUrl', 'YOUR_GAS_WEBAPP_URL_HERE');

// 設定確認
console.log('Chatwork有効:', localStorage.getItem('chatworkEnabled'));
console.log('Webhook URL:', localStorage.getItem('chatworkWebhookUrl'));
```

#### 設定の確認
```javascript
// 現在の設定を確認
console.log('Chatwork通知設定:', {
  enabled: localStorage.getItem('chatworkEnabled'),
  webhookUrl: localStorage.getItem('chatworkWebhookUrl')
});
```

#### 通知の無効化
```javascript
// 通知を無効にする場合
localStorage.setItem('chatworkEnabled', 'false');
```

---

### 4. ChatworkアカウントIDの設定

#### 📋 アカウントIDの取得方法

##### 方法1: プロフィールページから取得
1. Chatworkにログイン
2. 右上のユーザーアイコンをクリック
3. 「プロフィール」を選択
4. URLの末尾の数字がアカウントID
   - 例: `https://www.chatwork.com/#!profile/123456789` → `123456789`

##### 方法2: メッセージから取得
1. Chatworkの任意のルームを開く
2. 自分の名前をクリック
3. 表示される`[To:数字]`の数字部分がアカウントID

#### ⚙️ Buzzlogでの設定方法
1. 管理者（pialabuzz）でBuzzlogにログイン
2. 人員マスターで該当ユーザーの「編集」をクリック
3. 「ChatworkアカウントID」欄に取得したIDを入力
4. 「更新」をクリック

設定後、該当ユーザーが担当者のタスクに対してTo通知が送信されます。

---

### 5. 動作確認とトラブルシューティング

#### ✅ 動作テスト手順
1. **タスク作成テスト**: 
   - Buzzlogで新しいタスクを作成
   - Chatworkに通知が届くことを確認
2. **コメント追加テスト**: 
   - 既存タスクにコメントを追加
   - Chatworkに通知が届くことを確認

#### 🔧 トラブルシューティング

**通知が届かない場合:**
1. **GAS設定確認**: `checkConfiguration()` 関数を実行
2. **ログ確認**: GASの「実行数」でエラーログをチェック
3. **URL確認**: Buzzlog側のWebhook URLが正しいか確認
4. **権限確認**: GASが「全員」でアクセス可能に設定されているか確認

**エラーが発生する場合:**
1. **APIトークン確認**: Chatwork APIトークンが有効か確認
2. **ルームID確認**: ルームIDが正しい数字のみか確認
3. **ネットワーク確認**: Chatwork APIへの接続が可能か確認

### 📋 通知メッセージ例

#### タスク作成通知
```
📋 新しいタスクが作成されました
🆔 タスクID: T-20250112-ABC12
📝 タスク名: 新規プロジェクトの企画書作成
⭐ 優先度: 🔴高
👤 担当者: 山田太郎, 佐藤花子
📅 期限: 2025-01-15
👷 作成者: 鈴木一郎
🔗 詳細を見る: https://buzzlog-6fc74.web.app/task-detail.html?id=T-20250112-ABC12
```

#### コメント追加通知
```
💬 タスクにコメントが追加されました
🆔 タスクID: T-20250112-ABC12
📝 タスク名: 新規プロジェクトの企画書作成
💭 コメント: 資料の追加をお願いします。
👤 投稿者: 田中次郎
🔗 詳細を見る: https://buzzlog-6fc74.web.app/task-detail.html?id=T-20250112-ABC12
```

## 開発時の注意事項

### コード規約
- コメントは必要最小限に
- 既存のコードスタイルに従う
- セキュリティに配慮（秘密情報の扱い）

### デプロイ
- 機能実装・修正完了後は必ず `firebase deploy` を実行
- デプロイ完了を確認してから作業終了

### テスト
- ブラウザキャッシュのクリア（Ctrl+F5）を推奨
- 複数ユーザーでの動作確認

## 更新履歴

### 最新の更新
1. マルチユーザー対応（人員マスター連動ログイン）
2. 通知機能の実装
3. 優先度機能の追加
4. タスク一覧のコンパクト表示化
5. フィルタリング機能の改善
6. タスクID機能の追加（T-YYYYMMDD-001形式）
7. タスクID直接検索機能の実装
8. コメント「見ました」機能の追加（任意の既読チェック）
9. 未読コメントの電球アイコン表示機能
10. 担当者バッジの色分け機能（動的色割り当てで重複完全回避）
11. プロジェクト名フィルタリング機能の追加
12. ステータス「終了」タスクの削除機能
13. Buzzlogブランドリニューアル（ロゴ・デザイン更新）
14. **複数担当者機能の実装**
    - チェックボックス形式での複数選択
    - 複数担当者のカラーバッジ表示
    - フィルタリング・通知システムの複数対応
    - 電球アイコンは最初の担当者のみ表示（要望通り）
    - 既存データの自動移行処理
15. **プロジェクト名表示機能の追加**
    - タスク一覧でプロジェクトタスクにプロジェクト名バッジを表示
    - 紫色のバッジで視認性向上
16. **電球マーク表示ルールの改善**
    - コメントが存在しない場合は電球マーク非表示
    - 全てのコメントが既読の場合は電球マーク非表示
    - 未読コメントがある場合のみ電球マーク表示
17. **タスクID重複問題の解決**
    - ランダム英数字（5文字）での新規ID生成に変更
    - 既存タスクIDは保持、新規作成時のみランダムID適用
    - 60,466,176通りの組み合わせで重複リスクを大幅軽減
18. **タスク詳細画面でのタスクタイプ編集機能**
    - タスクタイプ（部署タスク/プロジェクトタスク/個人タスク）を編集可能
    - プロジェクトタスクに変更時、プロジェクト選択が自動表示
    - タスクタイプ変更時の適切な表示制御を実装
19. **タスク詳細画面での優先度編集機能**
    - 編集モードで優先度（高/中/低）を変更可能
    - 通常時は色付きバッジで表示、編集時はドロップダウン選択
    - 保存時に優先度更新と履歴記録
20. **人員マスター管理の改善**
    - 初期人員データを空配列に変更（完全ブラウザ管理）
    - 管理者（pialabuzz）のみハードコーディング維持
    - 人員追加時にログインIDとパスワードを個別設定可能
    - パスワード自動生成機能（名前→ローマ字変換 + 123）
    - 人員一覧にログインID表示
    - メールアドレス入力フィールドを追加
21. **タスク作成時通知機能の実装**
    - 他のユーザーが自分を担当者に設定してタスク作成時に通知
    - 新規タスク割り当て通知（作成者、優先度、期限表示）
    - 作成者自身には通知されない仕様
22. **通知機能の修正・改善**
    - ログインIDと実際の名前の不一致による通知バグを修正
    - sessionStorageにuserIdとuserNameの両方を保存
    - 通知フィルタリングでuserIdとuserNameの両方で判定
    - 管理者アカウント（pialabuzz）からの通知も正常動作
23. **ログイン画面のパスワード表示機能**
    - パスワード入力フィールドに表示/非表示切り替えボタンを追加
    - 目のアイコン（👁️/🙈）でパスワードの可視性を制御
    - ユーザビリティ向上とパスワード入力ミス防止
24. **pialabuzz専用人員管理機能**
    - 管理者（pialabuzz）のみ人員情報を編集可能
    - 人員編集モーダルでパスワード変更機能を実装
    - ログインID重複チェックとパスワード自動生成機能
    - 権限制御による編集・削除ボタンの表示制御
25. **Chatwork通知機能**
    - タスク作成時とコメント追加時にChatworkへ自動通知
    - Google Apps Script (GAS) Webhookサーバー経由で送信
    - LocalStorageベースの設定管理（有効/無効、WebhookURL）
    - タスク情報の詳細通知（担当者、優先度、期限等）
26. **アーカイブ機能の実装**
    - ステータス「終了」タスクの削除ボタンを「アーカイブ」に変更
    - タスクの完全削除ではなく、archived フラグでアーカイブ管理
    - アーカイブされたタスクは一覧から非表示（データは保持）
    - アーカイブ解除機能も実装済み
    - 誤削除防止とデータ保護を実現
27. **アーカイブ表示画面の実装**
    - メインナビゲーションに「アーカイブ」タブを追加
    - アーカイブされたタスクの専用表示画面を実装
    - アーカイブ日時の表示機能
    - 復元ボタンでタスクをアーカイブ解除
    - グレーアウト表示でアーカイブ済みタスクを視覚的に区別
    - アーカイブタスクがない場合の適切なメッセージ表示
28. **Firestore undefined値エラーの完全解決**
    - タスク保存時の「Unsupported field value: undefined」エラーを修正
    - 履歴データ作成時のoldValue/newValueのundefined値を空文字に変換
    - 深い再帰的データサニタイズ機能を実装（配列・オブジェクト内部も対応）
    - Firestore互換性の完全確保とデータ整合性の向上
    - エラーハンドリング強化と詳細デバッグ情報追加

## 現在の実装状況（2025年8月15日時点）

### ✅ 完全実装済み機能
1. **認証システム**: 人員マスター連動ログイン、複数認証方式対応
2. **タスク管理**: 作成・編集・削除（アーカイブ）・検索・フィルタリング・ソート
3. **複数担当者機能**: チェックボックス選択、カラーバッジ表示、フィルタリング対応
4. **通知システム**: タスク作成・更新・コメント追加時の自動通知（ブラウザ内）
5. **Chatwork連携**: GASサーバー経由でのChatwork通知（設定済み）
6. **アーカイブ機能**: 削除ではなくアーカイブ、専用表示画面、復元機能
7. **マスター管理**: 人員・プロジェクトマスターの完全管理
8. **UI/UX**: レスポンシブデザイン、コンパクト表示、視覚的区別

### 📱 ダッシュボード構成
- **ヘッダー**: Buzzlogロゴ、通知ベル、ログアウト
- **メインナビ**: タスク管理、アーカイブ、マスター管理
- **フィルタリング**: タスクタイプ、担当者、ステータス、プロジェクト別
- **ソート機能**: 優先度、開始日、終了日、ステータス順
- **検索機能**: タスクID直接検索対応
- **タスク一覧**: コンパクト表示、カラーバッジ、未読マーク

### 🔧 技術スタック
- **フロントエンド**: HTML/CSS/JavaScript（バニラ）
- **データ管理**: LocalStorage（メイン）+ Firebase Firestore（バックアップ）
- **ホスティング**: Firebase Hosting
- **外部連携**: Chatwork API（GAS Webhook経由）
- **認証**: セッションベース認証（sessionStorage）

## トラブルシューティング

### 機能が表示されない場合
1. ブラウザキャッシュをクリア（Ctrl+Shift+R）
2. シークレットモードで確認
3. Firebase デプロイの反映待ち（数分かかる場合あり）

### ログインできない場合
1. 人員マスターに登録されているか確認
2. ログインIDとパスワードが正しいか確認
3. 大文字小文字の入力ミスを確認

### 通知が来ない場合
1. **再ログインを実行**（最重要）
   - 一度ログアウトして再度ログイン
   - sessionStorageにuserName保存のため
2. ブラウザキャッシュをクリア
3. 担当者に正しく設定されているか確認
4. 作成者と受信者が異なるユーザーか確認