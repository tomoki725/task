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

        // 人員マスターの初期化
        if (!localStorage.getItem('persons')) {
            const defaultPersons = [
                { id: 1, name: '山田太郎', department: '' },
                { id: 2, name: '佐藤花子', department: '' },
                { id: 3, name: '鈴木一郎', department: '' }
            ];
            localStorage.setItem('persons', JSON.stringify(defaultPersons));
        }

        // プロジェクトマスターの初期化
        if (!localStorage.getItem('projects')) {
            const defaultProjects = [
                { id: 1, name: 'A社案件', description: 'A社向け新規提案' },
                { id: 2, name: 'B社案件', description: 'B社システム更新' }
            ];
            localStorage.setItem('projects', JSON.stringify(defaultProjects));
        }
    }

    // 既存タスクにタスクIDを付与する移行処理
    migrateTaskIds() {
        const tasks = this.getTasks();
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
    getTasks() {
        return JSON.parse(localStorage.getItem('tasks') || '[]');
    }

    // タスクID生成関数
    generateTaskId() {
        const today = new Date();
        const dateStr = today.toISOString().slice(0,10).replace(/-/g, '');
        const tasks = this.getTasks();
        const todayTasks = tasks.filter(t => t.taskId && t.taskId.startsWith(`T-${dateStr}`));
        const nextNumber = String(todayTasks.length + 1).padStart(3, '0');
        return `T-${dateStr}-${nextNumber}`;
    }

    saveTask(task) {
        const tasks = this.getTasks();
        task.id = Date.now();
        task.taskId = this.generateTaskId(); // 表示用ID
        task.createdAt = new Date().toISOString();
        task.status = '未対応';
        task.history = [{
            action: 'created',
            timestamp: new Date().toISOString(),
            user: sessionStorage.getItem('userId')
        }];
        tasks.push(task);
        localStorage.setItem('tasks', JSON.stringify(tasks));
        return task;
    }

    updateTask(taskId, updates) {
        const tasks = this.getTasks();
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        
        if (taskIndex !== -1) {
            const task = tasks[taskIndex];
            const history = task.history || [];
            const currentUser = sessionStorage.getItem('userId');
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
                        user: currentUser
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
            if (hasChanges && task.assignee) {
                notificationDetails.taskName = task.name;
                notificationDetails.changedBy = currentUser;
                this.createNotification(taskId, 'update', notificationDetails);
            }
            
            return tasks[taskIndex];
        }
        return null;
    }

    deleteTask(taskId) {
        const tasks = this.getTasks();
        const filteredTasks = tasks.filter(t => t.id !== taskId);
        localStorage.setItem('tasks', JSON.stringify(filteredTasks));
    }

    getTaskById(taskId) {
        const tasks = this.getTasks();
        return tasks.find(t => t.id === parseInt(taskId));
    }

    // タスクIDで検索
    getTaskByTaskId(taskId) {
        const tasks = this.getTasks();
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
        return comments[taskId] || [];
    }

    addComment(taskId, comment) {
        const comments = JSON.parse(localStorage.getItem('comments') || '{}');
        if (!comments[taskId]) {
            comments[taskId] = [];
        }
        
        const currentUser = sessionStorage.getItem('userId');
        const newComment = {
            id: Date.now(),
            text: comment,
            user: currentUser,
            timestamp: new Date().toISOString()
        };
        
        comments[taskId].push(newComment);
        localStorage.setItem('comments', JSON.stringify(comments));
        
        // タスクの担当者に通知を作成（コメント作成者と担当者が異なる場合）
        const task = this.getTaskById(taskId);
        if (task && task.assignee) {
            // コメント作成者がタスク担当者と異なる場合のみ通知
            if (currentUser !== task.assignee) {
                this.createNotification(taskId, 'comment', {
                    commentText: comment,
                    taskName: task.name,
                    commentedBy: currentUser
                });
            }
        }
        
        return newComment;
    }

    // 通知関連メソッド
    getNotifications(userId) {
        const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
        const tasks = this.getTasks();
        
        // 現在のユーザーが担当者のタスクに関する通知のみフィルタリング
        return notifications.filter(notif => {
            const task = tasks.find(t => t.id === notif.taskId);
            return task && task.assignee === userId;
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

    markAllNotificationsAsRead(userId) {
        const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
        const tasks = this.getTasks();
        
        notifications.forEach(notif => {
            const task = tasks.find(t => t.id === notif.taskId);
            if (task && task.assignee === userId) {
                notif.isRead = true;
            }
        });
        
        localStorage.setItem('notifications', JSON.stringify(notifications));
    }

    clearOldNotifications() {
        const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        const filteredNotifications = notifications.filter(n => {
            return new Date(n.timestamp) > oneWeekAgo;
        });
        
        localStorage.setItem('notifications', JSON.stringify(filteredNotifications));
    }
}

// グローバルインスタンス
const dataManager = new DataManager();