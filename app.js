// メインアプリケーション
let isAppInitialized = false;

document.addEventListener('DOMContentLoaded', function() {
    checkSession();
    initializeApp();
});

async function initializeApp() {
    try {
        // DataManagerの初期化完了を待機
        await dataManager.waitForInitialization();
        
        console.log('✅ DataManager初期化完了、UIを読み込み中...');
        
        // ユーザー名表示
        document.getElementById('userName').textContent = sessionStorage.getItem('userId');
        
        // 初期表示
        await loadTasks();
        loadMasterData();
        await loadNotifications();
        
        // フォームイベント設定
        document.getElementById('taskForm').addEventListener('submit', handleTaskSubmit);
        document.getElementById('personForm').addEventListener('submit', handlePersonSubmit);
        document.getElementById('personEditForm').addEventListener('submit', handlePersonEditSubmit);
        document.getElementById('projectForm').addEventListener('submit', handleProjectSubmit);
        
        // 定期的に通知をチェック（30秒ごと）
        setInterval(async () => await loadNotifications(), 30000);
        
        // 古い通知を定期的にクリア（起動時に実行）
        if (dataManager.useFirestore) {
            dataManager.clearOldNotifications();
        }
        
        // Chatwork設定状況を確認・表示
        checkChatworkSettings();
        
        // 初期化完了フラグを設定
        isAppInitialized = true;
        
        console.log('✅ アプリケーション初期化完了');
        console.log('🔧 デバッグ機能が利用可能です: debugBuzzlog');
        
    } catch (error) {
        console.error('❌ アプリケーション初期化エラー:', error);
        
        // API有効化エラーの場合は特別処理
        if (error.message.includes('Firestore API未有効化')) {
            console.error('');
            console.error('🔥 Firestore API有効化が必要です！');
            console.error('🔧 診断: await debugBuzzlog.diagnoseFirestoreAPI()');
            console.error('📚 ガイド: debugBuzzlog.showFirestoreSetupGuide()');
            console.error('');
            
            // アラート表示（API有効化専用）
            alert('🔥 Firestore APIの有効化が必要です\n\n' +
                  'コンソールで以下のコマンドを実行してください：\n' +
                  'debugBuzzlog.showFirestoreSetupGuide()\n\n' +
                  '現在はLocalStorageモードで動作しています。');
            return; // 他の処理は継続させる
        }
        
        // エラーの種類に応じたメッセージ表示
        let errorMessage = 'アプリケーション初期化中にエラーが発生しました。';
        if (error.message.includes('権限')) {
            errorMessage += '\n\nFirestoreのセキュリティルールを確認してください。';
        } else if (error.message.includes('接続')) {
            errorMessage += '\n\nインターネット接続を確認してください。';
        }
        errorMessage += '\n\nページを再読み込みしてください。';
        
        alert(errorMessage);
        
        // デバッグ情報をコンソールに出力
        console.error('🔍 デバッグ情報:');
        console.error('- Firebase利用可能:', typeof firebase !== 'undefined');
        console.error('- Firestore利用可能:', typeof firebase !== 'undefined' && firebase.firestore);
        console.error('- DataManager Firestore:', dataManager.useFirestore);
        console.error('- エラーメッセージ:', error.message);
        console.error('');
        console.error('🔧 診断コマンド: await debugBuzzlog.diagnoseFirestoreAPI()');
    }
}

// Chatwork設定確認関数
function checkChatworkSettings() {
    const enabled = localStorage.getItem('chatworkEnabled');
    const webhookUrl = localStorage.getItem('chatworkWebhookUrl');
    
    console.log('=== Chatwork通知設定状況 ===');
    console.log('有効状態:', enabled === 'true' ? '✅ 有効' : '❌ 無効');
    console.log('Webhook URL:', webhookUrl || '未設定');
    
    if (enabled !== 'true' || !webhookUrl) {
        console.log('🔧 Chatwork通知を有効にするには:');
        console.log('enableChatworkNotification("YOUR_GAS_WEBAPP_URL");');
        console.log('');
        console.log('🧪 設定後のテスト方法:');
        console.log('testChatworkNotification();');
    } else {
        console.log('✅ Chatwork通知設定完了');
        console.log('');
        console.log('🧪 テスト通知を送信:');
        console.log('testChatworkNotification();');
    }
    
    return {
        enabled: enabled === 'true',
        webhookUrl: webhookUrl,
        configured: enabled === 'true' && !!webhookUrl
    };
}

// Chatwork通知を有効にする便利関数（コンソールから実行可能）
function enableChatworkNotification(webhookUrl) {
    if (!webhookUrl || !webhookUrl.startsWith('https://')) {
        console.error('❌ 有効なWebhook URLを指定してください');
        return false;
    }
    
    localStorage.setItem('chatworkEnabled', 'true');
    localStorage.setItem('chatworkWebhookUrl', webhookUrl);
    
    console.log('✅ Chatwork通知を有効にしました');
    console.log('設定内容:', {
        enabled: localStorage.getItem('chatworkEnabled'),
        webhookUrl: localStorage.getItem('chatworkWebhookUrl')
    });
    
    return true;
}

// Chatwork通知を無効にする関数
function disableChatworkNotification() {
    localStorage.setItem('chatworkEnabled', 'false');
    console.log('❌ Chatwork通知を無効にしました');
}

// Chatworkテスト通知送信関数
function testChatworkNotification() {
    console.log('🧪 Chatworkテスト通知を送信します...');
    
    const currentUserName = sessionStorage.getItem('userName') || sessionStorage.getItem('userId') || 'テストユーザー';
    
    dataManager.sendChatworkNotification('task_created', {
        id: 'test-' + Date.now(),
        taskId: 'T-TEST-' + Date.now().toString().slice(-5),
        taskName: 'テスト通知タスク',
        assignees: ['テスト担当者'],
        assigneeChatworkIds: [],
        priority: 'high',
        endDate: new Date().toISOString().split('T')[0],
        createdBy: currentUserName
    });
    
    console.log('📤 テスト通知を送信しました。Chatworkを確認してください。');
}

