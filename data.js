// Firestore対応版データ管理クラス
class DataManager {
    constructor() {
        // 初期化状態の追跡
        this.isInitialized = false;
        this.migrationComplete = false;
        this.initializationPromise = this.initialize();
    }

    async initialize() {
        // Firestoreが利用可能かチェック
        // Firestoreモード有効化：複数デバイス間リアルタイム同期
        this.useFirestore = typeof firebase !== 'undefined' && firebase.firestore;
        
        if (this.useFirestore) {
            console.log('🔥 Firestoreモードで初期化を開始します');
            this.db = firebase.firestore();
            
            try {
                // Firebase接続確認
                console.log('🔗 Firebase接続を確認中...');
                await this.testFirestoreConnection();
                console.log('✅ Firebase接続成功');
                
                // Firestoreのセキュリティルール状態を確認
                await this.checkFirestoreAccess();
                
                // データ移行を確実に完了させる
                console.log('📦 データ移行を開始...');
                await this.migrateFromLocalStorageImproved();
                this.migrationComplete = true;
                console.log('✅ データ移行完了');
                
                // リアルタイムリスナー開始
                this.initializeRealtimeListeners();
                console.log('🔄 リアルタイム同期を開始しました');
                
            } catch (error) {
                console.error('❌ Firestore初期化エラー:', error);
                console.error('詳細:', {
                    message: error.message,
                    code: error.code,
                    stack: error.stack
                });
                
                // API有効化エラーの特別処理
                if (error.code === 'unavailable' || 
                    error.message.includes('Firestore API') ||
                    error.message.includes('has not been used') ||
                    error.message.includes('disabled')) {
                    
                    console.error('');
                    console.error('🚨 【Critical】Cloud Firestore APIが有効化されていません！');
                    console.error('');
                    console.error('📋 今すぐ以下の手順で有効化してください:');
                    console.error('1️⃣ API有効化URL:');
                    console.error('   https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=buzzlog-6fc74');
                    console.error('2️⃣ データベース作成URL:');
                    console.error('   https://console.firebase.google.com/project/buzzlog-6fc74/firestore');
                    console.error('');
                    console.error('⚡ 応急処置として現在はLocalStorageモードで動作します');
                    console.error('📝 API有効化後はページをリロードしてください');
                    console.error('');
                    
                    // API有効化診断ガイド
                    console.error('🔧 診断コマンド: await debugBuzzlog.diagnoseFirestoreAPI()');
                    console.error('📚 セットアップガイド: debugBuzzlog.showFirestoreSetupGuide()');
                    console.error('');
                    
                    // LocalStorageモードにフォールバック（APIエラーの場合のみ）
                    this.useFirestore = false;
                    console.log('⚡ LocalStorageモードにフォールバック...');
                    await this.initializeData();
                    return;
                    
                } else if (error.message.includes('権限')) {
                    console.error('💡 解決方法: Firebase Consoleでfirestoreのセキュリティルールを確認してください');
                    console.error('   https://console.firebase.google.com/project/buzzlog-6fc74/firestore/rules');
                } else if (error.message.includes('接続')) {
                    console.error('💡 解決方法: インターネット接続を確認してください');
                }
                
                // APIエラー以外は再スロー
                throw error;
            }
        } else {
            console.log('❌ LocalStorageモードで動作します（Firebase未利用）');
            console.log('Firebase利用可能:', typeof firebase !== 'undefined');
            console.log('Firestore利用可能:', typeof firebase !== 'undefined' && firebase.firestore);
            
            // LocalStorageモードの場合のみ初期化処理を実行
            await this.initializeData();
        }
        
        this.isInitialized = true;
        console.log('🎉 DataManager初期化完了');
    }

    // 初期化完了を待つ
    async waitForInitialization() {
        if (!this.isInitialized) {
            await this.initializationPromise;
        }
        return true;
    }

    // Firebase接続テスト
    async testFirestoreConnection() {
        try {
            // 軽量なテストクエリを実行
            await this.db.collection('_connection_test').limit(1).get();
            return true;
        } catch (error) {
            console.error('❌ Firebase接続エラー:', error);
            console.error('エラー詳細:', {
                code: error.code,
                message: error.message,
                stack: error.stack
            });
            
            // API有効化エラーの特別処理
            if (error.code === 'unavailable' || 
                error.message.includes('Firestore API') ||
                error.message.includes('has not been used') ||
                error.message.includes('disabled')) {
                throw new Error('Firestore API未有効化: Cloud Firestore APIが有効化されていません。');
                
            // より詳細なエラー情報を提供
            } else if (error.code === 'permission-denied') {
                throw new Error('Firebase権限エラー: データベースアクセスが拒否されました。Firestoreセキュリティルールを確認してください。');
            } else if (error.code === 'failed-precondition') {
                throw new Error('Firebase設定エラー: Firestoreが正しく初期化されていません。');
            } else {
                throw new Error('Firebase接続に失敗しました: ' + error.message);
            }
        }
    }
    
    // Firestoreアクセス権限チェック
    async checkFirestoreAccess() {
        console.log('🔐 Firestoreアクセス権限を確認中...');
        try {
            // 各コレクションへのアクセステスト
            const collections = ['tasks', 'persons', 'projects'];
            for (const collection of collections) {
                await this.db.collection(collection).limit(1).get();
                console.log(`✅ ${collection}コレクション: アクセス可能`);
            }
            return true;
        } catch (error) {
            if (error.code === 'permission-denied') {
                console.error('⚠️ Firestoreセキュリティルールが設定されていません');
                console.error('以下のコマンドでルールをデプロイしてください:');
                console.error('firebase deploy --only firestore:rules');
                throw new Error('Firestoreアクセス権限エラー: セキュリティルールを設定してください');
            }
            throw error;
        }
    }

    // 初期化処理
    async initializeData() {
        // LocalStorageの初期データを確保
        this.ensureLocalStorageInitialization();
        
        // 既存タスクのID移行
        this.migrateTaskIds();
        
        // 既存タスクの担当者を配列形式に移行
        this.migrateAssignees();
        
        // 初期データのセットアップ（Firestoreの場合）
        if (this.useFirestore) {
            await this.setupInitialFirestoreData();
        }
    }

    // LocalStorageの初期データを確保
    ensureLocalStorageInitialization() {
        // コメントデータの初期化
        if (!localStorage.getItem('comments')) {
            localStorage.setItem('comments', '[]');
            console.log('commentsデータを初期化しました');
        }
        
        // タスクデータの初期化
        if (!localStorage.getItem('tasks')) {
            localStorage.setItem('tasks', '[]');
            console.log('tasksデータを初期化しました');
        }
        
        // 人員データの初期化
        if (!localStorage.getItem('persons')) {
            localStorage.setItem('persons', '[]');
            console.log('personsデータを初期化しました');
        }
        
        // プロジェクトデータの初期化
        if (!localStorage.getItem('projects')) {
            localStorage.setItem('projects', '[]');
            console.log('projectsデータを初期化しました');
        }
        
        console.log('LocalStorageデータの初期化を完了しました');
    }

