// DOM要素の取得
const loginPage = document.getElementById('login-page');
const mainPage = document.getElementById('main-page');
const spacePage = document.getElementById('space-page');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const newSpaceModal = document.getElementById('new-space-modal');
const newSpaceBtn = document.getElementById('new-space-btn');

// 現在のユーザーと現在のスペース
let currentUser = null;
let currentSpace = null;
let socket;

// ページ切り替え関数
function showPage(page) {
    [loginPage, mainPage, spacePage].forEach(p => p.classList.add('hidden'));
    page.classList.remove('hidden');
}

// 初期表示
function initializeApp() {
    showPage(loginPage);
    newSpaceBtn.classList.add('hidden');
}

initializeApp();

// WebSocket接続を確立する関数
function connectWebSocket() {
    socket = new WebSocket('ws://localhost:8080');

    socket.onopen = function(e) {
        console.log("WebSocket接続が確立されました");
    };

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'chat') {
            addMessageToChat(message.data);
        } else if (message.type === 'space') {
            updateSpace(message.data);
        }
    };
}

// 新規登録とログインの表示切り替え
document.getElementById('show-signup').addEventListener('click', () => {
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
});

document.getElementById('show-login').addEventListener('click', () => {
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
});

// 新規登録処理
document.getElementById('signup-button').addEventListener('click', (e) => {
    e.preventDefault();
    const nickname = document.getElementById('signup-nickname').value;
    const id = document.getElementById('signup-id').value;
    const password = document.getElementById('signup-password').value;

    if (nickname && id && password && id.length === 5 && !isNaN(id)) {
        localStorage.setItem(id, JSON.stringify({ nickname, password }));
        alert('アカウントが作成されました。ログインしてください。');
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
        console.log('新規登録完了:', { id, nickname }); // デバッグ用
    } else {
        alert('入力内容を確認してください。識別コードは5桁の数字である必要があります。');
    }
});

// ログイン処理
document.getElementById('login-button').addEventListener('click', (e) => {
    e.preventDefault();
    const id = document.getElementById('login-id').value;
    const password = document.getElementById('login-password').value;

    const userData = JSON.parse(localStorage.getItem(id));
    if (userData && userData.password === password) {
        currentUser = { id, nickname: userData.nickname };
        showPage(mainPage);
        newSpaceBtn.classList.remove('hidden');
        loadPublicChat();
        updateActiveSpaces();
        connectWebSocket(); // WebSocket接続を確立
        console.log('ログイン成功:', currentUser); // デバッグ用
    } else {
        alert('ログインに失敗しました。IDまたはパスワードが間違っています。');
        console.log('ログイン失敗 - 入力されたID:', id); // デバッグ用
    }
});

// ログアウト処理
document.getElementById('logout').addEventListener('click', () => {
    currentUser = null;
    currentSpace = null;
    showPage(loginPage);
    newSpaceBtn.classList.add('hidden');
    if (socket) {
        socket.close();
    }
    console.log('ログアウト完了'); // デバッグ用
});

// 新規スペース作成モーダル表示
newSpaceBtn.addEventListener('click', () => {
    newSpaceModal.classList.remove('hidden');
});

// 新規スペース作成処理
document.getElementById('create-space-btn').addEventListener('click', () => {
    const spaceName = document.getElementById('space-name-input').value;
    const memberIds = document.getElementById('member-id-input').value.split(',').map(id => id.trim());
    
    if (spaceName && memberIds.length > 0) {
        createNewSpace(spaceName, memberIds);
        newSpaceModal.classList.add('hidden');
    } else {
        alert('スペース名とメンバーの識別コードを入力してください。');
    }
});

// モーダルを閉じる
document.getElementById('close-modal-btn').addEventListener('click', () => {
    newSpaceModal.classList.add('hidden');
});

// 新規スペース作成関数
function createNewSpace(name, memberIds) {
    const spaceId = Date.now().toString();
    const space = {
        id: spaceId,
        name: name,
        members: [currentUser.id, ...memberIds],
        messages: []
    };
    let spaces = JSON.parse(localStorage.getItem('spaces')) || {};
    spaces[spaceId] = space;
    localStorage.setItem('spaces', JSON.stringify(spaces));
    updateActiveSpaces();
    openSpace(spaceId);
}

