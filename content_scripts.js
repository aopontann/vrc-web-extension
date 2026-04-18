const KEY_NAME = "vrc_notification_forwarding_data"
const TARGET_ORIGIN = "https://vrchat.com/*"

const head = document.head
const script = document.createElement('script')
script.src = chrome.runtime.getURL('embed.js')
head.appendChild(script)

chrome.runtime.onMessage.addListener(async (json) => {
    // popupとembedのローカルストレージを同期させるための処理
    const {type} = json
    if (type === "set_localstorage") {
        const {key, value} = json.data
        const dataStr = localStorage.getItem(KEY_NAME) || "{}"
        const data = JSON.parse(dataStr) || {}
        localStorage.setItem(KEY_NAME, JSON.stringify({...data, [key]: value}))
        return {type: "set_localstorage_response", data: "OK"}
    }

    // popupからのリクエストをembedへ流す
    return await sendMessageAndWaitResponse(type)
});

function sendMessageAndWaitResponse(type) {
    return new Promise((resolve, reject) => {
        // 1. 一時的なメッセージリスナーを定義
        const handler = (event) => {
            // オリジンの検証（セキュリティ上必須）
            // if (event.origin !== targetOrigin) return;

            // 自分が送信したリクエストを受信してしまうので、typeが XX_response の場合、resolveする
            if (event.data.type && event.data.type.endsWith("_response")) {
                const {type, data} = event.data
                window.removeEventListener('message', handler);
                resolve({type, data})
            }
        }

        // 4. リスナーを待機状態にする
        window.addEventListener('message', handler);

        // 5. メッセージを送信
        window.postMessage(type, TARGET_ORIGIN);
    });
}

// embedからのメッセージを取得
window.addEventListener("message", async (event) => {
    const {type, data} = event.data
    if (type === "connected_response" || type === "reconnecting_response") {
        try {
            await chrome.runtime.sendMessage({type, data})
        } catch (error) {
            // popupを開いていないとエラーになるが問題はない
        }
    }
})