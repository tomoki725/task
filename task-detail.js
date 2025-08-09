// タスク詳細ページのJavaScript
let currentTask = null;
let isEditMode = false;

document.addEventListener('DOMContentLoaded', function() {
    checkSession();
    loadTaskDetail();
});

function loadTaskDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const taskId = urlParams.get('id');
    const notificationId = urlParams.get('notificationId');
    
    if (!taskId) {
        alert('タスクが見つかりません');
        window.location.href = 'dashboard.html';
        return;
    }
    
    currentTask = dataManager.getTaskById(taskId);
    
    if (!currentTask) {
        alert('タスクが見つかりません');
        window.location.href = 'dashboard.html';
        return;
    }
    
    displayTaskDetail();
    loadHistory();
    loadComments();
    
    // 通知からアクセスした場合、変更箇所をハイライト
    if (notificationId) {
        highlightChanges(notificationId);
    }
}

function displayTaskDetail() {
    // タスクIDの表示（既存データ対応）
    const taskIdText = currentTask.taskId ? 
        currentTask.taskId : 
        `T-${new Date(currentTask.createdAt || Date.now()).toISOString().slice(0,10).replace(/-/g, '')}-OLD`;
    document.getElementById('taskIdDisplay').textContent = `タスクID: ${taskIdText}`;
    
    document.getElementById('taskTitle').textContent = currentTask.name;
    document.getElementById('taskType').textContent = getTaskTypeLabel(currentTask.type);
    document.getElementById('taskStatus').value = currentTask.status || '未対応';
    
    // 担当者セレクトボックスの設定
    const assigneeSelect = document.getElementById('taskAssignee');
    assigneeSelect.innerHTML = '<option value="">なし</option>';
    
    // 人員マスターから担当者リストを取得
    const persons = dataManager.getPersons();
    persons.forEach(person => {
        const option = document.createElement('option');
        option.value = person.name;
        option.textContent = person.name;
        if (currentTask.assignee === person.name) {
            option.selected = true;
        }
        assigneeSelect.appendChild(option);
    });
    
    // プロジェクト情報の表示
    if (currentTask.project) {
        document.getElementById('projectRow').style.display = 'grid';
        document.getElementById('taskProject').textContent = currentTask.project;
    } else {
        document.getElementById('projectRow').style.display = 'none';
    }
    
    document.getElementById('taskDescription').value = currentTask.content || '';
    document.getElementById('taskStartDate').value = currentTask.startDate || '';
    document.getElementById('taskEndDate').value = currentTask.endDate || '';
    
    // 期限チェック
    const detailSection = document.querySelector('.task-detail-section');
    const today = new Date().toISOString().split('T')[0];
    
    if (currentTask.endDate) {
        if (currentTask.endDate < today) {
            detailSection.classList.add('overdue');
        } else if (currentTask.endDate === today) {
            detailSection.classList.add('today');
        }
    }
}

function getTaskTypeLabel(type) {
    const labels = {
        'department': '部署タスク',
        'project': 'プロジェクトタスク',
        'personal': '個人タスク'
    };
    return labels[type] || type;
}

function enableEdit() {
    isEditMode = true;
    
    // 編集可能にする
    document.getElementById('taskStatus').disabled = false;
    document.getElementById('taskAssignee').disabled = false;
    document.getElementById('taskDescription').disabled = false;
    document.getElementById('taskEndDate').disabled = false;
    
    // 編集ボタンを表示
    document.getElementById('editActions').style.display = 'flex';
}

function cancelEdit() {
    isEditMode = false;
    
    // 編集不可にする
    document.getElementById('taskStatus').disabled = true;
    document.getElementById('taskAssignee').disabled = true;
    document.getElementById('taskDescription').disabled = true;
    document.getElementById('taskEndDate').disabled = true;
    
    // 編集ボタンを非表示
    document.getElementById('editActions').style.display = 'none';
    
    // 元の値に戻す
    displayTaskDetail();
}

function saveTaskChanges() {
    const updates = {
        status: document.getElementById('taskStatus').value,
        assignee: document.getElementById('taskAssignee').value,
        content: document.getElementById('taskDescription').value,
        endDate: document.getElementById('taskEndDate').value
    };
    
    // 更新を保存
    const updatedTask = dataManager.updateTask(currentTask.id, updates);
    
    if (updatedTask) {
        currentTask = updatedTask;
        alert('タスクを更新しました');
        cancelEdit();
        loadHistory();
    }
}

