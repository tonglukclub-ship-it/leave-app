export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { message, image } = req.body;
  // เปลี่ยนจากพิมพ์ตรงๆ เป็นการดึงค่าจาก Vercel Environment Variables
const LINE_TOKEN = process.env.LINE_TOKEN;
const LINE_GROUP_ID = process.env.LINE_GROUP_ID;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  try {
    // 1. เตรียมส่ง LINE
    const lineMessages = [{ type: 'text', text: message }];
    if (image && image.startsWith('http')) {
      lineMessages.push({ type: 'image', originalContentUrl: image, previewImageUrl: image });
    }
    const lineReq = fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LINE_TOKEN}` },
      body: JSON.stringify({ to: LINE_GROUP_ID, messages: lineMessages })
    });

    // 2. เตรียมส่ง Telegram
    let tgUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    let tgBody = { chat_id: TELEGRAM_CHAT_ID, text: message };
    if (image && image.startsWith('http')) {
      tgUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`;
      tgBody = { chat_id: TELEGRAM_CHAT_ID, photo: image, caption: message };
    }
    const tgReq = fetch(tgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tgBody)
    });

    // ยิงพร้อมกันทั้ง 2 แอป
    await Promise.all([lineReq, tgReq]);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