// アクティブなスペース一覧を更新
function updateActiveSpaces() {
    const activeSpacesContainer = document.getElementById('active-spaces');
    activeSpacesContainer.innerHTML = '';
    const spaces = JSON.parse(localStorage.getItem('spaces')) || {};
    Object.values(spaces).forEach(space => {
        if (space.members.includes(currentUser.id)) {
            const spaceElement = document.createElement('button');
            spaceElement.classList.add('space-item');
            spaceElement.textContent = space.name;
            spaceElement.addEventListener('click', () => openSpace(space.id));
            activeSpacesContainer.appendChild(spaceElement);
        }
    });
}

// スペースを開く
function openSpace(spaceId) {
    const spaces = JSON.parse(localStorage.getItem('spaces')) || {};
    currentSpace = spaces[spaceId];
    document.getElementById('space-name').textContent = currentSpace.name;
    showPage(spacePage);
    loadSpaceChat();
}

// 公開チャットへ戻る
document.getElementById('back-to-public').addEventListener('click', () => {
    currentSpace = null;
    showPage(mainPage);
    loadPublicChat();
});

// メンバー追加
document.getElementById('add-member').addEventListener('click', () => {
    const newMemberId = prompt('新しいメンバーの識別コードを入力してください：');
    if (newMemberId && !currentSpace.members.includes(newMemberId)) {
        currentSpace.members.push(newMemberId);
        let spaces = JSON.parse(localStorage.getItem('spaces'));
        spaces[currentSpace.id] = currentSpace;
        localStorage.setItem('spaces', JSON.stringify(spaces));
        alert('メンバーが追加されました。');
    } else if (currentSpace.members.includes(newMemberId)) {
        alert('このメンバーは既に追加されています。');
    }
});

// 公開チャットの読み込み
function loadPublicChat() {
    const publicMessages = JSON.parse(localStorage.getItem('publicMessages')) || [];
    displayMessages(publicMessages, 'messages');
}

// スペースチャットの読み込み
function loadSpaceChat() {
    displayMessages(currentSpace.messages, 'space-messages');
}

// メッセージの表示
function displayMessages(messages, elementId) {
    const messageArea = document.getElementById(elementId);
    messageArea.innerHTML = '';
    messages.forEach(msg => {
        const messageElement = document.createElement('p');
        messageElement.textContent = `${msg.time} ${msg.user}: ${msg.text}`;
        messageArea.appendChild(messageElement);
    });
    messageArea.scrollTop = messageArea.scrollHeight;
}

// 公開チャットへのメッセージ送信
document.getElementById('message-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('message-input');
    if (input.value) {
        addMessage(input.value, 'publicMessages');
        input.value = '';
    }
});

// スペースチャットへのメッセージ送信
document.getElementById('space-message-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('space-message-input');
    if (input.value) {
        addMessage(input.value, 'spaceMessages');
        input.value = '';
    }
});

// メッセージの追加
function addMessage(text, type) {
    const timestamp = new Date().toLocaleTimeString();
    const message = { user: currentUser.nickname, text, time: timestamp };
    
    if (type === 'publicMessages') {
        socket.send(JSON.stringify({ type: 'chat', data: message }));
    } else if (type === 'spaceMessages') {
        socket.send(JSON.stringify({ type: 'space', data: { spaceId: currentSpace.id, message } }));
    }
}

// チャットにメッセージを追加
function addMessageToChat(message) {
    const messageArea = document.getElementById('messages');
    const messageElement = document.createElement('p');
    messageElement.textContent = `${message.time} ${message.user}: ${message.text}`;
    messageArea.appendChild(messageElement);
    messageArea.scrollTop = messageArea.scrollHeight;

    // ローカルストレージも更新
    let publicMessages = JSON.parse(localStorage.getItem('publicMessages')) || [];
    publicMessages.push(message);
    localStorage.setItem('publicMessages', JSON.stringify(publicMessages));
}

// スペースを更新
function updateSpace(data) {
    if (currentSpace && currentSpace.id === data.spaceId) {
        currentSpace.messages.push(data.message);
        loadSpaceChat();

        // ローカルストレージも更新
        let spaces = JSON.parse(localStorage.getItem('spaces'));
        spaces[currentSpace.id] = currentSpace;
        localStorage.setItem('spaces', JSON.stringify(spaces));
    }
}

// デバッグ用：ローカルストレージの内容を表示
function displayLocalStorageContents() {
    console.log('ローカルストレージの内容:');
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        console.log(key, JSON.parse(localStorage.getItem(key)));
    }
}

// ページ読み込み時にローカルストレージの内容を表示
window.addEventListener('load', displayLocalStorageContents);