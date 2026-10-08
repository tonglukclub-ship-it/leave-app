export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { message, image } = req.body;
  
  // ดึงแค่ค่าของ Telegram เพราะไฟล์นี้จะทำหน้าที่แจ้งเตือนทันที (Real-time)
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  try {
    // เตรียมส่งเข้า Telegram
    let tgUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    let tgBody = { chat_id: TELEGRAM_CHAT_ID, text: message };
    
    if (image && image.startsWith('http')) {
      tgUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`;
      tgBody = { chat_id: TELEGRAM_CHAT_ID, photo: image, caption: message };
    }
    
    // ยิง API ไปที่ Telegram อย่างเดียว
    await fetch(tgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tgBody)
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
