const KEY_NAME = "vrc_notification_forwarding_data"

// 通信状況を判断するための定数
const CONNECTING = "0"
const READY = "1"
const STARTED = "2"
const STOPPED = "3"
const RECONNECTING = "4"
const OTHER_PAGE = "5"
const LOGIN = "6"

const webhookUrlElement = document.getElementById('webhook-url');
const buttonElement = document.getElementById('button');

webhookUrlElement.addEventListener('change', async (e) => {
    await setLocalStorage("url", e.target.value)
})

buttonElement.addEventListener('click', async () => {
    // webhook URL を入力していない場合
    if (webhookUrlElement.value === "") {
        window.alert("webhook URL を入力してください")
        return
    }
    console.log("buttonElement.innerText:", buttonElement.innerText)
    if (buttonElement.innerText === "停止") {
        console.log("転送停止します")
        const res = await send({type: "stop"})
        if (res.data === "OK") {
            await setLocalStorage("status", STOPPED)
            update(STOPPED)
        }
    }
    else if (buttonElement.innerText === "開始") {
        console.log("転送開始します")
        const res = await send({type: "start"})
        if (res.data === "OK") {
            console.log("popup:start:OK")
            await setLocalStorage("status", STARTED)
            update(STARTED)
        } else {
            window.alert("指定したWebhook URLが正しくないようです...")
        }
    }
})

window.onload = async () => {
    // localstorageの値で初期化
    webhookUrlElement.value = getLocalstorage("url");

    // Websocket疎通状態を確認
    const {data} = await send({type: "status"})
    update(data)
}

const update = (type) => {
    switch (type) {
        case CONNECTING:
            // なにもしない
            break
        case READY:
            document.getElementById("status").textContent = `通知転送：準備完了`
            buttonElement.disabled = false
            webhookUrlElement.disabled = false
            break
        case STARTED:
            document.getElementById("status").textContent = `通知転送：開始中`
            buttonElement.innerText = "停止"
            webhookUrlElement.disabled = true
            buttonElement.disabled = false
            break
        case STOPPED:
            document.getElementById("status").textContent = `通知転送：停止中`
            buttonElement.innerText = "開始"
            webhookUrlElement.disabled = false
            buttonElement.disabled = false
            break
        case RECONNECTING:
            document.getElementById("status").textContent = `通知転送：再接続中`
            buttonElement.disabled = true
            break
    }
}

const send = async({type}) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    // vrchat.com以外のページがアクティブの場合
    if (!tab.url.includes("vrchat.com/home")) {
        return { type: "status_response", data: OTHER_PAGE}
    }
    // ログインしていない場合
    if (tab.url.includes("vrchat.com/home/login")) {
        return { type: "status_response", data: LOGIN}
    }
    console.log("popup:send", tab)
    return await chrome.tabs.sendMessage(tab.id, {type})
}

chrome.runtime.onMessage.addListener(async (json) => {
    if (json.type === "connected_response") {
        console.log("接続完了")
        const status = getLocalstorage("status") || READY
        update(status)
        return "OK"
    }
    if (json.type === "reconnecting_response") {
        console.log("再接続中")
        update(RECONNECTING)
        return "OK"
    }
})

const getLocalstorage = (key) => {
    const dataStr = localStorage.getItem(KEY_NAME)
    if (dataStr === null) return null
    const data = JSON.parse(dataStr)
    return data[key] || null
}

// popupとembedが別々のlocalstorageなので、書き込みを同期する
const setLocalStorage = async (key, value) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    const dataStr = localStorage.getItem(KEY_NAME) || "{}"
    const data = JSON.parse(dataStr) || {}
    localStorage.setItem(KEY_NAME, JSON.stringify({...data, [key]: value}))
    await chrome.tabs.sendMessage(tab.id, {type: "set_localstorage", data: {key, value}})
}