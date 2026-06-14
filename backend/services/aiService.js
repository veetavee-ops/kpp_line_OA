
const axios = require('axios');

// ── Groq ────────────────────────────────────────────────────────────────────
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';

// ── Gemini ──────────────────────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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
  const d = new Date(dateObj);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Build chat summary text + prompt ────────────────────────────────────────
function buildPrompt(allMessages) {
  const timestamps = allMessages.map(m => new Date(m.timestamp));
  const minDate = new Date(Math.min(...timestamps.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...timestamps.map(d => d.getTime())));

  const uniqueDayKeys = [...new Set(allMessages.map(m => toDayKey(new Date(m.timestamp))))];
  uniqueDayKeys.sort();
  const isMultiDay = uniqueDayKeys.length > 1;

  let dateRangeLabel;
  if (!isMultiDay) {
    dateRangeLabel = formatThaiDate(minDate);
  } else {
    dateRangeLabel = `${formatThaiDate(minDate)} — ${formatThaiDate(maxDate)} (${uniqueDayKeys.length} วัน)`;
  }

  const allGroupKeys = new Set();
  let chatSummaryText = '';

  if (isMultiDay) {
    const byDate = {};
    allMessages.forEach(m => {
      const dayKey = toDayKey(new Date(m.timestamp));
      if (!byDate[dayKey]) byDate[dayKey] = { dateObj: new Date(m.timestamp), groups: {} };
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

    uniqueDayKeys.forEach(dayKey => {
      const dayData = byDate[dayKey];
      const thaiDate = formatThaiDate(dayData.dateObj);
      chatSummaryText += `\n${'═'.repeat(60)}\n📅 วันที่: ${thaiDate}\n${'═'.repeat(60)}\n`;
      Object.entries(dayData.groups).forEach(([, data]) => {
        const groupLabel = data.isPrivate ? `💬 แชทส่วนตัว: ${data.name}` : `👥 กลุ่ม: ${data.name}`;
        chatSummaryText += `\n  ── ${groupLabel} (${data.messages.length} ข้อความ) ──\n`;
        data.messages.forEach(m => {
          const d = new Date(m.timestamp);
          const time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
          chatSummaryText += `  [${time}] ${m.user?.displayName || 'Unknown'}: ${formatMessageContent(m)}\n`;
        });
      });
    });
  } else {
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
      const groupLabel = data.isPrivate ? `💬 แชทส่วนตัว: ${data.name}` : `👥 กลุ่ม: ${data.name}`;
      chatSummaryText += `\n\n=== ${groupLabel} (${data.messages.length} ข้อความ) ===\n`;
      data.messages.forEach(m => {
        const d = new Date(m.timestamp);
        const time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        chatSummaryText += `[${time}] ${m.user?.displayName || 'Unknown'}: ${formatMessageContent(m)}\n`;
      });
    });
  }

  const perGroupInstruction = isMultiDay
    ? `## สรุปแต่ละวัน\nเรียงจากวันเก่าไปวันใหม่ สำหรับแต่ละวันให้แสดงชื่อวัน กิจกรรมหลักในแต่ละกลุ่ม และประเด็นสำคัญ`
    : `## สรุปแต่ละกลุ่ม\n1. **[ชื่อกลุ่มหรือแชท]**\n   - หัวข้อหลัก: ...\n   - ประเด็นสำคัญ: ...`;

  const prompt = `คุณเป็นผู้ช่วย AI ที่เชี่ยวชาญในการสรุปบทสนทนา LINE OA ของทีม
กรุณาสรุปบทสนทนาต่อไปนี้เป็นภาษาไทย กระชับ อ่านง่าย ไม่ใช้ emoji ในเนื้อหา

ข้อมูล: ${dateRangeLabel} | ${allMessages.length} ข้อความ | ${allGroupKeys.size} กลุ่ม/แชท

ใช้รูปแบบ Markdown ต่อไปนี้:

## ภาพรวม
สรุป 2-3 ประโยคว่ามีกิจกรรมอะไรบ้าง

${perGroupInstruction}

## Highlights
- สิ่งที่สำคัญที่สุด

## สิ่งที่ต้องติดตาม
- งานหรือประเด็นค้างอยู่ (ถ้าไม่มีให้ระบุว่า ไม่มี)

---
บทสนทนา:
${chatSummaryText}`;

  return { prompt, uniqueDayKeys, allGroupKeys, dateRangeLabel };
}

// ── Call Groq ────────────────────────────────────────────────────────────────
async function callGroq(prompt) {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY ยังไม่ได้ตั้งค่าใน .env');

  const response = await axios.post(
    GROQ_API,
    {
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
      temperature: 0.7,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
    }
  );

  return {
    text: response.data.choices[0].message.content,
    modelLabel: 'Llama 3.3 70B (Groq)',
  };
}

// ── Call Gemini ──────────────────────────────────────────────────────────────
async function callGemini(prompt) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY ยังไม่ได้ตั้งค่าใน .env');

  try {
    const response = await axios.post(
      `${GEMINI_API}?key=${GEMINI_API_KEY}`,
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    return {
      text: response.data.candidates[0].content.parts[0].text,
      modelLabel: `Gemini ${GEMINI_MODEL}`,
    };
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.error?.message || err.message;
    console.error(`❌ Gemini API error [${status}]:`, msg);
    console.error('Key prefix:', GEMINI_API_KEY?.slice(0, 10) + '...');
    throw err;
  }
}

// ── Main export ──────────────────────────────────────────────────────────────
async function summarizeAllChatsForDate(allMessages, provider = 'groq') {
  try {
    if (allMessages.length === 0) {
      return { summary: 'ไม่มีข้อความในช่วงนี้', messageCount: 0, groupCount: 0 };
    }

    const { prompt, uniqueDayKeys, allGroupKeys, dateRangeLabel } = buildPrompt(allMessages);

    console.log(`📝 Summarizing with ${provider === 'gemini' ? 'Gemini' : 'Groq'}: ${allMessages.length} msgs | ${uniqueDayKeys.length} day(s) | ${allGroupKeys.size} group(s)`);

    let result;
    try {
      result = provider === 'gemini' ? await callGemini(prompt) : await callGroq(prompt);
    } catch (primaryError) {
      // Fallback to the other provider if primary fails
      const fallback = provider === 'gemini' ? 'groq' : 'gemini';
      console.warn(`⚠️ ${provider} failed: ${primaryError.message} — trying ${fallback} as fallback`);
      result = fallback === 'gemini' ? await callGemini(prompt) : await callGroq(prompt);
      result.modelLabel += ' (fallback)';
    }

    console.log(`✅ Summary generated by ${result.modelLabel}`);

    return {
      summary: result.text,
      messageCount: allMessages.length,
      groupCount: allGroupKeys.size,
      dayCount: uniqueDayKeys.length,
      dateRange: dateRangeLabel,
      model: result.modelLabel,
    };

  } catch (error) {
    console.error('❌ AI Error:', error.message);

    if (error.response?.status === 401) throw new Error('API Key ไม่ถูกต้อง ตรวจสอบใน .env');
    if (error.response?.status === 429) throw new Error('ใช้งาน API เกิน rate limit กรุณารอสักครู่แล้วลองใหม่');

    throw new Error(error.response?.data?.error?.message || error.message);
  }
}

module.exports = { summarizeAllChatsForDate };
