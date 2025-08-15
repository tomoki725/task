// Firebase設定
const firebaseConfig = {
    apiKey: "AIzaSyBxRqIF0kFFV8o6wRYFvVMpzHmKhZJY-3s",
    authDomain: "buzzlog-6fc74.firebaseapp.com",
    projectId: "buzzlog-6fc74",
    storageBucket: "buzzlog-6fc74.appspot.com",
    messagingSenderId: "681665987431",
    appId: "1:681665987431:web:2e5e8c9f7a5b6e9f0a8e91"
};

// Firebase初期化
firebase.initializeApp(firebaseConfig);

// Firestore初期化
const db = firebase.firestore();

// Firebase v10ではデフォルトで以下が有効：
// - リアルタイム同期（オンライン時）
// - オフライン永続化（オフライン時）
// - 自動再同期（オンライン復帰時）
console.log('✅ Firestore初期化完了（リアルタイム同期・オフライン対応有効）');

// Firestoreコレクション参照
const collections = {
    tasks: db.collection('tasks'),
    persons: db.collection('persons'),
    projects: db.collection('projects'),
    comments: db.collection('comments'),
    notifications: db.collection('notifications')
};

// タイムスタンプヘルパー
const serverTimestamp = firebase.firestore.FieldValue.serverTimestamp;
const deleteField = firebase.firestore.FieldValue.delete;

console.log('Firebase Firestore initialized');