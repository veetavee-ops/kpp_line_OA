
const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// ✅ ใช้ Gemini 3 Flash (ใหม่ล่าสุด)
const MODEL = 'gemini-3-flash-preview';
const GEMINI_API = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// ── Helper: แปลงข้อความแต่ละประเภทเป็น text ────────────────────────────────
function formatMessageContent(m) {
  if (m.messageType === 'text') return m.text || '';
  if (m.messageType === 'image') return `[ส่งรูป ${m.metadata?.imageCount || 1} รูป]`;
  if (m.messageType === 'sticker') return '[ส่งสติกเกอร์]';
  if (m.messageType === 'video') return '[ส่งวิดีโอ]';
  if (m.messageType === 'file') return `[ส่งไฟล์: ${m.metadata?.fileName || 'ไม่ทราบชื่อ'}]`;
  if (m.messageType === 'location') return `[แชร์ตำแหน่ง: ${m.metadata?.address || ''}]`;
  if (m.messageType === 'audio') return '[ส่งเสียง]';
  return `[${m.messageType}]`;
}

// ── Helper: แปลงวันที่เป็นภาษาไทย ───────────────────────────────────────────
function formatThaiDate(dateObj) {
  return dateObj.toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ── Helper: แปลง Date เป็น key เปรียบเทียบวัน (YYYY-MM-DD local) ─────────────
function toDayKey(dateObj) {
  // ใช้ toISOString slice เพื่อ UTC-key ที่ consistent
  const d = new Date(dateObj);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function summarizeAllChatsForDate(allMessages) {
  try {
    if (allMessages.length === 0) {
      return {
        summary: 'ไม่มีข้อความในช่วงนี้',
        messageCount: 0,
        groupCount: 0,
      };
    }

    // ── 1. ตรวจสอบช่วงวันที่ ──────────────────────────────────────────────────
    const timestamps = allMessages.map(m => new Date(m.timestamp));
    const minDate = new Date(Math.min(...timestamps.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...timestamps.map(d => d.getTime())));

    // นับจำนวนวันที่ไม่ซ้ำกัน
    const uniqueDayKeys = [...new Set(allMessages.map(m => toDayKey(new Date(m.timestamp))))];
    uniqueDayKeys.sort();
    const isMultiDay = uniqueDayKeys.length > 1;

    // Label ช่วงวันที่สำหรับแสดงใน header
    let dateRangeLabel;
    if (!isMultiDay) {
      dateRangeLabel = formatThaiDate(minDate);
    } else {
      dateRangeLabel = `${formatThaiDate(minDate)} — ${formatThaiDate(maxDate)} (${uniqueDayKeys.length} วัน)`;
    }

    // ── 2. จัดกลุ่มข้อความ ────────────────────────────────────────────────────
    // รวบรวม unique groups สำหรับนับ groupCount
    const allGroupKeys = new Set();

    let chatSummaryText = '';

    if (isMultiDay) {
      // === Multi-day: จัดกลุ่มตาม วันที่ → กลุ่ม/แชท ===

      // สร้าง structure: { dayKey → { dateObj, groups: { groupKey → { name, isPrivate, messages[] } } } }
      const byDate = {};

      allMessages.forEach(m => {
        const dayKey = toDayKey(new Date(m.timestamp));
        if (!byDate[dayKey]) {
          byDate[dayKey] = { dateObj: new Date(m.timestamp), groups: {} };
        }
        const groupKey = m.groupId || `private_${m.userId}`;
        allGroupKeys.add(groupKey);
        if (!byDate[dayKey].groups[groupKey]) {
          byDate[dayKey].groups[groupKey] = {
            name: m.group?.groupName || m.user?.displayName || 'Unknown',
            isPrivate: !m.groupId,
            messages: [],
          };
        }
        byDate[dayKey].groups[groupKey].messages.push(m);
      });

      // เรียงวันที่จากเก่าไปใหม่
      uniqueDayKeys.forEach(dayKey => {
        const dayData = byDate[dayKey];
        const thaiDate = formatThaiDate(dayData.dateObj);

        chatSummaryText += `\n${'═'.repeat(60)}\n`;
        chatSummaryText += `📅 วันที่: ${thaiDate}\n`;
        chatSummaryText += `${'═'.repeat(60)}\n`;

        Object.entries(dayData.groups).forEach(([, data]) => {
          const groupLabel = data.isPrivate
            ? `💬 แชทส่วนตัว: ${data.name}`
            : `👥 กลุ่ม: ${data.name}`;
          chatSummaryText += `\n  ── ${groupLabel} (${data.messages.length} ข้อความ) ──\n`;

          data.messages.forEach(m => {
            const d = new Date(m.timestamp);
            const time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
            const sender = m.user?.displayName || 'Unknown';
            const content = formatMessageContent(m);
            chatSummaryText += `  [${time}] ${sender}: ${content}\n`;
          });
        });
      });

    } else {
      // === Single-day: จัดกลุ่มตาม กลุ่ม/แชท ===
      const groupedMessages = {};

      allMessages.forEach(m => {
        const key = m.groupId || `private_${m.userId}`;
        allGroupKeys.add(key);
        if (!groupedMessages[key]) {
          groupedMessages[key] = {
            name: m.group?.groupName || m.user?.displayName || 'Unknown',
            isPrivate: !m.groupId,
            messages: [],
          };
        }
        groupedMessages[key].messages.push(m);
      });

      Object.entries(groupedMessages).forEach(([, data]) => {
        const groupLabel = data.isPrivate
          ? `💬 แชทส่วนตัว: ${data.name}`
          : `👥 กลุ่ม: ${data.name}`;
        chatSummaryText += `\n\n=== ${groupLabel} (${data.messages.length} ข้อความ) ===\n`;

        data.messages.forEach(m => {
          const d = new Date(m.timestamp);
          const time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
          const sender = m.user?.displayName || 'Unknown';
          const content = formatMessageContent(m);
          chatSummaryText += `[${time}] ${sender}: ${content}\n`;
        });
      });
    }

    console.log(`📝 Summarizing with Gemini 3: ${allMessages.length} msgs | ${uniqueDayKeys.length} day(s) | ${allGroupKeys.size} group(s)`);

    // ── 3. สร้าง Prompt ────────────────────────────────────────────────────────
    const overviewTitle = isMultiDay
      ? `ภาพรวมช่วง ${dateRangeLabel}`
      : `ภาพรวมวันที่ ${dateRangeLabel}`;

    const perGroupInstruction = isMultiDay
      ? `📅 **สรุปแต่ละวัน** (เรียงจากวันเก่าไปวันใหม่)
สำหรับแต่ละวัน ให้แสดง:
- ชื่อวัน + วันที่ พร้อม emoji 📅
- กิจกรรมหลักในแต่ละกลุ่ม/แชท
- ประเด็นสำคัญที่พูดถึงในวันนั้น`
      : `📌 **สรุปแต่ละกลุ่ม/แชท**
1️⃣ **[ชื่อกลุ่ม/แชท]**
- หัวข้อหลัก: ...
- ประเด็นสำคัญ: ...`;

    const highlightLabel = isMultiDay ? 'Highlights ที่น่าสนใจตลอดช่วงเวลานี้' : 'Highlights วันนี้';

    const prompt = `คุณเป็นผู้ช่วย AI ที่เชี่ยวชาญในการสรุปบทสนทนา LINE OA ของทีม
กรุณาสรุปบทสนทนาทั้งหมดต่อไปนี้เป็นภาษาไทยที่อ่านง่าย กระชับ และมีประโยชน์

ข้อมูลการสรุป:
- ช่วงเวลา: ${dateRangeLabel}
- จำนวนข้อความ: ${allMessages.length} ข้อความ
- จำนวนวัน: ${uniqueDayKeys.length} วัน
- จำนวนกลุ่ม/แชท: ${allGroupKeys.size} กลุ่ม

ใช้รูปแบบต่อไปนี้ในการตอบ:

📊 **${overviewTitle}**
สรุป 2-3 ประโยค ว่าในช่วงนี้มีกิจกรรมอะไรบ้างในภาพรวม

${perGroupInstruction}

✨ **${highlightLabel}**
- สิ่งที่น่าสนใจหรือสำคัญที่สุด

⚠️ **สิ่งที่ต้องติดตาม**
- งานหรือประเด็นที่ยังค้างอยู่ (ถ้ามี หากไม่มีให้ระบุว่า "ไม่มี")

---
บทสนทนาที่ต้องสรุป:
${chatSummaryText}`;

    // ── 4. เรียก Gemini API ───────────────────────────────────────────────────
    const response = await axios.post(
      GEMINI_API,
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
      }
    );

    const summary = response.data.candidates[0].content.parts[0].text;
    console.log(`✅ Summary generated by Gemini 3 (${uniqueDayKeys.length} day(s))`);

    return {
      summary,
      messageCount: allMessages.length,
      groupCount: allGroupKeys.size,
      dayCount: uniqueDayKeys.length,
      dateRange: dateRangeLabel,
      model: 'Gemini 3 Flash',
    };

  } catch (error) {
    console.error('❌ Gemini Error:', error.message);

    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }

    if (error.response?.status === 404) {
      throw new Error('Model ไม่พบ: ' + (error.response.data.error?.message || 'ตรวจสอบชื่อ model'));
    }

    if (error.response?.status === 400) {
      throw new Error('คำขอไม่ถูกต้อง: ' + (error.response.data.error?.message || ''));
    }

    if (error.response?.status === 429) {
      throw new Error('ใช้งาน API เกินจำนวนที่กำหนด กรุณารอสักครู่');
    }

    throw new Error(error.response?.data?.error?.message || error.message);
  }
}

module.exports = { summarizeAllChatsForDate };