// デバッグ・手動制御関数
window.debugBuzzlog = {
    // Firestore接続テスト
    async testFirestore() {
        console.log('🔥 Firestore接続テスト開始...');
        try {
            await dataManager.testFirestoreConnection();
            console.log('✅ Firestore接続成功');
            
            // アクセス権限もテスト
            await dataManager.checkFirestoreAccess();
            console.log('✅ Firestoreアクセス権限確認完了');
        } catch (error) {
            console.error('❌ Firestore接続失敗:', error);
        }
    },
    
    // データ移行状況確認
    checkMigrationStatus() {
        console.log('📊 データ移行状況:');
        console.log('- Firestore使用:', dataManager.useFirestore);
        console.log('- 初期化完了:', dataManager.isInitialized);
        console.log('- 移行完了:', dataManager.migrationComplete);
        console.log('- 移行フラグ:', localStorage.getItem('firestore_migrated'));
    },
    
    // 手動データ移行実行
    async forceMigration() {
        console.log('🔄 手動データ移行を開始...');
        try {
            // 移行フラグをリセット
            localStorage.removeItem('firestore_migrated');
            console.log('移行フラグをリセットしました');
            
            await dataManager.migrateFromLocalStorageImproved();
            console.log('✅ データ移行完了');
        } catch (error) {
            console.error('❌ データ移行エラー:', error);
        }
    },
    
    // LocalStorage→Firestoreデータ比較
    async compareData() {
        console.log('📋 データ比較開始...');
        try {
            const localTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
            const localPersons = JSON.parse(localStorage.getItem('persons') || '[]');
            const localProjects = JSON.parse(localStorage.getItem('projects') || '[]');
            
            const firestoreTasks = await dataManager.getAllTasks();
            const firestorePersons = await dataManager.getPersons();
            const firestoreProjects = await dataManager.getProjects();
            
            console.log('📊 データ比較結果:');
            console.log('- LocalStorage タスク数:', localTasks.length, '/ Firestore:', firestoreTasks.length);
            console.log('- LocalStorage 人員数:', localPersons.length, '/ Firestore:', firestorePersons.length);
            console.log('- LocalStorage プロジェクト数:', localProjects.length, '/ Firestore:', firestoreProjects.length);
            
            if (localTasks.length !== firestoreTasks.length) {
                console.warn('⚠️ タスク数が一致しません');
            }
            if (localPersons.length !== firestorePersons.length) {
                console.warn('⚠️ 人員数が一致しません');
            }
            if (localProjects.length !== firestoreProjects.length) {
                console.warn('⚠️ プロジェクト数が一致しません');
            }
        } catch (error) {
            console.error('❌ データ比較エラー:', error);
        }
    },
    
    // Firestore使用モード切り替え
    async toggleFirestoreMode(enable = null) {
        const newMode = enable !== null ? enable : !dataManager.useFirestore;
        console.log(`🔄 Firestoreモードを${newMode ? '有効' : '無効'}に切り替え中...`);
        
        try {
            if (newMode && typeof firebase !== 'undefined' && firebase.firestore) {
                dataManager.useFirestore = true;
                dataManager.db = firebase.firestore();
                await dataManager.testFirestoreConnection();
                console.log('✅ Firestoreモード有効化完了');
            } else {
                dataManager.useFirestore = false;
                console.log('✅ LocalStorageモード有効化完了');
            }
            
            // UI再読み込み
            await loadTasks();
            loadMasterData();
            
        } catch (error) {
            console.error('❌ モード切り替えエラー:', error);
        }
    },
    
    // 移行フラグリセット
    resetMigrationFlag() {
        localStorage.removeItem('firestore_migrated');
        console.log('✅ 移行フラグをリセットしました。リロードすると再移行が実行されます。');
    },
    
    // Firestore セキュリティルール確認
    async checkFirestoreRules() {
        console.log('🔐 Firestoreセキュリティルール確認中...');
        try {
            const testData = { test: true, timestamp: new Date().toISOString() };
            
            // 書き込みテスト
            const docRef = await dataManager.db.collection('_test').add(testData);
            console.log('✅ 書き込み権限: OK');
            
            // 読み込みテスト
            const doc = await docRef.get();
            console.log('✅ 読み込み権限: OK');
            
            // クリーンアップ
            await docRef.delete();
            console.log('✅ 削除権限: OK');
            
            console.log('🎉 すべての権限が正常に設定されています');
        } catch (error) {
            console.error('❌ セキュリティルールエラー:', error);
            if (error.code === 'permission-denied') {
                console.error('⚠️ Firestoreセキュリティルールが制限的すぎます');
                console.error('以下のコマンドを実行してルールをデプロイしてください:');
                console.error('firebase deploy --only firestore:rules');
            }
        }
    },
    
    // SDK更新後の包括的接続テスト
    async fullConnectionTest() {
        console.log('🚀 Firebase SDK更新後の包括的接続テスト開始...');
        const results = {
            firebase: false,
            firestore: false,
            connection: false,
            permissions: false,
            realtime: false
        };
        
        try {
            // 1. Firebase SDKの確認
            console.log('1️⃣ Firebase SDK確認中...');
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                results.firebase = true;
                console.log('✅ Firebase SDK (v10.14.0) 正常に読み込まれています');
            } else {
                console.error('❌ Firebase SDKが読み込まれていません');
                return results;
            }
            
            // 2. Firestore初期化確認
            console.log('2️⃣ Firestore初期化確認中...');
            if (dataManager.db && dataManager.useFirestore) {
                results.firestore = true;
                console.log('✅ Firestore正常に初期化されています');
            } else {
                console.error('❌ Firestoreが初期化されていません');
                return results;
            }
            
            // 3. 基本接続テスト
            console.log('3️⃣ Firestore基本接続テスト中...');
            await dataManager.db.enableNetwork();
            const testDoc = await dataManager.db.collection('_connection_test').doc('test').get();
            results.connection = true;
            console.log('✅ Firestore基本接続成功');
            
            // 4. 権限テスト
            console.log('4️⃣ 読み書き権限テスト中...');
            const testData = { 
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                test: true,
                sdk_version: '10.14.0'
            };
            
            const docRef = await dataManager.db.collection('_permission_test').add(testData);
            const doc = await docRef.get();
            if (doc.exists) {
                results.permissions = true;
                console.log('✅ 読み書き権限正常');
                await docRef.delete(); // クリーンアップ
            }
            
            // 5. リアルタイムリスナーテスト
            console.log('5️⃣ リアルタイムリスナーテスト中...');
            return new Promise((resolve) => {
                const unsubscribe = dataManager.db.collection('_realtime_test')
                    .onSnapshot(
                        (snapshot) => {
                            results.realtime = true;
                            console.log('✅ リアルタイムリスナー正常動作');
                            unsubscribe();
                            
                            console.log('🎉 包括的接続テスト完了！結果:');
                            Object.entries(results).forEach(([key, value]) => {
                                console.log(`  - ${key}: ${value ? '✅' : '❌'}`);
                            });
                            
                            if (Object.values(results).every(r => r === true)) {
                                console.log('🔥 すべてのテストが合格しました！Firestore同期が正常に動作するはずです。');
                            } else {
                                console.error('⚠️ 一部のテストが失敗しました。上記の結果を確認してください。');
                            }
                            
                            resolve(results);
                        },
                        (error) => {
                            console.error('❌ リアルタイムリスナーエラー:', error);
                            unsubscribe();
                            resolve(results);
                        }
                    );
                
                // 5秒後にタイムアウト
                setTimeout(() => {
                    console.warn('⚠️ リアルタイムテストがタイムアウトしました');
                    unsubscribe();
                    resolve(results);
                }, 5000);
            });
            
        } catch (error) {
            console.error('❌ 包括的接続テスト中にエラー:', error);
            console.error('エラー詳細:', error.code, error.message);
            
            if (error.code === 'unavailable') {
                console.error('🌐 ネットワーク接続を確認してください');
            } else if (error.code === 'permission-denied') {
                console.error('🔐 Firestoreセキュリティルールを確認してください');
            }
            
            return results;
        }
    },
    
    // Firestore API有効化診断・手順提供
    async diagnoseFirestoreAPI() {
        console.log('🔍 Firestore API診断開始...');
        
        try {
            // 基本的な接続テスト
            console.log('1️⃣ Firebase SDK確認中...');
            if (typeof firebase === 'undefined') {
                console.error('❌ Firebase SDKが読み込まれていません');
                return;
            }
            
            console.log('2️⃣ Firestore初期化確認中...');
            if (!dataManager.db) {
                console.error('❌ Firestoreが初期化されていません');
                return;
            }
            
            console.log('3️⃣ Cloud Firestore API有効化確認中...');
            
            // シンプルなテストクエリを実行してAPIの状態を確認
            const testQuery = dataManager.db.collection('_api_test').limit(1);
            
            try {
                const snapshot = await testQuery.get();
                console.log('✅ Cloud Firestore APIが有効化されています');
                console.log('✅ API接続正常');
                return true;
                
            } catch (error) {
                console.error('❌ Cloud Firestore API関連エラー:', error);
                
                if (error.code === 'unavailable' || error.message.includes('Firestore API')) {
                    console.error('');
                    console.error('🚨 【重要】Cloud Firestore APIが有効化されていません！');
                    console.error('');
                    console.error('📋 手動で有効化する手順:');
                    console.error('1️⃣ 以下のURLにアクセス:');
                    console.error('   https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=buzzlog-6fc74');
                    console.error('');
                    console.error('2️⃣ 「有効にする」ボタンをクリック');
                    console.error('');
                    console.error('3️⃣ Firebase Consoleでデータベース作成:');
                    console.error('   https://console.firebase.google.com/project/buzzlog-6fc74/firestore');
                    console.error('');
                    console.error('4️⃣ 「データベースの作成」をクリック');
                    console.error('5️⃣ 「本番モードで開始」を選択');
                    console.error('6️⃣ リージョンを「asia-northeast1 (Tokyo)」に設定');
                    console.error('7️⃣ 作成完了後、このページをリロード');
                    console.error('');
                    console.error('⏰ API有効化には数分かかる場合があります');
                    
                } else if (error.code === 'permission-denied') {
                    console.error('🔐 Firestoreセキュリティルールを確認してください');
                } else {
                    console.error('🌐 ネットワーク接続またはその他の問題があります');
                }
                
                return false;
            }
            
        } catch (error) {
            console.error('❌ 診断中にエラー:', error);
            return false;
        }
    },
    
    // Firestore手動セットアップガイド表示
    showFirestoreSetupGuide() {
        console.log('📚 Firestore手動セットアップガイド:');
        console.log('');
        console.log('🔧 ステップ1: API有効化');
        console.log('URL: https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=buzzlog-6fc74');
        console.log('');
        console.log('🔧 ステップ2: データベース作成');
        console.log('URL: https://console.firebase.google.com/project/buzzlog-6fc74/firestore');
        console.log('・「データベースの作成」をクリック');
        console.log('・「本番モードで開始」を選択');
        console.log('・リージョン: asia-northeast1 (Tokyo)');
        console.log('');
        console.log('🔧 ステップ3: 確認コマンド');
        console.log('await debugBuzzlog.diagnoseFirestoreAPI()');
        console.log('');
        console.log('💡 完了後はページをリロードしてください');
    },
    
    // Firestore権限テスト（より詳細）
    async testFirestorePermissions() {
        console.log('🔐 Firestore権限テスト開始...');
        
        try {
            const testTaskId = 'permission-test-' + Date.now();
            
            // 1. 書き込み権限テスト
            console.log('1️⃣ 書き込み権限テスト中...');
            const testTask = {
                name: 'テスト用タスク',
                type: 'personal',
                status: '未対応',
                priority: 'medium',
                assignees: [sessionStorage.getItem('userId') || 'test'],
                content: 'これは権限テスト用のタスクです',
                createdAt: new Date().toISOString(),
                taskId: testTaskId
            };
            
            await dataManager.db.collection('tasks').doc(testTaskId).set(testTask);
            console.log('✅ 書き込み権限: OK');
            
            // 2. 読み込み権限テスト  
            console.log('2️⃣ 読み込み権限テスト中...');
            const doc = await dataManager.db.collection('tasks').doc(testTaskId).get();
            if (doc.exists) {
                console.log('✅ 読み込み権限: OK');
            } else {
                throw new Error('書き込んだドキュメントが読み込めません');
            }
            
            // 3. 更新権限テスト
            console.log('3️⃣ 更新権限テスト中...');
            await dataManager.db.collection('tasks').doc(testTaskId).update({
                status: '処理中',
                updatedAt: new Date().toISOString()
            });
            console.log('✅ 更新権限: OK');
            
            // 4. 削除権限テスト
            console.log('4️⃣ 削除権限テスト中...');
            await dataManager.db.collection('tasks').doc(testTaskId).delete();
            console.log('✅ 削除権限: OK');
            
            console.log('🎉 すべての権限テストが成功しました！');
            return true;
            
        } catch (error) {
            console.error('❌ 権限テスト失敗:');
            console.error('- エラーコード:', error.code);
            console.error('- エラーメッセージ:', error.message);
            
            if (error.code === 'permission-denied') {
                console.error('🚫 Firestoreセキュリティルールで拒否されています');
                console.error('💡 解決方法:');
                console.error('   1. Firebase Consoleでセキュリティルールを確認');
                console.error('   2. https://console.firebase.google.com/project/buzzlog-6fc74/firestore/rules');
            }
            
            return false;
        }
    },
    
    // 設定情報表示
    showConfig() {
        console.log('⚙️ Buzzlog設定情報:');
        console.log('- Chatwork有効:', localStorage.getItem('chatworkEnabled'));
        console.log('- Webhook URL:', localStorage.getItem('chatworkWebhookUrl'));
        console.log('- Current User:', sessionStorage.getItem('userId'));
        console.log('- Firestore Mode:', dataManager.useFirestore);
        console.log('- Firebase Available:', typeof firebase !== 'undefined');
        console.log('- Migration Flag:', localStorage.getItem('firestore_migrated'));
        console.log('- Project ID:', firebaseConfig ? firebaseConfig.projectId : 'N/A');
    },
    
    // リアルタイム同期状態の監視
    async monitorSyncStatus() {
        console.log('🔍 リアルタイム同期状態を監視中...');
        
        if (!dataManager.useFirestore) {
            console.log('❌ Firestoreモードではありません');
            return;
        }
        
        try {
            // リスナーの状態確認
            console.log('📡 リアルタイムリスナー状態:');
            console.log('- Tasks Listener:', dataManager.tasksUnsubscribe ? 'Active' : 'Inactive');
            console.log('- Persons Listener:', dataManager.personsUnsubscribe ? 'Active' : 'Inactive');
            console.log('- Projects Listener:', dataManager.projectsUnsubscribe ? 'Active' : 'Inactive');
            
            // Firestoreの実際のデータ確認
            const tasksSnapshot = await dataManager.db.collection('tasks').get();
            const personsSnapshot = await dataManager.db.collection('persons').get();
            const projectsSnapshot = await dataManager.db.collection('projects').get();
            
            console.log('📊 Firestore実データ:');
            console.log('- Tasks:', tasksSnapshot.size, '件');
            console.log('- Persons:', personsSnapshot.size, '件');
            console.log('- Projects:', projectsSnapshot.size, '件');
            
            if (tasksSnapshot.size > 0) {
                console.log('📋 最新タスク一覧:');
                tasksSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    console.log(`  - ${data.taskId || doc.id}: ${data.name}`);
                });
            }
            
            return {
                listeners: {
                    tasks: !!dataManager.tasksUnsubscribe,
                    persons: !!dataManager.personsUnsubscribe,
                    projects: !!dataManager.projectsUnsubscribe
                },
                data: {
                    tasks: tasksSnapshot.size,
                    persons: personsSnapshot.size,
                    projects: projectsSnapshot.size
                }
            };
            
        } catch (error) {
            console.error('❌ 同期状態監視エラー:', error);
            throw error;
        }
    },
    
    // デバイス間同期テスト
    async testDeviceSync() {
        console.log('🔄 デバイス間同期テストを開始...');
        
        if (!dataManager.useFirestore) {
            console.log('❌ Firestoreモードではないため、同期テストはできません');
            return;
        }
        
        try {
            // テストタスクを作成
            const testTaskId = 'test-sync-' + Date.now();
            const testTask = {
                id: testTaskId,
                taskId: 'T-TEST-' + Date.now(),
                name: '同期テストタスク - ' + new Date().toLocaleTimeString(),
                status: '未対応',
                priority: 'medium',
                assignees: [sessionStorage.getItem('userName') || 'テストユーザー'],
                createdAt: new Date().toISOString(),
                testFlag: true // テスト用フラグ
            };
            
            // Firestoreに直接保存
            await dataManager.db.collection('tasks').doc(testTaskId).set(testTask);
            console.log('✅ テストタスクを作成しました:', testTask.taskId);
            console.log('他のデバイス/ブラウザで自動的に表示されることを確認してください');
            
            // 10秒後に自動削除
            setTimeout(async () => {
                try {
                    await dataManager.db.collection('tasks').doc(testTaskId).delete();
                    console.log('🗑️ テストタスクを自動削除しました');
                } catch (error) {
                    console.error('❌ テストタスク削除エラー:', error);
                }
            }, 10000);
            
            return testTask;
            
        } catch (error) {
            console.error('❌ 同期テストエラー:', error);
            throw error;
        }
    },

    // Firestore内の全タスクを表示
    async listAllFirestoreTasks() {
        console.log('📋 Firestore内の全タスクを確認中...');
        
        if (!dataManager.useFirestore) {
            console.log('❌ Firestoreモードではありません');
            return;
        }
        
        try {
            const snapshot = await dataManager.db.collection('tasks').get();
            
            if (snapshot.empty) {
                console.log('📭 Firestoreにタスクは存在しません');
                return [];
            }
            
            const tasks = [];
            console.log(`📊 Firestore内のタスク一覧（${snapshot.size}件）:`);
            console.log('=====================================');
            
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                tasks.push(data);
                
                console.log(`🔹 ID: ${doc.id}`);
                console.log(`   タスクID: ${data.taskId || 'N/A'}`);
                console.log(`   名前: ${data.name || 'N/A'}`);
                console.log(`   ステータス: ${data.status || 'N/A'}`);
                console.log(`   担当者: ${Array.isArray(data.assignees) ? data.assignees.join(', ') : (data.assignee || 'N/A')}`);
                console.log(`   作成日: ${data.createdAt || 'N/A'}`);
                console.log(`   アーカイブ: ${data.archived ? 'はい' : 'いいえ'}`);
                console.log('---');
            });
            
            console.log('=====================================');
            return tasks;
            
        } catch (error) {
            console.error('❌ Firestoreタスク取得エラー:', error);
            throw error;
        }
    },

    // LocalStorage内の全タスクを表示
    listAllLocalTasks() {
        console.log('💾 LocalStorage内の全タスクを確認中...');
        
        try {
            const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
            
            if (tasks.length === 0) {
                console.log('📭 LocalStorageにタスクは存在しません');
                return [];
            }
            
            console.log(`📊 LocalStorage内のタスク一覧（${tasks.length}件）:`);
            console.log('=====================================');
            
            tasks.forEach(task => {
                console.log(`🔹 ID: ${task.id}`);
                console.log(`   タスクID: ${task.taskId || 'N/A'}`);
                console.log(`   名前: ${task.name || 'N/A'}`);
                console.log(`   ステータス: ${task.status || 'N/A'}`);
                console.log(`   担当者: ${Array.isArray(task.assignees) ? task.assignees.join(', ') : (task.assignee || 'N/A')}`);
                console.log(`   作成日: ${task.createdAt || 'N/A'}`);
                console.log(`   アーカイブ: ${task.archived ? 'はい' : 'いいえ'}`);
                console.log('---');
            });
            
            console.log('=====================================');
            return tasks;
            
        } catch (error) {
            console.error('❌ LocalStorageタスク取得エラー:', error);
            throw error;
        }
    },

    // 全データの詳細比較
    async compareAllData() {
        console.log('🔍 LocalStorageとFirestoreの全データ比較開始...');
        
        try {
            // LocalStorageデータ取得
            const localTasks = this.listAllLocalTasks();
            const localPersons = JSON.parse(localStorage.getItem('persons') || '[]');
            const localProjects = JSON.parse(localStorage.getItem('projects') || '[]');
            
            let firestoreTasks = [];
            let firestorePersons = [];
            let firestoreProjects = [];
            
            if (dataManager.useFirestore) {
                // Firestoreデータ取得
                firestoreTasks = await this.listAllFirestoreTasks();
                
                const personsSnapshot = await dataManager.db.collection('persons').get();
                firestorePersons = personsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                const projectsSnapshot = await dataManager.db.collection('projects').get();
                firestoreProjects = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                console.log('👥 Firestore人員データ:', firestorePersons.length, '件');
                console.log('📂 Firestoreプロジェクトデータ:', firestoreProjects.length, '件');
            }
            
            console.log('💾 LocalStorage人員データ:', localPersons.length, '件');
            console.log('📂 LocalStorageプロジェクトデータ:', localProjects.length, '件');
            
            // データの不一致をチェック
            console.log('⚖️ データ整合性チェック:');
            
            if (localTasks.length !== firestoreTasks.length) {
                console.warn('⚠️ タスク数が不一致:', localTasks.length, 'vs', firestoreTasks.length);
            } else {
                console.log('✅ タスク数は一致');
            }
            
            if (localPersons.length !== firestorePersons.length) {
                console.warn('⚠️ 人員数が不一致:', localPersons.length, 'vs', firestorePersons.length);
            } else {
                console.log('✅ 人員数は一致');
            }
            
            if (localProjects.length !== firestoreProjects.length) {
                console.warn('⚠️ プロジェクト数が不一致:', localProjects.length, 'vs', firestoreProjects.length);
            } else {
                console.log('✅ プロジェクト数は一致');
            }
            
            return {
                local: {
                    tasks: localTasks,
                    persons: localPersons,
                    projects: localProjects
                },
                firestore: {
                    tasks: firestoreTasks,
                    persons: firestorePersons,
                    projects: firestoreProjects
                }
            };
            
        } catch (error) {
            console.error('❌ データ比較エラー:', error);
            throw error;
        }
    },

    // 強制的にFirestoreからローカルに同期
    async forceFirestoreToLocal() {
        console.log('⬇️ FirestoreからLocalStorageに強制同期開始...');
        
        if (!dataManager.useFirestore) {
            console.log('❌ Firestoreモードではありません');
            return;
        }
        
        try {
            // Firestoreからデータ取得
            const tasksSnapshot = await dataManager.db.collection('tasks').get();
            const personsSnapshot = await dataManager.db.collection('persons').get();
            const projectsSnapshot = await dataManager.db.collection('projects').get();
            
            // LocalStorageに保存
            const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const persons = personsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const projects = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            localStorage.setItem('tasks', JSON.stringify(tasks));
            localStorage.setItem('persons', JSON.stringify(persons));
            localStorage.setItem('projects', JSON.stringify(projects));
            
            console.log('✅ 強制同期完了:');
            console.log('- タスク:', tasks.length, '件');
            console.log('- 人員:', persons.length, '件');
            console.log('- プロジェクト:', projects.length, '件');
            
            // UI再読み込み
            if (typeof loadTasks === 'function') {
                await loadTasks();
            }
            if (typeof loadPersonList === 'function') {
                loadPersonList();
            }
            if (typeof loadProjectList === 'function') {
                loadProjectList();
            }
            
            console.log('🔄 UIを再読み込みしました');
            
        } catch (error) {
            console.error('❌ 強制同期エラー:', error);
            throw error;
        }
    },

    // 強制的にローカルからFirestoreに同期
    async forceLocalToFirestore() {
        console.log('⬆️ LocalStorageからFirestoreに強制同期開始...');
        
        if (!dataManager.useFirestore) {
            console.log('❌ Firestoreモードではありません');
            return;
        }
        
        try {
            // LocalStorageからデータ取得
            const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
            const persons = JSON.parse(localStorage.getItem('persons') || '[]');
            const projects = JSON.parse(localStorage.getItem('projects') || '[]');
            
            console.log('📤 アップロード対象:');
            console.log('- タスク:', tasks.length, '件');
            console.log('- 人員:', persons.length, '件');
            console.log('- プロジェクト:', projects.length, '件');
            
            // バッチ処理でFirestoreに保存
            const batch = dataManager.db.batch();
            
            tasks.forEach(task => {
                const docRef = dataManager.db.collection('tasks').doc(String(task.id));
                batch.set(docRef, task);
            });
            
            persons.forEach(person => {
                const docRef = dataManager.db.collection('persons').doc(String(person.id));
                batch.set(docRef, person);
            });
            
            projects.forEach(project => {
                const docRef = dataManager.db.collection('projects').doc(String(project.id));
                batch.set(docRef, project);
            });
            
            await batch.commit();
            
            console.log('✅ 強制アップロード完了');
            
            // 移行フラグを設定
            localStorage.setItem('firestore_migrated', 'true');
            await dataManager.db.collection('_system').doc('migration').set({
                migrated: true,
                migratedAt: new Date().toISOString(),
                migratedBy: sessionStorage.getItem('userId') || 'manual_sync'
            });
            
            console.log('🏁 移行フラグを設定しました');
            
        } catch (error) {
            console.error('❌ 強制アップロードエラー:', error);
            throw error;
        }
    },

    // 同期問題の詳細診断
    async diagnoseSyncIssues() {
        console.log('🏥 同期問題の詳細診断を開始...');
        
        const issues = [];
        
        try {
            // 1. Firebase/Firestore利用可能性チェック
            console.log('🔍 1. Firebase/Firestore利用可能性チェック');
            const firebaseAvailable = typeof firebase !== 'undefined';
            const firestoreAvailable = firebaseAvailable && firebase.firestore;
            
            console.log('- Firebase SDK:', firebaseAvailable ? '✅ 利用可能' : '❌ 利用不可');
            console.log('- Firestore:', firestoreAvailable ? '✅ 利用可能' : '❌ 利用不可');
            
            if (!firebaseAvailable) {
                issues.push('Firebase SDKが読み込まれていません');
            }
            if (!firestoreAvailable) {
                issues.push('Firestoreが利用できません');
            }
            
            // 2. DataManager状態チェック
            console.log('🔍 2. DataManager状態チェック');
            console.log('- useFirestore:', dataManager.useFirestore ? '✅ 有効' : '❌ 無効');
            console.log('- 初期化完了:', dataManager.isInitialized ? '✅ 完了' : '❌ 未完了');
            console.log('- 移行完了:', dataManager.migrationComplete ? '✅ 完了' : '❌ 未完了');
            
            if (!dataManager.useFirestore) {
                issues.push('DataManagerがFirestoreモードではありません');
            }
            
            // 3. リアルタイムリスナー状態チェック
            console.log('🔍 3. リアルタイムリスナー状態チェック');
            const listeners = {
                tasks: !!dataManager.tasksUnsubscribe,
                persons: !!dataManager.personsUnsubscribe,
                projects: !!dataManager.projectsUnsubscribe
            };
            
            console.log('- Tasks Listener:', listeners.tasks ? '✅ Active' : '❌ Inactive');
            console.log('- Persons Listener:', listeners.persons ? '✅ Active' : '❌ Inactive');
            console.log('- Projects Listener:', listeners.projects ? '✅ Active' : '❌ Inactive');
            
            if (!listeners.tasks) {
                issues.push('タスクリアルタイムリスナーが非アクティブです');
            }
            
            // 4. Firestore接続テスト
            if (dataManager.useFirestore) {
                console.log('🔍 4. Firestore接続テスト');
                try {
                    await dataManager.db.collection('_test').limit(1).get();
                    console.log('- 接続テスト: ✅ 成功');
                } catch (error) {
                    console.log('- 接続テスト: ❌ 失敗');
                    issues.push('Firestore接続エラー: ' + error.message);
                }
            }
            
            // 5. セキュリティルールテスト
            if (dataManager.useFirestore) {
                console.log('🔍 5. セキュリティルールテスト');
                try {
                    const testData = { test: true, timestamp: new Date().toISOString() };
                    const docRef = await dataManager.db.collection('_test').add(testData);
                    await docRef.delete();
                    console.log('- 読み書きテスト: ✅ 成功');
                } catch (error) {
                    console.log('- 読み書きテスト: ❌ 失敗');
                    issues.push('セキュリティルールエラー: ' + error.message);
                }
            }
            
            // 診断結果まとめ
            console.log('🏥 診断結果まとめ:');
            if (issues.length === 0) {
                console.log('✅ 問題は見つかりませんでした');
            } else {
                console.log('❌ 発見された問題:');
                issues.forEach((issue, index) => {
                    console.log(`${index + 1}. ${issue}`);
                });
            }
            
            return issues;
            
        } catch (error) {
            console.error('❌ 診断エラー:', error);
            throw error;
        }
    }
};

