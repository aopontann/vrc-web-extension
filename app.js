const webhookUrlElement = document.getElementById('webhook-url');
const registerButtonElement = document.getElementById('register-button');

registerButtonElement.addEventListener('click', async () => {
    localStorage.setItem('vrc_web_extension_webhook_url', webhookUrlElement.value);

    // content-scriptにURLを送信
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tab.id, webhookUrlElement.value);
});

window.onload = () => {
    webhookUrlElement.value = localStorage.getItem('vrc_web_extension_webhook_url') || '';
}