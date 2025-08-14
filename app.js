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
    document.getElementById('personEditForm').addEventListener('submit', handlePersonEditSubmit);
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
    
    // ステータスが「終了」の場合のみ削除ボタンを表示
    const deleteButton = task.status === '終了' ? 
        `<button onclick="deleteTaskConfirm(${task.id})" class="delete-btn-compact">削除</button>` : '';
    
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
                    ${projectBadge}
                    ${assigneeInfo}
                </div>
            </div>
            <div class="task-actions">
                <button onclick="openTaskDetail(${task.id})" class="detail-btn-compact">詳細</button>
                ${deleteButton}
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
function openTaskDetail(taskId) {
    window.location.href = `task-detail.html?id=${taskId}`;
}

// タスク削除確認
function deleteTaskConfirm(taskId) {
    const task = dataManager.getTaskById(taskId);
    if (!task) {
        alert('タスクが見つかりません');
        return;
    }
    
    if (task.status !== '終了') {
        alert('終了状態のタスクのみ削除できます');
        return;
    }
    
    if (confirm(`タスク「${task.name}」を完全に削除しますか？\nこの操作は取り消せません。`)) {
        dataManager.deleteTask(taskId);
        loadTasks(); // タスクリストを再読み込み
        alert('タスクを削除しました');
    }
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
function handleTaskSubmit(e) {
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
    const currentUser = sessionStorage.getItem('userId');
    const isAdmin = currentUser === 'pialabuzz';
    
    personList.innerHTML = '';
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

// 人員編集フォーム送信処理
function handlePersonEditSubmit(e) {
    e.preventDefault();
    
    const editingId = parseInt(document.getElementById('personEditForm').dataset.editingId);
    const loginId = document.getElementById('personEditLoginId').value;
    
    // ログインIDの重複チェック（自分以外）
    const persons = dataManager.getPersons();
    const existingPerson = persons.find(p => p.loginId === loginId && p.id !== editingId);
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
    
    const result = dataManager.updatePerson(editingId, updates);
    if (result) {
        alert(`人員情報を更新しました。\\n名前: ${updates.name}\\nログインID: ${updates.loginId}\\nパスワード: ${updates.password}`);
        closePersonEditModal();
        loadPersonList();
    } else {
        alert('更新に失敗しました。');
    }
}

// パスワード自動生成関数
function generateAutoPassword() {
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

function handlePersonSubmit(e) {
    e.preventDefault();
    
    const loginId = document.getElementById('personLoginId').value;
    
    // ログインIDの重複チェック
    const persons = dataManager.getPersons();
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
    
    dataManager.savePerson(person);
    closePersonModal();
    loadPersonList();
    alert(`人員を追加しました。\nログインID: ${person.loginId}\nパスワード: ${person.password}`);
}

function editPerson(id) {
    // pialabuzzアカウントのみ編集可能
    const currentUser = sessionStorage.getItem('userId');
    if (currentUser !== 'pialabuzz') {
        alert('人員情報の編集は管理者のみ可能です。');
        return;
    }
    
    openPersonEditModal(id);
}

// 人員編集モーダルを開く
function openPersonEditModal(personId) {
    const persons = dataManager.getPersons();
    const person = persons.find(p => p.id === personId);
    
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
function closePersonEditModal() {
    document.getElementById('personEditModal').style.display = 'none';
    document.getElementById('personEditForm').reset();
    delete document.getElementById('personEditForm').dataset.editingId;
}

// 人員編集用パスワード自動生成
function generateEditAutoPassword() {
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
    } else if (filterType === 'project') {
        const projects = dataManager.getProjects();
        
        // プロジェクトを追加
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.name;
            option.textContent = project.name;
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
    const currentUser = sessionStorage.getItem('userName') || sessionStorage.getItem('userId');
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
    const currentUser = sessionStorage.getItem('userName') || sessionStorage.getItem('userId');
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

function markAllAsRead() {
    const currentUserId = sessionStorage.getItem('userId');
    const currentUserName = sessionStorage.getItem('userName');
    dataManager.markAllNotificationsAsRead(currentUserId, currentUserName);
    
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