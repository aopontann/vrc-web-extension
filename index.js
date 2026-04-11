console.log("load index.js")
const head = document.head
const script = document.createElement('script')
script.src = chrome.runtime.getURL('embed.js')
head.appendChild(script)

chrome.runtime.onMessage.addListener((url) => {
    localStorage.setItem("vrc_web_extension_webhook_url", url)
    return true;
});