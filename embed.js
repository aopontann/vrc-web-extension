const KEY_NAME = "vrc_notification_forwarding_data"
const TARGET_ORIGIN = "https://vrchat.com/*"

// 通信状況を判断するための定数
const CONNECTING = "0"
const READY = "1"
const STARTED = "2"
const STOPPED = "3"
const RECONNECTING = "4"
const OTHER_PAGE = "5"
const LOGIN = "6"

const waitingForConnection = () => {
    return new Promise((resolve) => {
        const check = () => {
            if (window.socket && window.socket.readyState === 1) { // 値が存在する場合
                console.log("接続完了しました")
                resolve(window.socket);
            } else {
                setTimeout(check, 5000); // 100msごとに再チェック
            }
        };
        check();
    });
};

const getLocalstorage = (key) => {
    const dataStr = localStorage.getItem(KEY_NAME)
    if (dataStr === null) return null
    const data = JSON.parse(dataStr)
    return data[key] || null
}

// websocketが確立しているか定期的にチェック
window.addEventListener("load", async () => {
    console.log("embed:onload")
    window.VRCWebExtensionStatus = CONNECTING
    await waitingForConnection()

    // popupに接続完了していることを通知
    window.postMessage({ type: "connected_response", data: "OK" }, TARGET_ORIGIN)
    window.VRCWebExtensionStatus = READY

    const status = getLocalstorage("status")
    if (!status) return
    // 前回起動時に、「転送開始」モードになっていた場合、そのまま転送開始する
    if (status === STARTED) {
        await TransferRegistration()
        window.VRCWebExtensionStatus = STARTED
    }
})

window.addEventListener("message", async (event) => {
    const type = event.data

    if (type === "status") {
        window.postMessage({ type: "status_response", data: window.VRCWebExtensionStatus }, TARGET_ORIGIN)
    }
    if (type === "start") {
        await TransferRegistration()
        // 指定されたwebhook URLが正しいか一度リクエストを送信する
        const url = getLocalstorage("url") || ""
        const isOK = await sendForDiscord(url)
        if (isOK) {
            window.postMessage({ type: "start_response", data: "OK" }, TARGET_ORIGIN)
            window.VRCWebExtensionStatus = STARTED
        } else {
            window.postMessage({ type: "start_response", data: "NG" }, TARGET_ORIGIN)
            TransferRemove()
        }
    }
    if (type === "stop") {
        TransferRemove()
        window.postMessage({ type: "stop_response", data: "OK" }, TARGET_ORIGIN)
        window.VRCWebExtensionStatus = STOPPED
    }
})

// websocketのメッセージを取得したときの処理
const messageHandler = async (event) => {
    console.log("[VRChat通知転送] イベントを受信:", new Date().toLocaleTimeString('ja-JP', {hour12:false}))
    const data = JSON.parse(event.data)
    // contentがjson文字列のままなので、もう一度パースする
    const content = JSON.parse(data.content)
    console.log("type:", data.type)
    console.log("content:", content)

    const url = getLocalstorage("url")
    if (!url) return

    if (data.type === "notification-v2") {
        // content.titleにグループ名が含まれているので、他のプロパティから取得
        const title = (content.type === "group.announcement" && content.data.announcementTitle) || (content.type === "group.event.created" && content.data.title) || ""
        const message = content.message || ""
        const sendData = `## ${title}\n${message}`
        await send(url, sendData)
    }
}

const closeHandler = async () => {
    console.log("[VRChat通知転送] Websocketが切断されたため、再接続します")
    const beforeStatus = window.VRCWebExtensionStatus
    window.VRCWebExtensionStatus = RECONNECTING
    window.postMessage({ type: "reconnecting_response", data: "OK" }, TARGET_ORIGIN)
    // 再接続されるまで待機
    await waitingForConnection()
    window.postMessage({ type: "connected_response", data: "OK" }, TARGET_ORIGIN)
    window.VRCWebExtensionStatus = beforeStatus
    // 接続が切れる前、転送開始モードだった場合、
    if (beforeStatus === STARTED) {
        await TransferRegistration()
    }
}

const TransferRegistration = async () => {
    console.log("[VRChat通知転送] 転送登録開始")
    window.socket.addEventListener("message", messageHandler)
    window.socket.addEventListener("close", closeHandler)
    console.log("[VRChat通知転送] 転送登録完了")
}

const TransferRemove = () => {
    console.log("[VRChat通知転送] 転送登録解除開始")
    window.socket.removeEventListener("message", messageHandler)
    window.socket.removeEventListener("close", closeHandler)
    console.log("[VRChat通知転送] 転送登録解除完了")
}

const send = async (url, content) => {
    await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content }),
    })
}

const sendForDiscord = async (url) => {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "登録が完了しました。\nVRChatの通知がこのチャンネルへ転送されます。" }),
    })
    return res.ok
}
