/**
 * Helper pengiriman notifikasi Telegram via bot
 * Bersifat non-blocking (fire-and-forget), kegagalan network tidak menggagalkan transaksi utama
 */
export async function sendTelegramAlert(htmlMessage: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) {
    // Jika belum dikonfigurasi di .env, lewati tanpa melempar error
    return
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: htmlMessage.trim(),
        parse_mode: 'HTML',
      }),
    })

    if (!res.ok) {
      const errData = await res.text()
      console.error('[Telegram] Response gagal dari Telegram API:', errData)
    }
  } catch (err) {
    console.error('[Telegram] Network error saat mengirim notifikasi:', err)
  }
}
