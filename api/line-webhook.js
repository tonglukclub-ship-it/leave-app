export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // ดึง Token ของ LINE จาก Vercel
  const LINE_TOKEN = process.env.LINE_TOKEN;
  
  // รหัสเชื่อมต่อ Supabase
  const SUPABASE_URL = 'https://vyrzjufrkkihzcebfasi.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_Rt5A7MrALN-6HaSz4yHg-Q_ExDFCJ1X';

  try {
    const body = req.body;
    
    // ตรวจสอบว่าเป็นการส่งข้อความจาก LINE หรือไม่
    if (body.events && body.events.length > 0) {
      const event = body.events[0];
      
      // เช็คว่าเป็นข้อความตัวอักษร
      if (event.type === 'message' && event.message.type === 'text') {
        const userMessage = event.message.text.trim();
        
        // 🛑 ถ้าพิมพ์คำว่า "เช็คลา"
        if (userMessage === 'เช็คลา') {
          
          // หาวันที่ปัจจุบัน (เวลาไทย)
          const today = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
          const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          const displayDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
          
          // ดึงข้อมูลจาก Supabase เฉพาะของ "วันนี้" และที่สถานะ "Approved"
          const supaRes = await fetch(`${SUPABASE_URL}/rest/v1/leaves?leave_date=eq.${dateStr}&status=eq.Approved`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
          });
          const leaves = await supaRes.json();
          
          // สร้างข้อความสรุป
          let replyText = `📅 สรุปการลางานวันนี้ (${displayDate})\n\n`;
          if (leaves && leaves.length > 0) {
            leaves.forEach((l, index) => {
              let note = l.note ? ` (${l.note})` : '';
              replyText += `${index + 1}. ${l.name} - ${l.leave_type}${note}\n`;
            });
            replyText += `\nรวมผู้ลางาน: ${leaves.length} ท่าน`;
          } else {
            replyText += `✅ วันนี้ไม่มีพนักงานลางานครับ (มาครบ!)`;
          }

          // ยิง API ตอบกลับไปที่แชท LINE ทันที
          await fetch('https://api.line.me/v2/bot/message/reply', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${LINE_TOKEN}`
            },
            body: JSON.stringify({
              replyToken: event.replyToken,
              messages: [{ type: 'text', text: replyText }]
            })
          });
        }
      }
    }
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
