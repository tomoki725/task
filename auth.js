// 認証処理

// パスワード生成関数（名前の最初の2文字（ひらがな→ローマ字）+ 123）
function generatePassword(name) {
    // ひらがな→ローマ字変換マップ（よく使う文字）
    const hiraganaToRomaji = {
        'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
        'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
        'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
        'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
        'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
        'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
        'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
        'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
        'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
        'わ': 'wa', 'を': 'wo', 'ん': 'n',
        'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
        'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
        'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
        'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
        'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po'
    };
    
    // 名前の最初の2文字を取得
    let prefix = '';
    for (let i = 0; i < Math.min(2, name.length); i++) {
        const char = name[i];
        if (hiraganaToRomaji[char]) {
            // ひらがなの場合はローマ字に変換
            prefix += hiraganaToRomaji[char];
        } else if (char.match(/[a-zA-Z]/)) {
            // 英字の場合はそのまま使用
            prefix += char.toLowerCase();
        } else {
            // その他の文字（漢字等）は最初の2文字をそのまま使用
            prefix += char.toLowerCase();
        }
    }
    
    // prefixが2文字未満の場合は、元の名前の最初の2文字を使用
    if (prefix.length < 2) {
        prefix = name.substring(0, 2).toLowerCase();
    }
    
    // 最大6文字に制限（変換後に長くなる場合があるため）
    prefix = prefix.substring(0, 6);
    
    return prefix + '123';
}

// 人員マスターから認証
function authenticateUser(userId, password) {
    // LocalStorageから人員マスターを取得
    const persons = JSON.parse(localStorage.getItem('persons') || '[]');
    console.log('認証開始 - 人員データ数:', persons.length);
    console.log('認証試行:', { userId, password });
    
    // loginIdで検索（新形式）
    let person = persons.find(p => p.loginId === userId);
    console.log('loginIdでの検索結果:', person);
    
    if (person) {
        // 新形式：設定されたパスワードで認証
        console.log('パスワード照合:', person.password, '===', password, '?', person.password === password);
        return person.password === password;
    }
    
    // 名前で検索（旧形式・後方互換性）
    person = persons.find(p => p.name === userId);
    console.log('名前での検索結果:', person);
    
    if (person) {
        // 旧形式：自動生成パスワードで認証
        const expectedPassword = generatePassword(person.name);
        console.log('旧形式パスワード照合:', expectedPassword, '===', password, '?', password === expectedPassword);
        return password === expectedPassword;
    }
    
    // 管理者アカウント（ハードコーディング）
    if (userId === 'pialabuzz' && password === 'pialabuzz1234') {
        console.log('管理者アカウントでログイン成功');
        return true;
    }
    
    console.log('認証失敗 - 該当ユーザーが見つからない');
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
        
        // 実際の名前も保存（通知機能のため）
        const persons = JSON.parse(localStorage.getItem('persons') || '[]');
        let userName = userId; // デフォルトはuserIdと同じ
        
        // loginIdでログインした人の名前を取得
        const personByLoginId = persons.find(p => p.loginId === userId);
        if (personByLoginId) {
            userName = personByLoginId.name;
        } else {
            // 名前でログインした場合（旧形式）
            const personByName = persons.find(p => p.name === userId);
            if (personByName) {
                userName = personByName.name;
            }
        }
        
        sessionStorage.setItem('userName', userName);
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

// パスワード表示/非表示切り替え関数
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
    const toggleIcon = document.getElementById('passwordToggleIcon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleIcon.textContent = '🙈';
    } else {
        passwordInput.type = 'password';
        toggleIcon.textContent = '👁️';
    }
}

// ファイル読み込み時に即座に人員データを初期化（IIFE）
(function() {
    const existingPersons = JSON.parse(localStorage.getItem('persons') || '[]');
    if (existingPersons.length === 0) {
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
        console.log('デフォルト人員データを初期化しました:', defaultPersons.length, '名');
    } else {
        console.log('既存の人員データが見つかりました:', existingPersons.length, '名');
    }
})();

// DOMContentLoaded時はセッションチェックのみ実行
window.addEventListener('DOMContentLoaded', function() {
    checkSession();
});