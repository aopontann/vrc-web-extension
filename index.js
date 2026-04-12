console.log("load index.js")
const head = document.head
const script = document.createElement('script')
script.src = chrome.runtime.getURL('embed.js')
head.appendChild(script)

chrome.runtime.onMessage.addListener(async (url) => {
    localStorage.setItem("vrc_web_extension_webhook_url", url)
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "登録が完了しました。今後こちらのチャンネルから通知が送られます。" }),
    })
    if (!res.ok) {
        window.alert("指定したURLが正しくないようです...")
    }
    return true;
});