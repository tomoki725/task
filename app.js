// メインアプリケーション
document.addEventListener('DOMContentLoaded', function() {
    checkSession();
    initializeApp();
});

function initializeApp() {
    // ユーザー名表示
    document.getElementById('userName').textContent = sessionStorage.getItem('userId');
    
    // 初期表示
    loadTasks();
    loadMasterData();
    loadNotifications();
    
    // フォームイベント設定
    document.getElementById('taskForm').addEventListener('submit', handleTaskSubmit);
    document.getElementById('personForm').addEventListener('submit', handlePersonSubmit);
    document.getElementById('projectForm').addEventListener('submit', handleProjectSubmit);
    
    // 定期的に通知をチェック（30秒ごと）
    setInterval(loadNotifications, 30000);
    
    // 古い通知を定期的にクリア（起動時に実行）
    dataManager.clearOldNotifications();
}

// セクション表示切り替え
function showSection(section) {
    const sections = document.querySelectorAll('.content-section');
    const navBtns = document.querySelectorAll('.nav-btn');
    
    sections.forEach(s => s.classList.remove('active'));
    navBtns.forEach(b => b.classList.remove('active'));
    
    if (section === 'tasks') {
        document.getElementById('tasksSection').classList.add('active');
        navBtns[0].classList.add('active');
    } else if (section === 'master') {
        document.getElementById('masterSection').classList.add('active');
        navBtns[1].classList.add('active');
    }
}

// タスク読み込み
function loadTasks() {
    // フィルタリング処理を一元化
    filterTasks();
}

