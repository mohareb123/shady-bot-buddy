import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============ TELEGRAM API HELPERS ============

async function tg(method: string, body: any) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
  const TELEGRAM_API_KEY = Deno.env.get('TELEGRAM_API_KEY')!;
  const res = await fetch(`${GATEWAY_URL}/${method}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'X-Connection-Api-Key': TELEGRAM_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

function getSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

// ============ LEVEL CALCULATION ============
function calcLevel(points: number): number {
  return Math.floor(Math.sqrt(points / 100)) + 1;
}

function pointsForLevel(level: number): number {
  return (level - 1) * (level - 1) * 100;
}

// ============ SMART RESPONSES (AI via Lovable AI) ============
async function getAIResponse(text: string): Promise<string | null> {
  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) return null;
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `أنت بوت تليغرام اسمك "شادي". شخصيتك مرحة وظريفة وتحب المزاح. 
ترد بالعربية دائماً وبأسلوب شبابي. ردودك قصيرة (جملة أو جملتين كحد أقصى).
إذا حياك أحد رد بتحية لطيفة. إذا شكرك رد بتواضع. إذا سألك من أنت عرّف عن نفسك.
إذا قال كلام حب أو زعل تفاعل عاطفياً. كن ذكياً وسريع البديهة.`
          },
          { role: 'user', content: text }
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

const DEVELOPER_ID = 6570434162;

// ============ COOLDOWN TRACKING ============
const lastReply: Record<number, number> = {};
const COOLDOWN_MS = 8000;

function canReply(chatId: number): boolean {
  const now = Date.now();
  if (lastReply[chatId] && now - lastReply[chatId] < COOLDOWN_MS) return false;
  lastReply[chatId] = now;
  return true;
}

function isDeveloper(userId: number): boolean {
  return userId === DEVELOPER_ID;
}

// ============ JOKES, FORTUNES, ETC ============
const jokes = [
  "واحد راح للدكتور قاله: يا دكتور كل ما أشرب شاي عيني تألمني... قاله: طلع المعلقة من الكوب 😂",
  "واحد سأل صاحبه: ليش حاطط صورتك على الثلاجة؟ قاله: عشان أخسّ كل ما أشوفها أفقد شهيتي 😂",
  "مرة واحد نام بالصحراء... صحى لقى النمل شايلينه ورايحين فيه... قال: حطوني حطوني أنا صاحي 😂",
  "واحد قال لصاحبه: تعرف الفرق بين المدرسة والحبس؟ قاله: المسجون يقدر يطلع بكفالة 😂",
  "مرة واحد دخل المطعم قال: عندكم أكل؟ قالوا: لا عندنا ملابس بس حاطين طاولات للمنظر 😂",
];

const fortunes = [
  "🔮 حظك اليوم ممتاز! توقع مفاجأة سعيدة",
  "🔮 يومك عادي... بس بكرة أحسن إن شاء الله",
  "🔮 انتبه من شخص قريب منك اليوم 👀",
  "🔮 حظك في الحب اليوم 💯... روح تكلم كراشك",
  "🔮 اليوم يومك في الأكل 🍕 دلّع نفسك",
  "🔮 نجمك ساطع اليوم ⭐ استغل الفرصة",
  "🔮 حظك نايم اليوم... خلاص ارجع السرير 😴",
];

const eightBallAnswers = [
  "نعم بكل تأكيد ✅", "أكيد 💯", "على الأغلب نعم 👍",
  "الإشارات تقول نعم 🟢", "ممكن... مو متأكد 🤔",
  "اسأل مرة ثانية ⏳", "لا أقدر أجاوب الحين 😶",
  "لا تعتمد عليها ❌", "مستحيل 🚫", "الجواب لا ❌",
];

const roasts = [
  "أنت لو كنت توابل... كنت تكون ملح بدون طعم 😂",
  "مخك أسرع من الواي فاي... بس بدون اتصال 📶",
  "لو الغباء رياضة كنت بطل أولمبي 🏅",
  "أنت تثبت إن الذكاء الاصطناعي أذكى من الطبيعي 🤖",
  "وجهك لو ينزل على التطبيق كان التطبيق يسوي كراش 💥",
];

const compliments = [
  "أنت شخص رائع والله! العالم محتاج ناس زيك ❤️",
  "ما شاء الله عليك... نور المجموعة 🌟",
  "لو الطيبة لها وجه... كان وجهك 😊",
  "أنت من الناس اللي تخلي الدنيا أحلى 🌈",
  "كلامك دايم يرفع المعنويات 💪",
];

const wisdoms = [
  "💡 من جدّ وجد ومن زرع حصد",
  "💡 الصبر مفتاح الفرج",
  "💡 العلم نور والجهل ظلام",
  "💡 لا تؤجل عمل اليوم إلى الغد",
  "💡 من صبر ظفر",
  "💡 الوقت كالسيف إن لم تقطعه قطعك",
];

const hackSecrets = [
  "كلمة سره: 123456 😱", "آخر بحث: كيف أكون ذكي 🧠",
  "يتكلم مع 5 كراشات بنفس الوقت 💔", "عنده 847 صورة سيلفي 🤳",
  "يأكل بالليل بالسر 🍕", "يسولف مع نفسه بالمرآة 🪞",
  "حسابه البنكي: 3 ريال 💸", "يبحث: كيف أصير مشهور بدون موهبة 😂",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============ MAIN HANDLER ============
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { update } = await req.json();
    if (!update) return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });

    const supabase = getSupabase();

    // Handle callback queries (quiz answers, whispers, settings, judgment)
    if (update.callback_query) {
      await handleCallbackQuery(supabase, update.callback_query);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // Handle new/left members
    if (update.message?.new_chat_members) {
      await handleNewMembers(supabase, update.message);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }
    if (update.message?.left_chat_member) {
      await handleLeftMember(update.message);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    const msg = update.message;
    if (!msg?.text && !msg?.caption) {
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username || '';
    const fullName = `${msg.from.first_name || ''} ${msg.from.last_name || ''}`.trim();
    const text = (msg.text || msg.caption || '').trim();
    const isPrivate = msg.chat.type === 'private';

    // Upsert member & add points
    await upsertMember(supabase, userId, chatId, username, fullName);

    // Log message
    await supabase.from('messages_log').insert({
      chat_id: chatId, user_id: userId, user_name: fullName || username,
      message_preview: text.substring(0, 100),
    });

    // Check commands
    if (text.startsWith('/')) {
      await handleCommand(supabase, msg, text, chatId, userId, username, fullName, isPrivate);
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // Link protection
    if (!isPrivate) {
      const linkBlocked = await checkLinks(supabase, msg, chatId, userId, fullName);
      if (linkBlocked) return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // Custom auto responses
    const autoResp = await checkAutoResponses(supabase, chatId, text);
    if (autoResp) {
      await tg('sendMessage', { chat_id: chatId, text: autoResp, reply_to_message_id: msg.message_id });
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // Smart responses (AI-powered)
    const shouldReply = isPrivate || 
      text.toLowerCase().includes('شادي') || 
      Math.random() < 0.07;

    if (shouldReply && canReply(chatId)) {
      // Check for keyword triggers first
      const lowerText = text.toLowerCase();
      if (lowerText.includes('نكتة') || lowerText.includes('نكته')) {
        await tg('sendMessage', { chat_id: chatId, text: pick(jokes), reply_to_message_id: msg.message_id });
      } else if (lowerText.includes('حكمة') || lowerText.includes('حكمه')) {
        await tg('sendMessage', { chat_id: chatId, text: pick(wisdoms), reply_to_message_id: msg.message_id });
      } else if (lowerText.includes('كويز') || lowerText.includes('اختبار')) {
        await sendQuiz(supabase, chatId);
      } else {
        // AI response
        const aiReply = await getAIResponse(text);
        if (aiReply) {
          await tg('sendMessage', { chat_id: chatId, text: aiReply, reply_to_message_id: msg.message_id });
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  } catch (e) {
    console.error('Bot error:', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});

// ============ MEMBER MANAGEMENT ============
async function upsertMember(supabase: any, userId: number, chatId: number, username: string, fullName: string) {
  const { data } = await supabase.from('members')
    .select('points, messages_count').eq('user_id', userId).eq('chat_id', chatId).single();
  
  if (data) {
    const newPoints = data.points + 1;
    const newLevel = calcLevel(newPoints);
    await supabase.from('members').update({
      username, full_name: fullName, points: newPoints, level: newLevel,
      messages_count: data.messages_count + 1, last_active: new Date().toISOString(),
    }).eq('user_id', userId).eq('chat_id', chatId);
  } else {
    await supabase.from('members').insert({
      user_id: userId, chat_id: chatId, username, full_name: fullName,
      points: 1, coins: 0, level: 1, messages_count: 1,
    });
    // Ensure group settings exist
    await supabase.from('group_settings').upsert({ chat_id: chatId }, { onConflict: 'chat_id' });
  }
}

// ============ COMMAND HANDLER ============
async function handleCommand(supabase: any, msg: any, text: string, chatId: number, userId: number, username: string, fullName: string, isPrivate: boolean) {
  const parts = text.split(/\s+/);
  const cmd = parts[0].toLowerCase().replace(/@\w+/, '');

  switch (cmd) {
    case '/start': return await cmdStart(chatId, isPrivate);
    case '/daily': return await cmdDaily(supabase, chatId, userId);
    case '/stats': return await cmdStats(supabase, chatId, userId, msg);
    case '/top': return await cmdTop(supabase, chatId);
    case '/wallet': return await cmdWallet(supabase, chatId, userId);
    case '/gift': return await cmdGift(supabase, msg, chatId, userId, fullName, parts);
    case '/shop': return await cmdShop(chatId);
    case '/buy_unwarn': return await cmdBuyUnwarn(supabase, chatId, userId);
    case '/buy_points': return await cmdBuyPoints(supabase, chatId, userId, parts);
    case '/buy_title': return await cmdBuyTitle(supabase, chatId, userId, parts);
    case '/title': return await cmdTitle(supabase, chatId, msg, parts);
    case '/mytitle': return await cmdMyTitle(supabase, chatId, userId);
    case '/quiz': return await sendQuiz(supabase, chatId);
    case '/hack': return await cmdHack(chatId, msg, fullName);
    case '/ship': return await cmdShip(chatId, parts);
    case '/8ball': return await cmd8Ball(chatId, text);
    case '/fortune': return await tg('sendMessage', { chat_id: chatId, text: pick(fortunes) });
    case '/joke': return await tg('sendMessage', { chat_id: chatId, text: pick(jokes) });
    case '/roast': return await cmdRoast(chatId, msg, fullName);
    case '/compliment': return await cmdCompliment(chatId, msg, fullName);
    case '/wisdom': return await tg('sendMessage', { chat_id: chatId, text: pick(wisdoms) });
    case '/judgment': return await cmdJudgment(supabase, chatId);
    case '/whisper': return await cmdWhisper(supabase, msg, chatId, userId, fullName, text);
    case '/ban': return await cmdBan(supabase, msg, chatId, userId, fullName);
    case '/kick': return await cmdKick(supabase, msg, chatId, userId, fullName);
    case '/mute': return await cmdMute(supabase, msg, chatId, userId, fullName, parts);
    case '/unmute': return await cmdUnmute(supabase, msg, chatId, userId, fullName);
    case '/warn': return await cmdWarn(supabase, msg, chatId, userId, fullName, text);
    case '/promote': return await cmdPromote(supabase, msg, chatId, userId, fullName);
    case '/settings': return await cmdSettings(supabase, chatId, userId);
    case '/addresponse': return await cmdAddResponse(supabase, chatId, userId, fullName, text);
    case '/responses': return await cmdResponses(supabase, chatId);
    case '/delresponse': return await cmdDelResponse(supabase, chatId, userId, parts);
    case '/all': return await cmdAll(chatId, userId);
    case '/calc': return await cmdCalc(chatId, text);
    case '/dev': return await cmdDev(supabase, chatId, userId);
  }
}

// ============ COMMANDS IMPLEMENTATIONS ============

async function cmdStart(chatId: number, isPrivate: boolean) {
  const keyboard = {
    inline_keyboard: [
      [{ text: '📋 الأوامر', callback_data: 'menu_commands' }, { text: '📊 إحصائياتي', callback_data: 'menu_stats' }],
      [{ text: '🎮 الألعاب', callback_data: 'menu_games' }, { text: '🏆 الترتيب', callback_data: 'menu_top' }],
      [{ text: '💰 محفظتي', callback_data: 'menu_wallet' }, { text: '🛒 المتجر', callback_data: 'menu_shop' }],
    ]
  };
  await tg('sendMessage', {
    chat_id: chatId,
    text: `🤖 *مرحباً! أنا شادي*\n\nبوت ذكي للمجموعات والمحادثات الخاصة!\n\n✨ نظام نقاط وعملات\n🎮 ألعاب ممتعة\n🛡️ أدوات إدارة\n🧠 ردود ذكية بالذكاء الاصطناعي\n\nاختر من القائمة أدناه:`,
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
}

async function cmdDaily(supabase: any, chatId: number, userId: number) {
  const { data: member } = await supabase.from('members')
    .select('last_daily, points, coins, level').eq('user_id', userId).eq('chat_id', chatId).single();
  
  if (!member) return;
  
  const now = new Date();
  if (member.last_daily) {
    const last = new Date(member.last_daily);
    if (now.getTime() - last.getTime() < 24 * 60 * 60 * 1000) {
      const remaining = 24 * 60 * 60 * 1000 - (now.getTime() - last.getTime());
      const hours = Math.floor(remaining / 3600000);
      const mins = Math.floor((remaining % 3600000) / 60000);
      return tg('sendMessage', { chat_id: chatId, text: `⏰ لازم تنتظر ${hours} ساعة و ${mins} دقيقة للمكافأة اليومية القادمة` });
    }
  }

  const reward = Math.floor(Math.random() * 151) + 50;
  const newPoints = member.points + reward;
  const newCoins = member.coins + reward;
  const newLevel = calcLevel(newPoints);

  await supabase.from('members').update({
    points: newPoints, coins: newCoins, level: newLevel,
    last_daily: now.toISOString(),
  }).eq('user_id', userId).eq('chat_id', chatId);

  await tg('sendMessage', {
    chat_id: chatId,
    text: `🎁 *المكافأة اليومية*\n\n💎 حصلت على *${reward}* نقطة\n💰 حصلت على *${reward}* عملة\n\n📊 رصيدك: ${newPoints} نقطة | ${newCoins} عملة\n⭐ المستوى: ${newLevel}`,
    parse_mode: 'Markdown',
  });
}

async function cmdStats(supabase: any, chatId: number, userId: number, msg: any) {
  const targetId = msg.reply_to_message ? msg.reply_to_message.from.id : userId;
  const { data: member } = await supabase.from('members')
    .select('*').eq('user_id', targetId).eq('chat_id', chatId).single();
  
  if (!member) return tg('sendMessage', { chat_id: chatId, text: '❌ لم يتم العثور على بيانات' });

  const { data: title } = await supabase.from('user_titles')
    .select('title').eq('user_id', targetId).eq('chat_id', chatId).single();

  const nextLevel = member.level + 1;
  const currentLevelPoints = pointsForLevel(member.level);
  const nextLevelPoints = pointsForLevel(nextLevel);
  const progress = Math.min(100, Math.floor(((member.points - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100));
  const progressBar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));

  let text = `📊 *إحصائيات ${member.full_name || member.username}*\n\n`;
  if (title) text += `🏷️ اللقب: ${title.title}\n`;
  text += `⭐ المستوى: ${member.level}\n`;
  text += `💎 النقاط: ${member.points}\n`;
  text += `💰 العملات: ${member.coins}\n`;
  text += `💬 الرسائل: ${member.messages_count}\n`;
  text += `⚠️ التحذيرات: ${member.warnings}\n`;
  text += `\n📈 التقدم: [${progressBar}] ${progress}%`;

  await tg('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown' });
}

async function cmdTop(supabase: any, chatId: number) {
  const { data: members } = await supabase.from('members')
    .select('full_name, username, points, level')
    .eq('chat_id', chatId).order('points', { ascending: false }).limit(10);

  if (!members?.length) return tg('sendMessage', { chat_id: chatId, text: '❌ لا يوجد أعضاء بعد' });

  const medals = ['🥇', '🥈', '🥉'];
  let text = '🏆 *أكثر 10 أعضاء نشاطاً*\n\n';
  members.forEach((m: any, i: number) => {
    const medal = medals[i] || `${i + 1}.`;
    text += `${medal} ${m.full_name || m.username} — ${m.points} نقطة (مستوى ${m.level})\n`;
  });

  await tg('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown' });
}

async function cmdWallet(supabase: any, chatId: number, userId: number) {
  const { data: member } = await supabase.from('members')
    .select('points, coins, level').eq('user_id', userId).eq('chat_id', chatId).single();
  if (!member) return;
  await tg('sendMessage', {
    chat_id: chatId,
    text: `💰 *محفظتك*\n\n💎 النقاط: ${member.points}\n💰 العملات: ${member.coins}\n⭐ المستوى: ${member.level}`,
    parse_mode: 'Markdown',
  });
}

async function cmdGift(supabase: any, msg: any, chatId: number, userId: number, fullName: string, parts: string[]) {
  let targetId: number | null = null;
  let amount = parseInt(parts[parts.length - 1]);

  if (msg.reply_to_message) {
    targetId = msg.reply_to_message.from.id;
  } else if (parts.length >= 3) {
    // Try to find user by username mention
    const mentioned = msg.entities?.find((e: any) => e.type === 'mention' || e.type === 'text_mention');
    if (mentioned?.user) targetId = mentioned.user.id;
  }

  if (!targetId || isNaN(amount) || amount <= 0) {
    return tg('sendMessage', { chat_id: chatId, text: '❌ استخدم: /gift @user <كمية> أو رد على رسالة' });
  }
  if (targetId === userId) return tg('sendMessage', { chat_id: chatId, text: '❌ لا يمكنك إهداء نفسك!' });

  const { data: sender } = await supabase.from('members')
    .select('coins').eq('user_id', userId).eq('chat_id', chatId).single();
  if (!sender || sender.coins < amount) return tg('sendMessage', { chat_id: chatId, text: '❌ رصيدك غير كافي' });

  const { data: receiver } = await supabase.from('members')
    .select('coins, full_name, username').eq('user_id', targetId).eq('chat_id', chatId).single();
  if (!receiver) return tg('sendMessage', { chat_id: chatId, text: '❌ المستخدم غير موجود' });

  await supabase.from('members').update({ coins: sender.coins - amount }).eq('user_id', userId).eq('chat_id', chatId);
  await supabase.from('members').update({ coins: receiver.coins + amount }).eq('user_id', targetId).eq('chat_id', chatId);

  await tg('sendMessage', {
    chat_id: chatId,
    text: `🎁 *هدية!*\n\n${fullName} أهدى ${receiver.full_name || receiver.username} مبلغ *${amount}* عملة 💰`,
    parse_mode: 'Markdown',
  });
}

async function cmdShop(chatId: number) {
  const text = `🛒 *متجر شادي*\n\n1️⃣ إزالة التحذيرات — 200 عملة\n   ← /buy\\_unwarn\n\n2️⃣ شراء نقاط — 2 عملة = 1 نقطة\n   ← /buy\\_points <عدد>\n\n3️⃣ لقب مخصص — 500 عملة\n   ← /buy\\_title <اللقب>`;
  await tg('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown' });
}

async function cmdBuyUnwarn(supabase: any, chatId: number, userId: number) {
  const { data: member } = await supabase.from('members')
    .select('coins, warnings').eq('user_id', userId).eq('chat_id', chatId).single();
  if (!member) return;
  if (member.warnings === 0) return tg('sendMessage', { chat_id: chatId, text: '✅ ليس لديك تحذيرات أصلاً' });
  if (member.coins < 200) return tg('sendMessage', { chat_id: chatId, text: '❌ تحتاج 200 عملة (لديك ' + member.coins + ')' });

  await supabase.from('members').update({ coins: member.coins - 200, warnings: 0 }).eq('user_id', userId).eq('chat_id', chatId);
  await tg('sendMessage', { chat_id: chatId, text: '✅ تم إزالة جميع تحذيراتك! 🎉' });
}

async function cmdBuyPoints(supabase: any, chatId: number, userId: number, parts: string[]) {
  const amount = parseInt(parts[1]);
  if (isNaN(amount) || amount <= 0) return tg('sendMessage', { chat_id: chatId, text: '❌ استخدم: /buy_points <عدد>' });
  const cost = amount * 2;

  const { data: member } = await supabase.from('members')
    .select('coins, points, level').eq('user_id', userId).eq('chat_id', chatId).single();
  if (!member) return;
  if (member.coins < cost) return tg('sendMessage', { chat_id: chatId, text: `❌ تحتاج ${cost} عملة (لديك ${member.coins})` });

  const newPoints = member.points + amount;
  await supabase.from('members').update({
    coins: member.coins - cost, points: newPoints, level: calcLevel(newPoints),
  }).eq('user_id', userId).eq('chat_id', chatId);
  await tg('sendMessage', { chat_id: chatId, text: `✅ اشتريت ${amount} نقطة مقابل ${cost} عملة 💎` });
}

async function cmdBuyTitle(supabase: any, chatId: number, userId: number, parts: string[]) {
  const title = parts.slice(1).join(' ');
  if (!title) return tg('sendMessage', { chat_id: chatId, text: '❌ استخدم: /buy_title <اللقب>' });

  const { data: member } = await supabase.from('members')
    .select('coins').eq('user_id', userId).eq('chat_id', chatId).single();
  if (!member) return;
  if (member.coins < 500) return tg('sendMessage', { chat_id: chatId, text: `❌ تحتاج 500 عملة (لديك ${member.coins})` });

  await supabase.from('members').update({ coins: member.coins - 500 }).eq('user_id', userId).eq('chat_id', chatId);
  await supabase.from('user_titles').upsert({ chat_id: chatId, user_id: userId, title }, { onConflict: 'chat_id,user_id' });
  await tg('sendMessage', { chat_id: chatId, text: `✅ تم تعيين لقبك: *${title}* 🏷️`, parse_mode: 'Markdown' });
}

async function cmdTitle(supabase: any, chatId: number, msg: any, parts: string[]) {
  const targetId = msg.reply_to_message ? msg.reply_to_message.from.id : msg.from.id;
  const { data: title } = await supabase.from('user_titles')
    .select('title').eq('user_id', targetId).eq('chat_id', chatId).single();
  if (!title) return tg('sendMessage', { chat_id: chatId, text: '❌ لا يوجد لقب لهذا المستخدم' });
  await tg('sendMessage', { chat_id: chatId, text: `🏷️ اللقب: *${title.title}*`, parse_mode: 'Markdown' });
}

async function cmdMyTitle(supabase: any, chatId: number, userId: number) {
  const { data: title } = await supabase.from('user_titles')
    .select('title').eq('user_id', userId).eq('chat_id', chatId).single();
  if (!title) return tg('sendMessage', { chat_id: chatId, text: '❌ ليس لديك لقب بعد. اشترِ واحداً من /shop' });
  await tg('sendMessage', { chat_id: chatId, text: `🏷️ لقبك: *${title.title}*`, parse_mode: 'Markdown' });
}

// ============ GAMES ============

async function sendQuiz(supabase: any, chatId: number) {
  const { data: questions } = await supabase.from('quiz_questions').select('*');
  if (!questions?.length) return tg('sendMessage', { chat_id: chatId, text: '❌ لا توجد أسئلة' });

  const q = pick(questions);
  const options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
  const keyboard = {
    inline_keyboard: options.map((opt: string) => [{ text: opt, callback_data: `quiz_${q.id}_${opt}` }])
  };

  await tg('sendMessage', {
    chat_id: chatId,
    text: `🧠 *سؤال الكويز*\n\n${q.question}\n\n📁 التصنيف: ${q.category}`,
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
}

async function cmdHack(chatId: number, msg: any, fullName: string) {
  const target = msg.reply_to_message ? 
    `${msg.reply_to_message.from.first_name || ''} ${msg.reply_to_message.from.last_name || ''}`.trim() : 
    fullName;
  
  const secret = pick(hackSecrets);
  const text = `💻 *جاري اختراق ${target}...*\n\n▓▓▓▓▓▓▓▓▓▓ 100%\n\n✅ تم الاختراق بنجاح!\n\n🔍 النتائج:\n${secret}`;
  await tg('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown' });
}

async function cmdShip(chatId: number, parts: string[]) {
  if (parts.length < 3) return tg('sendMessage', { chat_id: chatId, text: '❌ استخدم: /ship @user1 @user2' });
  const percent = Math.floor(Math.random() * 101);
  let comment = '';
  if (percent > 80) comment = '❤️‍🔥 توافق عالي جداً!';
  else if (percent > 50) comment = '💕 في أمل!';
  else if (percent > 20) comment = '🤔 صعبة بس مو مستحيلة';
  else comment = '💔 ما في نصيب...';

  const hearts = '❤️'.repeat(Math.floor(percent / 10)) + '🖤'.repeat(10 - Math.floor(percent / 10));
  await tg('sendMessage', {
    chat_id: chatId,
    text: `💘 *نسبة التوافق*\n\n${parts[1]} 💕 ${parts[2]}\n\n${hearts}\n\n📊 النسبة: *${percent}%*\n${comment}`,
    parse_mode: 'Markdown',
  });
}

async function cmd8Ball(chatId: number, text: string) {
  const question = text.replace(/\/8ball\s*/i, '').trim();
  if (!question) return tg('sendMessage', { chat_id: chatId, text: '❌ اكتب سؤالك بعد الأمر' });
  await tg('sendMessage', { chat_id: chatId, text: `🎱 *الكرة السحرية*\n\nسؤالك: ${question}\n\nالجواب: ${pick(eightBallAnswers)}`, parse_mode: 'Markdown' });
}

async function cmdRoast(chatId: number, msg: any, fullName: string) {
  const target = msg.reply_to_message ? 
    `${msg.reply_to_message.from.first_name || ''}`.trim() : fullName;
  await tg('sendMessage', { chat_id: chatId, text: `🔥 *هجاية لـ ${target}*\n\n${pick(roasts)}`, parse_mode: 'Markdown' });
}

async function cmdCompliment(chatId: number, msg: any, fullName: string) {
  const target = msg.reply_to_message ? 
    `${msg.reply_to_message.from.first_name || ''}`.trim() : fullName;
  await tg('sendMessage', { chat_id: chatId, text: `💐 *مدح لـ ${target}*\n\n${pick(compliments)}`, parse_mode: 'Markdown' });
}

async function cmdJudgment(supabase: any, chatId: number) {
  const { data: members } = await supabase.from('members')
    .select('user_id, full_name, username').eq('chat_id', chatId);
  if (!members || members.length < 2) return tg('sendMessage', { chat_id: chatId, text: '❌ يجب أن يكون هناك عضوان على الأقل' });

  const shuffled = members.sort(() => Math.random() - 0.5);
  const p1 = shuffled[0];
  const p2 = shuffled[1];
  const questions = [
    'من الأكثر كسلاً؟ 😴', 'من الأجمل؟ 😍', 'من الأذكى؟ 🧠',
    'من الأكثر مرحاً؟ 😂', 'من يأكل أكثر؟ 🍔', 'من الأكثر رومانسية؟ 💕',
  ];

  const q = pick(questions);
  const name1 = p1.full_name || p1.username;
  const name2 = p2.full_name || p2.username;

  await tg('sendMessage', {
    chat_id: chatId,
    text: `⚖️ *لعبة الأحكام*\n\n${q}\n\n1️⃣ ${name1}\n2️⃣ ${name2}`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: `${name1}`, callback_data: `judge_${p1.user_id}` }, { text: `${name2}`, callback_data: `judge_${p2.user_id}` }]
      ]
    },
  });
}

// ============ WHISPERS ============

async function cmdWhisper(supabase: any, msg: any, chatId: number, userId: number, fullName: string, text: string) {
  let targetId: number | null = null;
  let targetName = '';
  let whisperMsg = '';

  if (msg.reply_to_message) {
    targetId = msg.reply_to_message.from.id;
    targetName = `${msg.reply_to_message.from.first_name || ''}`.trim();
    whisperMsg = text.replace(/\/whisper\s*/, '').trim();
  } else {
    return tg('sendMessage', { chat_id: chatId, text: '❌ رد على رسالة الشخص المراد مع: /whisper رسالتك' });
  }

  if (!whisperMsg) return tg('sendMessage', { chat_id: chatId, text: '❌ اكتب الرسالة بعد الأمر' });
  if (targetId === userId) return tg('sendMessage', { chat_id: chatId, text: '❌ لا يمكنك همس نفسك!' });

  const { data: whisper } = await supabase.from('whispers').insert({
    sender_id: userId, sender_name: fullName,
    recipient_id: targetId, recipient_name: targetName,
    message: whisperMsg, chat_id: chatId,
  }).select().single();

  await tg('sendMessage', {
    chat_id: chatId,
    text: `🤫 *همسة سرية*\n\n${fullName} أرسل همسة لـ ${targetName}\n\nفقط ${targetName} يستطيع قراءتها 👇`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[{ text: '👀 اقرأ الهمسة', callback_data: `whisper_${whisper.id}` }]]
    },
  });
}

// ============ ADMIN COMMANDS ============

async function isAdmin(chatId: number, userId: number): Promise<boolean> {
  const res = await tg('getChatMember', { chat_id: chatId, user_id: userId });
  return ['creator', 'administrator'].includes(res.result?.status);
}

async function getTarget(msg: any): Promise<{ id: number; name: string } | null> {
  if (msg.reply_to_message) {
    return {
      id: msg.reply_to_message.from.id,
      name: `${msg.reply_to_message.from.first_name || ''} ${msg.reply_to_message.from.last_name || ''}`.trim(),
    };
  }
  return null;
}

async function logAdminAction(supabase: any, chatId: number, adminId: number, adminName: string, targetId: number, targetName: string, action: string, reason?: string) {
  await supabase.from('admin_logs').insert({
    chat_id: chatId, admin_id: adminId, admin_name: adminName,
    target_id: targetId, target_name: targetName, action, reason,
  });
}

async function cmdBan(supabase: any, msg: any, chatId: number, userId: number, fullName: string) {
  if (!(await isAdmin(chatId, userId))) return tg('sendMessage', { chat_id: chatId, text: '❌ هذا الأمر للمشرفين فقط' });
  const target = await getTarget(msg);
  if (!target) return tg('sendMessage', { chat_id: chatId, text: '❌ رد على رسالة العضو المراد حظره' });

  await tg('banChatMember', { chat_id: chatId, user_id: target.id });
  await logAdminAction(supabase, chatId, userId, fullName, target.id, target.name, 'ban');
  await tg('sendMessage', { chat_id: chatId, text: `🚫 تم حظر ${target.name} بواسطة ${fullName}` });
}

async function cmdKick(supabase: any, msg: any, chatId: number, userId: number, fullName: string) {
  if (!(await isAdmin(chatId, userId))) return tg('sendMessage', { chat_id: chatId, text: '❌ هذا الأمر للمشرفين فقط' });
  const target = await getTarget(msg);
  if (!target) return tg('sendMessage', { chat_id: chatId, text: '❌ رد على رسالة العضو' });

  await tg('banChatMember', { chat_id: chatId, user_id: target.id });
  await tg('unbanChatMember', { chat_id: chatId, user_id: target.id, only_if_banned: true });
  await logAdminAction(supabase, chatId, userId, fullName, target.id, target.name, 'kick');
  await tg('sendMessage', { chat_id: chatId, text: `👢 تم طرد ${target.name} بواسطة ${fullName}` });
}

async function cmdMute(supabase: any, msg: any, chatId: number, userId: number, fullName: string, parts: string[]) {
  if (!(await isAdmin(chatId, userId))) return tg('sendMessage', { chat_id: chatId, text: '❌ هذا الأمر للمشرفين فقط' });
  const target = await getTarget(msg);
  if (!target) return tg('sendMessage', { chat_id: chatId, text: '❌ رد على رسالة العضو' });

  const minutes = parseInt(parts[1]) || 60;
  const untilDate = Math.floor(Date.now() / 1000) + minutes * 60;

  await tg('restrictChatMember', {
    chat_id: chatId, user_id: target.id, until_date: untilDate,
    permissions: { can_send_messages: false, can_send_media_messages: false, can_send_other_messages: false },
  });
  await logAdminAction(supabase, chatId, userId, fullName, target.id, target.name, 'mute', `${minutes} دقيقة`);
  await tg('sendMessage', { chat_id: chatId, text: `🔇 تم كتم ${target.name} لمدة ${minutes} دقيقة بواسطة ${fullName}` });
}

async function cmdUnmute(supabase: any, msg: any, chatId: number, userId: number, fullName: string) {
  if (!(await isAdmin(chatId, userId))) return tg('sendMessage', { chat_id: chatId, text: '❌ هذا الأمر للمشرفين فقط' });
  const target = await getTarget(msg);
  if (!target) return tg('sendMessage', { chat_id: chatId, text: '❌ رد على رسالة العضو' });

  await tg('restrictChatMember', {
    chat_id: chatId, user_id: target.id,
    permissions: { can_send_messages: true, can_send_media_messages: true, can_send_other_messages: true, can_add_web_page_previews: true },
  });
  await logAdminAction(supabase, chatId, userId, fullName, target.id, target.name, 'unmute');
  await tg('sendMessage', { chat_id: chatId, text: `🔊 تم فك الكتم عن ${target.name} بواسطة ${fullName}` });
}

async function cmdWarn(supabase: any, msg: any, chatId: number, userId: number, fullName: string, text: string) {
  if (!(await isAdmin(chatId, userId))) return tg('sendMessage', { chat_id: chatId, text: '❌ هذا الأمر للمشرفين فقط' });
  const target = await getTarget(msg);
  if (!target) return tg('sendMessage', { chat_id: chatId, text: '❌ رد على رسالة العضو' });

  const reason = text.replace(/\/warn\s*/, '').trim() || 'بدون سبب';

  const { data: member } = await supabase.from('members')
    .select('warnings').eq('user_id', target.id).eq('chat_id', chatId).single();
  const newWarnings = (member?.warnings || 0) + 1;

  const { data: settings } = await supabase.from('group_settings')
    .select('max_warnings').eq('chat_id', chatId).single();
  const maxWarnings = settings?.max_warnings || 3;

  await supabase.from('members').update({ warnings: newWarnings }).eq('user_id', target.id).eq('chat_id', chatId);
  await logAdminAction(supabase, chatId, userId, fullName, target.id, target.name, 'warn', reason);

  if (newWarnings >= maxWarnings) {
    await tg('banChatMember', { chat_id: chatId, user_id: target.id });
    await tg('unbanChatMember', { chat_id: chatId, user_id: target.id, only_if_banned: true });
    await tg('sendMessage', { chat_id: chatId, text: `⚠️ ${target.name} وصل الحد الأقصى من التحذيرات (${maxWarnings}) وتم طرده!\n\nالسبب: ${reason}` });
  } else {
    await tg('sendMessage', { chat_id: chatId, text: `⚠️ تحذير لـ ${target.name} (${newWarnings}/${maxWarnings})\n\nالسبب: ${reason}\nبواسطة: ${fullName}` });
  }
}

async function cmdPromote(supabase: any, msg: any, chatId: number, userId: number, fullName: string) {
  if (!(await isAdmin(chatId, userId))) return tg('sendMessage', { chat_id: chatId, text: '❌ هذا الأمر للمشرفين فقط' });
  const target = await getTarget(msg);
  if (!target) return tg('sendMessage', { chat_id: chatId, text: '❌ رد على رسالة العضو' });

  await tg('promoteChatMember', {
    chat_id: chatId, user_id: target.id,
    can_delete_messages: true, can_restrict_members: true, can_pin_messages: true,
  });
  await logAdminAction(supabase, chatId, userId, fullName, target.id, target.name, 'promote');
  await tg('sendMessage', { chat_id: chatId, text: `👑 تم ترقية ${target.name} لمشرف بواسطة ${fullName}` });
}

// ============ SETTINGS ============

async function cmdSettings(supabase: any, chatId: number, userId: number) {
  if (!(await isAdmin(chatId, userId))) return tg('sendMessage', { chat_id: chatId, text: '❌ هذا الأمر للمشرفين فقط' });

  const { data: settings } = await supabase.from('group_settings')
    .select('*').eq('chat_id', chatId).single();
  const s = settings || { links_allowed: false, media_allowed: true, spam_protection: true, welcome_enabled: true, max_warnings: 3 };

  const keyboard = {
    inline_keyboard: [
      [{ text: `${s.links_allowed ? '✅' : '❌'} السماح بالروابط`, callback_data: `setting_links_${chatId}` }],
      [{ text: `${s.media_allowed ? '✅' : '❌'} السماح بالوسائط`, callback_data: `setting_media_${chatId}` }],
      [{ text: `${s.spam_protection ? '✅' : '❌'} حماية السبام`, callback_data: `setting_spam_${chatId}` }],
      [{ text: `${s.welcome_enabled ? '✅' : '❌'} رسائل الترحيب`, callback_data: `setting_welcome_${chatId}` }],
    ]
  };

  await tg('sendMessage', {
    chat_id: chatId,
    text: `⚙️ *إعدادات المجموعة*\n\nالحد الأقصى للتحذيرات: ${s.max_warnings}`,
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
}

async function cmdAddResponse(supabase: any, chatId: number, userId: number, fullName: string, text: string) {
  if (!(await isAdmin(chatId, userId))) return tg('sendMessage', { chat_id: chatId, text: '❌ هذا الأمر للمشرفين فقط' });
  const content = text.replace(/\/addresponse\s*/, '');
  const sep = content.indexOf('|');
  if (sep === -1) return tg('sendMessage', { chat_id: chatId, text: '❌ استخدم: /addresponse كلمة | رد' });

  const trigger = content.substring(0, sep).trim();
  const response = content.substring(sep + 1).trim();
  if (!trigger || !response) return tg('sendMessage', { chat_id: chatId, text: '❌ استخدم: /addresponse كلمة | رد' });

  await supabase.from('auto_responses').insert({
    chat_id: chatId, trigger_word: trigger, response, created_by: fullName,
  });
  await tg('sendMessage', { chat_id: chatId, text: `✅ تم إضافة رد تلقائي:\n\n🔑 الكلمة: ${trigger}\n💬 الرد: ${response}` });
}

async function cmdResponses(supabase: any, chatId: number) {
  const { data: responses } = await supabase.from('auto_responses')
    .select('*').eq('chat_id', chatId);
  if (!responses?.length) return tg('sendMessage', { chat_id: chatId, text: '❌ لا توجد ردود تلقائية' });

  let text = '📝 *الردود التلقائية*\n\n';
  responses.forEach((r: any, i: number) => {
    text += `${i + 1}. 🔑 ${r.trigger_word} → 💬 ${r.response}\n   ID: \`${r.id}\`\n\n`;
  });
  await tg('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown' });
}

