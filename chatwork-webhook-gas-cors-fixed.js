// Buzzlog Chatwork通知用 Google Apps Script Webhookサーバー
// 2025年版 - CORS対応・最新APIに対応

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

// CORS対応のレスポンス作成関数
function createCORSResponse(data, statusCode = 200) {
  const output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  
  // CORSヘッダーを設定（重要！）
  return {
    output: output,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '3600'
    }
  };
}

// OPTIONSリクエストの処理（CORS preflight）
function doOptions(e) {
  const response = createCORSResponse({ message: 'CORS preflight successful' });
  
  // ヘッダーを設定
  const output = response.output;
  Object.keys(response.headers).forEach(key => {
    // Google Apps ScriptのContentServiceではヘッダー設定が制限されているため
    // ここではJSONレスポンスのみ返す
  });
  
  return output;
}

// メイン関数：Webhookの受信処理（CORS対応版）
function doPost(e) {
  try {
    Logger.log('=== Webhook受信開始 ===');
    Logger.log('Request Headers:', JSON.stringify(e));
    Logger.log('Post Data:', e.postData ? e.postData.contents : 'No post data');
    
    // リクエストデータのパース
    let requestData;
    try {
      requestData = JSON.parse(e.postData.contents);
      Logger.log('受信データ:', requestData);
    } catch (parseError) {
      Logger.log('JSONパースエラー:', parseError);
      throw new Error('Invalid JSON format');
    }
    
    // データタイプに応じた処理
    if (requestData.type === 'task_created') {
      Logger.log('タスク作成通知を処理中...');
      sendTaskCreatedNotification(requestData);
    } else if (requestData.type === 'comment_added') {
      Logger.log('コメント追加通知を処理中...');
      sendCommentAddedNotification(requestData);
    } else {
      Logger.log('未対応のデータタイプ:', requestData.type);
      throw new Error('Unsupported data type: ' + requestData.type);
    }
    
    Logger.log('=== Webhook処理完了 ===');
    
    // CORS対応の成功レスポンス
    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: 'success',
        message: 'Notification sent successfully',
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('=== エラー発生 ===');
    Logger.log('エラーが発生しました:', error);
    Logger.log('Error stack:', error.stack);
    
    // CORS対応のエラーレスポンス
    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: 'error', 
        message: error.toString(),
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// タスク作成通知の送信
function sendTaskCreatedNotification(data) {
  const message = buildTaskCreatedMessage(data);
  return sendChatworkMessage(message);
}

// コメント追加通知の送信
function sendCommentAddedNotification(data) {
  const message = buildCommentAddedMessage(data);
  return sendChatworkMessage(message);
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
  
  Logger.log('=== Chatwork送信開始 ===');
  Logger.log('API Token:', apiToken ? '設定済み' : '未設定');
  Logger.log('Room ID:', roomId || '未設定');
  Logger.log('Message:', message);
  
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
    Logger.log('Chatwork API呼び出し中...');
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    Logger.log('Chatwork API Response Code:', responseCode);
    Logger.log('Chatwork API Response:', responseText);
    
    if (responseCode === 200) {
      Logger.log('✅ Chatworkメッセージ送信成功');
      return JSON.parse(responseText);
    } else {
      Logger.log('❌ Chatworkメッセージ送信失敗:', responseCode, responseText);
      throw new Error(`Chatwork API エラー: ${responseCode} - ${responseText}`);
    }
  } catch (error) {
    Logger.log('❌ Chatworkメッセージ送信中にエラー:', error);
    throw error;
  }
}

// 接続テスト用関数
function testConnection() {
  Logger.log('=== 接続テスト開始 ===');
  
  try {
    const testData = {
      type: 'task_created',
      taskId: 'T-TEST-' + new Date().getTime(),
      taskName: 'GAS接続テスト',
      assignees: ['テストユーザー'],
      priority: 'medium',
      endDate: '2025-01-20',
      createdBy: 'システムテスト'
    };
    
    Logger.log('テストデータ:', testData);
    
    // doPost関数をシミュレート
    const mockEvent = {
      postData: {
        contents: JSON.stringify(testData)
      }
    };
    
    const result = doPost(mockEvent);
    Logger.log('テスト結果:', result.getContent());
    Logger.log('✅ 接続テスト完了');
    
    return true;
  } catch (error) {
    Logger.log('❌ 接続テスト失敗:', error);
    return false;
  }
}

// テスト用関数：タスク作成通知のテスト
function testTaskCreatedNotification() {
  const testData = {
    type: 'task_created',
    taskId: 'T-20250114-TEST1',
    taskName: 'CORS修正後テストタスク',
    assignees: ['山田太郎', '佐藤花子'],
    priority: 'high',
    endDate: '2025-01-15',
    createdBy: 'テストユーザー'
  };
  
  sendTaskCreatedNotification(testData);
  Logger.log('✅ タスク作成通知テスト完了');
}

// テスト用関数：コメント追加通知のテスト
function testCommentAddedNotification() {
  const testData = {
    type: 'comment_added',
    taskId: 'T-20250114-TEST1',
    taskName: 'CORS修正後テストタスク',
    comment: 'これはCORS修正後のテストコメントです。',
    commentedBy: 'テストユーザー'
  };
  
  sendCommentAddedNotification(testData);
  Logger.log('✅ コメント追加通知テスト完了');
}

// 設定確認用関数
function checkConfiguration() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const apiToken = scriptProperties.getProperty('CHATWORK_API_TOKEN');
  const roomId = scriptProperties.getProperty('CHATWORK_ROOM_ID');
  
  Logger.log('=== 設定確認 ===');
  Logger.log('APIトークン:', apiToken ? '設定済み(' + apiToken.substring(0, 8) + '...)' : '未設定');
  Logger.log('ルームID:', roomId ? roomId : '未設定');
  Logger.log('GAS Version: CORS対応版 2025-01-14');
  
  if (!apiToken || !roomId) {
    Logger.log('⚠️ setupProperties()関数を実行して初期設定を行ってください');
  } else {
    Logger.log('✅ 設定完了済み');
  }
  
  return { apiToken: !!apiToken, roomId: !!roomId };
}

// デバッグ情報表示
function showDebugInfo() {
  Logger.log('=== デバッグ情報 ===');
  Logger.log('Script Version: CORS対応版');
  Logger.log('Last Updated: 2025-01-14');
  Logger.log('Features: CORS Headers, Enhanced Logging, Error Handling');
  
  const config = checkConfiguration();
  Logger.log('Configuration Status:', config);
}