// コンソールでの利用方法をログ出力
console.log('🐛 デバッグ機能が利用可能です:');
console.log('=== 基本機能 ===');
console.log('debugBuzzlog.testFirestore() - Firestore接続テスト');
console.log('debugBuzzlog.checkMigrationStatus() - 移行状況確認');
console.log('debugBuzzlog.showConfig() - 設定情報表示');
console.log('=== データ確認 ===');
console.log('debugBuzzlog.listAllFirestoreTasks() - Firestore内全タスク表示');
console.log('debugBuzzlog.listAllLocalTasks() - LocalStorage内全タスク表示');
console.log('debugBuzzlog.compareAllData() - 全データ詳細比較');
console.log('=== 同期制御 ===');
console.log('debugBuzzlog.forceFirestoreToLocal() - Firestore→Local強制同期');
console.log('debugBuzzlog.forceLocalToFirestore() - Local→Firestore強制同期');
console.log('debugBuzzlog.monitorSyncStatus() - 同期状態監視');
console.log('debugBuzzlog.testDeviceSync() - デバイス間同期テスト');
console.log('=== 問題診断 ===');
console.log('debugBuzzlog.diagnoseSyncIssues() - 同期問題詳細診断');
console.log('debugBuzzlog.checkFirestoreRules() - セキュリティルール確認');
console.log('debugBuzzlog.resetMigrationFlag() - 移行フラグリセット');

