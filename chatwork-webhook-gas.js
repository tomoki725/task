// Buzzlog Chatwork通知用 Google Apps Script Webhookサーバー
// 2025年版 - 最新のAPIに対応

// 初期設定関数（最初に1回実行）
function setupProperties() {
  const scriptProperties = PropertiesService.getScriptProperties();
  
  // 実際の情報を設定
  scriptProperties.setProperties({
    'CHATWORK_API_TOKEN': 'cc946d7f6eeeb7efd4aad5554aa938cb',
    'CHATWORK_ROOM_ID': '407398913'
  });
  
  Logger.log('スクリプトプロパティが設定されました');
}

// メイン関数：Webhookの受信処理
function doPost(e) {
  try {
    // リクエストデータのパース
    const requestData = JSON.parse(e.postData.contents);
    Logger.log('受信データ:', requestData);
    
    // データタイプに応じた処理
    if (requestData.type === 'task_created') {
      sendTaskCreatedNotification(requestData);
    } else if (requestData.type === 'comment_added') {
      sendCommentAddedNotification(requestData);
    } else {
      Logger.log('未対応のデータタイプ:', requestData.type);
    }
    
    // 成功レスポンス
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('エラーが発生しました:', error);
    
    // エラーレスポンス
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
  
  // To通知タグを追加
  let toTags = '';
  if (data.assigneeChatworkIds && data.assigneeChatworkIds.length > 0) {
    toTags = data.assigneeChatworkIds.map(id => `[To:${id}]`).join(' ') + '\n';
  }
  
  let message = toTags;
  message += `[info][title]📋 新しいタスクが作成されました[/title]`;
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
  
  // To通知タグを追加
  let toTags = '';
  if (data.assigneeChatworkIds && data.assigneeChatworkIds.length > 0) {
    toTags = data.assigneeChatworkIds.map(id => `[To:${id}]`).join(' ') + '\n';
  }
  
  let message = toTags;
  message += `[info][title]💬 タスクにコメントが追加されました[/title]`;
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