function loadHistory() {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';
    
    if (!currentTask.history || currentTask.history.length === 0) {
        historyList.innerHTML = '<p>変更履歴はありません</p>';
        return;
    }
    
    currentTask.history.reverse().forEach(entry => {
        const div = document.createElement('div');
        div.className = 'history-item';
        
        let action = '';
        if (entry.action === 'created') {
            action = 'タスクを作成しました';
        } else if (entry.action === 'updated') {
            const fieldLabels = {
                'status': 'ステータス',
                'assignee': '担当者',
                'content': '概要',
                'endDate': '終了日'
            };
            const fieldLabel = fieldLabels[entry.field] || entry.field;
            action = `${fieldLabel}を変更: ${entry.oldValue || 'なし'} → ${entry.newValue || 'なし'}`;
        }
        
        div.innerHTML = `
            <div class="history-meta">
                <span class="history-user">${entry.user}</span>
                <span class="history-time">${formatDateTime(entry.timestamp)}</span>
            </div>
            <div class="history-action">${action}</div>
        `;
        
        historyList.appendChild(div);
    });
}

function loadComments() {
    const comments = dataManager.getComments(currentTask.id);
    const commentList = document.getElementById('commentList');
    const currentUser = sessionStorage.getItem('userId');
    
    commentList.innerHTML = '';
    
    if (comments.length === 0) {
        commentList.innerHTML = '<p>コメントはまだありません</p>';
        return;
    }
    
    comments.forEach(comment => {
        const div = document.createElement('div');
        div.className = 'comment-item';
        
        // 既読状態をチェック
        const readBy = comment.readBy || [];
        const isRead = readBy.includes(currentUser);
        
        div.innerHTML = `
            <div class="comment-header">
                <span class="comment-user">${comment.user}</span>
                <span class="comment-time">${formatDateTime(comment.timestamp)}</span>
            </div>
            <div class="comment-text">${escapeHtml(comment.text)}</div>
            <div class="comment-actions">
                <button class="read-btn ${isRead ? 'read' : ''}" 
                        onclick="markCommentAsRead(${comment.id})"
                        ${isRead ? 'disabled' : ''}>
                    ${isRead ? '✓' : ''} 見ました
                </button>
            </div>
        `;
        commentList.appendChild(div);
    });
}

function markCommentAsRead(commentId) {
    const result = dataManager.markCommentAsRead(currentTask.id, commentId);
    if (result) {
        loadComments(); // UIを更新
    }
}

function addComment() {
    const commentInput = document.getElementById('commentInput');
    const commentText = commentInput.value.trim();
    
    if (!commentText) {
        alert('コメントを入力してください');
        return;
    }
    
    dataManager.addComment(currentTask.id, commentText);
    commentInput.value = '';
    loadComments();
}

function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function highlightChanges(notificationId) {
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    const notification = notifications.find(n => n.id === parseInt(notificationId));
    
    if (!notification) return;
    
    const details = notification.details;
    
    // 変更された要素をハイライト
    setTimeout(() => {
        if (notification.type === 'update') {
            if (details.statusChange) {
                const statusElement = document.getElementById('taskStatus');
                if (statusElement) {
                    statusElement.parentElement.classList.add('highlight-change');
                }
            }
            
            if (details.contentChanged) {
                const descElement = document.getElementById('taskDescription');
                if (descElement) {
                    descElement.parentElement.classList.add('highlight-change');
                }
            }
            
            if (details.endDateChange) {
                const endDateElement = document.getElementById('taskEndDate');
                if (endDateElement) {
                    endDateElement.parentElement.classList.add('highlight-change');
                }
            }
            
            if (details.assigneeChange) {
                const assigneeElement = document.getElementById('taskAssignee');
                if (assigneeElement) {
                    assigneeElement.parentElement.classList.add('highlight-change');
                }
            }
        } else if (notification.type === 'comment') {
            // 最新のコメントをハイライト
            const commentList = document.getElementById('commentList');
            if (commentList && commentList.firstChild) {
                commentList.firstChild.classList.add('highlight-change');
            }
        }
        
        // 2秒後にハイライトクラスを削除
        setTimeout(() => {
            document.querySelectorAll('.highlight-change').forEach(element => {
                element.classList.remove('highlight-change');
            });
        }, 2000);
    }, 100);
}