// セクション表示切り替え
window.showSection = async function(section) {
    const sections = document.querySelectorAll('.content-section');
    const navBtns = document.querySelectorAll('.nav-btn');
    
    // 現在のアクティブセクションを確認
    const currentActiveSection = document.querySelector('.content-section.active');
    const isAlreadyActive = currentActiveSection && 
        ((section === 'tasks' && currentActiveSection.id === 'tasksSection') ||
         (section === 'archive' && currentActiveSection.id === 'archiveSection') ||
         (section === 'master' && currentActiveSection.id === 'masterSection'));
    
    sections.forEach(s => s.classList.remove('active'));
    navBtns.forEach(b => b.classList.remove('active'));
    
    if (section === 'tasks') {
        document.getElementById('tasksSection').classList.add('active');
        navBtns[0].classList.add('active');
        // 初期化完了後、かつ既にアクティブでない場合のみタスクを読み込み（重複読み込み防止）
        if (isAppInitialized && !isAlreadyActive) {
            await loadTasks();
        }
    } else if (section === 'archive') {
        document.getElementById('archiveSection').classList.add('active');
        navBtns[1].classList.add('active');
        loadArchivedTasks(); // アーカイブタスクを読み込み（非同期）
    } else if (section === 'master') {
        document.getElementById('masterSection').classList.add('active');
        navBtns[2].classList.add('active');
    }
}

// タスク読み込み処理中フラグ
let isLoadingTasks = false;

// タスク読み込み
async function loadTasks() {
    // 既に処理中の場合はスキップ（重複実行防止）
    if (isLoadingTasks) {
        console.log('⚠️ loadTasks: 既に処理中のためスキップ');
        return;
    }
    
    try {
        isLoadingTasks = true;
        // フィルタリング処理を一元化
        await filterTasks();
    } finally {
        isLoadingTasks = false;
    }
}

// タスク要素作成
async function createTaskElement(task) {
    const div = document.createElement('div');
    div.className = 'task-item';
    div.dataset.taskId = task.id;
    
    // 期限チェック
    const today = new Date().toISOString().split('T')[0];
    if (task.endDate) {
        if (task.endDate < today) {
            div.classList.add('overdue');
        } else if (task.endDate === today) {
            div.classList.add('today');
        }
    }
    
    // ステータスに応じたクラス
    if (task.status === '処理完了' || task.status === '終了') {
        div.classList.add('completed');
    }
    
    // プロジェクト情報の表示
    let metaInfo = '';
    if (task.project) {
        metaInfo += `<span>プロジェクト: ${task.project}</span>`;
    }
    if (task.assignee) {
        metaInfo += `<span>担当: ${task.assignee}</span>`;
    }
    if (task.endDate) {
        metaInfo += `<span>期限: ${task.endDate}</span>`;
    }
    
    // 優先度アイコンの設定
    const priorityMap = {
        'high': { icon: '↑', label: '高', class: 'high' },
        'medium': { icon: '→', label: '中', class: 'medium' },
        'low': { icon: '↓', label: '低', class: 'low' }
    };
    
    const priority = task.priority || 'medium';
    const priorityInfo = priorityMap[priority] || priorityMap['medium'];
    const priorityDisplay = `
        <span class="priority-badge-compact priority-${priorityInfo.class}">
            <span class="priority-icon-compact">${priorityInfo.icon}</span>
        </span>
    `;
    
    // 期限の表示を簡潔に
    let deadlineInfo = '';
    if (task.endDate) {
        deadlineInfo = `<span class="deadline-info">~${task.endDate}</span>`;
    }
    
    // タスクIDの表示（既存データ対応）
    const taskIdDisplay = task.taskId ? 
        `<span class="task-id">[${task.taskId}]</span>` : 
        `<span class="task-id">[T-${new Date(task.createdAt || Date.now()).toISOString().slice(0,10).replace(/-/g, '')}-OLD]</span>`;
    
    // 未読コメントチェック（非同期処理を同期化、LocalStorageなので高速）
    const currentUser = sessionStorage.getItem('userId');
    let hasUnreadComments = false;
    try {
        hasUnreadComments = await dataManager.hasUnreadComments(task.id, currentUser);
    } catch (error) {
        console.error('未読コメントチェックエラー:', error);
        hasUnreadComments = false;
    }
    
    // プロジェクト名の表示
    let projectBadge = '';
    if (task.project) {
        projectBadge = `<span class="project-badge">${task.project}</span>`;
    }
    
    // 複数担当者情報（最初の担当者のみ未読コメントマークを表示）
    let assigneeInfo = '';
    const assignees = task.assignees || (task.assignee ? [task.assignee] : []);
    
    if (assignees.length > 0) {
        const assigneeBadges = assignees.map((assignee, index) => {
            const colorClass = getAssigneeColorClass(assignee);
            // 未読コメントマークは最初の担当者のみ表示
            const bulbIcon = (index === 0 && hasUnreadComments) ? `
                <span class="unread-indicator">
                    <svg width="16" height="20" viewBox="0 0 24 30" class="bulb-icon">
                        <!-- 電球の球体部分 -->
                        <circle cx="12" cy="12" r="8" fill="#fbbf24" stroke="#f59e0b" stroke-width="1.5"/>
                        <!-- フィラメント -->
                        <path d="M8 9 Q12 7 16 9 M8 12 Q12 10 16 12 M8 15 Q12 13 16 15" stroke="#f97316" stroke-width="1" fill="none"/>
                        <!-- ネジ部分 -->
                        <rect x="10" y="19" width="4" height="2" fill="#9ca3af"/>
                        <rect x="10" y="21" width="4" height="2" fill="#9ca3af"/>
                        <rect x="10" y="23" width="4" height="2" fill="#9ca3af"/>
                        <!-- 光の効果 -->
                        <circle cx="12" cy="12" r="10" fill="none" stroke="#fcd34d" stroke-width="0.5" opacity="0.6"/>
                    </svg>
                </span>
            ` : '';
            return `<span class="assignee-badge assignee-color-${colorClass}">${assignee}${bulbIcon}</span>`;
        }).join('');
        
        assigneeInfo = `<div class="assignees-badges">${assigneeBadges}</div>`;
    }
    
    // ステータスが「終了」の場合のみアーカイブボタンを表示
    const archiveButton = task.status === '終了' ? 
        `<button onclick="archiveTaskConfirm(${task.id})" class="archive-btn-compact">アーカイブ</button>` : '';
    
    div.innerHTML = `
        <div class="task-row">
            <div class="task-main">
                <div class="task-title-row">
                    ${taskIdDisplay}
                    <h3 class="task-name-compact">${task.name}</h3>
                </div>
                <div class="task-info-compact">
                    ${priorityDisplay}
                    <span class="task-status-compact status-${task.status || '未対応'}">${task.status || '未対応'}</span>
                    ${deadlineInfo}
                    ${projectBadge}
                    ${assigneeInfo}
                </div>
            </div>
            <div class="task-actions">
                <button onclick="openTaskDetail(${task.id})" class="detail-btn-compact">詳細</button>
                ${archiveButton}
            </div>
        </div>
    `;
    
    return div;
}

