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
          
          // ดึงข้อมูลจาก Supabase เฉพาะของ "วันนี้" และที่สถานะ "Approved"
          const supaRes = await fetch(`${SUPABASE_URL}/rest/v1/leaves?leave_date=eq.${dateStr}&status=eq.Approved`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
          });
          const leaves = await supaRes.json();
          
          let lineMessages = [];

          if (!leaves || leaves.length === 0) {
            lineMessages.push({ type: 'text', text: '✅ วันนี้ไม่มีพนักงานลางานครับ (มาครบ!)' });
          } else {
            // ฟังก์ชันจัดฟอร์แมตข้อความตามรูปต้นแบบ
            const formatLeaveMsg = (l) => {
              // จัดรูปแบบวันที่ลา YYYY-MM-DD เป็น DD/MM/YYYY
              const d = l.leave_date.split('-');
              const leaveDateThai = `${d[2]}/${d[1]}/${d[0]}`;
              
              // จัดรูปแบบเวลากดลา (ถ้ามีข้อมูลในระบบ)
              let submitTime = '-';
              if (l.created_at) {
                const c = new Date(l.created_at);
                const timeStr = c.toLocaleString('en-GB', { 
                  timeZone: 'Asia/Bangkok', day: '2-digit', month: '2-digit', year: 'numeric', 
                  hour: '2-digit', minute: '2-digit' 
                }).replace(',', '');
                submitTime = `${timeStr} น.`;
              }

              return `👤 **${l.name} รหัส ${l.username}**\n⏰ กดลา: ${submitTime}\n📅 วันที่ลา: ${leaveDateThai}\n📌 ประเภท: ${l.leave_type}\n📝 เหตุผล: ${l.note || '-'}`;
            };

            // ลอจิกการส่งบับเบิ้ลแบบแยก
            if (leaves.length <= 5) {
              // กรณีไม่เกิน 5 คน: สร้างบับเบิ้ลแยกคนละ 1 ข้อความเลย
              leaves.forEach(l => {
                lineMessages.push({ type: 'text', text: formatLeaveMsg(l) });
              });
            } else {
              // กรณีเกิน 5 คน: เอาแค่ 4 คนแรกมาสร้างบับเบิ้ล
              for (let i = 0; i < 4; i++) {
                lineMessages.push({ type: 'text', text: formatLeaveMsg(leaves[i]) });
              }
              // บับเบิ้ลที่ 5 ทำหน้าที่แจ้งเตือนคนที่เหลือตามที่คุณ Tongluk ระบุ
              const remaining = leaves.length - 4;
              lineMessages.push({ type: 'text', text: `🔔 มีผู้ลางานอีก ${remaining} ท่านที่ยังไม่แสดงผล (ตรวจสอบรายชื่อทั้งหมดได้ที่ระบบเว็บแอปครับ)` });
            }
          }

          // ยิง API ตอบกลับไปที่แชท LINE
          await fetch('https://api.line.me/v2/bot/message/reply', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${LINE_TOKEN}`
            },
            body: JSON.stringify({
              replyToken: event.replyToken,
              messages: lineMessages
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
