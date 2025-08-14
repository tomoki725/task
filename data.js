// データ管理モジュール
class DataManager {
    constructor() {
        this.initializeData();
    }

    initializeData() {
        // タスクデータの初期化
        if (!localStorage.getItem('tasks')) {
            localStorage.setItem('tasks', JSON.stringify([]));
        } else {
            // 既存タスクにタスクIDを付与（移行処理）
            this.migrateTaskIds();
        }

        // 人員マスターの初期化（デフォルト人員を含む）
        if (!localStorage.getItem('persons')) {
            const defaultPersons = [
                { id: 1001, name: '市村光希', loginId: 'ichimura', password: 'ichimura_piala1234', department: '', email: '', chatworkId: '' },
                { id: 1002, name: '大谷凪沙', loginId: 'ohtani', password: 'ohtani_piala1234', department: '', email: '', chatworkId: '' },
                { id: 1003, name: '牧野風音', loginId: 'makino', password: 'makino_1234', department: '', email: '', chatworkId: '' },
                { id: 1004, name: '青木海燈', loginId: 'aoki', password: 'aoki_1234', department: '', email: '', chatworkId: '' },
                { id: 1005, name: '村山太洋', loginId: 'murayama', password: 'murayama_1234', department: '', email: '', chatworkId: '' },
                { id: 1006, name: '井上舞', loginId: 'inoue', password: 'inoue_1234', department: '', email: '', chatworkId: '' },
                { id: 1007, name: '長野由愛', loginId: 'nagano', password: 'nagano_1234', department: '', email: '', chatworkId: '' },
                { id: 1008, name: '上谷朋輝', loginId: 'kamiya', password: 'kamiya_1234', department: '', email: '', chatworkId: '' }
            ];
            localStorage.setItem('persons', JSON.stringify(defaultPersons));
        } else {
            // 既存データがある場合、デフォルト人員が含まれているか確認
            this.ensureDefaultPersons();
        }

        // プロジェクトマスターの初期化
        if (!localStorage.getItem('projects')) {
            const defaultProjects = [
                { id: 1, name: 'A社案件', description: 'A社向け新規提案' },
                { id: 2, name: 'B社案件', description: 'B社システム更新' }
            ];
            localStorage.setItem('projects', JSON.stringify(defaultProjects));
        }

        // 既存コメントの移行（既読機能の追加）
        this.migrateComments();
        
        // 担当者の複数対応への移行
        this.migrateAssignees();
    }

    // 既存タスクにタスクIDを付与する移行処理
    migrateTaskIds() {
        const tasks = this.getAllTasks();
        let needsUpdate = false;
        
        // 日付ごとのカウンター管理
        const dateCounters = {};
        
        tasks.forEach(task => {
            if (!task.taskId) {
                needsUpdate = true;
                
                // タスクの作成日からIDを生成
                const createdDate = task.createdAt ? new Date(task.createdAt) : new Date(task.id || Date.now());
                const dateStr = createdDate.toISOString().slice(0,10).replace(/-/g, '');
                
                // その日のカウンターを初期化または増加
                if (!dateCounters[dateStr]) {
                    // その日の既存タスクを数える
                    const existingCount = tasks.filter(t => 
                        t.taskId && t.taskId.startsWith(`T-${dateStr}`)
                    ).length;
                    dateCounters[dateStr] = existingCount;
                }
                
                dateCounters[dateStr]++;
                const nextNumber = String(dateCounters[dateStr]).padStart(3, '0');
                task.taskId = `T-${dateStr}-${nextNumber}`;
            }
        });
        
        // 更新が必要な場合のみ保存
        if (needsUpdate) {
            localStorage.setItem('tasks', JSON.stringify(tasks));
            console.log('既存タスクにタスクIDを付与しました');
        }
    }

    // タスク関連メソッド
    getAllTasks() {
        return JSON.parse(localStorage.getItem('tasks') || '[]');
    }

    getTasks() {
        const allTasks = this.getAllTasks();
        // アーカイブされていないタスクのみを返す
        return allTasks.filter(task => !task.archived);
    }