// 担当者名から色クラスを生成（人員マスター連動で重複回避）
function getAssigneeColorClass(assigneeName) {
    if (!assigneeName) return 'blue';
    
    // 人員マスター連動の色マッピングを取得
    const colorMapping = dataManager.getAssigneeColorMapping();
    
    // マッピングに存在する場合はその色を返す
    if (colorMapping[assigneeName]) {
        return colorMapping[assigneeName];
    }
    
    // マッピングにない場合（新規追加などの場合）はハッシュ方式でフォールバック
    const colors = [
        'blue', 'green', 'purple', 'orange', 'pink', 'teal', 
        'red', 'indigo', 'amber', 'cyan', 'lime', 'rose',
        'slate', 'emerald', 'sky', 'violet', 'fuchsia', 'yellow', 'gray', 'stone'
    ];
    
    // FNV-1aハッシュアルゴリズム
    let fnvHash = 2166136261;
    for (let i = 0; i < assigneeName.length; i++) {
        fnvHash ^= assigneeName.charCodeAt(i);
        fnvHash += (fnvHash << 1) + (fnvHash << 4) + (fnvHash << 7) + (fnvHash << 8) + (fnvHash << 24);
    }
    
    // djb2ハッシュアルゴリズム
    let djb2Hash = 5381;
    for (let i = 0; i < assigneeName.length; i++) {
        djb2Hash = ((djb2Hash << 5) + djb2Hash) + assigneeName.charCodeAt(i);
    }
    
    // 2つのハッシュ値をXORで組み合わせてより良い分散性を実現
    const combinedHash = fnvHash ^ djb2Hash;
    
    return colors[Math.abs(combinedHash) % colors.length];
}

// タスク詳細を開く
window.openTaskDetail = function(taskId) {
    window.location.href = `task-detail.html?id=${taskId}`;
}

// タスクアーカイブ確認
window.archiveTaskConfirm = async function(taskId) {
    const task = await dataManager.getTaskById(taskId);
    if (!task) {
        alert('タスクが見つかりません');
        return;
    }
    
    if (task.status !== '終了') {
        alert('終了状態のタスクのみアーカイブできます');
        return;
    }
    
    if (confirm(`タスク「${task.name}」をアーカイブしますか？\nアーカイブしたタスクは一覧に表示されなくなりますが、データは保持されます。`)) {
        await dataManager.archiveTask(taskId);
        await loadTasks(); // タスクリストを再読み込み
        alert('タスクをアーカイブしました');
    }
}

// アーカイブタスク読み込み
async function loadArchivedTasks() {
    try {
        const archivedTasks = await dataManager.getArchivedTasks();
        const archiveTaskList = document.getElementById('archiveTaskList');
        console.log('アーカイブタスクデータ取得完了:', archivedTasks.length, '件');
        
        if (archivedTasks.length === 0) {
            archiveTaskList.innerHTML = '<div class="no-tasks">アーカイブされたタスクはありません</div>';
            return;
        }
        
        archiveTaskList.innerHTML = '';
        archivedTasks.forEach(task => {
            const taskElement = createArchivedTaskElement(task);
            archiveTaskList.appendChild(taskElement);
        });
    } catch (error) {
        console.error('アーカイブタスクデータ取得エラー:', error);
        const archiveTaskList = document.getElementById('archiveTaskList');
        archiveTaskList.innerHTML = '<div class="error-message">アーカイブタスクの取得に失敗しました</div>';
    }
}

// アーカイブタスク要素作成
function createArchivedTaskElement(task) {
    const div = document.createElement('div');
    div.className = 'task-item archived-task';
    div.dataset.taskId = task.id;
    
    // 優先度表示
    const priorityMap = {
        'high': { text: '高', icon: '↑', color: '#e53e3e' },
        'medium': { text: '中', icon: '→', color: '#d69e2e' },
        'low': { text: '低', icon: '↓', color: '#3182ce' }
    };
    
    const priority = priorityMap[task.priority] || priorityMap['medium'];
    const priorityDisplay = `<span class="priority-badge" style="color: ${priority.color};">${priority.icon} ${priority.text}</span>`;
    
    // 期限の表示を簡潔に
    let deadlineInfo = '';
    if (task.endDate) {
        deadlineInfo = `<span class="deadline-info">~${task.endDate}</span>`;
    }
    
    // タスクIDの表示
    const taskIdDisplay = task.taskId ? 
        `<span class="task-id">[${task.taskId}]</span>` : 
        `<span class="task-id">[T-${new Date(task.createdAt || Date.now()).toISOString().slice(0,10).replace(/-/g, '')}-OLD]</span>`;
    
    // プロジェクト名の表示
    let projectBadge = '';
    if (task.project) {
        projectBadge = `<span class="project-badge">${task.project}</span>`;
    }
    
    // 複数担当者情報
    let assigneeInfo = '';
    const assignees = task.assignees || (task.assignee ? [task.assignee] : []);
    
    if (assignees.length > 0) {
        const assigneeBadges = assignees.map((assignee, index) => {
            const colorClass = getAssigneeColorClass(assignee);
            return `<span class="assignee-badge assignee-color-${colorClass}">${assignee}</span>`;
        }).join('');
        
        assigneeInfo = `<div class="assignees-badges">${assigneeBadges}</div>`;
    }
    
    // アーカイブ日時の表示
    let archiveInfo = '';
    if (task.archivedAt) {
        const archiveDate = new Date(task.archivedAt).toLocaleDateString('ja-JP');
        archiveInfo = `<span class="archive-date">アーカイブ日: ${archiveDate}</span>`;
    }
    
    div.innerHTML = `
        <div class="task-row">
            <div class="task-main">
                <div class="task-title-row">
                    ${taskIdDisplay}
                    <h3 class="task-name-compact">${task.name}</h3>
                </div>
                <div class="task-info-compact">
                    ${priorityDisplay}
                    <span class="task-status-compact status-${task.status || '未対応'}">${task.status || '未対応'}</span>
                    ${deadlineInfo}
                    ${projectBadge}
                    ${assigneeInfo}
                    ${archiveInfo}
                </div>
            </div>
            <div class="task-actions">
                <button onclick="openTaskDetail(${task.id})" class="detail-btn-compact">詳細</button>
                <button onclick="unarchiveTaskConfirm(${task.id})" class="unarchive-btn-compact">復元</button>
            </div>
        </div>
    `;
    
    return div;
}

// アーカイブタスク復元確認
window.unarchiveTaskConfirm = async function(taskId) {
    const task = await dataManager.getTaskById(taskId);
    if (!task) {
        alert('タスクが見つかりません');
        return;
    }
    
    if (confirm(`タスク「${task.name}」を復元しますか？\n復元したタスクは通常のタスク一覧に表示されます。`)) {
        await dataManager.unarchiveTask(taskId);
        await loadArchivedTasks(); // アーカイブタスクリストを再読み込み
        alert('タスクを復元しました');
    }
}

// タスクモーダル
window.openTaskModal = async function() {
    document.getElementById('taskModal').style.display = 'block';
    await updateAssigneeOptions();
}

window.closeTaskModal = function() {
    document.getElementById('taskModal').style.display = 'none';
    document.getElementById('taskForm').reset();
}

// 担当者オプション更新
window.updateAssigneeOptions = async function() {
    const taskType = document.getElementById('taskType').value;
    const projectGroup = document.getElementById('projectGroup');
    const assigneeGroup = document.getElementById('assigneeGroup');
    const projectSelect = document.getElementById('project');
    
    // 一旦両方非表示
    projectGroup.style.display = 'none';
    assigneeGroup.style.display = 'none';
    
    // セレクトボックスをクリア
    projectSelect.innerHTML = '<option value="">選択してください</option>';
    
    // ドロップダウンをリセット
    resetAssigneeDropdown();
    
    if (!taskType) {
        // タスクタイプが選択されていない場合は何もしない
        return;
    }
    
    // 担当者選択肢を取得
    const persons = await dataManager.getPersons();
    
    switch(taskType) {
        case 'project':
            // プロジェクトタスクの場合
            projectGroup.style.display = 'block';
            assigneeGroup.style.display = 'block';
            
            // プロジェクト選択肢を追加
            const projects = await dataManager.getProjects();
            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.name;
                option.textContent = project.name;
                projectSelect.appendChild(option);
            });
            
            // 担当者ドロップダウンを設定
            setupAssigneeDropdown(persons);
            break;
            
        case 'department':
        case 'personal':
            // 部署タスクまたは個人タスクの場合
            assigneeGroup.style.display = 'block';
            
            // 担当者ドロップダウンを設定
            setupAssigneeDropdown(persons);
            break;
    }
}

// ドロップダウン制御関数群
function setupAssigneeDropdown(persons) {
    const dropdownMenu = document.getElementById('assigneeDropdownMenu');
    dropdownMenu.innerHTML = '';
    
    // チェックボックスアイテムを追加
    persons.forEach(person => {
        const checkboxItem = document.createElement('div');
        checkboxItem.className = 'checkbox-item';
        checkboxItem.innerHTML = `
            <label for="assignee_${person.id}">${person.name}</label>
            <input type="checkbox" id="assignee_${person.id}" value="${person.name}" onchange="updateAssigneeDropdownDisplay()">
        `;
        dropdownMenu.appendChild(checkboxItem);
    });
    
    // ドロップダウンボタンイベント設定
    const dropdownBtn = document.getElementById('assigneeDropdownBtn');
    dropdownBtn.onclick = () => toggleAssigneeDropdown();
    
    // 外部クリック時に閉じる
    setupDropdownOutsideClick();
}