async function cmdDelResponse(supabase: any, chatId: number, userId: number, parts: string[]) {
  if (!(await isAdmin(chatId, userId))) return tg('sendMessage', { chat_id: chatId, text: '❌ هذا الأمر للمشرفين فقط' });
  if (!parts[1]) return tg('sendMessage', { chat_id: chatId, text: '❌ استخدم: /delresponse <id>' });

  await supabase.from('auto_responses').delete().eq('id', parts[1]).eq('chat_id', chatId);
  await tg('sendMessage', { chat_id: chatId, text: '✅ تم حذف الرد التلقائي' });
}

async function cmdAll(chatId: number, userId: number) {
  if (!(await isAdmin(chatId, userId))) return tg('sendMessage', { chat_id: chatId, text: '❌ هذا الأمر للمشرفين فقط' });
  const res = await tg('getChatAdministrators', { chat_id: chatId });
  if (!res.result) return;
  const mentions = res.result.map((a: any) => a.user.first_name || a.user.username).join('، ');
  await tg('sendMessage', { chat_id: chatId, text: `📢 *مناداة المشرفين*\n\n${mentions}`, parse_mode: 'Markdown' });
}

async function cmdCalc(chatId: number, text: string) {
  const expr = text.replace(/\/calc\s*/, '').trim();
  if (!expr) return tg('sendMessage', { chat_id: chatId, text: '❌ استخدم: /calc تعبير رياضي' });

  try {
    // Safe evaluation - only allow numbers and basic operators
    if (!/^[\d\s+\-*/().%]+$/.test(expr)) throw new Error('Invalid');
    const result = Function('"use strict"; return (' + expr + ')')();
    await tg('sendMessage', { chat_id: chatId, text: `🧮 *الآلة الحاسبة*\n\n${expr} = *${result}*`, parse_mode: 'Markdown' });
  } catch {
    await tg('sendMessage', { chat_id: chatId, text: '❌ تعبير غير صالح. استخدم أرقام وعمليات فقط (+, -, *, /, %)' });
  }
}

