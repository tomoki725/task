// タスク詳細ページのJavaScript
let currentTask = null;
let isEditMode = false;

document.addEventListener('DOMContentLoaded', function() {
    checkSession();
    loadTaskDetail();
});

async function loadTaskDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const taskId = urlParams.get('id');
    const notificationId = urlParams.get('notificationId');
    
    if (!taskId) {
        alert('タスクが見つかりません');
        window.location.href = 'dashboard.html';
        return;
    }
    
    currentTask = await dataManager.getTaskById(taskId);
    
    if (!currentTask) {
        alert('タスクが見つかりません');
        window.location.href = 'dashboard.html';
        return;
    }
    
    await displayTaskDetail();
    loadHistory();
    await loadComments();
    
    // 通知からアクセスした場合、変更箇所をハイライト
    if (notificationId) {
        highlightChanges(notificationId);
    }
}

async function displayTaskDetail() {
    // タスクIDの表示（既存データ対応）
    const taskIdText = currentTask.taskId ? 
        currentTask.taskId : 
        `T-${new Date(currentTask.createdAt || Date.now()).toISOString().slice(0,10).replace(/-/g, '')}-OLD`;
    document.getElementById('taskIdDisplay').textContent = `タスクID: ${taskIdText}`;
    
    document.getElementById('taskTitle').textContent = currentTask.name;
    document.getElementById('taskTypeDisplay').textContent = getTaskTypeLabel(currentTask.type);
    document.getElementById('taskTypeSelect').value = currentTask.type || 'department';
    document.getElementById('taskStatus').value = currentTask.status || '未対応';
    
    // 優先度表示の設定
    displayPriority();
    document.getElementById('taskPrioritySelect').value = currentTask.priority || 'medium';
    
    // 担当者表示の設定（複数対応）
    displayAssignees();
    await setupAssigneeEdit();
    
    // プロジェクト情報の表示
    if (currentTask.project) {
        document.getElementById('projectRow').style.display = 'grid';
        document.getElementById('taskProjectDisplay').textContent = currentTask.project;
        document.getElementById('taskProjectSelect').value = currentTask.project;
    } else {
        document.getElementById('projectRow').style.display = 'none';
    }
    
    // プロジェクト選択肢を読み込み
    await loadProjectOptions();
    
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
    document.getElementById('taskTypeDisplay').style.display = 'none';
    document.getElementById('taskTypeSelect').style.display = 'inline-block';
    document.getElementById('taskStatus').disabled = false;
    document.getElementById('taskPriorityDisplay').style.display = 'none';
    document.getElementById('taskPrioritySelect').style.display = 'inline-block';
    document.getElementById('taskDescription').disabled = false;
    document.getElementById('taskEndDate').disabled = false;
    
    // プロジェクト表示・編集の切り替え
    if (currentTask.type === 'project') {
        document.getElementById('taskProjectDisplay').style.display = 'none';
        document.getElementById('taskProjectSelect').style.display = 'inline-block';
    }
    
    // 担当者表示・編集の切り替え
    document.getElementById('assigneeDisplay').style.display = 'none';
    document.getElementById('assigneeEditContainer').style.display = 'block';
    
    // 編集ボタンを表示
    document.getElementById('editActions').style.display = 'flex';
}

async function cancelEdit() {
    isEditMode = false;
    
    // 編集不可にする
    document.getElementById('taskTypeDisplay').style.display = 'inline-block';
    document.getElementById('taskTypeSelect').style.display = 'none';
    document.getElementById('taskStatus').disabled = true;
    document.getElementById('taskPriorityDisplay').style.display = 'inline-block';
    document.getElementById('taskPrioritySelect').style.display = 'none';
    document.getElementById('taskDescription').disabled = true;
    document.getElementById('taskEndDate').disabled = true;
    
    // プロジェクト表示・編集の切り替え
    document.getElementById('taskProjectDisplay').style.display = 'inline-block';
    document.getElementById('taskProjectSelect').style.display = 'none';
    
    // 担当者表示・編集の切り替え
    document.getElementById('assigneeDisplay').style.display = 'flex';
    document.getElementById('assigneeEditContainer').style.display = 'none';
    
    // 編集ボタンを非表示
    document.getElementById('editActions').style.display = 'none';
    
    // 元の値に戻す
    await displayTaskDetail();
}