function toggleAssigneeDropdown() {
    const dropdownBtn = document.getElementById('assigneeDropdownBtn');
    const dropdownMenu = document.getElementById('assigneeDropdownMenu');
    const arrow = dropdownBtn.querySelector('.dropdown-arrow');
    
    const isOpen = dropdownMenu.style.display === 'block';
    
    if (isOpen) {
        dropdownMenu.style.display = 'none';
        dropdownMenu.classList.remove('show');
        dropdownBtn.classList.remove('active');
        arrow.classList.remove('open');
    } else {
        dropdownMenu.style.display = 'block';
        dropdownMenu.classList.add('show');
        dropdownBtn.classList.add('active');
        arrow.classList.add('open');
    }
}

function updateAssigneeDropdownDisplay() {
    const dropdownText = document.getElementById('assigneeDropdownBtn').querySelector('.dropdown-text');
    const preview = document.getElementById('assigneePreview');
    const checkedBoxes = document.querySelectorAll('#assigneeDropdownMenu input[type="checkbox"]:checked');
    
    if (checkedBoxes.length === 0) {
        dropdownText.textContent = '担当者を選択';
        dropdownText.classList.add('placeholder');
        preview.innerHTML = '';
    } else {
        dropdownText.textContent = `${checkedBoxes.length}名選択中`;
        dropdownText.classList.remove('placeholder');
        
        // プレビューバッジを更新
        const badges = Array.from(checkedBoxes).map(cb => {
            const colorClass = getAssigneeColorClass(cb.value);
            return `<span class="assignee-badge assignee-color-${colorClass}">${cb.value}</span>`;
        }).join('');
        
        preview.innerHTML = `<div class="assignees-badges">${badges}</div>`;
    }
}

function resetAssigneeDropdown() {
    const dropdownText = document.getElementById('assigneeDropdownBtn').querySelector('.dropdown-text');
    const preview = document.getElementById('assigneePreview');
    const dropdownMenu = document.getElementById('assigneeDropdownMenu');
    const arrow = document.getElementById('assigneeDropdownBtn').querySelector('.dropdown-arrow');
    
    dropdownText.textContent = '担当者を選択';
    dropdownText.classList.add('placeholder');
    preview.innerHTML = '';
    dropdownMenu.style.display = 'none';
    dropdownMenu.classList.remove('show');
    document.getElementById('assigneeDropdownBtn').classList.remove('active');
    arrow.classList.remove('open');
}

function setupDropdownOutsideClick() {
    document.addEventListener('click', function(event) {
        const container = document.querySelector('.dropdown-checkbox-container');
        if (container && !container.contains(event.target)) {
            const dropdownMenu = document.getElementById('assigneeDropdownMenu');
            if (dropdownMenu && dropdownMenu.style.display === 'block') {
                toggleAssigneeDropdown();
            }
        }
    });
}

// タスク送信処理
async function handleTaskSubmit(e) {
    e.preventDefault();
    
    const taskType = document.getElementById('taskType').value;
    // 選択された担当者を取得（複数対応）
    const selectedAssignees = Array.from(document.querySelectorAll('#assigneeDropdownMenu input[type="checkbox"]:checked'))
        .map(cb => cb.value);
    
    const task = {
        name: document.getElementById('taskName').value,
        content: document.getElementById('taskContent').value,
        type: taskType,
        priority: document.getElementById('taskPriority').value,
        status: '未対応', // デフォルトステータスを明示的に設定
        assignees: selectedAssignees,
        // 後方互換性のため最初の担当者をassigneeにも設定
        assignee: selectedAssignees.length > 0 ? selectedAssignees[0] : '',
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value
    };
    
    // プロジェクトタスクの場合はプロジェクト情報も保存
    if (taskType === 'project') {
        task.project = document.getElementById('project').value;
    }
    
    dataManager.saveTask(task);
    closeTaskModal();
    await loadTasks();
}

// マスターデータ読み込み
async function loadMasterData() {
    console.log('マスターデータ読み込み開始');
    await Promise.all([
        loadPersonList(),
        loadProjectList()
    ]);
    console.log('マスターデータ読み込み完了');
}

// 人員リスト読み込み
async function loadPersonList() {
    try {
        const persons = await dataManager.getPersons();
        const personList = document.getElementById('personList');
        const currentUser = sessionStorage.getItem('userId');
        const isAdmin = currentUser === 'pialabuzz';
        
        console.log('人員データ取得:', persons.length, '件');
        personList.innerHTML = '';
        
        if (persons.length === 0) {
            personList.innerHTML = '<div class="no-data">人員データがありません</div>';
            return;
        }
        
        persons.forEach(person => {
        const div = document.createElement('div');
        div.className = 'master-item';
        
        // 管理者のみ編集ボタンを表示
        const editButton = isAdmin ? `<button onclick="editPerson(${person.id})" class="edit-btn">編集</button>` : '';
        const deleteButton = isAdmin ? `<button onclick="deletePerson(${person.id})" class="delete-btn">削除</button>` : '';
        
        div.innerHTML = `
            <div class="master-info">
                <strong>${person.name}</strong>
                <span>ID: ${person.loginId || person.name} | ${person.department || '部署未設定'}${person.email ? ' | ' + person.email : ''}</span>
            </div>
            <div class="master-actions">
                ${editButton}
                ${deleteButton}
            </div>
        `;
        personList.appendChild(div);
        });
    } catch (error) {
        console.error('人員データ取得エラー:', error);
        const personList = document.getElementById('personList');
        personList.innerHTML = '<div class="error-message">人員データの取得に失敗しました</div>';
    }
}

// プロジェクトリスト読み込み
async function loadProjectList() {
    try {
        const projects = await dataManager.getProjects();
        const projectList = document.getElementById('projectList');
        
        console.log('プロジェクトデータ取得:', projects.length, '件');
        projectList.innerHTML = '';
        
        if (projects.length === 0) {
            projectList.innerHTML = '<div class="no-data">プロジェクトデータがありません</div>';
            return;
        }
        
        projects.forEach(project => {
        const div = document.createElement('div');
        div.className = 'master-item';
        div.innerHTML = `
            <div class="master-info">
                <strong>${project.name}</strong>
                <span>${project.description || ''}</span>
            </div>
            <div class="master-actions">
                <button onclick="editProject(${project.id})" class="edit-btn">編集</button>
                <button onclick="deleteProject(${project.id})" class="delete-btn">削除</button>
            </div>
        `;
        projectList.appendChild(div);
        });
    } catch (error) {
        console.error('プロジェクトデータ取得エラー:', error);
        const projectList = document.getElementById('projectList');
        projectList.innerHTML = '<div class="error-message">プロジェクトデータの取得に失敗しました</div>';
    }
}

// 人員モーダル
window.openPersonModal = function() {
    document.getElementById('personModal').style.display = 'block';
}

window.closePersonModal = function() {
    document.getElementById('personModal').style.display = 'none';
    document.getElementById('personForm').reset();
}

// 人員編集フォーム送信処理
async function handlePersonEditSubmit(e) {
    e.preventDefault();
    
    const editingId = parseInt(document.getElementById('personEditForm').dataset.editingId);
    const loginId = document.getElementById('personEditLoginId').value;
    
    // ログインIDの重複チェック（自分以外）
    const persons = await dataManager.getPersons();
    // ID型の不整合に対応
    const existingPerson = persons.find(p => p.loginId === loginId && p.id != editingId && String(p.id) !== String(editingId));
    if (existingPerson) {
        alert('このログインIDは既に使用されています。');
        return;
    }
    
    const updates = {
        name: document.getElementById('personEditName').value,
        loginId: loginId,
        password: document.getElementById('personEditPassword').value,
        department: document.getElementById('personEditDepartment').value,
        email: document.getElementById('personEditEmail').value,
        chatworkId: document.getElementById('personEditChatworkId').value
    };
    
    console.log('人員更新開始:', editingId, updates);
    const result = await dataManager.updatePerson(editingId, updates);
    console.log('人員更新結果:', result);
    if (result) {
        alert(`人員情報を更新しました。\\n名前: ${updates.name}\\nログインID: ${updates.loginId}\\nパスワード: ${updates.password}`);
        closePersonEditModal();
        await loadPersonList();
    } else {
        alert('更新に失敗しました。');
    }
}

// パスワード自動生成関数
window.generateAutoPassword = function() {
    const nameInput = document.getElementById('personName');
    const loginIdInput = document.getElementById('personLoginId');
    const passwordInput = document.getElementById('personPassword');
    
    if (!nameInput.value) {
        alert('先に名前を入力してください。');
        return;
    }
    
    // ログインIDが空の場合は、名前からローマ字を生成
    if (!loginIdInput.value) {
        const romaji = convertToRomaji(nameInput.value);
        loginIdInput.value = romaji;
    }
    
    // パスワードを生成（ログインID + 123）
    passwordInput.value = loginIdInput.value + '123';
}

// 簡易的な漢字→ローマ字変換関数
function convertToRomaji(name) {
    // 一般的な苗字の変換マップ
    const kanjiMap = {
        '長野': 'nagano',
        '山田': 'yamada',
        '佐藤': 'sato',
        '鈴木': 'suzuki',
        '田中': 'tanaka',
        '高橋': 'takahashi',
        '渡辺': 'watanabe',
        '伊藤': 'ito',
        '中村': 'nakamura',
        '小林': 'kobayashi',
        '加藤': 'kato',
        '吉田': 'yoshida',
        '山本': 'yamamoto',
        '森': 'mori',
        '斉藤': 'saito',
        '清水': 'shimizu',
        '山口': 'yamaguchi',
        '松本': 'matsumoto',
        '井上': 'inoue',
        '木村': 'kimura'
    };
    
    // 苗字（最初の2文字）を取得
    const surname = name.substring(0, 2);
    
    // マップに存在する場合はそれを使用
    if (kanjiMap[surname]) {
        return kanjiMap[surname];
    }
    
    // 存在しない場合は最初の2文字をそのまま使用
    return name.substring(0, 2).toLowerCase();
}

async function handlePersonSubmit(e) {
    e.preventDefault();
    
    const loginId = document.getElementById('personLoginId').value;
    
    // ログインIDの重複チェック
    const persons = await dataManager.getPersons();
    if (persons.some(p => p.loginId === loginId)) {
        alert('このログインIDは既に使用されています。');
        return;
    }
    
    const person = {
        name: document.getElementById('personName').value,
        loginId: loginId,
        password: document.getElementById('personPassword').value,
        department: document.getElementById('personDepartment').value,
        email: document.getElementById('personEmail').value,
        chatworkId: document.getElementById('personChatworkId').value
    };
    
    await dataManager.savePerson(person);
    closePersonModal();
    await loadPersonList();
    alert(`人員を追加しました。\nログインID: ${person.loginId}\nパスワード: ${person.password}`);
}

window.editPerson = function(id) {
    // pialabuzzアカウントのみ編集可能
    const currentUser = sessionStorage.getItem('userId');
    if (currentUser !== 'pialabuzz') {
        alert('人員情報の編集は管理者のみ可能です。');
        return;
    }
    
    openPersonEditModal(id);
}

