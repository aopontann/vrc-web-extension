console.log("embed.js が読み込まれました")
const webhookURL = ""

const waitForVariable = () => {
    return new Promise((resolve) => {
        const check = () => {
            if (window.socket && window.socket.readyState === 1) { // 値が存在する場合
                resolve(window.socket);
            } else {
                setTimeout(check, 5000); // 100msごとに再チェック
            }
        };
        check();
    });
};

const func = async () => {
    console.log("embed Websocket 接続開始")
    const socket = await waitForVariable();
    console.log("embed Websocket 接続完了", socket)

    socket.addEventListener("message", (event) => {
        job(event)
    })

    socket.addEventListener("close", async () => {
        console.log("embed Websocketが切断されたため、再接続します")
        await func()
    })
}
func()


const job = async (event) => {
    console.log("イベントを受信:", new Date().toLocaleTimeString('ja-JP', {hour12:false}))
    const data = JSON.parse(event.data)
    const content = JSON.parse(data.content)
    console.log("data:", data)
    console.log("content:", content)

    if (data.type === "friend-online") {
        const userName = content.user.displayName
        await send(`${userName} がオンラインになりました`)
    }
}

const send = async (content) => {
    await fetch(webhookURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content }),
    });
}