    // Firestoreの初期データセットアップ
    async setupInitialFirestoreData() {
        try {
            // 人員データの初期化チェック
            const personsSnapshot = await this.db.collection('persons').get();
            if (personsSnapshot.empty) {
                console.log('Firestoreに初期人員データをセットアップします');
                const defaultPersons = [
                    { id: '1001', name: '市村光希', loginId: 'ichimura', password: 'ichimura_piala1234', department: '', email: '', chatworkId: '' },
                    { id: '1002', name: '大谷凪沙', loginId: 'ohtani', password: 'ohtani_piala1234', department: '', email: '', chatworkId: '' },
                    { id: '1003', name: '牧野風音', loginId: 'makino', password: 'makino_1234', department: '', email: '', chatworkId: '' },
                    { id: '1004', name: '青木海燈', loginId: 'aoki', password: 'aoki_1234', department: '', email: '', chatworkId: '' },
                    { id: '1005', name: '村山太洋', loginId: 'murayama', password: 'murayama_1234', department: '', email: '', chatworkId: '' },
                    { id: '1006', name: '井上舞', loginId: 'inoue', password: 'inoue_1234', department: '', email: '', chatworkId: '' },
                    { id: '1007', name: '長野由愛', loginId: 'nagano', password: 'nagano_1234', department: '', email: '', chatworkId: '' },
                    { id: '1008', name: '上谷朋輝', loginId: 'kamiya', password: 'kamiya_1234', department: '', email: '', chatworkId: '' }
                ];
                
                const batch = this.db.batch();
                defaultPersons.forEach(person => {
                    const docRef = this.db.collection('persons').doc(person.id);
                    batch.set(docRef, person);
                });
                await batch.commit();
                console.log('初期人員データをFirestoreに保存しました');
            }
        } catch (error) {
            console.error('Firestore初期化エラー:', error);
        }
    }

    // LocalStorageからFirestoreへのデータ移行
    async migrateFromLocalStorage() {
        try {
            const migrationFlag = localStorage.getItem('firestore_migrated');
            if (migrationFlag === 'true') {
                console.log('データ移行済みです');
                return;
            }

            console.log('LocalStorageからFirestoreへデータを移行します');
            
            // タスクの移行
            const localTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
            if (localTasks.length > 0) {
                const batch = this.db.batch();
                localTasks.forEach(task => {
                    const docRef = this.db.collection('tasks').doc(String(task.id));
                    batch.set(docRef, {
                        ...task,
                        createdAt: task.createdAt || new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });
                });
                await batch.commit();
                console.log(`${localTasks.length}件のタスクを移行しました`);
            }

            // 人員データの移行
            const localPersons = JSON.parse(localStorage.getItem('persons') || '[]');
            if (localPersons.length > 0) {
                const batch = this.db.batch();
                localPersons.forEach(person => {
                    const docRef = this.db.collection('persons').doc(String(person.id));
                    batch.set(docRef, person);
                });
                await batch.commit();
                console.log(`${localPersons.length}件の人員データを移行しました`);
            }

            // プロジェクトの移行
            const localProjects = JSON.parse(localStorage.getItem('projects') || '[]');
            if (localProjects.length > 0) {
                const batch = this.db.batch();
                localProjects.forEach(project => {
                    const docRef = this.db.collection('projects').doc(String(project.id));
                    batch.set(docRef, project);
                });
                await batch.commit();
                console.log(`${localProjects.length}件のプロジェクトを移行しました`);
            }

            // 移行完了フラグを設定
            localStorage.setItem('firestore_migrated', 'true');
            console.log('Firestoreへのデータ移行が完了しました');
            
        } catch (error) {
            console.error('❌ データ移行エラー:', error);
            console.error('エラー詳細:', {
                code: error.code,
                message: error.message,
                stack: error.stack
            });
            
            // エラーの種類に応じた対処
            if (error.code === 'permission-denied') {
                throw new Error('Firebase権限エラー: データ移行権限がありません。管理者に連絡してください。');
            } else if (error.code === 'quota-exceeded') {
                throw new Error('Firestore容量エラー: データ容量が上限を超えています。');
            } else if (error.code === 'unavailable') {
                throw new Error('Firebase接続エラー: サービスが一時的に利用できません。しばらく後に再試行してください。');
            } else {
                throw new Error('データ移行に失敗しました: ' + error.message);
            }
        }
    }

    // リアルタイムリスナーの初期化
    initializeRealtimeListeners() {
        if (!this.useFirestore) {
            console.log('⚠️ Firestoreモードではないため、リアルタイムリスナーは初期化されません');
            return;
        }

        console.log('📡 Firestoreリアルタイムリスナーを初期化中...');

        // タスクのリアルタイム監視（エラーハンドリング付き）
        this.tasksUnsubscribe = this.db.collection('tasks').onSnapshot(
            async (snapshot) => {
                console.log('🔄 タスクデータが更新されました。変更数:', snapshot.docChanges().length);
                
                // 変更の詳細をログ出力
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        console.log('➕ 新規タスク:', change.doc.data().taskId || change.doc.id);
                    }
                    if (change.type === 'modified') {
                        console.log('📝 更新タスク:', change.doc.data().taskId || change.doc.id);
                    }
                    if (change.type === 'removed') {
                        console.log('🗑️ 削除タスク:', change.doc.data().taskId || change.doc.id);
                    }
                });