// 人員編集モーダルを開く
async function openPersonEditModal(personId) {
    const persons = await dataManager.getPersons();
    console.log('編集対象ID:', personId, '型:', typeof personId);
    console.log('人員データ:', persons.map(p => ({ id: p.id, type: typeof p.id, name: p.name })));
    
    // ID型の不整合に対応（FirestoreのIDは文字列、HTMLからは数値で渡される）
    const person = persons.find(p => p.id == personId || p.id === String(personId) || String(p.id) === String(personId));
    
    if (!person) {
        alert('人員情報が見つかりません。');
        return;
    }
    
    // フォームに現在の情報を設定
    document.getElementById('personEditName').value = person.name || '';
    document.getElementById('personEditLoginId').value = person.loginId || person.name;
    document.getElementById('personEditPassword').value = person.password || '';
    document.getElementById('personEditDepartment').value = person.department || '';
    document.getElementById('personEditEmail').value = person.email || '';
    document.getElementById('personEditChatworkId').value = person.chatworkId || '';
    
    // 編集対象のIDを保存
    document.getElementById('personEditForm').dataset.editingId = personId;
    
    // モーダルを表示
    document.getElementById('personEditModal').style.display = 'block';
}

// 人員編集モーダルを閉じる
window.closePersonEditModal = function() {
    document.getElementById('personEditModal').style.display = 'none';
    document.getElementById('personEditForm').reset();
    delete document.getElementById('personEditForm').dataset.editingId;
}

// 人員編集用パスワード自動生成
window.generateEditAutoPassword = function() {
    const nameInput = document.getElementById('personEditName');
    const loginIdInput = document.getElementById('personEditLoginId');
    const passwordInput = document.getElementById('personEditPassword');
    
    if (!nameInput.value) {
        alert('先に名前を入力してください。');
        return;
    }
    
    // ログインIDが空の場合は、名前からローマ字を生成
    if (!loginIdInput.value) {
        const romaji = convertToRomaji(nameInput.value);
        loginIdInput.value = romaji;
    }
    
    // パスワードを生成（ログインID + 123）
    passwordInput.value = loginIdInput.value + '123';
}

window.deletePerson = async function(id) {
    if (confirm('この人員を削除しますか？')) {
        await dataManager.deletePerson(id);
        await loadPersonList();
    }
}

// プロジェクトモーダル
window.openProjectModal = function() {
    document.getElementById('projectModal').style.display = 'block';
}

window.closeProjectModal = function() {
    document.getElementById('projectModal').style.display = 'none';
    document.getElementById('projectForm').reset();
}

async function handleProjectSubmit(e) {
    e.preventDefault();
    
    const project = {
        name: document.getElementById('projectName').value,
        description: document.getElementById('projectDescription').value
    };
    
    await dataManager.saveProject(project);
    closeProjectModal();
    await loadProjectList();
}

window.editProject = async function(id) {
    const projects = await dataManager.getProjects();
    // ID型の不整合に対応
    const project = projects.find(p => p.id == id || String(p.id) === String(id));
    if (project) {
        const newName = prompt('プロジェクト名を編集:', project.name);
        if (newName) {
            await dataManager.updateProject(id, { name: newName });
            await loadProjectList();
        }
    }
}

window.deleteProject = async function(id) {
    if (confirm('このプロジェクトを削除しますか？')) {
        await dataManager.deleteProject(id);
        await loadProjectList();
    }
}

// カテゴリフィルタリング
window.filterByCategory = async function() {
    const categoryFilter = document.getElementById('categoryFilter').value;
    const taskBoxTitle = document.getElementById('taskBoxTitle');
    
    // タイトル更新
    const titles = {
        'all': 'すべてのタスク',
        'department': '部署タスク',
        'project': 'プロジェクトタスク',
        'personal': '個人タスク'
    };
    taskBoxTitle.textContent = titles[categoryFilter] || 'タスク';
    
    // フィルタリング実行
    await filterTasks();
}

// フィルタータイプ変更時の処理
window.updateFilterOptions = async function() {
    const filterType = document.getElementById('filterType').value;
    const filterValue = document.getElementById('filterValue');
    
    // フィルタータイプに応じて選択肢を更新
    filterValue.innerHTML = '<option value="">選択してください</option>';
    
    if (filterType === 'assignee') {
        const persons = await dataManager.getPersons();
        
        // 人員を追加
        persons.forEach(person => {
            const option = document.createElement('option');
            option.value = person.name;
            option.textContent = person.name;
            filterValue.appendChild(option);
        });
    } else if (filterType === 'status') {
        const statuses = ['未対応', '処理中', '処理完了', '終了'];
        statuses.forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status;
            filterValue.appendChild(option);
        });
    } else if (filterType === 'project') {
        const projects = await dataManager.getProjects();
        
        // プロジェクトを追加
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.name;
            option.textContent = project.name;
            filterValue.appendChild(option);
        });
    } else {
        // フィルタータイプが空の場合、全てのタスクを表示
        await filterTasks();
    }
}

window.filterTasks = async function() {
    const categoryFilter = document.getElementById('categoryFilter').value;
    const filterType = document.getElementById('filterType').value;
    const filterValue = document.getElementById('filterValue').value;
    
    try {
        const tasks = await dataManager.getTasks();
        const taskList = document.getElementById('taskList');
        console.log('タスクデータ取得完了:', tasks.length, '件');
    
    // タスクリストを確実にクリア
    if (taskList) {
        taskList.innerHTML = '';
        // 既存の子要素も完全に削除
        while (taskList.firstChild) {
            taskList.removeChild(taskList.firstChild);
        }
    }
    
    // フィルタリング処理
    const filteredTasks = tasks.filter(task => {
        // カテゴリフィルタ
        if (categoryFilter !== 'all' && task.type !== categoryFilter) {
            return false;
        }
        
        // 担当者/ステータスフィルタ
        if (filterType && filterValue) {
            if (filterType === 'assignee') {
                // 担当者フィルタの場合（複数担当者対応）
                const assignees = task.assignees || (task.assignee ? [task.assignee] : []);
                if (assignees.length === 0 || !assignees.includes(filterValue)) {
                    return false;
                }
            }
            if (filterType === 'status') {
                // ステータスフィルタの場合
                if (!task.status || task.status !== filterValue) {
                    return false;
                }
            }
            if (filterType === 'project') {
                // プロジェクトフィルタの場合
                // プロジェクトが設定されていないタスクも除外
                if (!task.project || task.project !== filterValue) {
                    return false;
                }
            }
        }
        
        return true;
    });
    
    if (filteredTasks.length === 0) {
        taskList.innerHTML = '<p style="text-align: center; padding: 20px; color: #999;">該当するタスクがありません</p>';
        return;
    }
    
    // ソート処理があれば適用
    const sortBy = document.getElementById('sortBy').value;
    if (sortBy) {
        filteredTasks.sort((a, b) => {
            if (sortBy === 'priority') {
                const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
                const aPriority = priorityOrder[a.priority] !== undefined ? priorityOrder[a.priority] : 1;
                const bPriority = priorityOrder[b.priority] !== undefined ? priorityOrder[b.priority] : 1;
                return aPriority - bPriority;
            } else if (sortBy === 'startDate') {
                return (a.startDate || '').localeCompare(b.startDate || '');
            } else if (sortBy === 'endDate') {
                return (a.endDate || '').localeCompare(b.endDate || '');
            } else if (sortBy === 'status') {
                const statusOrder = ['未対応', '処理中', '処理完了', '終了'];
                return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
            }
            return 0;
        });
    }
    
        // タスク要素を作成して追加（非同期対応）
        for (const task of filteredTasks) {
            const taskElement = await createTaskElement(task);
            taskList.appendChild(taskElement);
        }
        
        if (filteredTasks.length === 0) {
            taskList.innerHTML = '<div class="no-tasks">表示するタスクがありません</div>';
        }
    } catch (error) {
        console.error('タスクデータ取得エラー:', error);
        const taskList = document.getElementById('taskList');
        taskList.innerHTML = '<div class="error-message">タスクの取得に失敗しました</div>';
    }
}

// ソート
window.applySorting = async function() {
    // フィルタリング処理に統合されたので、filterTasksを呼ぶだけ
    await filterTasks();
}

// タスクID検索
window.searchByTaskId = function() {
    const searchInput = document.getElementById('taskIdSearchInput');
    const taskId = searchInput.value.trim();
    
    if (!taskId) {
        alert('タスクIDを入力してください');
        return;
    }
    
    const task = dataManager.getTaskByTaskId(taskId);
    const taskList = document.getElementById('taskList');
    
    if (!task) {
        taskList.innerHTML = `<p style="text-align: center; padding: 20px; color: #e53e3e;">タスクID「${taskId}」は見つかりませんでした</p>`;
        return;
    }
    
    // 検索結果のタスクのみ表示
    taskList.innerHTML = '';
    const taskElement = createTaskElement(task);
    taskList.appendChild(taskElement);
    
    // タイトルを更新
    document.getElementById('taskBoxTitle').textContent = `検索結果: ${taskId}`;
}

// タスクID検索をクリア
window.clearTaskIdSearch = async function() {
    document.getElementById('taskIdSearchInput').value = '';
    document.getElementById('taskBoxTitle').textContent = 'すべてのタスク';
    document.getElementById('categoryFilter').value = 'all';
    await filterTasks();
}

// モーダル外クリックで閉じる
window.onclick = function(event) {
    if (event.target.className === 'modal') {
        event.target.style.display = 'none';
    }
    
    // 通知ドロップダウンの外クリックで閉じる
    const notificationContainer = document.querySelector('.notification-container');
    if (!notificationContainer.contains(event.target)) {
        document.getElementById('notificationDropdown').style.display = 'none';
    }
}