async function cmdDev(supabase: any, chatId: number, userId: number) {
  const { count: membersCount } = await supabase.from('members').select('*', { count: 'exact', head: true });
  const { count: messagesCount } = await supabase.from('messages_log').select('*', { count: 'exact', head: true });
  const { count: groupsCount } = await supabase.from('group_settings').select('*', { count: 'exact', head: true });

  const { data: recentLogs } = await supabase.from('admin_logs')
    .select('*').order('timestamp', { ascending: false }).limit(5);

  let text = `🛠️ *لوحة المطور*\n\n👥 الأعضاء: ${membersCount || 0}\n💬 الرسائل: ${messagesCount || 0}\n📋 المجموعات: ${groupsCount || 0}\n\n`;
  
  if (recentLogs?.length) {
    text += '📋 *آخر الإجراءات:*\n';
    recentLogs.forEach((l: any) => {
      text += `• ${l.action}: ${l.target_name} بواسطة ${l.admin_name}\n`;
    });
  }

  await tg('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown' });
}

// ============ LINK PROTECTION ============

async function checkLinks(supabase: any, msg: any, chatId: number, userId: number, fullName: string): Promise<boolean> {
  const { data: settings } = await supabase.from('group_settings')
    .select('links_allowed, max_warnings').eq('chat_id', chatId).single();

  if (!settings || settings.links_allowed) return false;

  const text = msg.text || msg.caption || '';
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/gi;
  if (!urlRegex.test(text)) return false;

  // Check if sender is admin
  if (await isAdmin(chatId, userId)) return false;

  // Delete message
  await tg('deleteMessage', { chat_id: chatId, message_id: msg.message_id });

  // Add warning
  const { data: member } = await supabase.from('members')
    .select('warnings').eq('user_id', userId).eq('chat_id', chatId).single();
  const newWarnings = (member?.warnings || 0) + 1;
  await supabase.from('members').update({ warnings: newWarnings }).eq('user_id', userId).eq('chat_id', chatId);

  const maxWarnings = settings.max_warnings || 3;

  if (newWarnings >= maxWarnings) {
    await tg('banChatMember', { chat_id: chatId, user_id: userId });
    await tg('unbanChatMember', { chat_id: chatId, user_id: userId, only_if_banned: true });
    await tg('sendMessage', { chat_id: chatId, text: `🚫 تم طرد ${fullName} بسبب إرسال روابط (${newWarnings}/${maxWarnings} تحذيرات)` });
  } else {
    await tg('sendMessage', { chat_id: chatId, text: `⚠️ ${fullName}، الروابط ممنوعة! تحذير (${newWarnings}/${maxWarnings})` });
  }

  return true;
}