                // UIの更新をトリガー（非同期対応）
                try {
                    if (typeof loadTasks === 'function') {
                        await loadTasks();
                    }
                    if (typeof loadArchivedTasks === 'function' && document.getElementById('archiveSection')?.classList.contains('active')) {
                        await loadArchivedTasks();
                    }
                } catch (error) {
                    console.error('❌ リアルタイム更新エラー:', error);
                }
            },
            (error) => {
                console.error('❌ タスクリアルタイムリスナーエラー:', error);
                console.error('エラー詳細:', {
                    code: error.code,
                    message: error.message
                });
                
                // エラータイプに応じた対処
                if (error.code === 'permission-denied') {
                    console.error('💡 解決方法: Firestoreセキュリティルールを確認してください');
                } else if (error.code === 'unavailable') {
                    console.error('💡 解決方法: インターネット接続を確認してください');
                    // 5秒後にリトライ
                    setTimeout(() => {
                        console.log('🔄 タスクリスナーを再接続中...');
                        this.initializeRealtimeListeners();
                    }, 5000);
                }
            }
        );

        // 人員データのリアルタイム監視（エラーハンドリング付き）
        this.personsUnsubscribe = this.db.collection('persons').onSnapshot(
            (snapshot) => {
                console.log('👥 人員データが更新されました。変更数:', snapshot.docChanges().length);
                if (typeof loadPersonList === 'function') {
                    loadPersonList();
                }
            },
            (error) => {
                console.error('❌ 人員リアルタイムリスナーエラー:', error);
            }
        );

        // プロジェクトのリアルタイム監視（エラーハンドリング付き）
        this.projectsUnsubscribe = this.db.collection('projects').onSnapshot(
            (snapshot) => {
                console.log('📂 プロジェクトデータが更新されました。変更数:', snapshot.docChanges().length);
                if (typeof loadProjectList === 'function') {
                    loadProjectList();
                }
            },
            (error) => {
                console.error('❌ プロジェクトリアルタイムリスナーエラー:', error);
            }
        );

        console.log('✅ リアルタイムリスナーの初期化完了');
    }

    // リアルタイムリスナーの停止
    destroyRealtimeListeners() {
        if (this.tasksUnsubscribe) {
            this.tasksUnsubscribe();
            this.tasksUnsubscribe = null;
        }
        if (this.personsUnsubscribe) {
            this.personsUnsubscribe();
            this.personsUnsubscribe = null;
        }
        if (this.projectsUnsubscribe) {
            this.projectsUnsubscribe();
            this.projectsUnsubscribe = null;
        }
        console.log('🔌 リアルタイムリスナーを停止しました');
    }

    // タスク関連メソッド
    async getAllTasks() {
        if (this.useFirestore) {
            try {
                const snapshot = await this.db.collection('tasks').get();
                const tasks = snapshot.docs.map(doc => {
                    const data = doc.data();
                    // IDを文字列として統一
                    return { ...data, id: doc.id };
                });
                console.log(`📦 Firestoreから${tasks.length}件のタスクを取得`);
                return tasks;
            } catch (error) {
                console.error('❌ Firestore取得エラー:', error);
                console.error('エラー詳細:', {
                    code: error.code,
                    message: error.message
                });
                
                if (error.code === 'permission-denied') {
                    throw new Error('Firestore読み込み権限エラー: セキュリティルールを確認してください');
                }
                throw new Error('Firestoreからデータを取得できませんでした: ' + error.message);
            }
        } else {
            const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
            console.log(`💾 LocalStorageから${tasks.length}件のタスクを取得`);
            return tasks;
        }
    }

    async getTasks() {
        const allTasks = await this.getAllTasks();
        // アーカイブされていないタスクのみを返す
        return allTasks.filter(task => !task.archived);
    }

    async getArchivedTasks() {
        const allTasks = await this.getAllTasks();
        // アーカイブされたタスクのみを返す
        return allTasks.filter(task => task.archived);
    }

    // タスクID生成関数
    generateTaskId() {
        const today = new Date();
        const dateStr = today.toISOString().slice(0,10).replace(/-/g, '');
        
        // ランダムIDを生成
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let randomStr = '';
        for (let i = 0; i < 5; i++) {
            randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return `T-${dateStr}-${randomStr}`;
    }

    async saveTask(task) {
        // IDを文字列として生成
        task.id = String(Date.now());
        task.taskId = this.generateTaskId();
        task.createdAt = new Date().toISOString();
        task.status = '未対応'; // デフォルトステータスを設定
        task.history = [{
            action: 'created',
            date: task.createdAt,
            user: sessionStorage.getItem('userName') || 'Unknown'
        }];

        if (this.useFirestore) {
            try {
                // Firestoreに直接保存
                await this.db.collection('tasks').doc(task.id).set(task);
                console.log('✅ タスクをFirestoreに保存しました:', task.taskId);
                
                // リアルタイムリスナーがUIを更新するので、ここでは何もしない
                
            } catch (error) {
                console.error('❌ Firestore保存エラー:', error);
                throw new Error('Firestoreにタスクを保存できませんでした: ' + error.message);
            }
        } else {
            // LocalStorageモードの場合
            const allTasks = await this.getAllTasks();
            allTasks.push(task);
            localStorage.setItem('tasks', JSON.stringify(allTasks));
            console.log('💾 LocalStorageにタスクを保存しました:', task.taskId);
        }

        // タスク作成通知を作成（担当者に通知）
        const currentUser = sessionStorage.getItem('userId');
        const currentUserName = sessionStorage.getItem('userName') || currentUser;
        if (task.assignees && task.assignees.length > 0) {
            // 非同期で通知を作成（重複防止機能付き）
            task.assignees.forEach(async (assignee) => {
                // 作成者自身には通知しない
                if (assignee !== currentUserName && assignee !== currentUser) {
                    await this.createNotification(task.id, 'created', {
                        taskName: task.name,
                        taskId: task.taskId,
                        priority: task.priority || 'medium',
                        endDate: task.endDate,
                        createdBy: currentUserName,
                        notifyTo: assignee
                    });
                }
            });
        }

        // Chatwork通知を送信（ChatworkIDも含める）
        console.log('📨 タスク作成時のChatwork通知準備開始');
        const assigneeNames = task.assignees || [task.assignee];
        const persons = await this.getPersons();
        const assigneeChatworkIds = assigneeNames.map(name => {
            const person = persons.find(p => p.name === name);
            return person ? person.chatworkId : null;
        }).filter(id => id);

        console.log('📨 通知対象情報:', {
            assigneeNames,
            assigneeChatworkIds,
            taskId: task.taskId,
            createdBy: currentUserName
        });

        this.sendChatworkNotification('task_created', {
            id: task.id,
            taskId: task.taskId,
            taskName: task.name,
            assignees: assigneeNames,
            assigneeChatworkIds: assigneeChatworkIds,
            priority: task.priority || 'medium',
            endDate: task.endDate,
            createdBy: currentUserName
        });

        console.log('📨 Chatwork通知呼び出し完了');

        return task;
    }

    // Firestore用データサニタイズ機能（深い再帰対応）
    sanitizeFirestoreData(data) {
        console.log('🧹 データサニタイズ開始:', data);
        
        const deepSanitize = (obj) => {
            if (obj === undefined) {
                return null; // undefinedは除去フラグ
            }
            
            if (obj === null) {
                return ''; // nullは空文字に変換
            }
            
            if (Array.isArray(obj)) {
                // 配列の場合：各要素を再帰的にサニタイズ
                const sanitizedArray = obj.map(item => deepSanitize(item))
                    .filter(item => item !== null); // undefined除去フラグを持つ項目を除去
                console.log(`🔄 配列サニタイズ: ${obj.length}項目 → ${sanitizedArray.length}項目`);
                return sanitizedArray;
            }
            
            if (typeof obj === 'object' && obj !== null) {
                // オブジェクトの場合：各プロパティを再帰的にサニタイズ
                const sanitized = {};
                let removedCount = 0;
                
                Object.keys(obj).forEach(key => {
                    const sanitizedValue = deepSanitize(obj[key]);
                    if (sanitizedValue !== null) {
                        sanitized[key] = sanitizedValue;
                    } else {
                        console.log(`⚠️ undefined値を検出・除去: ${key}`);
                        removedCount++;
                    }
                });
                
                if (removedCount > 0) {
                    console.log(`🧹 オブジェクトから${removedCount}個のundefined値を除去`);
                }
                
                return sanitized;
            }
            
            // 文字列の処理
            if (typeof obj === 'string') {
                return obj.trim();
            }
            
            // プリミティブ値はそのまま返す
            return obj;
        };
        
        const result = deepSanitize(data);
        console.log('✅ データサニタイズ完了:', result);
        return result;
    }

    // データ検証機能
    validateTaskUpdates(updates) {
        const errors = [];
        
        console.log('🔍 データ検証開始:', updates);
        
        // 必須フィールドの検証
        if (updates.hasOwnProperty('type') && !updates.type) {
            errors.push('タスクタイプは必須です');
        }
        
        if (updates.hasOwnProperty('status') && !updates.status) {
            errors.push('ステータスは必須です');
        }
        
        // タスクタイプの検証
        if (updates.type && !['department', 'project', 'personal'].includes(updates.type)) {
            errors.push(`無効なタスクタイプ: ${updates.type}`);
        }
        
        // ステータスの検証
        if (updates.status && !['未対応', '処理中', '処理完了', '終了'].includes(updates.status)) {
            errors.push(`無効なステータス: ${updates.status}`);
        }
        
        // 優先度の検証
        if (updates.priority && !['high', 'medium', 'low'].includes(updates.priority)) {
            errors.push(`無効な優先度: ${updates.priority}`);
        }
        
        // 担当者の検証
        if (updates.assignees && !Array.isArray(updates.assignees)) {
            errors.push('担当者は配列である必要があります');
        }
        
        // 日付の検証
        if (updates.endDate && updates.endDate !== '') {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(updates.endDate)) {
                errors.push(`無効な日付形式: ${updates.endDate}`);
            }
        }
        
        // コンテンツの文字数制限
        if (updates.content && typeof updates.content === 'string' && updates.content.length > 5000) {
            errors.push('タスク内容は5000文字以下にしてください');
        }
        
        // プロジェクトタスクの場合のプロジェクト必須チェック
        if (updates.type === 'project' && (!updates.project || updates.project === '')) {
            errors.push('プロジェクトタスクにはプロジェクトの選択が必要です');
        }
        
        console.log('🔍 データ検証結果:', { 
            isValid: errors.length === 0, 
            errors: errors 
        });
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    async updateTask(taskId, updates) {
        const currentUserName = sessionStorage.getItem('userName') || 'Unknown';
        
        // IDを文字列として扱う
        taskId = String(taskId);
        
        console.log('🔄 updateTask開始:', { taskId, updates, currentUserName });
        
        if (this.useFirestore) {
            try {
                // 1. タスク存在確認
                const taskRef = this.db.collection('tasks').doc(taskId);
                console.log('📋 タスク参照取得:', taskRef.path);
                
                const doc = await taskRef.get();
                console.log('📄 ドキュメント取得結果:', { exists: doc.exists, id: doc.id });
                
                if (!doc.exists) {
                    console.error('❌ タスクが存在しません:', taskId);
                    throw new Error(`タスクが見つかりません: ${taskId}`);
                }
                
                const task = doc.data();
                console.log('📊 現在のタスクデータ:', { 
                    taskId: task.taskId, 
                    name: task.name,
                    status: task.status,
                    dataKeys: Object.keys(task)
                });
                
                // 2. データサニタイズ（undefined除去）
                const sanitizedUpdates = this.sanitizeFirestoreData(updates);
                console.log('🧹 サニタイズ後データ:', sanitizedUpdates);
                
                // 3. データ検証
                const validationResult = this.validateTaskUpdates(sanitizedUpdates);
                if (!validationResult.isValid) {
                    console.error('❌ データ検証失敗:', validationResult.errors);
                    throw new Error(`データ検証エラー: ${validationResult.errors.join(', ')}`);
                }
                
                // 4. 更新データの準備
                const history = task.history || [];
                let hasChanges = false;
                
                // 変更履歴を記録（サニタイズ済みデータを使用）
                Object.keys(sanitizedUpdates).forEach(key => {
                    if (JSON.stringify(task[key]) !== JSON.stringify(sanitizedUpdates[key])) {
                        hasChanges = true;
                        // oldValue/newValueのundefined値を空文字に変換
                        const safeOldValue = task[key] === undefined ? '' : task[key];
                        const safeNewValue = sanitizedUpdates[key] === undefined ? '' : sanitizedUpdates[key];
                        
                        history.push({
                            action: 'updated',
                            field: key,
                            oldValue: safeOldValue,
                            newValue: safeNewValue,
                            date: new Date().toISOString(),
                            user: currentUserName
                        });
                        console.log(`📝 変更検出: ${key} = ${safeOldValue} → ${safeNewValue}`);
                    }
                });
                
                if (!hasChanges) {
                    console.log('ℹ️ 変更がありません。更新をスキップします。');
                    return { id: taskId, ...task };
                }
                
                // 5. Firestore更新実行（サニタイズ済みデータを使用）
                console.log('📊 履歴データ詳細（サニタイズ前）:', JSON.stringify(history, null, 2));
                
                const updateData = this.sanitizeFirestoreData({
                    ...sanitizedUpdates,
                    history: history,
                    updatedAt: new Date().toISOString()
                });
                
                console.log('💾 Firestore更新データ（最終）:', JSON.stringify(updateData, null, 2));
                
                await taskRef.update(updateData);
                console.log('✅ Firestore更新成功');
                
                // 6. 更新後データの返却
                const updatedTask = { id: taskId, ...task, ...sanitizedUpdates };
                console.log('🎉 タスク更新完了:', { taskId: updatedTask.taskId, name: updatedTask.name });
                
                return updatedTask;
                
            } catch (error) {
                console.error('❌ Firestore更新エラー詳細:');
                console.error('- エラータイプ:', error.constructor.name);
                console.error('- エラーコード:', error.code);
                console.error('- エラーメッセージ:', error.message);
                console.error('- スタックトレース:', error.stack);
                
                // より具体的なエラーメッセージの生成
                let userFriendlyMessage = '';
                if (error.code === 'permission-denied') {
                    userFriendlyMessage = 'アクセス権限がありません。管理者に連絡してください。';
                } else if (error.code === 'unavailable') {
                    userFriendlyMessage = 'Firestoreサービスに接続できません。インターネット接続を確認してください。';
                } else if (error.code === 'not-found') {
                    userFriendlyMessage = `タスク(ID: ${taskId})が見つかりません。`;
                } else if (error.message.includes('データ検証エラー')) {
                    userFriendlyMessage = error.message;
                } else {
                    userFriendlyMessage = `予期しないエラーが発生しました: ${error.message}`;
                }
                
                throw new Error(userFriendlyMessage);
            }
        } else {
            // LocalStorage版の実装
            const tasks = await this.getAllTasks();
            const taskIndex = tasks.findIndex(t => t.id === taskId);
            
            if (taskIndex !== -1) {
                const task = tasks[taskIndex];
                const history = task.history || [];
                const currentUser = sessionStorage.getItem('userId');
                
                // 変更の詳細を記録
                const changes = {};
                let hasSignificantChanges = false;
                
                Object.keys(updates).forEach(key => {
                    if (task[key] !== updates[key]) {
                        history.push({
                            action: 'updated',
                            field: key,
                            oldValue: task[key],
                            newValue: updates[key],
                            date: new Date().toISOString(),
                            user: currentUserName
                        });
                        
                        // 重要な変更を記録（通知に使用）
                        if (['status', 'assignees', 'content', 'endDate', 'priority'].includes(key)) {
                            changes[key] = { oldValue: task[key], newValue: updates[key] };
                            hasSignificantChanges = true;
                        }
                    }
                });
                
                tasks[taskIndex] = { ...task, ...updates, history };
                localStorage.setItem('tasks', JSON.stringify(tasks));
                
                // 重要な変更があった場合、担当者に通知を作成
                if (hasSignificantChanges && task.assignees && task.assignees.length > 0) {
                    task.assignees.forEach(assignee => {
                        // 更新者自身には通知しない
                        if (assignee !== currentUserName && assignee !== currentUser) {
                            this.createNotification(taskId, 'update', {
                                taskName: task.name,
                                taskId: task.taskId,
                                changedBy: currentUserName,
                                changes: changes,
                                notifyTo: assignee
                            });
                        }
                    });
                }
                
                return tasks[taskIndex];
            }
        }
        return null;
    }

    async archiveTask(taskId) {
        return await this.updateTask(taskId, {
            archived: true,
            archivedAt: new Date().toISOString()
        });
    }

    async unarchiveTask(taskId) {
        if (this.useFirestore) {
            const taskRef = this.db.collection('tasks').doc(String(taskId));
            await taskRef.update({
                archived: false,
                archivedAt: firebase.firestore.FieldValue.delete()
            });
        } else {
            const tasks = await this.getAllTasks();
            const taskIndex = tasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                tasks[taskIndex].archived = false;
                delete tasks[taskIndex].archivedAt;
                localStorage.setItem('tasks', JSON.stringify(tasks));
            }
        }
        return true;
    }

    async deleteTask(taskId) {
        if (this.useFirestore) {
            try {
                await this.db.collection('tasks').doc(String(taskId)).delete();
                console.log('タスクを削除しました');
            } catch (error) {
                console.error('Firestore削除エラー:', error);
            }
        } else {
            const tasks = await this.getAllTasks();
            const filteredTasks = tasks.filter(t => t.id !== taskId);
            localStorage.setItem('tasks', JSON.stringify(filteredTasks));
        }
    }

    async getTaskById(taskId) {
        if (this.useFirestore) {
            try {
                const doc = await this.db.collection('tasks').doc(String(taskId)).get();
                if (doc.exists) {
                    return { id: doc.id, ...doc.data() };
                }
            } catch (error) {
                console.error('Firestore取得エラー:', error);
            }
        } else {
            const tasks = await this.getAllTasks();
            return tasks.find(t => t.id === parseInt(taskId));
        }
        return null;
    }

    async getTaskByTaskId(taskId) {
        if (this.useFirestore) {
            try {
                const snapshot = await this.db.collection('tasks')
                    .where('taskId', '==', taskId)
                    .limit(1)
                    .get();
                
                if (!snapshot.empty) {
                    const doc = snapshot.docs[0];
                    return { id: doc.id, ...doc.data() };
                }
            } catch (error) {
                console.error('Firestore検索エラー:', error);
            }
        } else {
            const tasks = await this.getAllTasks();
            return tasks.find(t => t.taskId === taskId);
        }
        return null;
    }

    // 人員関連メソッド
    async getPersons() {
        if (this.useFirestore) {
            try {
                const snapshot = await this.db.collection('persons').get();
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (error) {
                console.error('Firestore取得エラー:', error);
                return [];
            }
        } else {
            return JSON.parse(localStorage.getItem('persons') || '[]');
        }
    }

    async savePerson(person) {
        person.id = Date.now();
        
        if (this.useFirestore) {
            try {
                await this.db.collection('persons').doc(String(person.id)).set(person);
                console.log('人員をFirestoreに保存しました');
            } catch (error) {
                console.error('Firestore保存エラー:', error);
            }
        } else {
            const persons = await this.getPersons();
            persons.push(person);
            localStorage.setItem('persons', JSON.stringify(persons));
        }
    }

    async updatePerson(personId, updates) {
        if (this.useFirestore) {
            try {
                await this.db.collection('persons').doc(String(personId)).update(updates);
                console.log('人員情報を更新しました');
                return true;
            } catch (error) {
                console.error('Firestore更新エラー:', error);
                return false;
            }
        } else {
            const persons = await this.getPersons();
            // ID型の不整合に対応
            const index = persons.findIndex(p => p.id == personId || String(p.id) === String(personId));
            if (index !== -1) {
                persons[index] = { ...persons[index], ...updates };
                localStorage.setItem('persons', JSON.stringify(persons));
                return true;
            }
            return false;
        }
    }

    async deletePerson(personId) {
        if (this.useFirestore) {
            try {
                await this.db.collection('persons').doc(String(personId)).delete();
                console.log('人員を削除しました');
            } catch (error) {
                console.error('Firestore削除エラー:', error);
            }
        } else {
            const persons = await this.getPersons();
            // ID型の不整合に対応
            const filteredPersons = persons.filter(p => p.id != personId && String(p.id) !== String(personId));
            localStorage.setItem('persons', JSON.stringify(filteredPersons));
        }
    }

    // プロジェクト関連メソッド
    async getProjects() {
        if (this.useFirestore) {
            try {
                const snapshot = await this.db.collection('projects').get();
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (error) {
                console.error('Firestore取得エラー:', error);
                return [];
            }
        } else {
            return JSON.parse(localStorage.getItem('projects') || '[]');
        }
    }

    async saveProject(project) {
        project.id = Date.now();
        
        if (this.useFirestore) {
            try {
                await this.db.collection('projects').doc(String(project.id)).set(project);
                console.log('プロジェクトをFirestoreに保存しました');
            } catch (error) {
                console.error('Firestore保存エラー:', error);
            }
        } else {
            const projects = await this.getProjects();
            projects.push(project);
            localStorage.setItem('projects', JSON.stringify(projects));
        }
    }

    async updateProject(projectId, updates) {
        if (this.useFirestore) {
            try {
                await this.db.collection('projects').doc(String(projectId)).update(updates);
                console.log('プロジェクト情報を更新しました');
                return true;
            } catch (error) {
                console.error('Firestore更新エラー:', error);
                return false;
            }
        } else {
            const projects = await this.getProjects();
            // ID型の不整合に対応
            const index = projects.findIndex(p => p.id == projectId || String(p.id) === String(projectId));
            if (index !== -1) {
                projects[index] = { ...projects[index], ...updates };
                localStorage.setItem('projects', JSON.stringify(projects));
                return true;
            }
            return false;
        }
    }

    async deleteProject(projectId) {
        if (this.useFirestore) {
            try {
                await this.db.collection('projects').doc(String(projectId)).delete();
                console.log('プロジェクトを削除しました');
            } catch (error) {
                console.error('Firestore削除エラー:', error);
            }
        } else {
            const projects = await this.getProjects();
            // ID型の不整合に対応
            const filteredProjects = projects.filter(p => p.id != projectId && String(p.id) !== String(projectId));
            localStorage.setItem('projects', JSON.stringify(filteredProjects));
        }
    }

    // コメント関連メソッド（非同期対応）
    async getComments(taskId) {
        if (this.useFirestore) {
            try {
                const snapshot = await this.db.collection('comments')
                    .where('taskId', '==', taskId)
                    .orderBy('createdAt', 'desc')
                    .get();
                
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (error) {
                console.error('Firestore取得エラー:', error);
                return [];
            }
        } else {
            try {
                const commentsData = localStorage.getItem('comments') || '[]';
                console.log('commentsData取得:', commentsData);
                
                const comments = JSON.parse(commentsData);
                console.log('comments解析結果:', comments, '型:', typeof comments, '配列？:', Array.isArray(comments));
                
                // 配列でない場合は空配列を返す
                if (!Array.isArray(comments)) {
                    console.warn('commentsが配列でありません。空配列を返します。');
                    return [];
                }
                
                // taskIdの型変換対応
                return comments.filter(c => c && (c.taskId === taskId || String(c.taskId) === String(taskId)));
            } catch (error) {
                console.error('コメントデータ取得エラー:', error);
                return [];
            }
        }
    }

    async saveComment(comment) {
        comment.id = Date.now();
        comment.createdAt = new Date().toISOString();
        
        if (this.useFirestore) {
            try {
                await this.db.collection('comments').doc(String(comment.id)).set(comment);
                console.log('コメントをFirestoreに保存しました');
                
                // タスクの更新時刻を更新
                await this.db.collection('tasks').doc(String(comment.taskId)).update({
                    updatedAt: new Date().toISOString()
                });
            } catch (error) {
                console.error('Firestore保存エラー:', error);
            }
        } else {
            const comments = JSON.parse(localStorage.getItem('comments') || '[]');
            comments.push(comment);
            localStorage.setItem('comments', JSON.stringify(comments));
        }

        // コメント追加通知を作成（担当者に通知）
        const currentUser = sessionStorage.getItem('userId');
        const currentUserName = sessionStorage.getItem('userName') || currentUser;
        const task = await this.getTaskById(comment.taskId);
        
        if (task && task.assignees && task.assignees.length > 0) {
            // 全担当者に通知を作成（コメント作成者以外）重複防止機能付き
            task.assignees.forEach(async (assignee) => {
                if (currentUserName !== assignee && currentUser !== assignee) {
                    await this.createNotification(comment.taskId, 'comment', {
                        commentText: comment.text,
                        taskName: task.name,
                        commentedBy: currentUserName,
                        notifyTo: assignee
                    });
                }
            });
        }

        // Chatwork通知を送信（ChatworkIDも含める）
        if (task && task.assignees) {
            const persons = await this.getPersons();
            const assigneeChatworkIds = task.assignees.map(name => {
                const person = persons.find(p => p.name === name);
                return person ? person.chatworkId : null;
            }).filter(id => id);

            this.sendChatworkNotification('comment_added', {
                id: task.id,
                taskId: task.taskId,
                taskName: task.name,
                assignees: task.assignees,
                assigneeChatworkIds: assigneeChatworkIds,
                comment: comment.text,
                commentedBy: currentUserName
            });
        }
        
        return comment;
    }

    // 既読管理（非同期対応）
    async markCommentAsRead(commentId, userId) {
        if (this.useFirestore) {
            try {
                const commentRef = this.db.collection('comments').doc(String(commentId));
                const doc = await commentRef.get();
                
                if (doc.exists) {
                    const readBy = doc.data().readBy || [];
                    if (!readBy.includes(userId)) {
                        readBy.push(userId);
                        await commentRef.update({ readBy });
                        console.log('📖 Firestoreでコメント既読更新:', commentId, 'ユーザー:', userId);
                        return true;
                    } else {
                        console.log('📖 既に既読済み:', commentId);
                        return true;
                    }
                } else {
                    console.error('❌ コメントが見つかりません:', commentId);
                    return false;
                }
            } catch (error) {
                console.error('❌ Firestore既読更新エラー:', error);
                return false;
            }
        } else {
            const comments = JSON.parse(localStorage.getItem('comments') || '[]');
            const comment = comments.find(c => c.id === commentId);
            if (comment) {
                if (!comment.readBy) comment.readBy = [];
                if (!comment.readBy.includes(userId)) {
                    comment.readBy.push(userId);
                }
                localStorage.setItem('comments', JSON.stringify(comments));
                console.log('📖 LocalStorageでコメント既読更新:', commentId);
                return true;
            } else {
                console.error('❌ LocalStorageでコメントが見つかりません:', commentId);
                return false;
            }
        }
    }

    async hasUnreadComments(taskId, userId) {
        const comments = await this.getComments(taskId);
        if (comments.length === 0) return false;
        
        return comments.some(comment => {
            const readBy = comment.readBy || [];
            return !readBy.includes(userId);
        });
    }

    // 既存メソッドの移行処理
    migrateTaskIds() {
        // Firestoreの場合は移行不要
        if (this.useFirestore) return;
        
        // LocalStorage版の既存処理
        const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        let needsUpdate = false;
        
        tasks.forEach(task => {
            if (!task.taskId) {
                task.taskId = this.generateTaskId();
                needsUpdate = true;
            }
        });
        
        if (needsUpdate) {
            localStorage.setItem('tasks', JSON.stringify(tasks));
            console.log('既存タスクにタスクIDを付与しました');
        }
    }

    migrateAssignees() {
        // Firestoreの場合は移行不要
        if (this.useFirestore) return;
        
        // LocalStorage版の既存処理
        const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        let needsUpdate = false;
        
        tasks.forEach(task => {
            if (task.assignee && !Array.isArray(task.assignees)) {
                task.assignees = [task.assignee];
                delete task.assignee;
                needsUpdate = true;
            }
        });
        
        if (needsUpdate) {
            localStorage.setItem('tasks', JSON.stringify(tasks));
            console.log('既存タスクの担当者を配列形式に移行しました');
        }
    }

    // 担当者カラーマッピング
    getAssigneeColorMapping() {
        // Firestoreの場合は動的に生成
        if (this.useFirestore) {
            return this.generateDynamicColorMapping();
        }
        
        // LocalStorage版
        const persons = JSON.parse(localStorage.getItem('persons') || '[]');
        const colors = [
            'blue', 'green', 'purple', 'orange', 'pink', 'teal', 
            'red', 'indigo', 'amber', 'cyan', 'lime', 'rose',
            'slate', 'emerald', 'sky', 'violet', 'fuchsia', 'yellow', 'gray', 'stone'
        ];
        
        const mapping = {};
        persons.forEach((person, index) => {
            mapping[person.name] = colors[index % colors.length];
        });
        
        return mapping;
    }

    async generateDynamicColorMapping() {
        const persons = await this.getPersons();
        const colors = [
            'blue', 'green', 'purple', 'orange', 'pink', 'teal', 
            'red', 'indigo', 'amber', 'cyan', 'lime', 'rose',
            'slate', 'emerald', 'sky', 'violet', 'fuchsia', 'yellow', 'gray', 'stone'
        ];
        
        const mapping = {};
        persons.forEach((person, index) => {
            mapping[person.name] = colors[index % colors.length];
        });
        
        return mapping;
    }

    // 通知関連メソッド
    async getNotifications(userId) {
        if (this.useFirestore) {
            try {
                const snapshot = await this.db.collection('notifications').get();
                const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const tasks = await this.getAllTasks();
                const userName = sessionStorage.getItem('userName') || userId;
                
                // 現在のユーザーが担当者のタスクに関する通知のみフィルタリング
                return notifications.filter(notif => {
                    const task = tasks.find(t => t.id === notif.taskId);
                    return task && (
                        (task.assignees && (task.assignees.includes(userId) || task.assignees.includes(userName))) ||
                        (notif.details && (notif.details.notifyTo === userId || notif.details.notifyTo === userName)) ||
                        (task.assignee === userId || task.assignee === userName) // 後方互換性
                    );
                });
            } catch (error) {
                console.error('Firestore通知取得エラー:', error);
                return [];
            }
        } else {
            const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
            const tasks = await this.getAllTasks();
            const userName = sessionStorage.getItem('userName') || userId;
            
            // 現在のユーザーが担当者のタスクに関する通知のみフィルタリング
            // userIdまたはuserNameでマッチング
            return notifications.filter(notif => {
                const task = tasks.find(t => t.id === notif.taskId);
                return task && (
                    (task.assignees && (task.assignees.includes(userId) || task.assignees.includes(userName))) ||
                    (notif.details && (notif.details.notifyTo === userId || notif.details.notifyTo === userName)) ||
                    (task.assignee === userId || task.assignee === userName) // 後方互換性
                );
            });
        }
    }

    async getUnreadNotifications(userId) {
        const notifications = await this.getNotifications(userId);
        return notifications.filter(n => !n.isRead);
    }

    async createNotification(taskId, type, details) {
        if (this.useFirestore) {
            try {
                // 重複防止のためのユニークIDを生成
                const uniqueId = `${taskId}_${type}_${details.notifyTo || 'all'}_${Date.now()}`;
                const notificationId = this.generateUniqueId(uniqueId);
                
                // 既存の同じ通知がないかチェック（重複防止）
                const isDuplicate = await this.checkDuplicateNotification(taskId, type, details);
                if (isDuplicate) {
                    console.log('🔄 重複通知をスキップしました:', { taskId, type, notifyTo: details.notifyTo });
                    return null;
                }
                
                const notification = {
                    id: notificationId,
                    taskId: taskId,
                    type: type, // 'update', 'comment', 'status', 'created'
                    details: details,
                    timestamp: new Date().toISOString(),
                    isRead: false,
                    createdBy: sessionStorage.getItem('userId')
                };
                
                await this.db.collection('notifications').doc(String(notification.id)).set(notification);
                console.log('📬 通知を作成しました:', { taskId, type, notifyTo: details.notifyTo });
                
                // デバッグ: Chatwork通知の状態確認
                const chatworkEnabled = localStorage.getItem('chatworkEnabled') === 'true';
                const webhookUrl = localStorage.getItem('chatworkWebhookUrl');
                console.log('🔍 createNotification内でのChatwork設定:', {
                    enabled: chatworkEnabled,
                    hasWebhookUrl: !!webhookUrl,
                    type: type
                });
                
                // Chatwork未設定の場合は設定手順を表示
                if (!chatworkEnabled || !webhookUrl) {
                    console.log('');
                    console.log('🔧 Chatwork通知を有効にするには:');
                    console.log('1. checkChatworkSettings(); // 現在の設定確認');
                    console.log('2. enableChatworkNotification("YOUR_GAS_WEBAPP_URL"); // 通知有効化');
                    console.log('3. testChatworkNotification(); // テスト送信');
                    console.log('');
                }
                
                return notification;
            } catch (error) {
                console.error('Firestore通知作成エラー:', error);
            }
        } else {
            const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
            
            const notification = {
                id: Date.now(),
                taskId: taskId,
                type: type, // 'update', 'comment', 'status', 'created'
                details: details,
                timestamp: new Date().toISOString(),
                isRead: false,
                createdBy: sessionStorage.getItem('userId')
            };
            
            notifications.push(notification);
            localStorage.setItem('notifications', JSON.stringify(notifications));
            return notification;
        }
    }

    // 重複通知チェック機能
    async checkDuplicateNotification(taskId, type, details) {
        if (!this.useFirestore) return false;
        
        try {
            const currentUser = sessionStorage.getItem('userId');
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            
            // 最もシンプルなクエリ（インデックス完全不要）
            const duplicateQuery = this.db.collection('notifications')
                .where('taskId', '==', String(taskId))
                .limit(10);
            
            const snapshot = await duplicateQuery.get();
            
            // クライアント側でフィルタリング
            const matchingDocs = snapshot.docs.filter(doc => {
                const data = doc.data();
                return data.createdBy === currentUser && 
                       data.type === type &&
                       data.timestamp > fiveMinutesAgo;
            });
            
            // コメント通知の場合は特に厳密にチェック
            if (type === 'comment' && details.commentText) {
                const exactMatch = matchingDocs.find(doc => {
                    const data = doc.data();
                    return data.details && 
                           data.details.commentText === details.commentText &&
                           data.details.notifyTo === details.notifyTo;
                });
                if (exactMatch) {
                    console.log('🔄 同一コメントの重複通知を検出:', details.commentText.substring(0, 30));
                    return true;
                }
            }
            
            return matchingDocs.length > 0;
            
        } catch (error) {
            console.warn('⚠️ 重複チェック処理でエラーが発生しました。重複チェックをスキップして続行します。');
            console.debug('重複チェックエラー詳細:', error.message);
            return false; // エラー時は重複チェックをスキップして安全に続行
        }
    }

    // ユニークID生成
    generateUniqueId(baseString) {
        // baseStringをハッシュ化して短縮
        let hash = 0;
        for (let i = 0; i < baseString.length; i++) {
            const char = baseString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 32bit integer
        }
        
        // ランダム要素を追加
        const random = Math.random().toString(36).substring(2, 8);
        return Math.abs(hash).toString(36) + random;
    }

    markNotificationAsRead(notificationId) {
        if (this.useFirestore) {
            try {
                this.db.collection('notifications').doc(String(notificationId)).update({
                    isRead: true,
                    readAt: new Date().toISOString()
                });
                return true;
            } catch (error) {
                console.error('Firestore通知既読エラー:', error);
                return null;
            }
        } else {
            const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
            const index = notifications.findIndex(n => n.id === notificationId);
            
            if (index !== -1) {
                notifications[index].isRead = true;
                localStorage.setItem('notifications', JSON.stringify(notifications));
                return notifications[index];
            }
            return null;
        }
    }

    async markAllNotificationsAsRead(userId, userName) {
        if (this.useFirestore) {
            try {
                const notifications = await this.getNotifications(userId);
                const batch = this.db.batch();
                
                notifications.forEach(notif => {
                    if (!notif.isRead) {
                        const docRef = this.db.collection('notifications').doc(String(notif.id));
                        batch.update(docRef, {
                            isRead: true,
                            readAt: new Date().toISOString()
                        });
                    }
                });
                
                await batch.commit();
                console.log('全通知を既読にしました');
            } catch (error) {
                console.error('Firestore全通知既読エラー:', error);
            }
        } else {
            const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
            const tasks = this.getAllTasks();
            
            notifications.forEach(notif => {
                const task = tasks.find(t => t.id === notif.taskId);
                if (task && (
                    (task.assignees && (task.assignees.includes(userId) || task.assignees.includes(userName))) ||
                    (notif.details && (notif.details.notifyTo === userId || notif.details.notifyTo === userName)) ||
                    (task.assignee === userId || task.assignee === userName) // 後方互換性
                )) {
                    notif.isRead = true;
                }
            });
            
            localStorage.setItem('notifications', JSON.stringify(notifications));
        }
    }

    async clearOldNotifications() {
        if (this.useFirestore) {
            try {
                const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                const snapshot = await this.db.collection('notifications')
                    .where('timestamp', '<', oneWeekAgo.toISOString())
                    .get();
                
                if (!snapshot.empty) {
                    const batch = this.db.batch();
                    snapshot.docs.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                    await batch.commit();
                    console.log(`${snapshot.size}件の古い通知を削除しました`);
                }
            } catch (error) {
                console.error('Firestore古い通知削除エラー:', error);
            }
        } else {
            const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
            const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            
            const filteredNotifications = notifications.filter(n => {
                return new Date(n.timestamp) > oneWeekAgo;
            });
            
            localStorage.setItem('notifications', JSON.stringify(filteredNotifications));
        }
    }

    // Chatwork設定をFirestoreから取得（キャッシュ付き）
    chatworkSettingsCache = null;
    chatworkSettingsCacheTime = 0;
    
    async getChatworkSettings() {
        // 5分間キャッシュ
        const CACHE_DURATION = 5 * 60 * 1000;
        const now = Date.now();
        
        if (this.chatworkSettingsCache && (now - this.chatworkSettingsCacheTime) < CACHE_DURATION) {
            return this.chatworkSettingsCache;
        }
        
        try {
            if (this.useFirestore) {
                // Firestoreから設定を取得
                const settingsDoc = await this.db.collection('settings').doc('chatwork').get();
                if (settingsDoc.exists) {
                    const firestoreSettings = settingsDoc.data();
                    this.chatworkSettingsCache = {
                        enabled: firestoreSettings.enabled || false,
                        webhookUrl: firestoreSettings.webhookUrl || '',
                        source: 'firestore'
                    };
                    this.chatworkSettingsCacheTime = now;
                    console.log('📋 Firestore設定を読み込みました:', this.chatworkSettingsCache);
                    return this.chatworkSettingsCache;
                }
            }
        } catch (error) {
            console.warn('Firestore設定読み込みエラー:', error.message);
        }
        
        // Firestoreにない場合は後方互換性でlocalStorageを確認
        const localEnabled = localStorage.getItem('chatworkEnabled') === 'true';
        const localWebhookUrl = localStorage.getItem('chatworkWebhookUrl') || '';
        
        this.chatworkSettingsCache = {
            enabled: localEnabled,
            webhookUrl: localWebhookUrl,
            source: 'localStorage'
        };
        this.chatworkSettingsCacheTime = now;
        console.log('📋 localStorage設定を読み込みました:', this.chatworkSettingsCache);
        return this.chatworkSettingsCache;
    }

    // Chatwork通知送信関数
    async sendChatworkNotification(type, data) {
        console.log('🔔 Chatwork通知送信開始:', type);
        
        // Firestore/localStorage統合設定を取得
        const settings = await this.getChatworkSettings();
        
        console.log('📋 Chatwork設定確認:');
        console.log('  - 有効状態:', settings.enabled ? '✅ 有効' : '❌ 無効');
        console.log('  - Webhook URL:', settings.webhookUrl ? '✅ 設定済み' : '❌ 未設定');
        console.log('  - 設定元:', settings.source);
        
        if (!settings.enabled) {
            console.log('⚠️ Chatwork通知が無効のため送信をスキップします');
            return;
        }
        
        if (!settings.webhookUrl) {
            console.log('⚠️ Webhook URLが設定されていないため送信をスキップします');
            return;
        }
        
        const payload = {
            type: type,
            ...data,
            timestamp: new Date().toISOString()
        };
        
        console.log('📤 送信データ:', payload);
        
        // 非同期でWebhookに送信（エラーが発生しても処理を継続）
        fetch(settings.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: JSON.stringify(payload)
        }).then(response => {
            console.log('✅ Chatwork通知送信完了:', response.status);
        }).catch(error => {
            console.error('❌ Chatwork通知送信エラー:', error);
            // エラーが発生してもUIには影響させない
        });
    }

    // データ復旧・デバッグ用ユーティリティ
    async debugDataStatus() {
        console.log('=== データ状況デバッグ ===');
        
        // LocalStorage確認
        const migrationFlag = localStorage.getItem('firestore_migrated');
        const localTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        const localPersons = JSON.parse(localStorage.getItem('persons') || '[]');
        const localProjects = JSON.parse(localStorage.getItem('projects') || '[]');
        
        console.log('移行フラグ:', migrationFlag);
        console.log('LocalStorage - タスク数:', localTasks.length);
        console.log('LocalStorage - 人員数:', localPersons.length);
        console.log('LocalStorage - プロジェクト数:', localProjects.length);
        
        if (this.useFirestore) {
            try {
                const firestoreTasks = await this.db.collection('tasks').get();
                const firestorePersons = await this.db.collection('persons').get();
                const firestoreProjects = await this.db.collection('projects').get();
                
                console.log('Firestore - タスク数:', firestoreTasks.size);
                console.log('Firestore - 人員数:', firestorePersons.size);
                console.log('Firestore - プロジェクト数:', firestoreProjects.size);
                
                return {
                    migrationFlag,
                    localStorage: {
                        tasks: localTasks.length,
                        persons: localPersons.length,
                        projects: localProjects.length
                    },
                    firestore: {
                        tasks: firestoreTasks.size,
                        persons: firestorePersons.size,
                        projects: firestoreProjects.size
                    }
                };
            } catch (error) {
                console.error('Firestore確認エラー:', error);
            }
        }
    }

    // 移行フラグをリセットして強制再移行
    async forceReMigration() {
        console.log('=== 強制再移行を開始 ===');
        
        // 移行フラグをリセット
        localStorage.removeItem('firestore_migrated');
        console.log('移行フラグをリセットしました');
        
        // データ状況を確認
        await this.debugDataStatus();
        
        // 再移行実行
        if (this.useFirestore) {
            await this.migrateFromLocalStorage();
        }
        
        // 移行後の状況確認
        await this.debugDataStatus();
    }

    // 改善された移行ロジック
    async migrateFromLocalStorageImproved() {
        try {
            const migrationFlag = localStorage.getItem('firestore_migrated');
            console.log('移行フラグ確認:', migrationFlag);
            
            // Firestoreのデータ存在確認
            const existingTasks = await this.db.collection('tasks').limit(1).get();
            const existingPersons = await this.db.collection('persons').limit(1).get();
            
            console.log('Firestore既存データ - タスク:', existingTasks.size, '人員:', existingPersons.size);
            
            // LocalStorageデータ確認
            const localTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
            const localPersons = JSON.parse(localStorage.getItem('persons') || '[]');
            const localProjects = JSON.parse(localStorage.getItem('projects') || '[]');
            
            console.log('LocalStorageデータ - タスク:', localTasks.length, '人員:', localPersons.length, 'プロジェクト:', localProjects.length);
            
            // 移行が必要かどうかの判定を改善
            const shouldMigrate = migrationFlag !== 'true' || 
                                 (existingTasks.empty && localTasks.length > 0) ||
                                 (existingPersons.empty && localPersons.length > 0);
            
            if (!shouldMigrate) {
                console.log('移行不要：Firestoreにデータが存在し、移行完了済み');
                return;
            }
            
            console.log('LocalStorageからFirestoreへデータを移行します');
            
            // タスクの移行（改善版）
            if (localTasks.length > 0 && existingTasks.empty) {
                const batch = this.db.batch();
                localTasks.forEach(task => {
                    const docRef = this.db.collection('tasks').doc(String(task.id));
                    batch.set(docRef, {
                        ...task,
                        createdAt: task.createdAt || new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });
                });
                await batch.commit();
                console.log(`✓ ${localTasks.length}件のタスクを移行しました`);
            }

            // 人員データの移行（改善版）
            if (localPersons.length > 0 && existingPersons.empty) {
                const batch = this.db.batch();
                localPersons.forEach(person => {
                    const docRef = this.db.collection('persons').doc(String(person.id));
                    batch.set(docRef, person);
                });
                await batch.commit();
                console.log(`✓ ${localPersons.length}件の人員データを移行しました`);
            }

            // プロジェクトの移行（改善版）
            if (localProjects.length > 0) {
                const existingProjects = await this.db.collection('projects').limit(1).get();
                if (existingProjects.empty) {
                    const batch = this.db.batch();
                    localProjects.forEach(project => {
                        const docRef = this.db.collection('projects').doc(String(project.id));
                        batch.set(docRef, project);
                    });
                    await batch.commit();
                    console.log(`✓ ${localProjects.length}件のプロジェクトを移行しました`);
                }
            }

            // 移行完了フラグをFirestoreとLocalStorage両方に設定
            await this.db.collection('_system').doc('migration').set({
                migrated: true,
                migratedAt: new Date().toISOString(),
                migratedBy: sessionStorage.getItem('userId') || 'system'
            });
            localStorage.setItem('firestore_migrated', 'true');
            console.log('✓ Firestoreへのデータ移行が完了しました（Firestore統一管理開始）');
            
        } catch (error) {
            console.error('❌ データ移行エラー:', error);
            // エラー時は移行フラグを削除してリトライ可能にする
            localStorage.removeItem('firestore_migrated');
        }
    }
}

// グローバルインスタンスの作成
const dataManager = new DataManager();