// タスク要素作成
function createTaskElement(task) {
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
    
    // 未読コメントチェック
    const currentUser = sessionStorage.getItem('userId');
    const hasUnreadComments = dataManager.hasUnreadComments(task.id, currentUser);
    
    // 担当者情報（未読コメントがある場合は目玉マークを追加）
    let assigneeInfo = '';
    if (task.assignee) {
        const colorClass = getAssigneeColorClass(task.assignee);
        assigneeInfo = `<span class="assignee-info assignee-color-${colorClass}">${task.assignee}${hasUnreadComments ? ' <span class="unread-indicator">👁</span>' : ''}</span>`;
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
                    <span class="task-status-compact status-${task.status}">${task.status}</span>
                    ${deadlineInfo}
                    ${assigneeInfo}
                </div>
            </div>
            <button onclick="openTaskDetail(${task.id})" class="detail-btn-compact">詳細</button>
        </div>
    `;
    
    return div;
}

// 担当者名から色クラスを生成
function getAssigneeColorClass(assigneeName) {
    if (!assigneeName) return 'blue';
    
    const colors = ['blue', 'green', 'purple', 'orange', 'pink', 'teal'];
    // 名前から簡単なハッシュ値を生成
    let hash = 0;
    for (let i = 0; i < assigneeName.length; i++) {
        hash += assigneeName.charCodeAt(i);
    }
    return colors[hash % colors.length];
}

// タスク詳細を開く
function openTaskDetail(taskId) {
    window.location.href = `task-detail.html?id=${taskId}`;
}

// タスクモーダル
function openTaskModal() {
    document.getElementById('taskModal').style.display = 'block';
    updateAssigneeOptions();
}

function closeTaskModal() {
    document.getElementById('taskModal').style.display = 'none';
    document.getElementById('taskForm').reset();
}

// 担当者オプション更新
function updateAssigneeOptions() {
    const taskType = document.getElementById('taskType').value;
    const projectGroup = document.getElementById('projectGroup');
    const assigneeGroup = document.getElementById('assigneeGroup');
    const projectSelect = document.getElementById('project');
    const assigneeSelect = document.getElementById('assignee');
    
    // 一旦両方非表示
    projectGroup.style.display = 'none';
    assigneeGroup.style.display = 'none';
    
    // セレクトボックスをクリア
    projectSelect.innerHTML = '<option value="">選択してください</option>';
    assigneeSelect.innerHTML = '<option value="">選択してください</option>';
    
    if (!taskType) {
        // タスクタイプが選択されていない場合は何もしない
        return;
    }
    
    // 担当者選択肢を取得
    const persons = dataManager.getPersons();
    
    switch(taskType) {
        case 'project':
            // プロジェクトタスクの場合
            projectGroup.style.display = 'block';
            assigneeGroup.style.display = 'block';
            
            // プロジェクト選択肢を追加
            const projects = dataManager.getProjects();
            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.name;
                option.textContent = project.name;
                projectSelect.appendChild(option);
            });
            
            // 担当者選択肢を追加
            persons.forEach(person => {
                const option = document.createElement('option');
                option.value = person.name;
                option.textContent = person.name;
                assigneeSelect.appendChild(option);
            });
            break;
            
        case 'department':
        case 'personal':
            // 部署タスクまたは個人タスクの場合
            assigneeGroup.style.display = 'block';
            
            // 担当者選択肢を追加
            persons.forEach(person => {
                const option = document.createElement('option');
                option.value = person.name;
                option.textContent = person.name;
                assigneeSelect.appendChild(option);
            });
            break;
    }
}

// タスク送信処理
function handleTaskSubmit(e) {
    e.preventDefault();
    
    const taskType = document.getElementById('taskType').value;
    const task = {
        name: document.getElementById('taskName').value,
        content: document.getElementById('taskContent').value,
        type: taskType,
        priority: document.getElementById('taskPriority').value,
        assignee: document.getElementById('assignee').value,
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value
    };
    
    // プロジェクトタスクの場合はプロジェクト情報も保存
    if (taskType === 'project') {
        task.project = document.getElementById('project').value;
    }
    
    dataManager.saveTask(task);
    closeTaskModal();
    loadTasks();
}

// マスターデータ読み込み
function loadMasterData() {
    loadPersonList();
    loadProjectList();
}

// 人員リスト読み込み
function loadPersonList() {
    const persons = dataManager.getPersons();
    const personList = document.getElementById('personList');
    
    personList.innerHTML = '';
    persons.forEach(person => {
        const div = document.createElement('div');
        div.className = 'master-item';
        div.innerHTML = `
            <div class="master-info">
                <strong>${person.name}</strong>
                <span>${person.department || ''}</span>
            </div>
            <div class="master-actions">
                <button onclick="editPerson(${person.id})" class="edit-btn">編集</button>
                <button onclick="deletePerson(${person.id})" class="delete-btn">削除</button>
            </div>
        `;
        personList.appendChild(div);
    });
}

// プロジェクトリスト読み込み
function loadProjectList() {
    const projects = dataManager.getProjects();
    const projectList = document.getElementById('projectList');
    
    projectList.innerHTML = '';
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
}

// 人員モーダル
function openPersonModal() {
    document.getElementById('personModal').style.display = 'block';
}

function closePersonModal() {
    document.getElementById('personModal').style.display = 'none';
    document.getElementById('personForm').reset();
}

function handlePersonSubmit(e) {
    e.preventDefault();
    
    const person = {
        name: document.getElementById('personName').value,
        department: document.getElementById('personDepartment').value
    };
    
    dataManager.savePerson(person);
    closePersonModal();
    loadPersonList();
}

function editPerson(id) {
    const persons = dataManager.getPersons();
    const person = persons.find(p => p.id === id);
    if (person) {
        const newName = prompt('名前を編集:', person.name);
        if (newName) {
            dataManager.updatePerson(id, { name: newName });
            loadPersonList();
        }
    }
}

function deletePerson(id) {
    if (confirm('この人員を削除しますか？')) {
        dataManager.deletePerson(id);
        loadPersonList();
    }
}

// プロジェクトモーダル
function openProjectModal() {
    document.getElementById('projectModal').style.display = 'block';
}

function closeProjectModal() {
    document.getElementById('projectModal').style.display = 'none';
    document.getElementById('projectForm').reset();
}

function handleProjectSubmit(e) {
    e.preventDefault();
    
    const project = {
        name: document.getElementById('projectName').value,
        description: document.getElementById('projectDescription').value
    };
    
    dataManager.saveProject(project);
    closeProjectModal();
    loadProjectList();
}

function editProject(id) {
    const projects = dataManager.getProjects();
    const project = projects.find(p => p.id === id);
    if (project) {
        const newName = prompt('プロジェクト名を編集:', project.name);
        if (newName) {
            dataManager.updateProject(id, { name: newName });
            loadProjectList();
        }
    }
}

function deleteProject(id) {
    if (confirm('このプロジェクトを削除しますか？')) {
        dataManager.deleteProject(id);
        loadProjectList();
    }
}

// カテゴリフィルタリング
function filterByCategory() {
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
    filterTasks();
}

// フィルタータイプ変更時の処理
function updateFilterOptions() {
    const filterType = document.getElementById('filterType').value;
    const filterValue = document.getElementById('filterValue');
    
    // フィルタータイプに応じて選択肢を更新
    filterValue.innerHTML = '<option value="">選択してください</option>';
    
    if (filterType === 'assignee') {
        const persons = dataManager.getPersons();
        
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
    } else {
        // フィルタータイプが空の場合、全てのタスクを表示
        filterTasks();
    }
}

function filterTasks() {
    const categoryFilter = document.getElementById('categoryFilter').value;
    const filterType = document.getElementById('filterType').value;
    const filterValue = document.getElementById('filterValue').value;
    const tasks = dataManager.getTasks();
    const taskList = document.getElementById('taskList');
    
    // クリア
    taskList.innerHTML = '';
    
    // フィルタリング処理
    const filteredTasks = tasks.filter(task => {
        // カテゴリフィルタ
        if (categoryFilter !== 'all' && task.type !== categoryFilter) {
            return false;
        }
        
        // 担当者/ステータスフィルタ
        if (filterType && filterValue) {
            if (filterType === 'assignee') {
                // 担当者フィルタの場合
                // 担当者が設定されていないタスクも除外
                if (!task.assignee || task.assignee !== filterValue) {
                    return false;
                }
            }
            if (filterType === 'status') {
                // ステータスフィルタの場合
                if (!task.status || task.status !== filterValue) {
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
    
    // タスク要素を作成して追加
    filteredTasks.forEach(task => {
        const taskElement = createTaskElement(task);
        taskList.appendChild(taskElement);
    });
}

// ソート
function applySorting() {
    // フィルタリング処理に統合されたので、filterTasksを呼ぶだけ
    filterTasks();
}

// タスクID検索
function searchByTaskId() {
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
function clearTaskIdSearch() {
    document.getElementById('taskIdSearchInput').value = '';
    document.getElementById('taskBoxTitle').textContent = 'すべてのタスク';
    document.getElementById('categoryFilter').value = 'all';
    filterTasks();
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
function loadNotifications() {
    const currentUser = sessionStorage.getItem('userId');
    const unreadNotifications = dataManager.getUnreadNotifications(currentUser);
    const badge = document.getElementById('notificationBadge');
    
    if (unreadNotifications.length > 0) {
        badge.textContent = unreadNotifications.length;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
}

function toggleNotifications() {
    const dropdown = document.getElementById('notificationDropdown');
    const isVisible = dropdown.style.display === 'block';
    
    if (!isVisible) {
        displayNotifications();
        dropdown.style.display = 'block';
    } else {
        dropdown.style.display = 'none';
    }
}

function displayNotifications() {
    const currentUser = sessionStorage.getItem('userId');
    const notifications = dataManager.getNotifications(currentUser);
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
    
    if (notification.type === 'update') {
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

function markAllAsRead() {
    const currentUser = sessionStorage.getItem('userId');
    dataManager.markAllNotificationsAsRead(currentUser);
    
    // UIを更新
    loadNotifications();
    displayNotifications();
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