// ============ AUTO RESPONSES ============

async function checkAutoResponses(supabase: any, chatId: number, text: string): Promise<string | null> {
  const { data: responses } = await supabase.from('auto_responses')
    .select('trigger_word, response').eq('chat_id', chatId);
  if (!responses) return null;
  const lower = text.toLowerCase();
  const match = responses.find((r: any) => lower.includes(r.trigger_word.toLowerCase()));
  return match?.response || null;
}

// ============ WELCOME/GOODBYE ============

const welcomeMessages = [
  'أهلاً وسهلاً بك في المجموعة! 🎉', 'منوّر/ة يا {name}! ⭐',
  'يا هلا يا هلا بـ {name}! 🌟', 'حياك الله {name}! نورت المجموعة 💫',
];

const goodbyeMessages = [
  'مع السلامة {name}... بنفتقدك 😢', 'يا خسارة {name} طلع... 💔',
  'الله يوفقك يا {name} وين ما رحت 🤲',
];

async function handleNewMembers(supabase: any, msg: any) {
  const chatId = msg.chat.id;
  const { data: settings } = await supabase.from('group_settings')
    .select('welcome_enabled').eq('chat_id', chatId).single();
  if (settings && !settings.welcome_enabled) return;

  for (const member of msg.new_chat_members) {
    if (member.is_bot) continue;
    const name = `${member.first_name || ''} ${member.last_name || ''}`.trim();
    const welcome = pick(welcomeMessages).replace('{name}', name);
    await tg('sendMessage', { chat_id: chatId, text: welcome });
    
    await upsertMember(supabase, member.id, chatId, member.username || '', name);
  }
}