async function saveTaskChanges() {
    try {
        console.log('💾 タスク保存処理を開始...');
        
        // ボタンを一時的に無効化（重複クリック防止）
        const saveBtn = document.querySelector('.save-btn');
        const cancelBtn = document.querySelector('.cancel-btn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = '保存中...';
        }
        
        // 安全なDOM要素値取得関数
        const getElementValue = (elementId, defaultValue = '') => {
            const element = document.getElementById(elementId);
            if (!element) {
                console.warn(`⚠️ 要素が見つかりません: ${elementId}`);
                return defaultValue;
            }
            const value = element.value;
            // undefined/nullを空文字に変換
            return (value === undefined || value === null) ? defaultValue : value;
        };
        
        // 選択された担当者を取得（安全）
        const selectedAssignees = Array.from(document.querySelectorAll('#assigneeEditDropdownMenu input[type="checkbox"]:checked'))
            .map(cb => cb.value)
            .filter(value => value !== undefined && value !== null && value !== ''); // 無効値を除去
        
        const updates = {
            type: getElementValue('taskTypeSelect', 'department'),
            status: getElementValue('taskStatus', '未対応'),
            priority: getElementValue('taskPrioritySelect', 'medium'),
            assignees: selectedAssignees,
            // 後方互換性のため最初の担当者をassigneeにも設定
            assignee: selectedAssignees.length > 0 ? selectedAssignees[0] : '',
            content: getElementValue('taskDescription', ''),
            endDate: getElementValue('taskEndDate', '')
        };
        
        // プロジェクトタスクの場合のみプロジェクト情報を追加
        if (updates.type === 'project') {
            updates.project = getElementValue('taskProjectSelect', '');
        } else {
            updates.project = ''; // プロジェクトタスクでない場合はクリア
        }
        
        console.log('📝 更新データ:', updates);
        
        // 更新を保存（同期機能はそのまま動作継続）
        const updatedTask = await dataManager.updateTask(currentTask.id, updates);
        
        if (updatedTask) {
            currentTask = updatedTask;
            console.log('✅ タスク更新成功');
            alert('タスクを更新しました');
            cancelEdit();
            await loadHistory(); // 履歴の非同期読み込み
        } else {
            throw new Error('タスク更新に失敗しました');
        }
        
    } catch (error) {
        console.error('❌ タスク保存エラー:', error);
        alert('タスクの保存に失敗しました。再度お試しください。\nエラー: ' + error.message);
        
    } finally {
        // ボタン状態を復元（エラー時も必ず実行）
        const saveBtn = document.querySelector('.save-btn');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = '保存';
        }
        console.log('💾 タスク保存処理完了');
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

async function loadComments() {
    const comments = await dataManager.getComments(currentTask.id);
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

async function markCommentAsRead(commentId) {
    const currentUserId = sessionStorage.getItem('userId');
    const result = await dataManager.markCommentAsRead(commentId, currentUserId);
    if (result !== false) {
        await loadComments(); // UIを更新
        console.log('✅ コメントを既読にしました:', commentId);
    }
}

async function addComment() {
    const commentInput = document.getElementById('commentInput');
    const commentText = commentInput.value.trim();
    
    if (!commentText) {
        alert('コメントを入力してください');
        return;
    }
    
    const comment = {
        taskId: currentTask.id,
        text: commentText,
        user: sessionStorage.getItem('userName') || sessionStorage.getItem('userId'),
        timestamp: new Date().toISOString()
    };
    await dataManager.saveComment(comment);
    commentInput.value = '';
    await loadComments();
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

// プロジェクト選択肢を読み込み
async function loadProjectOptions() {
    const projectSelect = document.getElementById('taskProjectSelect');
    const projects = await dataManager.getProjects();
    
    // 既存のオプションをクリア（デフォルトオプション以外）
    while (projectSelect.children.length > 1) {
        projectSelect.removeChild(projectSelect.lastChild);
    }
    
    // プロジェクト選択肢を追加
    projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.name;
        option.textContent = project.name;
        projectSelect.appendChild(option);
    });
}

// タスクタイプ変更時の処理
function onTaskTypeChange() {
    const taskType = document.getElementById('taskTypeSelect').value;
    const projectRow = document.getElementById('projectRow');
    const taskProjectDisplay = document.getElementById('taskProjectDisplay');
    const taskProjectSelect = document.getElementById('taskProjectSelect');
    
    if (taskType === 'project') {
        // プロジェクトタスクの場合、プロジェクト選択を表示
        projectRow.style.display = 'grid';
        if (isEditMode) {
            taskProjectDisplay.style.display = 'none';
            taskProjectSelect.style.display = 'inline-block';
        }
    } else {
        // それ以外の場合、プロジェクト選択を非表示
        projectRow.style.display = 'none';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 担当者表示関数
function displayAssignees() {
    const assigneeDisplay = document.getElementById('assigneeDisplay');
    const assignees = currentTask.assignees || (currentTask.assignee ? [currentTask.assignee] : []);
    
    if (assignees.length === 0) {
        assigneeDisplay.className = 'assignees-display empty';
        assigneeDisplay.innerHTML = '';
    } else {
        assigneeDisplay.className = 'assignees-display';
        const badges = assignees.map(assignee => {
            const colorClass = getAssigneeColorClass(assignee);
            return `<span class="assignee-badge assignee-color-${colorClass}">${assignee}</span>`;
        }).join('');
        assigneeDisplay.innerHTML = badges;
    }
}

// 担当者編集用ドロップダウン設定
async function setupAssigneeEdit() {
    const persons = await dataManager.getPersons();
    const currentAssignees = currentTask.assignees || (currentTask.assignee ? [currentTask.assignee] : []);
    
    setupAssigneeEditDropdown(persons, currentAssignees);
}

// 担当者色クラス取得関数
function getAssigneeColorClass(assigneeName) {
    if (!assigneeName) return 'blue';
    
    const colorMapping = dataManager.getAssigneeColorMapping();
    if (colorMapping[assigneeName]) {
        return colorMapping[assigneeName];
    }
    
    // フォールバック
    return 'blue';
}

// 編集用ドロップダウン制御関数群
function setupAssigneeEditDropdown(persons, currentAssignees) {
    const dropdownMenu = document.getElementById('assigneeEditDropdownMenu');
    dropdownMenu.innerHTML = '';
    
    // チェックボックスアイテムを追加
    persons.forEach(person => {
        const checkboxItem = document.createElement('div');
        checkboxItem.className = 'checkbox-item';
        const isChecked = currentAssignees.includes(person.name) ? 'checked' : '';
        checkboxItem.innerHTML = `
            <label for="edit_assignee_${person.id}">${person.name}</label>
            <input type="checkbox" id="edit_assignee_${person.id}" value="${person.name}" ${isChecked} onchange="updateAssigneeEditDropdownDisplay()">
        `;
        dropdownMenu.appendChild(checkboxItem);
    });
    
    // ドロップダウンボタンイベント設定
    const dropdownBtn = document.getElementById('assigneeEditDropdownBtn');
    dropdownBtn.onclick = () => toggleAssigneeEditDropdown();
    
    // 初期表示を更新
    updateAssigneeEditDropdownDisplay();
    
    // 外部クリック時に閉じる
    setupEditDropdownOutsideClick();
}

function toggleAssigneeEditDropdown() {
    const dropdownBtn = document.getElementById('assigneeEditDropdownBtn');
    const dropdownMenu = document.getElementById('assigneeEditDropdownMenu');
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

function updateAssigneeEditDropdownDisplay() {
    const dropdownText = document.getElementById('assigneeEditDropdownBtn').querySelector('.dropdown-text');
    const preview = document.getElementById('assigneeEditPreview');
    const checkedBoxes = document.querySelectorAll('#assigneeEditDropdownMenu input[type="checkbox"]:checked');
    
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

function setupEditDropdownOutsideClick() {
    document.addEventListener('click', function(event) {
        const container = document.getElementById('assigneeEditContainer');
        if (container && !container.contains(event.target)) {
            const dropdownMenu = document.getElementById('assigneeEditDropdownMenu');
            if (dropdownMenu && dropdownMenu.style.display === 'block') {
                toggleAssigneeEditDropdown();
            }
        }
    });
}

// 優先度表示関数
function displayPriority() {
    const priorityDisplay = document.getElementById('taskPriorityDisplay');
    const priority = currentTask.priority || 'medium';
    
    const priorityMap = {
        'high': { label: '高', icon: '↑', class: 'high' },
        'medium': { label: '中', icon: '→', class: 'medium' },
        'low': { label: '低', icon: '↓', class: 'low' }
    };
    
    const priorityInfo = priorityMap[priority] || priorityMap['medium'];
    
    priorityDisplay.innerHTML = `
        <span class="priority-badge priority-${priorityInfo.class}">
            <span class="priority-icon">${priorityInfo.icon}</span>
            <span class="priority-label">${priorityInfo.label}</span>
        </span>
    `;
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
                const assigneeElement = document.getElementById('assigneeDisplay');
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