    getArchivedTasks() {
        const allTasks = this.getAllTasks();
        // アーカイブされたタスクのみを返す
        return allTasks.filter(task => task.archived);
    }

    // タスクID生成関数（ランダム英数字版）
    generateTaskId() {
        const today = new Date();
        const dateStr = today.toISOString().slice(0,10).replace(/-/g, '');
        const tasks = this.getAllTasks();
        
        // ランダムIDを生成（重複しないまで繰り返す）
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let taskId;
        let attempts = 0;
        const maxAttempts = 1000; // 無限ループ防止
        
        do {
            let randomStr = '';
            for (let i = 0; i < 5; i++) {
                randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            taskId = `T-${dateStr}-${randomStr}`;
            attempts++;
            
            if (attempts > maxAttempts) {
                // 万が一の場合はタイムスタンプを使用
                taskId = `T-${dateStr}-${Date.now()}`;
                break;
            }
        } while (tasks.some(t => t.taskId === taskId));
        
        return taskId;
    }

    saveTask(task) {
        const tasks = this.getAllTasks();
        task.id = Date.now();
        task.taskId = this.generateTaskId(); // 表示用ID
        task.createdAt = new Date().toISOString();
        task.status = '未対応';
        task.history = [{
            action: 'created',
            timestamp: new Date().toISOString(),
            user: sessionStorage.getItem('userName') || sessionStorage.getItem('userId')
        }];
        tasks.push(task);
        localStorage.setItem('tasks', JSON.stringify(tasks));
        
        // タスク作成時の通知を担当者に送信
        const currentUser = sessionStorage.getItem('userId');
        const currentUserName = sessionStorage.getItem('userName') || currentUser;
        if (task.assignees && task.assignees.length > 0) {
            task.assignees.forEach(assignee => {
                // 作成者自身には通知しない
                if (assignee !== currentUserName && assignee !== currentUser) {
                    this.createNotification(task.id, 'created', {
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
        const assigneeNames = task.assignees || [task.assignee];
        const persons = this.getPersons();
        const assigneeChatworkIds = assigneeNames.map(name => {
            const person = persons.find(p => p.name === name);
            return person ? person.chatworkId : null;
        }).filter(id => id);
        
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
        
        return task;
    }

    updateTask(taskId, updates) {
        const tasks = this.getAllTasks();
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        
        if (taskIndex !== -1) {
            const task = tasks[taskIndex];
            const history = task.history || [];
            const currentUser = sessionStorage.getItem('userId');
            const currentUserName = sessionStorage.getItem('userName') || currentUser;
            let hasChanges = false;
            let notificationDetails = {};
            
            // 変更履歴を記録
            Object.keys(updates).forEach(key => {
                if (task[key] !== updates[key]) {
                    hasChanges = true;
                    history.push({
                        action: 'updated',
                        field: key,
                        oldValue: task[key],
                        newValue: updates[key],
                        timestamp: new Date().toISOString(),
                        user: currentUserName
                    });
                    
                    // 通知詳細の作成
                    if (key === 'status') {
                        notificationDetails.statusChange = {
                            oldStatus: task[key],
                            newStatus: updates[key]
                        };
                    } else if (key === 'content') {
                        notificationDetails.contentChanged = true;
                    } else if (key === 'endDate') {
                        notificationDetails.endDateChange = {
                            oldDate: task[key],
                            newDate: updates[key]
                        };
                    } else if (key === 'assignee') {
                        notificationDetails.assigneeChange = {
                            oldAssignee: task[key],
                            newAssignee: updates[key]
                        };
                    }
                }
            });
            
            tasks[taskIndex] = { ...task, ...updates, history };
            localStorage.setItem('tasks', JSON.stringify(tasks));
            
            // 担当者への通知を作成（自分自身の変更でも、担当者として通知を受け取る）
            if (hasChanges && task.assignees && task.assignees.length > 0) {
                notificationDetails.taskName = task.name;
                notificationDetails.changedBy = currentUserName;
                
                // 全担当者に通知を作成
                task.assignees.forEach(assignee => {
                    this.createNotification(taskId, 'update', {
                        ...notificationDetails,
                        notifyTo: assignee
                    });
                });
            }
            
            return tasks[taskIndex];
        }
        return null;
    }

    archiveTask(taskId) {
        const tasks = this.getAllTasks(); // アーカイブ済みも含む全タスクを取得
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            tasks[taskIndex].archived = true;
            tasks[taskIndex].archivedAt = new Date().toISOString();
            localStorage.setItem('tasks', JSON.stringify(tasks));
            return true;
        }
        return false;
    }

    unarchiveTask(taskId) {
        const tasks = this.getAllTasks(); // アーカイブ済みも含む全タスクを取得
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            tasks[taskIndex].archived = false;
            delete tasks[taskIndex].archivedAt;
            localStorage.setItem('tasks', JSON.stringify(tasks));
            return true;
        }
        return false;
    }

    deleteTask(taskId) {
        const tasks = this.getAllTasks(); // アーカイブ済みも含む全タスクを取得
        const filteredTasks = tasks.filter(t => t.id !== taskId);
        localStorage.setItem('tasks', JSON.stringify(filteredTasks));
    }

    getTaskById(taskId) {
        const tasks = this.getAllTasks();
        return tasks.find(t => t.id === parseInt(taskId));
    }

    // タスクIDで検索
    getTaskByTaskId(taskId) {
        const tasks = this.getAllTasks();
        return tasks.find(t => t.taskId === taskId);
    }

    // 人員マスター関連メソッド
    getPersons() {
        return JSON.parse(localStorage.getItem('persons') || '[]');
    }

    savePerson(person) {
        const persons = this.getPersons();
        person.id = Date.now();
        persons.push(person);
        localStorage.setItem('persons', JSON.stringify(persons));
        return person;
    }

    updatePerson(personId, updates) {
        const persons = this.getPersons();
        const index = persons.findIndex(p => p.id === personId);
        if (index !== -1) {
            persons[index] = { ...persons[index], ...updates };
            localStorage.setItem('persons', JSON.stringify(persons));
            return persons[index];
        }
        return null;
    }

    deletePerson(personId) {
        const persons = this.getPersons();
        const filtered = persons.filter(p => p.id !== personId);
        localStorage.setItem('persons', JSON.stringify(filtered));
    }

    // プロジェクトマスター関連メソッド
    getProjects() {
        return JSON.parse(localStorage.getItem('projects') || '[]');
    }

    saveProject(project) {
        const projects = this.getProjects();
        project.id = Date.now();
        projects.push(project);
        localStorage.setItem('projects', JSON.stringify(projects));
        return project;
    }

    updateProject(projectId, updates) {
        const projects = this.getProjects();
        const index = projects.findIndex(p => p.id === projectId);
        if (index !== -1) {
            projects[index] = { ...projects[index], ...updates };
            localStorage.setItem('projects', JSON.stringify(projects));
            return projects[index];
        }
        return null;
    }

    deleteProject(projectId) {
        const projects = this.getProjects();
        const filtered = projects.filter(p => p.id !== projectId);
        localStorage.setItem('projects', JSON.stringify(filtered));
    }

    // コメント関連メソッド
    getComments(taskId) {
        const comments = JSON.parse(localStorage.getItem('comments') || '{}');
        const taskComments = comments[taskId];
        // 確実に配列を返すようにする
        if (!taskComments || !Array.isArray(taskComments)) {
            return [];
        }
        return taskComments;
    }

    addComment(taskId, comment) {
        const comments = JSON.parse(localStorage.getItem('comments') || '{}');
        if (!comments[taskId]) {
            comments[taskId] = [];
        }
        
        const currentUser = sessionStorage.getItem('userId');
        const currentUserName = sessionStorage.getItem('userName') || currentUser;
        const newComment = {
            id: Date.now(),
            text: comment,
            user: currentUserName,
            timestamp: new Date().toISOString(),
            readBy: [] // 初期状態では誰も既読していない
        };
        
        comments[taskId].push(newComment);
        localStorage.setItem('comments', JSON.stringify(comments));
        
        // タスクの担当者に通知を作成（コメント作成者と担当者が異なる場合）
        const task = this.getTaskById(taskId);
        if (task && task.assignees && task.assignees.length > 0) {
            // 全担当者に通知を作成（コメント作成者以外）
            task.assignees.forEach(assignee => {
                if (currentUserName !== assignee && currentUser !== assignee) {
                    this.createNotification(taskId, 'comment', {
                        commentText: comment,
                        taskName: task.name,
                        commentedBy: currentUserName,
                        notifyTo: assignee
                    });
                }
            });
        }
        
        // Chatwork通知を送信（ChatworkIDも含める）
        const persons = this.getPersons();
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
            comment: comment,
            commentedBy: currentUserName
        });
        
        return newComment;
    }

    // コメントを既読にマーク
    markCommentAsRead(taskId, commentId) {
        const comments = JSON.parse(localStorage.getItem('comments') || '{}');
        const taskComments = comments[taskId] || [];
        const currentUser = sessionStorage.getItem('userId');
        
        const commentIndex = taskComments.findIndex(c => c.id === commentId);
        if (commentIndex !== -1) {
            const comment = taskComments[commentIndex];
            
            // readByが存在しない場合は初期化
            if (!comment.readBy) {
                comment.readBy = [];
            }
            
            // まだ既読していない場合のみ追加
            if (!comment.readBy.includes(currentUser)) {
                comment.readBy.push(currentUser);
                comments[taskId] = taskComments;
                localStorage.setItem('comments', JSON.stringify(comments));
                return true;
            }
        }
        return false;
    }

    // 既存コメントの移行（readByフィールドを追加）
    migrateComments() {
        const comments = JSON.parse(localStorage.getItem('comments') || '{}');
        let needsUpdate = false;
        
        Object.keys(comments).forEach(taskId => {
            comments[taskId].forEach(comment => {
                if (!comment.readBy) {
                    comment.readBy = [];
                    needsUpdate = true;
                }
            });
        });
        
        if (needsUpdate) {
            localStorage.setItem('comments', JSON.stringify(comments));
            console.log('既存コメントに既読機能を追加しました');
        }
    }

    // 既存タスクの担当者を配列形式に移行
    migrateAssignees() {
        const tasks = this.getAllTasks();
        let needsUpdate = false;
        
        tasks.forEach(task => {
            // assigneeフィールドが存在し、assigneesフィールドが存在しない場合
            if (task.assignee && !task.assignees) {
                needsUpdate = true;
                // 単一担当者を配列形式に変換
                task.assignees = task.assignee ? [task.assignee] : [];
                // 後方互換性のためassigneeフィールドは残す
            } else if (!task.assignees) {
                // assigneesフィールドが存在しない場合は空配列で初期化
                needsUpdate = true;
                task.assignees = [];
            }
        });
        
        if (needsUpdate) {
            localStorage.setItem('tasks', JSON.stringify(tasks));
            console.log('既存タスクの担当者を複数対応に移行しました');
        }
    }

    // タスクに未読コメントがあるかチェック
    hasUnreadComments(taskId, userId) {
        const comments = this.getComments(taskId);
        
        // コメントが存在しない、または0件の場合はfalse
        if (!comments || comments.length === 0) {
            return false;
        }
        
        // いずれかのコメントが未読ならtrue
        return comments.some(comment => {
            const readBy = comment.readBy || [];
            return !readBy.includes(userId);
        });
    }

    // 担当者名の色マッピングを取得（重複回避）
    getAssigneeColorMapping() {
        const persons = this.getPersons();
        const colors = [
            'blue', 'green', 'purple', 'orange', 'pink', 'teal', 
            'red', 'indigo', 'amber', 'cyan', 'lime', 'rose',
            'slate', 'emerald', 'sky', 'violet', 'fuchsia', 'yellow', 'gray', 'stone'
        ];
        
        const mapping = {};
        persons.forEach((person, index) => {
            // 人員マスターの順序に基づいて色を割り当て
            const colorIndex = index % colors.length;
            mapping[person.name] = colors[colorIndex];
        });
        
        return mapping;
    }

    // 通知関連メソッド
    getNotifications(userId) {
        const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
        const tasks = this.getAllTasks();
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

    getUnreadNotifications(userId) {
        const notifications = this.getNotifications(userId);
        return notifications.filter(n => !n.isRead);
    }

    createNotification(taskId, type, details) {
        const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
        
        const notification = {
            id: Date.now(),
            taskId: taskId,
            type: type, // 'update', 'comment', 'status'
            details: details,
            timestamp: new Date().toISOString(),
            isRead: false,
            createdBy: sessionStorage.getItem('userId')
        };
        
        notifications.push(notification);
        localStorage.setItem('notifications', JSON.stringify(notifications));
        return notification;
    }

    markNotificationAsRead(notificationId) {
        const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
        const index = notifications.findIndex(n => n.id === notificationId);
        
        if (index !== -1) {
            notifications[index].isRead = true;
            localStorage.setItem('notifications', JSON.stringify(notifications));
            return notifications[index];
        }
        return null;
    }

    markAllNotificationsAsRead(userId, userName) {
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

    // Chatwork通知送信関数
    sendChatworkNotification(type, data) {
        // Chatwork通知が有効かチェック
        const chatworkEnabled = localStorage.getItem('chatworkEnabled') === 'true';
        const webhookUrl = localStorage.getItem('chatworkWebhookUrl');
        
        if (!chatworkEnabled || !webhookUrl) {
            return; // 設定されていない場合は何もしない
        }
        
        const payload = {
            type: type,
            ...data,
            timestamp: new Date().toISOString()
        };
        
        // 非同期でWebhookに送信（エラーが発生しても処理を継続）
        fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: JSON.stringify(payload)
        }).catch(error => {
            console.warn('Chatwork notification failed:', error);
            // エラーが発生してもUIには影響させない
        });
    }

    clearOldNotifications() {
        const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        const filteredNotifications = notifications.filter(n => {
            return new Date(n.timestamp) > oneWeekAgo;
        });
        
        localStorage.setItem('notifications', JSON.stringify(filteredNotifications));
    }

    // デフォルト人員が存在するか確認し、不足分を追加
    ensureDefaultPersons() {
        const persons = this.getPersons();
        const defaultPersons = [
            { id: 1001, name: '市村光希', loginId: 'ichimura', password: 'ichimura_piala1234', department: '', email: '', chatworkId: '' },
            { id: 1002, name: '大谷凪沙', loginId: 'ohtani', password: 'ohtani_piala1234', department: '', email: '', chatworkId: '' },
            { id: 1003, name: '牧野風音', loginId: 'makino', password: 'makino_1234', department: '', email: '', chatworkId: '' },
            { id: 1004, name: '青木海燈', loginId: 'aoki', password: 'aoki_1234', department: '', email: '', chatworkId: '' },
            { id: 1005, name: '村山太洋', loginId: 'murayama', password: 'murayama_1234', department: '', email: '', chatworkId: '' },
            { id: 1006, name: '井上舞', loginId: 'inoue', password: 'inoue_1234', department: '', email: '', chatworkId: '' },
            { id: 1007, name: '長野由愛', loginId: 'nagano', password: 'nagano_1234', department: '', email: '', chatworkId: '' },
            { id: 1008, name: '上谷朋輝', loginId: 'kamiya', password: 'kamiya_1234', department: '', email: '', chatworkId: '' }
        ];
        
        let updated = false;
        defaultPersons.forEach(defaultPerson => {
            if (!persons.find(p => p.loginId === defaultPerson.loginId)) {
                persons.push(defaultPerson);
                updated = true;
            }
        });
        
        if (updated) {
            localStorage.setItem('persons', JSON.stringify(persons));
        }
    }
}

// グローバルインスタンス
const dataManager = new DataManager();