async function handleLeftMember(msg: any) {
  const member = msg.left_chat_member;
  if (member.is_bot) return;
  const name = `${member.first_name || ''} ${member.last_name || ''}`.trim();
  const goodbye = pick(goodbyeMessages).replace('{name}', name);
  await tg('sendMessage', { chat_id: msg.chat.id, text: goodbye });
}

// ============ CALLBACK QUERY HANDLER ============

async function handleCallbackQuery(supabase: any, query: any) {
  const data = query.data;
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const fullName = `${query.from.first_name || ''} ${query.from.last_name || ''}`.trim();

  // Quiz answer
  if (data.startsWith('quiz_')) {
    const parts = data.split('_');
    const questionId = parts[1];
    const answer = parts.slice(2).join('_');

    const { data: question } = await supabase.from('quiz_questions')
      .select('answer').eq('id', questionId).single();
    
    if (question && answer === question.answer) {
      const { data: member } = await supabase.from('members')
        .select('points, coins, level').eq('user_id', userId).eq('chat_id', chatId).single();
      if (member) {
        const newPoints = member.points + 5;
        await supabase.from('members').update({
          points: newPoints, coins: member.coins + 5, level: calcLevel(newPoints),
        }).eq('user_id', userId).eq('chat_id', chatId);
      }
      await tg('answerCallbackQuery', { callback_query_id: query.id, text: '✅ إجابة صحيحة! +5 نقاط', show_alert: true });
    } else {
      await tg('answerCallbackQuery', { callback_query_id: query.id, text: `❌ خطأ! الإجابة الصحيحة: ${question?.answer}`, show_alert: true });
    }
    return;
  }

  // Whisper
  if (data.startsWith('whisper_')) {
    const whisperId = data.replace('whisper_', '');
    const { data: whisper } = await supabase.from('whispers')
      .select('*').eq('id', whisperId).single();
    
    if (!whisper) {
      return tg('answerCallbackQuery', { callback_query_id: query.id, text: '❌ الهمسة غير موجودة', show_alert: true });
    }
    if (whisper.recipient_id !== userId) {
      return tg('answerCallbackQuery', { callback_query_id: query.id, text: '🚫 هذه الهمسة ليست لك!', show_alert: true });
    }

    await supabase.from('whispers').update({ is_read: true }).eq('id', whisperId);
    await tg('answerCallbackQuery', { callback_query_id: query.id, text: `🤫 من ${whisper.sender_name}:\n\n${whisper.message}`, show_alert: true });
    return;
  }

  // Judgment vote
  if (data.startsWith('judge_')) {
    const votedFor = data.replace('judge_', '');
    await tg('answerCallbackQuery', { callback_query_id: query.id, text: `✅ صوّت ${fullName}!` });
    return;
  }

  // Settings toggle
  if (data.startsWith('setting_')) {
    if (!(await isAdmin(chatId, userId))) {
      return tg('answerCallbackQuery', { callback_query_id: query.id, text: '❌ للمشرفين فقط', show_alert: true });
    }
    
    const parts = data.split('_');
    const setting = parts[1]; // links, media, spam, welcome
    const settingChatId = parseInt(parts[2]);

    const fieldMap: Record<string, string> = {
      links: 'links_allowed', media: 'media_allowed',
      spam: 'spam_protection', welcome: 'welcome_enabled',
    };
    const field = fieldMap[setting];
    if (!field) return;

    const { data: current } = await supabase.from('group_settings')
      .select(field).eq('chat_id', settingChatId).single();

    const newValue = !(current?.[field] ?? false);
    await supabase.from('group_settings')
      .update({ [field]: newValue }).eq('chat_id', settingChatId);

    await tg('answerCallbackQuery', { callback_query_id: query.id, text: `✅ تم ${newValue ? 'تفعيل' : 'تعطيل'} الإعداد` });

    // Refresh settings message
    await cmdSettings(supabase, settingChatId, userId);
    return;
  }

  // Menu buttons
  if (data.startsWith('menu_')) {
    const menu = data.replace('menu_', '');
    switch (menu) {
      case 'commands':
        await tg('answerCallbackQuery', { callback_query_id: query.id });
        await tg('sendMessage', {
          chat_id: chatId,
          text: `📋 *أوامر شادي*\n\n*💰 اقتصاد:*\n/daily - مكافأة يومية\n/wallet - محفظتك\n/gift - إهداء عملات\n/shop - المتجر\n/stats - إحصائياتك\n/top - الترتيب\n\n*🎮 ألعاب:*\n/quiz - كويز\n/hack - اختراق وهمي\n/ship - توافق\n/8ball - كرة سحرية\n/fortune - حظك\n/joke - نكتة\n/roast - هجاية\n/compliment - مدح\n/wisdom - حكمة\n/judgment - أحكام\n\n*🤫 اجتماعي:*\n/whisper - همسة سرية\n\n*🛠️ إدارة:*\n/ban /kick /mute /unmute /warn /promote\n/settings - الإعدادات\n/addresponse - إضافة رد\n/responses - الردود\n/calc - آلة حاسبة`,
          parse_mode: 'Markdown',
        });
        break;
      case 'stats':
        await tg('answerCallbackQuery', { callback_query_id: query.id });
        await cmdStats(supabase, chatId, userId, { reply_to_message: null, from: query.from });
        break;
      case 'games':
        await tg('answerCallbackQuery', { callback_query_id: query.id });
        await tg('sendMessage', {
          chat_id: chatId, text: '🎮 *الألعاب*',
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🧠 كويز', callback_data: 'game_quiz' }, { text: '💻 اختراق', callback_data: 'game_hack' }],
              [{ text: '💘 توافق', callback_data: 'game_ship' }, { text: '🎱 كرة سحرية', callback_data: 'game_8ball' }],
              [{ text: '😂 نكتة', callback_data: 'game_joke' }, { text: '🔮 حظك', callback_data: 'game_fortune' }],
            ]
          },
        });
        break;
      case 'top':
        await tg('answerCallbackQuery', { callback_query_id: query.id });
        await cmdTop(supabase, chatId);
        break;
      case 'wallet':
        await tg('answerCallbackQuery', { callback_query_id: query.id });
        await cmdWallet(supabase, chatId, userId);
        break;
      case 'shop':
        await tg('answerCallbackQuery', { callback_query_id: query.id });
        await cmdShop(chatId);
        break;
    }
    return;
  }

  // Game buttons
  if (data.startsWith('game_')) {
    const game = data.replace('game_', '');
    await tg('answerCallbackQuery', { callback_query_id: query.id });
    switch (game) {
      case 'quiz': await sendQuiz(supabase, chatId); break;
      case 'hack': await cmdHack(chatId, { reply_to_message: null }, fullName); break;
      case 'joke': await tg('sendMessage', { chat_id: chatId, text: pick(jokes) }); break;
      case 'fortune': await tg('sendMessage', { chat_id: chatId, text: pick(fortunes) }); break;
    }
  }
}
