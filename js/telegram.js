// ========== CONFIGURACIÓN TELEGRAM ==========
const TELEGRAM_BOT_TOKEN = '8700671088:AAEDhL7z5FvDxCFQWspjCEJuuHcccA5NkVI';
const TELEGRAM_CHAT_ID = '8700671088';

// Envío simple (sin botones)
async function sendTelegram(mensaje) {
    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: mensaje,
                parse_mode: 'Markdown'
            })
        });
        return response.ok;
    } catch (error) {
        console.error('Error enviando a Telegram:', error);
        return false;
    }
}

// Envío con botones inline
async function sendTelegramConBotones(mensaje, reply_markup) {
    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: mensaje,
                parse_mode: 'Markdown',
                reply_markup: reply_markup
            })
        });
        return response.ok;
    } catch (error) {
        console.error('Error enviando a Telegram con botones:', error);
        return false;
    }
}
