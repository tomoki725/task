// 認証処理

// パスワード生成関数（苗字のローマ字 + 123）
function generatePassword(name) {
    const passwordMap = {
        '山田太郎': 'yamada123',
        '佐藤花子': 'sato123',
        '鈴木一郎': 'suzuki123'
    };
    
    // 事前定義されたパスワードがある場合はそれを使用
    if (passwordMap[name]) {
        return passwordMap[name];
    }
    
    // 新規ユーザーの場合は、最初の文字をローマ字に変換 + 123
    // 簡易的に苗字の最初の2文字 + 123
    const simpleName = name.substring(0, 2).toLowerCase();
    return simpleName + '123';
}

// 人員マスターから認証
function authenticateUser(userId, password) {
    // LocalStorageから人員マスターを取得
    const persons = JSON.parse(localStorage.getItem('persons') || '[]');
    const person = persons.find(p => p.name === userId);
    
    if (person) {
        const expectedPassword = generatePassword(person.name);
        return password === expectedPassword;
    }
    
    // 旧認証情報との互換性（pialabuzz）
    if (userId === 'pialabuzz' && password === 'pialabuzz1234') {
        return true;
    }
    
    return false;
}

document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const userId = document.getElementById('userId').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');
    
    if (authenticateUser(userId, password)) {
        // ログイン成功
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('userId', userId);
        sessionStorage.setItem('loginTime', new Date().toISOString());
        
        // ダッシュボードへ遷移
        window.location.href = 'dashboard.html';
    } else {
        // ログイン失敗
        errorMessage.textContent = 'IDまたはパスワードが正しくありません。';
        errorMessage.style.display = 'block';
        
        // パスワードフィールドをクリア
        document.getElementById('password').value = '';
    }
});

// セッションチェック関数
function checkSession() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    const currentPage = window.location.pathname.split('/').pop();
    
    if (!isLoggedIn && currentPage !== 'index.html' && currentPage !== '') {
        // ログインしていない場合はログインページへ
        window.location.href = 'index.html';
    } else if (isLoggedIn && (currentPage === 'index.html' || currentPage === '')) {
        // ログイン済みの場合はダッシュボードへ
        window.location.href = 'dashboard.html';
    }
}

// ログアウト関数
function logout() {
    sessionStorage.clear();
    window.location.href = 'index.html';
}