// 通知関連の関数
async function loadNotifications() {
    const currentUser = sessionStorage.getItem('userName') || sessionStorage.getItem('userId');
    const unreadNotifications = await dataManager.getUnreadNotifications(currentUser);
    const badge = document.getElementById('notificationBadge');
    
    if (unreadNotifications.length > 0) {
        badge.textContent = unreadNotifications.length;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
}

window.toggleNotifications = async function() {
    const dropdown = document.getElementById('notificationDropdown');
    const isVisible = dropdown.style.display === 'block';
    
    if (!isVisible) {
        await displayNotifications();
        dropdown.style.display = 'block';
    } else {
        dropdown.style.display = 'none';
    }
}

async function displayNotifications() {
    const currentUser = sessionStorage.getItem('userName') || sessionStorage.getItem('userId');
    const notifications = await dataManager.getNotifications(currentUser);
    const notificationList = document.getElementById('notificationList');
    
    if (notifications.length === 0) {
        notificationList.innerHTML = '<p class="no-notifications">新しい通知はありません</p>';
        return;
    }
    
    notificationList.innerHTML = '';
    
    // 新しい通知から表示
    notifications.reverse().forEach(notification => {
        const notificationItem = createNotificationElement(notification);
        notificationList.appendChild(notificationItem);
    });
}

function createNotificationElement(notification) {
    const div = document.createElement('div');
    div.className = 'notification-item';
    if (!notification.isRead) {
        div.classList.add('unread');
    }
    
    const task = dataManager.getTaskById(notification.taskId);
    if (!task) return div;
    
    let message = '';
    const details = notification.details;
    
    if (notification.type === 'created') {
        // タスク作成通知
        const priorityMap = {
            'high': '高',
            'medium': '中',
            'low': '低'
        };
        const priorityLabel = priorityMap[details.priority] || '中';
        
        message = `<strong>新しいタスクが割り当てられました</strong>`;
        message += `<br>タスク: ${details.taskName}`;
        message += `<br>優先度: ${priorityLabel}`;
        if (details.endDate) {
            message += `<br>期限: ${details.endDate}`;
        }
        message += `<br><span class="notification-meta">作成者: ${details.createdBy}</span>`;
    } else if (notification.type === 'update') {
        message = `<strong>${details.taskName}</strong>`;
        
        if (details.statusChange) {
            message += `<br>ステータス: ${details.statusChange.oldStatus} → ${details.statusChange.newStatus}`;
        }
        if (details.contentChanged) {
            message += '<br>内容が更新されました';
        }
        if (details.endDateChange) {
            const oldDate = details.endDateChange.oldDate || 'なし';
            const newDate = details.endDateChange.newDate || 'なし';
            message += `<br>終了日: ${oldDate} → ${newDate}`;
        }
        if (details.assigneeChange) {
            const oldAssignee = details.assigneeChange.oldAssignee || 'なし';
            const newAssignee = details.assigneeChange.newAssignee || 'なし';
            message += `<br>担当者: ${oldAssignee} → ${newAssignee}`;
        }
        
        message += `<br><span class="notification-meta">更新者: ${details.changedBy}</span>`;
    } else if (notification.type === 'comment') {
        message = `<strong>${details.taskName}</strong><br>新しいコメントが追加されました`;
        const commentedBy = details.commentedBy || notification.createdBy;
        message += `<br><span class="notification-meta">コメント者: ${commentedBy}</span>`;
    }
    
    const timeAgo = getTimeAgo(notification.timestamp);
    
    div.innerHTML = `
        <div class="notification-content" onclick="openTaskFromNotification(${notification.taskId}, ${notification.id})">
            ${message}
            <div class="notification-time">${timeAgo}</div>
        </div>
    `;
    
    return div;
}

function openTaskFromNotification(taskId, notificationId) {
    // 通知を既読にする
    dataManager.markNotificationAsRead(notificationId);
    
    // タスク詳細ページへ遷移（通知IDをパラメータとして追加）
    window.location.href = `task-detail.html?id=${taskId}&notificationId=${notificationId}`;
}

window.markAllAsRead = async function() {
    const currentUserId = sessionStorage.getItem('userId');
    const currentUserName = sessionStorage.getItem('userName');
    dataManager.markAllNotificationsAsRead(currentUserId, currentUserName);
    
    // UIを更新
    await loadNotifications();
    await displayNotifications();
}

function getTimeAgo(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const diff = Math.floor((now - date) / 1000); // 秒単位の差
    
    if (diff < 60) return 'たった今';
    if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}日前`;
    
    return date.toLocaleDateString('ja-JP');
}

// デバッグ機能
window.debugChatworkSettings = function() {
    console.log('=== Chatwork設定デバッグ ===');
    console.log('localStorage設定:');
    console.log('- enabled:', localStorage.getItem('chatworkEnabled'));
    console.log('- webhookUrl:', localStorage.getItem('chatworkWebhookUrl'));
    
    if (dataManager && dataManager.getChatworkSettings) {
        dataManager.getChatworkSettings().then(settings => {
            console.log('実際に使用される設定:', settings);
        }).catch(error => {
            console.error('設定取得エラー:', error);
        });
    }
};

// グローバルChatwork通知設定を有効化
window.enableChatworkNotificationGlobal = async function(webhookUrl) {
    if (!webhookUrl || !webhookUrl.trim()) {
        alert('Webhook URLを入力してください');
        return false;
    }
    
    try {
        if (dataManager.useFirestore) {
            // Firestoreに保存
            await dataManager.db.collection('settings').doc('chatwork').set({
                enabled: true,
                webhookUrl: webhookUrl.trim(),
                updatedAt: new Date().toISOString(),
                updatedBy: sessionStorage.getItem('userName') || 'unknown'
            });
            
            // キャッシュをクリア
            dataManager.chatworkSettingsCache = null;
            dataManager.chatworkSettingsCacheTime = 0;
            
            console.log('✅ Firestoreグローバル設定が保存されました');
            alert('Chatwork通知がグローバルに有効になりました。\n全てのデバイス・ユーザーでタスク作成・コメント追加時に通知が送信されます。');
            return true;
        } else {
            // ローカルストレージにフォールバック
            localStorage.setItem('chatworkEnabled', 'true');
            localStorage.setItem('chatworkWebhookUrl', webhookUrl.trim());
            console.log('⚠️ Firestoreが無効のため、ローカル設定のみ保存しました');
            alert('Chatwork通知が有効になりました（このデバイスのみ）。');
            return true;
        }
    } catch (error) {
        console.error('❌ Chatwork設定保存エラー:', error);
        alert('設定の保存に失敗しました: ' + error.message);
        return false;
    }
};

// グローバルChatwork通知設定を無効化
window.disableChatworkNotificationGlobal = async function() {
    try {
        if (dataManager.useFirestore) {
            // Firestoreから削除
            await dataManager.db.collection('settings').doc('chatwork').set({
                enabled: false,
                webhookUrl: '',
                updatedAt: new Date().toISOString(),
                updatedBy: sessionStorage.getItem('userName') || 'unknown'
            });
            
            // キャッシュをクリア
            dataManager.chatworkSettingsCache = null;
            dataManager.chatworkSettingsCacheTime = 0;
            
            console.log('✅ Firestoreグローバル設定が無効化されました');
            alert('Chatwork通知がグローバルに無効になりました。');
            return true;
        } else {
            // ローカルストレージから削除
            localStorage.setItem('chatworkEnabled', 'false');
            localStorage.removeItem('chatworkWebhookUrl');
            console.log('⚠️ Firestoreが無効のため、ローカル設定のみ削除しました');
            alert('Chatwork通知が無効になりました（このデバイスのみ）。');
            return true;
        }
    } catch (error) {
        console.error('❌ Chatwork設定削除エラー:', error);
        alert('設定の削除に失敗しました: ' + error.message);
        return false;
    }
};

// グローバルChatwork設定の確認
window.checkChatworkSettingsGlobal = async function() {
    try {
        const settings = await dataManager.getChatworkSettings();
        
        console.log('=== グローバルChatwork設定確認 ===');
        console.log('設定元:', settings.source);
        console.log('有効状態:', settings.enabled);
        console.log('Webhook URL:', settings.webhookUrl);
        
        if (settings.source === 'firestore') {
            console.log('✅ Firestoreからグローバル設定を読み込みました');
            alert(`Chatwork通知設定（グローバル）:\n\n有効: ${settings.enabled ? 'はい' : 'いいえ'}\nWebhook URL: ${settings.webhookUrl || '未設定'}\n\n全てのデバイス・ユーザーで共通の設定です。`);
        } else {
            console.log('⚠️ Firestoreが無効または設定なし、ローカル設定を使用');
            alert(`Chatwork通知設定（ローカル）:\n\n有効: ${settings.enabled ? 'はい' : 'いいえ'}\nWebhook URL: ${settings.webhookUrl || '未設定'}\n\nこのデバイスのみの設定です。`);
        }
        
        return settings;
    } catch (error) {
        console.error('❌ Chatwork設定確認エラー:', error);
        alert('設定の確認に失敗しました: ' + error.message);
        return null;
    }
};

// 設定管理用のヘルパー関数
window.setupChatworkNotification = function() {
    const webhookUrl = prompt('Google Apps Script (GAS) のWebhook URLを入力してください:\n\n例: https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec');
    
    if (webhookUrl && webhookUrl.trim()) {
        enableChatworkNotificationGlobal(webhookUrl.trim());
    }
};

// ローカル設定からFirestoreへのマイグレーション
window.migrateChatworkSettingsToFirestore = async function() {
    try {
        const localEnabled = localStorage.getItem('chatworkEnabled') === 'true';
        const localWebhookUrl = localStorage.getItem('chatworkWebhookUrl');
        
        if (!localEnabled || !localWebhookUrl) {
            console.log('⚠️ ローカル設定が見つかりません');
            alert('ローカルに有効なChatwork設定が見つかりません。');
            return false;
        }
        
        // Firestoreに設定を保存
        const success = await enableChatworkNotificationGlobal(localWebhookUrl);
        
        if (success) {
            console.log('✅ ローカル設定をFirestoreに移行しました');
            
            // 確認後、ローカル設定をクリア（必要に応じて）
            const clearLocal = confirm('Firestore移行が完了しました。\nローカル設定を削除しますか？\n（削除しても問題ありません）');
            if (clearLocal) {
                localStorage.removeItem('chatworkEnabled');
                localStorage.removeItem('chatworkWebhookUrl');
                console.log('✅ ローカル設定を削除しました');
            }
            
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('❌ マイグレーションエラー:', error);
        alert('設定の移行に失敗しました: ' + error.message);
        return false;
    }
};

// 初期化時の自動チェック（必要に応じて実行）
window.checkAndMigrateChatworkSettings = async function() {
    try {
        // 現在の設定を確認
        const settings = await dataManager.getChatworkSettings();
        
        // Firestoreに設定がなく、ローカルに設定がある場合
        if (settings.source === 'localStorage') {
            const localEnabled = localStorage.getItem('chatworkEnabled') === 'true';
            const localWebhookUrl = localStorage.getItem('chatworkWebhookUrl');
            
            if (localEnabled && localWebhookUrl && dataManager.useFirestore) {
                console.log('🔄 ローカル設定が検出されました。Firestoreへの移行が推奨されます。');
                
                const migrate = confirm('ローカルのChatwork設定が検出されました。\n全デバイスで通知を有効にするため、Firestoreに移行しますか？');
                if (migrate) {
                    await migrateChatworkSettingsToFirestore();
                }
            }
        }
    } catch (error) {
        console.error('⚠️ 設定チェック中にエラー:', error);
    }
};

