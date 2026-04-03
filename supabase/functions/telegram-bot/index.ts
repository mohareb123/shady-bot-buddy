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

// ============ HELPERS ============
function calcLevel(points: number): number { return Math.floor(Math.sqrt(points / 100)) + 1; }
function pointsForLevel(level: number): number { return (level - 1) * (level - 1) * 100; }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

const DEVELOPER_ID = 6570434162;
const lastReply: Record<number, number> = {};
const COOLDOWN_MS = 8000;
const floodTracker: Record<string, number[]> = {};

function canReply(chatId: number): boolean {
  const now = Date.now();
  if (lastReply[chatId] && now - lastReply[chatId] < COOLDOWN_MS) return false;
  lastReply[chatId] = now;
  return true;
}

function isDeveloper(userId: number): boolean { return userId === DEVELOPER_ID; }

// ============ FLOOD & SPAM DETECTION ============
const contentTracker: Record<string, string[]> = {};

function checkFlood(userId: number, chatId: number, messageText?: string): 'none' | 'flood' | 'repeat' {
  const key = `${userId}_${chatId}`;
  const now = Date.now();
  if (!floodTracker[key]) floodTracker[key] = [];
  floodTracker[key] = floodTracker[key].filter(t => now - t < 10000);
  floodTracker[key].push(now);
  
  // Check message repetition (same content 4+ times in 60 seconds)
  if (messageText) {
    const contentKey = `${key}_content`;
    if (!contentTracker[contentKey]) contentTracker[contentKey] = [];
    contentTracker[contentKey].push(messageText);
    // Keep only last 10 messages
    if (contentTracker[contentKey].length > 10) contentTracker[contentKey] = contentTracker[contentKey].slice(-10);
    const recentSame = contentTracker[contentKey].filter(t => t === messageText).length;
    if (recentSame >= 4) {
      contentTracker[contentKey] = [];
      return 'repeat';
    }
  }
  
  if (floodTracker[key].length > 8) return 'flood'; // 8+ messages in 10 seconds
  return 'none';
}

// ============ FAKE ACCOUNT DETECTION ============
function isSuspiciousAccount(user: any): boolean {
  if (!user) return false;
  const hasNoUsername = !user.username;
  const hasNoLastName = !user.last_name;
  const hasShortName = (user.first_name || '').length <= 1;
  return hasNoUsername && hasNoLastName && hasShortName;
}

// ============ AI ============

const AI_TOOLS = [
  {
    type: "function",
    function: {
      name: "execute_action",
      description: "Execute a bot admin/moderation action when the user asks Shady to do something like delete, kick, ban, mute, warn, unmute, promote a user. Only use when the user is clearly commanding an action.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["delete_message", "kick", "ban", "mute", "unmute", "warn", "promote", "add_coins", "add_points", "reset_warns", "pin_message", "unpin_message"],
            description: "The action to perform"
          },
          mute_minutes: { type: "number", description: "Duration in minutes for mute (default 60)" },
          amount: { type: "number", description: "Amount for add_coins or add_points" },
          reason: { type: "string", description: "Reason for warn action" },
          reply_text: { type: "string", description: "A short Arabic response to send after executing the action" }
        },
        required: ["action", "reply_text"],
        additionalProperties: false
      }
    }
  }
];

async function getAIResponse(text: string, hasReplyTarget: boolean = false, isAdminOrDev: boolean = false, conversationHistory: any[] = []): Promise<{ text: string | null; action: any | null }> {
  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) return { text: null, action: null };

    const systemPrompt = `أنت بوت تليغرام اسمك "شادي". شخصيتك مرحة وظريفة وتحب المزاح لكنك ذكي جداً.
ترد بالعربية دائماً وبأسلوب شبابي. ردودك قصيرة (جملة أو جملتين كحد أقصى) إلا إذا طُلب منك شرح أو بحث.
إذا حياك أحد رد بتحية لطيفة. إذا شكرك رد بتواضع. إذا سألك من أنت عرّف عن نفسك.
إذا قال كلام حب أو زعل تفاعل عاطفياً. كن ذكياً وسريع البديهة.
إذا سألك سؤال ثقافي أو علمي أجب عليه بدقة ووضوح.
إذا طلب ترجمة نص ترجمه بدقة.
إذا طلب بحث عن موضوع أو شخص، قدم معلومات مفصلة ودقيقة مع المصادر.
إذا طلب ملخص كتاب أو معلومات عنه، قدمها بشكل منظم مع روابط PDF إن أمكن.
إذا طلب بحث يوتيوب، اقترح أفضل الفيديوهات مع روابط بحث.
إذا طلب بحث ويب، ابحث وقدم النتائج مع المواقع والمصادر.
لديك ذاكرة للمحادثات السابقة مع المستخدم. استخدمها لتكون أكثر طبيعية.
حلل سياق المحادثة لفهم نوايا المستخدم حتى لو لم يذكر اسمك مباشرة.

أنت قادر على تنفيذ جميع الأوامر الإدارية وأوامر البوت بدون الحاجة لكتابة أمر. مثلاً:
- "يا شادي اكتب نكتة" → أكتب نكتة مضحكة
- "يا شادي شو حظي اليوم" → أعطي حظ اليوم
- "يا شادي ترجم" → ترجم الرسالة المردود عليها
- "يا شادي ابحث عن X" → ابحث عن الموضوع وقدم نتائج مع مصادر
- "يا شادي حكمة" → أعطي حكمة
- "يا شادي كم عملاتي" → أجب عن رصيد المحفظة
${isAdminOrDev ? `
المستخدم الحالي مشرف/مطور وله صلاحيات كاملة.
إذا طلب منك تنفيذ إجراء إداري (حذف رسالة، طرد، حظر، كتم، تحذير، فك كتم، ترقية، إضافة عملات/نقاط، إزالة تحذيرات، تثبيت، إلغاء تثبيت) استخدم أداة execute_action.
${hasReplyTarget ? 'الرسالة رد على رسالة شخص آخر - نفّذ الإجراء عليه.' : 'لا يوجد رد على رسالة. إذا طلب إجراء على شخص أخبره يرد على رسالة الشخص المستهدف.'}
` : 'المستخدم ليس مشرفاً. إذا طلب إجراء إداري أخبره أنه يحتاج صلاحيات مشرف.'}`;

    const messages: any[] = [{ role: 'system', content: systemPrompt }];
    // Add conversation history (last 10 messages)
    if (conversationHistory.length > 0) {
      messages.push(...conversationHistory.slice(-10));
    }
    messages.push({ role: 'user', content: text });

    const body: any = {
      model: 'google/gemini-3-flash-preview',
      messages,
    };

    if (isAdminOrDev) {
      body.tools = AI_TOOLS;
      body.tool_choice = "auto";
    }

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { text: null, action: null };
    const data = await res.json();
    const choice = data.choices?.[0];

    if (choice?.message?.tool_calls?.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      if (toolCall.function?.name === 'execute_action') {
        try {
          const action = JSON.parse(toolCall.function.arguments);
          return { text: action.reply_text || null, action };
        } catch { return { text: choice?.message?.content || null, action: null }; }
      }
    }

    return { text: choice?.message?.content || null, action: null };
  } catch { return { text: null, action: null }; }
}

// ============ CONVERSATION MEMORY ============
async function loadConversationHistory(supabase: any, chatId: number, userId: number): Promise<any[]> {
  const { data } = await supabase.from('conversation_memory')
    .select('role, content')
    .eq('chat_id', chatId).eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(10);
  return data || [];
}

async function saveConversationMessage(supabase: any, chatId: number, userId: number, role: string, content: string) {
  await supabase.from('conversation_memory').insert({ chat_id: chatId, user_id: userId, role, content });
  // Keep only last 20 messages per user per chat
  const { data: old } = await supabase.from('conversation_memory')
    .select('id').eq('chat_id', chatId).eq('user_id', userId)
    .order('created_at', { ascending: false }).range(20, 100);
  if (old && old.length > 0) {
    await supabase.from('conversation_memory').delete().in('id', old.map((r: any) => r.id));
  }
}

async function trackBotMessage(supabase: any, chatId: number, messageId: number) {
  await supabase.from('bot_messages').upsert({ chat_id: chatId, message_id: messageId }, { onConflict: 'message_id,chat_id' });
}

async function isBotMessage(supabase: any, chatId: number, messageId: number): Promise<boolean> {
  const { data } = await supabase.from('bot_messages').select('message_id').eq('chat_id', chatId).eq('message_id', messageId).single();
  return !!data;
}

async function executeAIAction(supabase: any, action: any, msg: any, chatId: number, userId: number, fullName: string) {
  const target = msg.reply_to_message ? {
    id: msg.reply_to_message.from.id,
    name: `${msg.reply_to_message.from.first_name || ''} ${msg.reply_to_message.from.last_name || ''}`.trim(),
  } : null;
  if (!target && !['pin_message', 'unpin_message'].includes(action.action)) return;

  switch (action.action) {
    case 'delete_message':
      if (msg.reply_to_message) await tg('deleteMessage', { chat_id: chatId, message_id: msg.reply_to_message.message_id });
      break;
    case 'kick':
      await tg('banChatMember', { chat_id: chatId, user_id: target!.id });
      await tg('unbanChatMember', { chat_id: chatId, user_id: target!.id, only_if_banned: true });
      await logAdminAction(supabase, chatId, userId, fullName, target!.id, target!.name, 'kick (AI)');
      break;
    case 'ban':
      await tg('banChatMember', { chat_id: chatId, user_id: target!.id });
      await logAdminAction(supabase, chatId, userId, fullName, target!.id, target!.name, 'ban (AI)');
      break;
    case 'mute': {
      const mins = action.mute_minutes || 60;
      await tg('restrictChatMember', {
        chat_id: chatId, user_id: target!.id, until_date: Math.floor(Date.now() / 1000) + mins * 60,
        permissions: { can_send_messages: false, can_send_media_messages: false, can_send_other_messages: false },
      });
      await logAdminAction(supabase, chatId, userId, fullName, target!.id, target!.name, 'mute (AI)', `${mins} دقيقة`);
      break;
    }
    case 'unmute':
      await tg('restrictChatMember', {
        chat_id: chatId, user_id: target!.id,
        permissions: { can_send_messages: true, can_send_media_messages: true, can_send_other_messages: true, can_add_web_page_previews: true },
      });
      await logAdminAction(supabase, chatId, userId, fullName, target!.id, target!.name, 'unmute (AI)');
      break;
    case 'warn': {
      const { data: member } = await supabase.from('members').select('warnings').eq('user_id', target!.id).eq('chat_id', chatId).single();
      const newW = (member?.warnings || 0) + 1;
      const { data: settings } = await supabase.from('group_settings').select('max_warnings').eq('chat_id', chatId).single();
      await supabase.from('members').update({ warnings: newW }).eq('user_id', target!.id).eq('chat_id', chatId);
      await logAdminAction(supabase, chatId, userId, fullName, target!.id, target!.name, 'warn (AI)', action.reason || 'بواسطة شادي');
      if (newW >= (settings?.max_warnings || 3)) {
        await tg('banChatMember', { chat_id: chatId, user_id: target!.id });
        await tg('unbanChatMember', { chat_id: chatId, user_id: target!.id, only_if_banned: true });
      }
      break;
    }
    case 'promote':
      await tg('promoteChatMember', {
        chat_id: chatId, user_id: target!.id,
        can_manage_chat: true, can_delete_messages: true, can_restrict_members: true,
        can_promote_members: false, can_change_info: true, can_invite_users: true,
        can_pin_messages: true, can_manage_video_chats: true,
      });
      await logAdminAction(supabase, chatId, userId, fullName, target!.id, target!.name, 'promote (AI)');
      break;
    case 'add_coins': {
      const amt = action.amount || 100;
      const { data: m } = await supabase.from('members').select('coins').eq('user_id', target!.id).eq('chat_id', chatId).single();
      if (m) await supabase.from('members').update({ coins: m.coins + amt }).eq('user_id', target!.id).eq('chat_id', chatId);
      break;
    }
    case 'add_points': {
      const amt = action.amount || 100;
      const { data: m } = await supabase.from('members').select('points').eq('user_id', target!.id).eq('chat_id', chatId).single();
      if (m) await supabase.from('members').update({ points: m.points + amt, level: calcLevel(m.points + amt) }).eq('user_id', target!.id).eq('chat_id', chatId);
      break;
    }
    case 'reset_warns':
      await supabase.from('members').update({ warnings: 0 }).eq('user_id', target!.id).eq('chat_id', chatId);
      await logAdminAction(supabase, chatId, userId, fullName, target!.id, target!.name, 'reset_warns (AI)');
      break;
    case 'pin_message':
      if (msg.reply_to_message) await tg('pinChatMessage', { chat_id: chatId, message_id: msg.reply_to_message.message_id });
      break;
    case 'unpin_message':
      if (msg.reply_to_message) await tg('unpinChatMessage', { chat_id: chatId, message_id: msg.reply_to_message.message_id });
      break;
  }
}

// ============ STATIC DATA ============
const jokes = [
  "واحد راح للدكتور قاله: يا دكتور كل ما أشرب شاي عيني تألمني... قاله: طلع المعلقة من الكوب 😂",
  "واحد سأل صاحبه: ليش حاطط صورتك على الثلاجة؟ قاله: عشان أخسّ كل ما أشوفها أفقد شهيتي 😂",
  "مرة واحد نام بالصحراء... صحى لقى النمل شايلينه ورايحين فيه... قال: حطوني حطوني أنا صاحي 😂",
  "واحد قال لصاحبه: تعرف الفرق بين المدرسة والحبس؟ قاله: المسجون يقدر يطلع بكفالة 😂",
  "مرة واحد دخل المطعم قال: عندكم أكل؟ قالوا: لا عندنا ملابس بس حاطين طاولات للمنظر 😂",
];
const fortunes = [
  "🔮 حظك اليوم ممتاز! توقع مفاجأة سعيدة", "🔮 يومك عادي... بس بكرة أحسن إن شاء الله",
  "🔮 انتبه من شخص قريب منك اليوم 👀", "🔮 حظك في الحب اليوم 💯... روح تكلم كراشك",
  "🔮 اليوم يومك في الأكل 🍕 دلّع نفسك", "🔮 نجمك ساطع اليوم ⭐ استغل الفرصة",
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
  "💡 من جدّ وجد ومن زرع حصد", "💡 الصبر مفتاح الفرج",
  "💡 العلم نور والجهل ظلام", "💡 لا تؤجل عمل اليوم إلى الغد",
  "💡 من صبر ظفر", "💡 الوقت كالسيف إن لم تقطعه قطعك",
];
const hackSecrets = [
  "كلمة سره: 123456 😱", "آخر بحث: كيف أكون ذكي 🧠",
  "يتكلم مع 5 كراشات بنفس الوقت 💔", "عنده 847 صورة سيلفي 🤳",
  "يأكل بالليل بالسر 🍕", "يسولف مع نفسه بالمرآة 🪞",
  "حسابه البنكي: 3 ريال 💸", "يبحث: كيف أصير مشهور بدون موهبة 😂",
];
const welcomeMessages = [
  'أهلاً وسهلاً بك في المجموعة! 🎉', 'منوّر/ة يا {name}! ⭐',
  'يا هلا يا هلا بـ {name}! 🌟', 'حياك الله {name}! نورت المجموعة 💫',
];
const goodbyeMessages = [
  'مع السلامة {name}... بنفتقدك 😢', 'يا خسارة {name} طلع... 💔',
  'الله يوفقك يا {name} وين ما رحت 🤲',
];

// ============ MAIN HANDLER ============
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();

    // Handle broadcast action from dashboard (rich media support)
    if (body.action === 'broadcast') {
      const sb = getSupabase();
      const msgText = body.type === 'poll'
        ? `📊 استفتاء: ${body.question}`
        : body.message || body.caption || body.photo_url || body.video_url || body.file_url || body.sticker_id || 'إشعار';
      const { data: notif } = await sb.from('notifications').insert({
        message: msgText, created_by: 6570434162, is_sent: false,
      }).select().single();
      await handleBroadcast(sb, { ...body, notification_id: notif?.id });
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // Handle promote/demote from dashboard
    if (body.action === 'promote_member') {
      await tg('promoteChatMember', {
        chat_id: body.chat_id, user_id: body.user_id,
        can_manage_chat: true, can_delete_messages: true, can_restrict_members: true,
        can_promote_members: false, can_change_info: true, can_invite_users: true,
        can_pin_messages: true, can_manage_video_chats: true,
      });
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }
    if (body.action === 'demote_member') {
      await tg('promoteChatMember', {
        chat_id: body.chat_id, user_id: body.user_id,
        can_manage_chat: false, can_delete_messages: false, can_restrict_members: false,
        can_promote_members: false, can_change_info: false, can_invite_users: false,
        can_pin_messages: false, can_manage_video_chats: false,
      });
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    // Handle delete broadcast messages from Telegram
    if (body.action === 'delete_broadcast') {
      const supabase = getSupabase();
      const { data: msgs } = await supabase.from('bot_messages').select('chat_id, message_id').order('created_at', { ascending: false }).limit(200);
      if (msgs) {
        for (const m of msgs) {
          try { await tg('deleteMessage', { chat_id: m.chat_id, message_id: m.message_id }); } catch {}
        }
      }
      return new Response(JSON.stringify({ ok: true, deleted: msgs?.length || 0 }), { headers: corsHeaders });
    }

    // Handle get sticker file_id
    if (body.action === 'get_sticker_id') {
      // Forward sticker info - the file_id is already in the sticker message
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    if (body.action === 'check_link_code') {
      const supabase = getSupabase();
      const code = (body.code || '').trim().toUpperCase();
      const { data } = await supabase.from('dashboard_links')
        .select('id, chat_title').eq('code', code).eq('used', false).single();
      if (!data) return new Response(JSON.stringify({ ok: false, error: 'رمز غير صالح' }), { headers: corsHeaders });
      return new Response(JSON.stringify({ ok: true, chat_title: data.chat_title }), { headers: corsHeaders });
    }

    // Handle link code verification from dashboard
    if (body.action === 'verify_link_code') {
      const supabase = getSupabase();
      const code = (body.code || '').trim().toUpperCase();
      const { data } = await supabase.from('dashboard_links')
        .select('*').eq('code', code).eq('used', false).single();
      if (!data) return new Response(JSON.stringify({ ok: false, error: 'رمز غير صالح' }), { headers: corsHeaders });
      await supabase.from('dashboard_links').update({ used: true }).eq('id', data.id);
      await supabase.from('dashboard_users').insert({
        user_id: body.user_id, chat_id: data.chat_id, display_name: body.display_name || '',
      });
      return new Response(JSON.stringify({ ok: true, chat_id: data.chat_id, chat_title: data.chat_title }), { headers: corsHeaders });
    }

    const { update } = body;
    if (!update) return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });

    const supabase = getSupabase();

    // Handle callback queries
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
    if (!msg?.text && !msg?.caption) return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username || '';
    const fullName = `${msg.from.first_name || ''} ${msg.from.last_name || ''}`.trim();
    const text = (msg.text || msg.caption || '').trim();
    const isPrivate = msg.chat.type === 'private';

    // ===== FEATURE 1: FLOOD & SPAM DETECTION (respects spam_protection setting) =====
    if (!isPrivate && !isDeveloper(userId)) {
      const { data: spamSettings } = await supabase.from('group_settings').select('spam_protection').eq('chat_id', chatId).single();
      const spamEnabled = spamSettings?.spam_protection !== false; // default true
      if (spamEnabled) {
        const floodResult = checkFlood(userId, chatId, text);
        const adminCheck = floodResult !== 'none' ? await isAdmin(chatId, userId) : false;
        if (floodResult !== 'none' && !adminCheck) {
          const muteDuration = floodResult === 'repeat' ? 600 : 300; // 10 min for repeat, 5 for flood
          const reason = floodResult === 'repeat' ? 'تكرار رسائل' : 'فلود';
          await tg('deleteMessage', { chat_id: chatId, message_id: msg.message_id }).catch(() => {});
          await tg('restrictChatMember', {
            chat_id: chatId, user_id: userId,
            until_date: Math.floor(Date.now() / 1000) + muteDuration,
            permissions: { can_send_messages: false, can_send_media_messages: false, can_send_other_messages: false },
          });
          // Auto-warn
          const { data: member } = await supabase.from('members').select('warnings').eq('user_id', userId).eq('chat_id', chatId).single();
          const newW = (member?.warnings || 0) + 1;
          await supabase.from('members').update({ warnings: newW }).eq('user_id', userId).eq('chat_id', chatId);
          const { data: maxWarnSettings } = await supabase.from('group_settings').select('max_warnings').eq('chat_id', chatId).single();
          const maxW = maxWarnSettings?.max_warnings || 3;
          
          if (newW >= maxW) {
            await tg('banChatMember', { chat_id: chatId, user_id: userId });
            await tg('unbanChatMember', { chat_id: chatId, user_id: userId, only_if_banned: true });
            await tg('sendMessage', { chat_id: chatId, text: `🚫 تم طرد ${fullName} تلقائياً بسبب ${reason} (${newW}/${maxW} تحذيرات)` });
          } else {
            await tg('sendMessage', { chat_id: chatId, text: `🛡️ تم كتم ${fullName} تلقائياً لمدة ${muteDuration / 60} دقائق بسبب ${reason}\n⚠️ تحذير (${newW}/${maxW})` });
          }
          await logAdminAction(supabase, chatId, 0, 'نظام الحماية', userId, fullName, `auto_mute (${reason})`);
          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
        }
      }
    }

    // Upsert member & add points
    await upsertMember(supabase, userId, chatId, username, fullName);

    // ===== FEATURE 2: AFK AUTO-RESPONSE =====
    if (!isPrivate) {
      // Check if mentioned user is AFK
      if (msg.reply_to_message) {
        const replyUserId = msg.reply_to_message.from.id;
        const { data: afk } = await supabase.from('afk_status').select('*').eq('user_id', replyUserId).eq('chat_id', chatId).single();
        if (afk) {
          const replyName = `${msg.reply_to_message.from.first_name || ''}`.trim();
          await tg('sendMessage', { chat_id: chatId, text: `💤 ${replyName} غير متاح حالياً\n📝 السبب: ${afk.reason || 'بدون سبب'}`, reply_to_message_id: msg.message_id });
        }
      }
      // Remove AFK status if user sends a message
      await supabase.from('afk_status').delete().eq('user_id', userId).eq('chat_id', chatId);
    }

    // ===== FEATURE 3: ACHIEVEMENT CHECK =====
    await checkAndUnlockAchievements(supabase, userId, chatId);

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
    // Detect if user is replying to one of Shady's messages
    const isReplyToBot = msg.reply_to_message ? await isBotMessage(supabase, chatId, msg.reply_to_message.message_id) : false;
    
    // Improved trigger: reply to bot, private, mentions شادي, or smart detection of conversational intent
    const mentionsShady = text.toLowerCase().includes('شادي') || text.toLowerCase().includes('shady');
    const isQuestion = text.includes('؟') || text.endsWith('?');
    const startsWithYa = /^(يا\s|ي\s)/.test(text.trim());
    const shouldReply = isPrivate || isReplyToBot || mentionsShady || startsWithYa || (isQuestion && Math.random() < 0.3) || Math.random() < 0.05;

    if (shouldReply && canReply(chatId)) {
      const lowerText = text.toLowerCase();
      if (lowerText.includes('نكتة') || lowerText.includes('نكته')) {
        await tg('sendMessage', { chat_id: chatId, text: pick(jokes), reply_to_message_id: msg.message_id });
      } else if (lowerText.includes('حكمة') || lowerText.includes('حكمه')) {
        await tg('sendMessage', { chat_id: chatId, text: pick(wisdoms), reply_to_message_id: msg.message_id });
      } else if (lowerText.includes('كويز') || lowerText.includes('اختبار')) {
        await sendQuiz(supabase, chatId);
      } else {
        // Load conversation history for context
        const history = await loadConversationHistory(supabase, chatId, userId);
        const hasReplyTarget = !!msg.reply_to_message;
        const userIsAdmin = isDeveloper(userId) || (!isPrivate && await isAdmin(chatId, userId));
        const aiResult = await getAIResponse(text, hasReplyTarget, userIsAdmin, history);
        
        // Save conversation to memory
        await saveConversationMessage(supabase, chatId, userId, 'user', text);
        
        if (aiResult.action) await executeAIAction(supabase, aiResult.action, msg, chatId, userId, fullName);
        if (aiResult.text) {
          const sent = await tg('sendMessage', { chat_id: chatId, text: aiResult.text, reply_to_message_id: msg.message_id });
          // Track bot's message for reply detection
          if (sent?.result?.message_id) {
            await trackBotMessage(supabase, chatId, sent.result.message_id);
          }
          await saveConversationMessage(supabase, chatId, userId, 'assistant', aiResult.text);
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
    await supabase.from('group_settings').upsert({ chat_id: chatId }, { onConflict: 'chat_id' });
  }
}

// ============ ACHIEVEMENT SYSTEM ============
async function checkAndUnlockAchievements(supabase: any, userId: number, chatId: number) {
  const { data: member } = await supabase.from('members')
    .select('messages_count, points, level, quiz_correct, daily_streak, total_gifted, reputation')
    .eq('user_id', userId).eq('chat_id', chatId).single();
  if (!member) return;

  const checks = [
    { id: 'msg_100', value: member.messages_count, threshold: 100 },
    { id: 'msg_1000', value: member.messages_count, threshold: 1000 },
    { id: 'msg_5000', value: member.messages_count, threshold: 5000 },
    { id: 'points_500', value: member.points, threshold: 500 },
    { id: 'points_5000', value: member.points, threshold: 5000 },
    { id: 'level_5', value: member.level, threshold: 5 },
    { id: 'level_10', value: member.level, threshold: 10 },
    { id: 'level_20', value: member.level, threshold: 20 },
    { id: 'quiz_10', value: member.quiz_correct || 0, threshold: 10 },
    { id: 'daily_7', value: member.daily_streak || 0, threshold: 7 },
    { id: 'gift_1000', value: member.total_gifted || 0, threshold: 1000 },
    { id: 'rep_10', value: member.reputation || 0, threshold: 10 },
  ];

  for (const check of checks) {
    if (check.value >= check.threshold) {
      const { data: existing } = await supabase.from('member_achievements')
        .select('achievement_id').eq('user_id', userId).eq('chat_id', chatId).eq('achievement_id', check.id).single();
      if (!existing) {
        await supabase.from('member_achievements').insert({ user_id: userId, chat_id: chatId, achievement_id: check.id });
        const { data: achievement } = await supabase.from('achievements').select('name, icon').eq('id', check.id).single();
        if (achievement) {
          await tg('sendMessage', { chat_id: chatId, text: `🏅 *إنجاز جديد!*\n\n${achievement.icon} ${achievement.name}\n\nمبروك! 🎉`, parse_mode: 'Markdown' });
        }
      }
    }
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
    case '/broadcast': return await cmdBroadcast(supabase, chatId, userId, text);
    case '/addcoins': return await cmdAddCoins(supabase, chatId, userId, msg, parts);
    case '/addpoints': return await cmdAddPoints(supabase, chatId, userId, msg, parts);
    case '/resetwarns': return await cmdResetWarns(supabase, chatId, userId, msg);
    case '/call': case '/tagall': return await cmdCallAll(supabase, chatId, userId);
    case '/pin': return await cmdPin(chatId, userId, msg);
    case '/unpin': return await cmdUnpin(chatId, userId, msg);
    case '/id': return await cmdId(chatId, msg);
    case '/info': return await cmdInfo(supabase, chatId, msg);
    case '/rules': return await cmdRules(supabase, chatId);
    case '/setrules': return await cmdSetRules(supabase, chatId, userId, text);
    case '/demote': return await cmdDemote(supabase, msg, chatId, userId, fullName);
    case '/unban': return await cmdUnban(supabase, msg, chatId, userId, fullName);
    case '/help': return await cmdHelp(chatId);
    case '/report': return await cmdReport(chatId, userId, msg, fullName);
    case '/dice': return await cmdDice(chatId);
    case '/coinflip': return await cmdCoinFlip(chatId);
    // ===== NEW FEATURES COMMANDS =====
    case '/afk': return await cmdAfk(supabase, chatId, userId, fullName, text);
    case '/rep': return await cmdRep(supabase, chatId, userId, msg, parts);
    case '/achievements': return await cmdAchievements(supabase, chatId, userId);
    case '/profile': return await cmdProfile(supabase, chatId, userId, msg);
    case '/remind': return await cmdRemind(supabase, chatId, userId, text);
    case '/poll': return await cmdPoll(supabase, chatId, userId, text);
    case '/endpoll': return await cmdEndPoll(supabase, chatId, userId, parts);
    case '/lottery': return await cmdLottery(supabase, chatId, userId);
    case '/draw': return await cmdDraw(supabase, chatId, userId);
    case '/translate': return await cmdTranslate(chatId, msg);
    case '/summary': return await cmdSummary(supabase, chatId, userId);
    case '/challenge': return await cmdChallenge(supabase, chatId, userId, fullName, msg, parts);
    case '/accept': return await cmdAccept(supabase, chatId, userId, fullName, msg);
    case '/leaderboard': return await cmdLeaderboard(supabase, chatId);
    case '/linkdashboard': return await cmdLinkDashboard(supabase, chatId, userId, msg);
    case '/antiraid': return await cmdAntiRaid(supabase, chatId, userId, parts);
    case '/slowmode': return await cmdSlowMode(chatId, userId, parts);
    case '/gamble': return await cmdGamble(supabase, chatId, userId, parts);
    case '/steal': return await cmdSteal(supabase, chatId, userId, fullName, msg);
    case '/marry': return await cmdMarry(chatId, msg, fullName);
    // ===== STORE & PAYMENT =====
    case '/store': return await cmdStore(supabase, chatId);
    case '/buy': return await cmdBuy(supabase, chatId, userId, fullName, parts, msg);
    case '/my': return await cmdMy(supabase, chatId, userId);
    case '/pay': return await cmdPay(supabase, chatId, userId, fullName, parts);
    case '/confirm': return await cmdConfirm(supabase, chatId, userId, fullName, msg);
    case '/activate': return await cmdActivate(supabase, chatId, userId, parts);
    case '/pending': return await cmdPending(supabase, chatId, userId);
    // ===== SEARCH =====
    case '/search': return await cmdSearch(chatId, text);
    case '/youtube': return await cmdYoutube(chatId, text);
    case '/book': return await cmdBook(chatId, text);
  }
}

// ============ ORIGINAL COMMANDS ============

async function cmdStart(chatId: number, isPrivate: boolean) {
  const keyboard = {
    inline_keyboard: [
      [{ text: '📋 الأوامر', callback_data: 'menu_commands' }, { text: '📊 إحصائياتي', callback_data: 'menu_stats' }],
      [{ text: '🎮 الألعاب', callback_data: 'menu_games' }, { text: '🏆 الترتيب', callback_data: 'menu_top' }],
      [{ text: '💰 محفظتي', callback_data: 'menu_wallet' }, { text: '🏪 المتجر', callback_data: 'menu_store' }],
      [{ text: '🏅 إنجازاتي', callback_data: 'menu_achievements' }, { text: '👤 بروفايلي', callback_data: 'menu_profile' }],
      [{ text: '🔍 بحث', callback_data: 'menu_search' }, { text: '👜 حسابي', callback_data: 'menu_my' }],
    ]
  };
  await tg('sendMessage', {
    chat_id: chatId,
    text: `🤖 *مرحباً! أنا شادي*\n\nبوت ذكي لإدارة المجموعات + منصة خدمات!\n\n✨ نظام نقاط وعملات وإنجازات\n🏪 متجر + نظام دفع (Orange Cash)\n🔍 بحث ويب + يوتيوب + كتب\n🎮 ألعاب ممتعة ومتنوعة\n🛡️ حماية متقدمة\n🧠 ذكاء اصطناعي متطور\n\nاختر من القائمة:`,
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
}

async function cmdDaily(supabase: any, chatId: number, userId: number) {
  const { data: member } = await supabase.from('members')
    .select('last_daily, points, coins, level, daily_streak').eq('user_id', userId).eq('chat_id', chatId).single();
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

  // Check streak
  let newStreak = 1;
  if (member.last_daily) {
    const last = new Date(member.last_daily);
    const diffHours = (now.getTime() - last.getTime()) / 3600000;
    if (diffHours < 48) newStreak = (member.daily_streak || 0) + 1;
  }

  const baseReward = Math.floor(Math.random() * 151) + 50;
  const streakBonus = Math.min(newStreak * 10, 100); // Max 100 bonus
  const reward = baseReward + streakBonus;
  const newPoints = member.points + reward;
  const newCoins = member.coins + reward;
  const newLevel = calcLevel(newPoints);

  await supabase.from('members').update({
    points: newPoints, coins: newCoins, level: newLevel,
    last_daily: now.toISOString(), daily_streak: newStreak,
  }).eq('user_id', userId).eq('chat_id', chatId);

  let text = `🎁 *المكافأة اليومية*\n\n💎 حصلت على *${reward}* نقطة\n💰 حصلت على *${reward}* عملة`;
  if (streakBonus > 0) text += `\n🔥 مكافأة السلسلة: +${streakBonus} (${newStreak} يوم متتالي)`;
  text += `\n\n📊 رصيدك: ${newPoints} نقطة | ${newCoins} عملة\n⭐ المستوى: ${newLevel}`;

  await tg('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown' });
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
  text += `⭐ المستوى: ${member.level}\n💎 النقاط: ${member.points}\n💰 العملات: ${member.coins}\n`;
  text += `💬 الرسائل: ${member.messages_count}\n⚠️ التحذيرات: ${member.warnings}\n`;
  text += `⭐ السمعة: ${member.reputation || 0}\n🔥 سلسلة يومية: ${member.daily_streak || 0}\n`;
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
    .select('points, coins, level, reputation').eq('user_id', userId).eq('chat_id', chatId).single();
  if (!member) return;
  await tg('sendMessage', {
    chat_id: chatId,
    text: `💰 *محفظتك*\n\n💎 النقاط: ${member.points}\n💰 العملات: ${member.coins}\n⭐ المستوى: ${member.level}\n⭐ السمعة: ${member.reputation || 0}`,
    parse_mode: 'Markdown',
  });
}

async function cmdGift(supabase: any, msg: any, chatId: number, userId: number, fullName: string, parts: string[]) {
  let targetId: number | null = null;
  let amount = parseInt(parts[parts.length - 1]);
  if (msg.reply_to_message) targetId = msg.reply_to_message.from.id;
  else if (msg.entities) {
    const mentioned = msg.entities.find((e: any) => e.type === 'mention' || e.type === 'text_mention');
    if (mentioned?.user) targetId = mentioned.user.id;
  }
  if (!targetId || isNaN(amount) || amount <= 0) return tg('sendMessage', { chat_id: chatId, text: '❌ استخدم: /gift @user <كمية> أو رد على رسالة' });
  if (targetId === userId) return tg('sendMessage', { chat_id: chatId, text: '❌ لا يمكنك إهداء نفسك!' });

  const { data: sender } = await supabase.from('members').select('coins, total_gifted').eq('user_id', userId).eq('chat_id', chatId).single();
  if (!sender || sender.coins < amount) return tg('sendMessage', { chat_id: chatId, text: '❌ رصيدك غير كافي' });

  const { data: receiver } = await supabase.from('members').select('coins, full_name, username').eq('user_id', targetId).eq('chat_id', chatId).single();
  if (!receiver) return tg('sendMessage', { chat_id: chatId, text: '❌ المستخدم غير موجود' });

  await supabase.from('members').update({ coins: sender.coins - amount, total_gifted: (sender.total_gifted || 0) + amount }).eq('user_id', userId).eq('chat_id', chatId);
  await supabase.from('members').update({ coins: receiver.coins + amount }).eq('user_id', targetId).eq('chat_id', chatId);

  await tg('sendMessage', {
    chat_id: chatId,
    text: `🎁 *هدية!*\n\n${fullName} أهدى ${receiver.full_name || receiver.username} مبلغ *${amount}* عملة 💰`,
    parse_mode: 'Markdown',
  });
}

async function cmdShop(chatId: number) {
  const text = `🛒 *متجر شادي*\n\n1️⃣ إزالة التحذيرات — 200 عملة\n   ← /buy\\_unwarn\n\n2️⃣ شراء نقاط — 2 عملة = 1 نقطة\n   ← /buy\\_points <عدد>\n\n3️⃣ لقب مخصص — 500 عملة\n   ← /buy\\_title <اللقب>\n\n4️⃣ تذكرة يانصيب — 50 عملة\n   ← /lottery\n\n5️⃣ قمار — حد أدنى 10 عملات\n   ← /gamble <مبلغ>`;
  await tg('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown' });
}

async function cmdBuyUnwarn(supabase: any, chatId: number, userId: number) {
  const { data: member } = await supabase.from('members').select('coins, warnings').eq('user_id', userId).eq('chat_id', chatId).single();
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
  const { data: member } = await supabase.from('members').select('coins, points, level').eq('user_id', userId).eq('chat_id', chatId).single();
  if (!member) return;
  if (member.coins < cost) return tg('sendMessage', { chat_id: chatId, text: `❌ تحتاج ${cost} عملة (لديك ${member.coins})` });
  const newPoints = member.points + amount;
  await supabase.from('members').update({ coins: member.coins - cost, points: newPoints, level: calcLevel(newPoints) }).eq('user_id', userId).eq('chat_id', chatId);
  await tg('sendMessage', { chat_id: chatId, text: `✅ اشتريت ${amount} نقطة مقابل ${cost} عملة 💎` });
}

async function cmdBuyTitle(supabase: any, chatId: number, userId: number, parts: string[]) {
  const title = parts.slice(1).join(' ');
  if (!title) return tg('sendMessage', { chat_id: chatId, text: '❌ استخدم: /buy_title <اللقب>' });
  const { data: member } = await supabase.from('members').select('coins').eq('user_id', userId).eq('chat_id', chatId).single();
  if (!member) return;
  if (member.coins < 500) return tg('sendMessage', { chat_id: chatId, text: `❌ تحتاج 500 عملة (لديك ${member.coins})` });
  await supabase.from('members').update({ coins: member.coins - 500 }).eq('user_id', userId).eq('chat_id', chatId);
  await supabase.from('user_titles').upsert({ chat_id: chatId, user_id: userId, title }, { onConflict: 'chat_id,user_id' });
  await tg('sendMessage', { chat_id: chatId, text: `✅ تم تعيين لقبك: *${title}* 🏷️`, parse_mode: 'Markdown' });
}

async function cmdTitle(supabase: any, chatId: number, msg: any, _parts: string[]) {
  const targetId = msg.reply_to_message ? msg.reply_to_message.from.id : msg.from.id;
  const { data: title } = await supabase.from('user_titles').select('title').eq('user_id', targetId).eq('chat_id', chatId).single();
  if (!title) return tg('sendMessage', { chat_id: chatId, text: '❌ لا يوجد لقب لهذا المستخدم' });
  await tg('sendMessage', { chat_id: chatId, text: `🏷️ اللقب: *${title.title}*`, parse_mode: 'Markdown' });
}

async function cmdMyTitle(supabase: any, chatId: number, userId: number) {
  const { data: title } = await supabase.from('user_titles').select('title').eq('user_id', userId).eq('chat_id', chatId).single();
  if (!title) return tg('sendMessage', { chat_id: chatId, text: '❌ ليس لديك لقب بعد. اشترِ واحداً من /shop' });
  await tg('sendMessage', { chat_id: chatId, text: `🏷️ لقبك: *${title.title}*`, parse_mode: 'Markdown' });
}

// ============ GAMES ============

async function sendQuiz(supabase: any, chatId: number) {
  const { data: questions } = await supabase.from('quiz_questions').select('*');
  if (!questions?.length) return tg('sendMessage', { chat_id: chatId, text: '❌ لا توجد أسئلة' });
  const q = pick(questions);
  const options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
  const keyboard = { inline_keyboard: options.map((opt: string) => [{ text: opt, callback_data: `quiz_${q.id}_${opt}` }]) };
  await tg('sendMessage', {
    chat_id: chatId,
    text: `🧠 *سؤال الكويز*\n\n${q.question}\n\n📁 التصنيف: ${q.category}`,
    parse_mode: 'Markdown', reply_markup: keyboard,
  });
}

async function cmdHack(chatId: number, msg: any, fullName: string) {
  const target = msg.reply_to_message ? `${msg.reply_to_message.from.first_name || ''} ${msg.reply_to_message.from.last_name || ''}`.trim() : fullName;
  await tg('sendMessage', { chat_id: chatId, text: `💻 *جاري اختراق ${target}...*\n\n▓▓▓▓▓▓▓▓▓▓ 100%\n\n✅ تم الاختراق بنجاح!\n\n🔍 النتائج:\n${pick(hackSecrets)}`, parse_mode: 'Markdown' });
}

async function cmdShip(chatId: number, parts: string[]) {
  if (parts.length < 3) return tg('sendMessage', { chat_id: chatId, text: '❌ استخدم: /ship @user1 @user2' });
  const percent = Math.floor(Math.random() * 101);
  let comment = percent > 80 ? '❤️‍🔥 توافق عالي جداً!' : percent > 50 ? '💕 في أمل!' : percent > 20 ? '🤔 صعبة بس مو مستحيلة' : '💔 ما في نصيب...';
  const hearts = '❤️'.repeat(Math.floor(percent / 10)) + '🖤'.repeat(10 - Math.floor(percent / 10));
  await tg('sendMessage', { chat_id: chatId, text: `💘 *نسبة التوافق*\n\n${parts[1]} 💕 ${parts[2]}\n\n${hearts}\n\n📊 النسبة: *${percent}%*\n${comment}`, parse_mode: 'Markdown' });
}

async function cmd8Ball(chatId: number, text: string) {
  const question = text.replace(/\/8ball\s*/i, '').trim();
  if (!question) return tg('sendMessage', { chat_id: chatId, text: '❌ استخدم: /8ball سؤالك' });
  await tg('sendMessage', { chat_id: chatId, text: `🎱 *الكرة السحرية*\n\n❓ ${question}\n\n🔮 ${pick(eightBallAnswers)}`, parse_mode: 'Markdown' });
}

async function cmdRoast(chatId: number, msg: any, fullName: string) {
  const target = msg.reply_to_message ? `${msg.reply_to_message.from.first_name || ''}`.trim() : fullName;
  await tg('sendMessage', { chat_id: chatId, text: `🔥 *هجاية لـ ${target}*\n\n${pick(roasts)}`, parse_mode: 'Markdown' });
}

async function cmdCompliment(chatId: number, msg: any, fullName: string) {
  const target = msg.reply_to_message ? `${msg.reply_to_message.from.first_name || ''}`.trim() : fullName;
  await tg('sendMessage', { chat_id: chatId, text: `💐 *مدح لـ ${target}*\n\n${pick(compliments)}`, parse_mode: 'Markdown' });
}

async function cmdJudgment(supabase: any, chatId: number) {
  const { data: members } = await supabase.from('members').select('full_name, username, user_id').eq('chat_id', chatId);
  if (!members || members.length < 2) return tg('sendMessage', { chat_id: chatId, text: '❌ يجب أن يكون هناك عضوين على الأقل' });
  const shuffled = members.sort(() => Math.random() - 0.5);
  const p1 = shuffled[0], p2 = shuffled[1];
  const questions = ['من الأكثر ذكاءً؟ 🧠', 'من الأجمل؟ 💅', 'من الأطيب قلباً؟ ❤️', 'من الأكثر كسلاً؟ 😴', 'من الأكثر ضحكاً؟ 😂', 'من يأكل أكثر؟ 🍔'];
  const q = pick(questions);
  const n1 = p1.full_name || p1.username, n2 = p2.full_name || p2.username;
  await tg('sendMessage', {
    chat_id: chatId,
    text: `⚖️ *لعبة الأحكام*\n\n${q}\n\n1️⃣ ${n1}\n2️⃣ ${n2}`,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: n1, callback_data: `judge_${n1}` }, { text: n2, callback_data: `judge_${n2}` }]] },
  });
}

async function cmdWhisper(supabase: any, msg: any, chatId: number, userId: number, fullName: string, text: string) {
  if (!msg.reply_to_message) return tg('sendMessage', { chat_id: chatId, text: '❌ رد على رسالة الشخص المراد إرسال الهمسة له' });
  const whisperText = text.replace(/\/whisper\s*/, '').trim();
  if (!whisperText) return tg('sendMessage', { chat_id: chatId, text: '❌ استخدم: /whisper رسالتك (رد على رسالة)' });
  const targetId = msg.reply_to_message.from.id;
  const targetName = `${msg.reply_to_message.from.first_name || ''}`.trim();
  const { data: whisper } = await supabase.from('whispers').insert({
    sender_id: userId, sender_name: fullName, recipient_id: targetId, recipient_name: targetName,
    message: whisperText, chat_id: chatId,
  }).select().single();
  await tg('sendMessage', {
    chat_id: chatId,
    text: `🤫 *همسة سرية*\n\n${fullName} أرسل همسة لـ ${targetName}\n\nفقط ${targetName} يستطيع قراءتها 👇`,
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[{ text: '👀 اقرأ الهمسة', callback_data: `whisper_${whisper.id}` }]] },
  });
}

// ============ ADMIN COMMANDS ============

async function isAdmin(chatId: number, userId: number): Promise<boolean> {
  if (isDeveloper(userId)) return true; // Developer always has admin privileges
  const res = await tg('getChatMember', { chat_id: chatId, user_id: userId });
  return ['creator', 'administrator'].includes(res.result?.status);
}

async function getTarget(msg: any): Promise<{ id: number; name: string } | null> {
  if (msg.reply_to_message) {
    return { id: msg.reply_to_message.from.id, name: `${msg.reply_to_message.from.first_name || ''} ${msg.reply_to_message.from.last_name || ''}`.trim() };
  }
  return null;
}

async function logAdminAction(supabase: any, chatId: number, adminId: number, adminName: string, targetId: number, targetName: string, action: string, reason?: string) {
  await supabase.from('admin_logs').insert({ chat_id: chatId, admin_id: adminId, admin_name: adminName, target_id: targetId, target_name: targetName, action, reason });
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
  await tg('restrictChatMember', {
    chat_id: chatId, user_id: target.id, until_date: Math.floor(Date.now() / 1000) + minutes * 60,
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
  const { data: member } = await supabase.from('members').select('warnings').eq('user_id', target.id).eq('chat_id', chatId).single();
  const newWarnings = (member?.warnings || 0) + 1;
  const { data: settings } = await supabase.from('group_settings').select('max_warnings').eq('chat_id', chatId).single();
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
  await tg('promoteChatMember', { chat_id: chatId, user_id: target.id, can_delete_messages: true, can_restrict_members: true, can_pin_messages: true });
  await logAdminAction(supabase, chatId, userId, fullName, target.id, target.name, 'promote');
  await tg('sendMessage', { chat_id: chatId, text: `👑 تم ترقية ${target.name} لمشرف بواسطة ${fullName}` });
}

async function cmdSettings(supabase: any, chatId: number, userId: number) {
  if (!(await isAdmin(chatId, userId))) return tg('sendMessage', { chat_id: chatId, text: '❌ هذا الأمر للمشرفين فقط' });
  const { data: settings } = await supabase.from('group_settings').select('*').eq('chat_id', chatId).single();
  const s = settings || { links_allowed: false, media_allowed: true, spam_protection: true, welcome_enabled: true, max_warnings: 3 };
  await tg('sendMessage', {
    chat_id: chatId,
    text: `⚙️ *إعدادات المجموعة*\n\nالحد الأقصى للتحذيرات: ${s.max_warnings}`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: `${s.links_allowed ? '✅' : '❌'} السماح بالروابط`, callback_data: `setting_links_${chatId}` }],
        [{ text: `${s.media_allowed ? '✅' : '❌'} السماح بالوسائط`, callback_data: `setting_media_${chatId}` }],
        [{ text: `${s.spam_protection ? '✅' : '❌'} حماية السبام`, callback_data: `setting_spam_${chatId}` }],
        [{ text: `${s.welcome_enabled ? '✅' : '❌'} رسائل الترحيب`, callback_data: `setting_welcome_${chatId}` }],
      ]
    },
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
  await supabase.from('auto_responses').insert({ chat_id: chatId, trigger_word: trigger, response, created_by: fullName });
  await tg('sendMessage', { chat_id: chatId, text: `✅ تم إضافة رد تلقائي:\n\n🔑 الكلمة: ${trigger}\n💬 الرد: ${response}` });
}

async function cmdResponses(supabase: any, chatId: number) {
  const { data: responses } = await supabase.from('auto_responses').select('*').eq('chat_id', chatId);
  if (!responses?.length) return tg('sendMessage', { chat_id: chatId, text: '❌ لا توجد ردود تلقائية' });
  let text = '📝 *الردود التلقائية*\n\n';
  responses.forEach((r: any, i: number) => { text += `${i + 1}. 🔑 ${r.trigger_word} → 💬 ${r.response}\n   ID: \`${r.id}\`\n\n`; });
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
  const mentions = res.result.map((a: any) => `<a href="tg://user?id=${a.user.id}">${a.user.first_name || a.user.username}</a>`).join(' | ');
  await tg('sendMessage', { chat_id: chatId, text: `📢 <b>مناداة المشرفين</b>\n\n${mentions}`, parse_mode: 'HTML' });
}

async function cmdCalc(chatId: number, text: string) {
  const expr = text.replace(/\/calc\s*/, '').trim();
  if (!expr) return tg('sendMessage', { chat_id: chatId, text: '❌ استخدم: /calc تعبير رياضي' });
  try {
    if (!/^[\d\s+\-*/().%]+$/.test(expr)) throw new Error('Invalid');
    const result = Function('"use strict"; return (' + expr + ')')();
    await tg('sendMessage', { chat_id: chatId, text: `🧮 *الآلة الحاسبة*\n\n${expr} = *${result}*`, parse_mode: 'Markdown' });
  } catch {
    await tg('sendMessage', { chat_id: chatId, text: '❌ تعبير غير صالح' });
  }
}

async function cmdDev(supabase: any, chatId: number, userId: number) {
  const { count: membersCount } = await supabase.from('members').select('*', { count: 'exact', head: true });
  const { count: messagesCount } = await supabase.from('messages_log').select('*', { count: 'exact', head: true });
  const { count: groupsCount } = await supabase.from('group_settings').select('*', { count: 'exact', head: true });
  const { data: recentLogs } = await supabase.from('admin_logs').select('*').order('timestamp', { ascending: false }).limit(5);
  let text = `🛠️ *لوحة المطور*\n\n👥 الأعضاء: ${membersCount || 0}\n💬 الرسائل: ${messagesCount || 0}\n📋 المجموعات: ${groupsCount || 0}\n\n`;
  if (recentLogs?.length) {
    text += '📋 *آخر الإجراءات:*\n';
    recentLogs.forEach((l: any) => { text += `• ${l.action}: ${l.target_name} بواسطة ${l.admin_name}\n`; });
  }
  await tg('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown' });
}

async function handleBroadcast(supabase: any, payload: any) {
  const { data: chats } = await supabase.from('members').select('chat_id');
  if (!chats) return;
  const uniqueChats = [...new Set(chats.map((c: any) => c.chat_id))];
  const notificationId = payload.notification_id;
  const type = payload.type || 'text';
  const sentMessages: { chat_id: number; message_id: number }[] = [];

  for (const chatId of uniqueChats) {
    try {
      let result: any;
      switch (type) {
        case 'photo':
          result = await tg('sendPhoto', { chat_id: chatId, photo: payload.photo_url, caption: payload.caption ? `📢 ${payload.caption}` : '📢 إشعار', parse_mode: 'HTML' });
          break;
        case 'video':
          result = await tg('sendVideo', { chat_id: chatId, video: payload.video_url, caption: payload.caption ? `📢 ${payload.caption}` : '📢 إشعار', parse_mode: 'HTML' });
          break;
        case 'file':
          result = await tg('sendDocument', { chat_id: chatId, document: payload.file_url, caption: payload.caption ? `📢 ${payload.caption}` : '📢 ملف', parse_mode: 'HTML' });
          break;
        case 'poll':
          result = await tg('sendPoll', { chat_id: chatId, question: payload.question, options: payload.options, is_anonymous: true });
          break;
        case 'sticker':
          result = await tg('sendSticker', { chat_id: chatId, sticker: payload.sticker_id });
          break;
        default:
          result = await tg('sendMessage', { chat_id: chatId, text: `📢 <b>إشعار هام</b>\n\n${payload.message}`, parse_mode: 'HTML' });
      }
      if (result?.result?.message_id) {
        sentMessages.push({ chat_id: chatId as number, message_id: result.result.message_id });
      }
    } catch (e) { console.error(`Failed to send to ${chatId}:`, e); }
  }
  if (notificationId) {
    await supabase.from('notifications').update({ is_sent: true }).eq('id', notificationId);
    // Store sent message IDs for deletion capability
    for (const sm of sentMessages) {
      await supabase.from('bot_messages').insert({ chat_id: sm.chat_id, message_id: sm.message_id });
    }
  }
}

async function cmdBroadcast(supabase: any, chatId: number, userId: number, text: string) {
  if (!isDeveloper(userId)) return tg('sendMessage', { chat_id: chatId, text: '❌ هذا الأمر للمطور فقط' });
  const msg = text.replace(/\/broadcast\s*/, '').trim();
  if (!msg) return tg('sendMessage', { chat_id: chatId, text: '❌ استخدم: /broadcast <الرسالة>' });
  const { data: notif } = await supabase.from('notifications').insert({ message: msg, created_by: userId, is_sent: false }).select().single();
  await handleBroadcast(supabase, { type: 'text', message: msg, notification_id: notif?.id });
  await tg('sendMessage', { chat_id: chatId, text: '✅ تم إرسال الإشعار لجميع المجموعات' });
}

async function cmdAddCoins(supabase: any, chatId: number, userId: number, msg: any, parts: string[]) {
  if (!isDeveloper(userId)) return tg('sendMessage', { chat_id: chatId, text: '❌ هذا الأمر للمطور فقط' });
  const target = await getTarget(msg);
  if (!target) return tg('sendMessage', { chat_id: chatId, text: '❌ رد على رسالة العضو' });
  const amount = parseInt(parts[1]);
  if (isNaN(amount)) return tg('sendMessage', { chat_id: chatId, text: '❌ استخدم: /addcoins <عدد>' });
  const { data: member } = await supabase.from('members').select('coins').eq('user_id', target.id).eq('chat_id', chatId).single();
  if (!member) return tg('sendMessage', { chat_id: chatId, text: '❌ العضو غير موجود' });
  await supabase.from('members').update({ coins: member.coins + amount }).eq('user_id', target.id).eq('chat_id', chatId);
  await tg('sendMessage', { chat_id: chatId, text: `✅ تم إضافة ${amount} عملة لـ ${target.name}` });
}

async function cmdAddPoints(supabase: any, chatId: number, userId: number, msg: any, parts: string[]) {
  if (!isDeveloper(userId)) return tg('sendMessage', { chat_id: chatId, text: '❌ هذا الأمر للمطور فقط' });
  const target = await getTarget(msg);
  if (!target) return tg('sendMessage', { chat_id: chatId, text: '❌ رد على رسالة العضو' });
  const amount = parseInt(parts[1]);
  if (isNaN(amount)) return tg('sendMessage', { chat_id: chatId, text: '❌ استخدم: /addpoints <عدد>' });
  const { data: member } = await supabase.from('members').select('points, level').eq('user_id', target.id).eq('chat_id', chatId).single();
  if (!member) return tg('sendMessage', { chat_id: chatId, text: '❌ العضو غير موجود' });
  const newPoints = member.points + amount;
  await supabase.from('members').update({ points: newPoints, level: calcLevel(newPoints) }).eq('user_id', target.id).eq('chat_id', chatId);
  await tg('sendMessage', { chat_id: chatId, text: `✅ تم إضافة ${amount} نقطة لـ ${target.name}` });
}

async function cmdResetWarns(supabase: any, chatId: number, userId: number, msg: any) {
  if (!isDeveloper(userId)) return tg('sendMessage', { chat_id: chatId, text: '❌ هذا الأمر للمطور فقط' });
  const target = await getTarget(msg);
  if (!target) return tg('sendMessage', { chat_id: chatId, text: '❌ رد على رسالة العضو' });
  await supabase.from('members').update({ warnings: 0 }).eq('user_id', target.id).eq('chat_id', chatId);
  await tg('sendMessage', { chat_id: chatId, text: `✅ تم إزالة جميع تحذيرات ${target.name}` });
}

async function cmdCallAll(supabase: any, chatId: number, userId: number) {
  if (!(await isAdmin(chatId, userId))) return tg('sendMessage', { chat_id: chatId, text: '❌ هذا الأمر للمشرفين فقط' });
  const { data: members } = await supabase.from('members').select('full_name, username, user_id').eq('chat_id', chatId);
  if (!members?.length) return tg('sendMessage', { chat_id: chatId, text: '❌ لا يوجد أعضاء' });
  
  // Build mention text using tg://user?id= links for ALL members (works even if offline/no username)
  const mentions = members.map((m: any) => `<a href="tg://user?id=${m.user_id}">${m.full_name || m.username || m.user_id}</a>`);
  
  // Split into chunks of 5 members per message to avoid Telegram limits
  const chunks: string[][] = [];
  for (let i = 0; i < mentions.length; i += 5) {
    chunks.push(mentions.slice(i, i + 5));
  }
  
  await tg('sendMessage', { chat_id: chatId, text: `📢 <b>مناداة جميع الأعضاء (${members.length} عضو)</b>`, parse_mode: 'HTML' });
  
  for (const chunk of chunks) {
    await tg('sendMessage', { chat_id: chatId, text: `📢 ${chunk.join(' | ')}`, parse_mode: 'HTML' });
    // Small delay between batches to avoid rate limiting
    if (chunks.length > 5) await new Promise(r => setTimeout(r, 500));
  }
}

async function cmdPin(chatId: number, userId: number, msg: any) {
  if (!(await isAdmin(chatId, userId))) return tg('sendMessage', { chat_id: chatId, text: '❌ هذا الأمر للمشرفين فقط' });
  if (!msg.reply_to_message) return tg('sendMessage', { chat_id: chatId, text: '❌ رد على الرسالة المراد تثبيتها' });
  await tg('pinChatMessage', { chat_id: chatId, message_id: msg.reply_to_message.message_id });
  await tg('sendMessage', { chat_id: chatId, text: '📌 تم تثبيت الرسالة' });
}

async function cmdUnpin(chatId: number, userId: number, msg: any) {
  if (!(await isAdmin(chatId, userId))) return tg('sendMessage', { chat_id: chatId, text: '❌ هذا الأمر للمشرفين فقط' });
  if (msg.reply_to_message) await tg('unpinChatMessage', { chat_id: chatId, message_id: msg.reply_to_message.message_id });
  else await tg('unpinAllChatMessages', { chat_id: chatId });
  await tg('sendMessage', { chat_id: chatId, text: '📌 تم إلغاء تثبيت الرسالة' });
}

async function cmdId(chatId: number, msg: any) {
  const target = msg.reply_to_message?.from || msg.from;
  const name = `${target.first_name || ''} ${target.last_name || ''}`.trim();
  await tg('sendMessage', { chat_id: chatId, text: `🆔 *معلومات المعرف*\n\n👤 الاسم: ${name}\n🆔 المعرف: \`${target.id}\`\n📛 اليوزر: ${target.username ? '@' + target.username : 'لا يوجد'}\n💬 المحادثة: \`${chatId}\``, parse_mode: 'Markdown' });
}

async function cmdInfo(supabase: any, chatId: number, msg: any) {
  const target = msg.reply_to_message?.from || msg.from;
  const targetId = target.id;
  const name = `${target.first_name || ''} ${target.last_name || ''}`.trim();
  const { data: member } = await supabase.from('members').select('*').eq('user_id', targetId).eq('chat_id', chatId).single();
  const { data: title } = await supabase.from('user_titles').select('title').eq('user_id', targetId).eq('chat_id', chatId).single();
  const { data: achievementsCount } = await supabase.from('member_achievements').select('*', { count: 'exact', head: true }).eq('user_id', targetId).eq('chat_id', chatId);

  let text = `ℹ️ *معلومات ${name}*\n\n🆔 المعرف: \`${targetId}\`\n📛 اليوزر: ${target.username ? '@' + target.username : 'لا يوجد'}`;
  if (title) text += `\n🏷️ اللقب: ${title.title}`;
  if (member) {
    text += `\n\n⭐ المستوى: ${member.level}\n💎 النقاط: ${member.points}\n💰 العملات: ${member.coins}`;
    text += `\n💬 الرسائل: ${member.messages_count}\n⚠️ التحذيرات: ${member.warnings}`;
    text += `\n⭐ السمعة: ${member.reputation || 0}\n🔥 سلسلة يومية: ${member.daily_streak || 0}`;
    text += `\n📅 تاريخ الانضمام: ${new Date(member.join_date).toLocaleDateString('ar-EG')}`;
  }
  if (isSuspiciousAccount(target)) text += `\n\n⚠️ *حساب مشبوه* (بدون يوزرنيم أو اسم قصير)`;
  await tg('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown' });
}

async function cmdRules(supabase: any, chatId: number) {
  const { data: settings } = await supabase.from('group_settings').select('rules').eq('chat_id', chatId).single();
  const rules = settings?.rules || 'لم يتم تعيين قوانين بعد. استخدم /setrules لتعيين القوانين.';
  await tg('sendMessage', { chat_id: chatId, text: `📜 *قوانين المجموعة*\n\n${rules}`, parse_mode: 'Markdown' });
}

async function cmdSetRules(supabase: any, chatId: number, userId: number, text: string) {
  if (!(await isAdmin(chatId, userId))) return tg('sendMessage', { chat_id: chatId, text: '❌ هذا الأمر للمشرفين فقط' });
  const rules = text.replace(/\/setrules\s*/, '').trim();
  if (!rules) return tg('sendMessage', { chat_id: chatId, text: '❌ استخدم: /setrules القوانين' });
  await supabase.from('group_settings').update({ rules }).eq('chat_id', chatId);
  await tg('sendMessage', { chat_id: chatId, text: '✅ تم تحديث القوانين' });
}

async function cmdDemote(supabase: any, msg: any, chatId: number, userId: number, fullName: string) {
  if (!(await isAdmin(chatId, userId))) return tg('sendMessage', { chat_id: chatId, text: '❌ هذا الأمر للمشرفين فقط' });
  const target = await getTarget(msg);
  if (!target) return tg('sendMessage', { chat_id: chatId, text: '❌ رد على رسالة العضو' });
  await tg('promoteChatMember', {
    chat_id: chatId, user_id: target.id,
    can_manage_chat: false, can_delete_messages: false, can_restrict_members: false,
    can_promote_members: false, can_change_info: false, can_invite_users: false,
    can_pin_messages: false, can_manage_video_chats: false,
  });
  await logAdminAction(supabase, chatId, userId, fullName, target.id, target.name, 'demote');
  await tg('sendMessage', { chat_id: chatId, text: `📉 تم تخفيض ${target.name} بواسطة ${fullName}` });
}

async function cmdUnban(supabase: any, msg: any, chatId: number, userId: number, fullName: string) {
  if (!(await isAdmin(chatId, userId))) return tg('sendMessage', { chat_id: chatId, text: '❌ هذا الأمر للمشرفين فقط' });
  const target = await getTarget(msg);
  if (!target) return tg('sendMessage', { chat_id: chatId, text: '❌ رد على رسالة العضو' });
  await tg('unbanChatMember', { chat_id: chatId, user_id: target.id, only_if_banned: true });
  await logAdminAction(supabase, chatId, userId, fullName, target.id, target.name, 'unban');
  await tg('sendMessage', { chat_id: chatId, text: `✅ تم فك الحظر عن ${target.name} بواسطة ${fullName}` });
}

async function cmdHelp(chatId: number) {
  const text = `📋 *جميع أوامر شادي*\n\n` +
    `*💰 اقتصاد:*\n/daily - مكافأة يومية\n/wallet - محفظتك\n/gift - إهداء عملات\n/shop - المتجر القديم\n/stats - إحصائياتك\n/top - الترتيب\n/gamble - قمار\n\n` +
    `*🏪 المتجر والدفع:*\n/store - عرض المنتجات\n/buy <رقم> - شراء بالعملات\n/pay <رقم> - شراء بالمال\n/confirm - تأكيد الدفع\n/my - حسابك ومشترياتك\n\n` +
    `*🔍 البحث:*\n/search <سؤال> - بحث ويب\n/youtube <موضوع> - بحث يوتيوب\n/book <كتاب> - بحث كتب وملخصات\n\n` +
    `*🎮 ألعاب:*\n/quiz - كويز\n/hack - اختراق وهمي\n/ship - توافق\n/8ball - كرة سحرية\n/fortune - حظك\n/joke - نكتة\n/roast - هجاية\n/compliment - مدح\n/wisdom - حكمة\n/judgment - أحكام\n/dice - نرد\n/coinflip - عملة\n/challenge - تحدي\n/steal - سرقة\n/marry - زواج\n\n` +
    `*👤 ملف شخصي:*\n/profile - بروفايل كامل\n/achievements - إنجازاتك\n/rep +/- - تقييم سمعة\n/afk - وضع غير متاح\n/leaderboard - لوحة الصدارة\n\n` +
    `*🗳️ تفاعل:*\n/poll - استطلاع\n/lottery - يانصيب\n/remind - تذكير\n/translate - ترجمة\n/summary - ملخص\n/whisper - همسة\n\n` +
    `*🛠️ إدارة:*\n/ban /unban /kick /mute /unmute\n/warn /promote /demote\n/pin /unpin /call /tagall\n/settings /rules /setrules\n/addresponse /responses /delresponse\n/report /slowmode /antiraid\n/linkdashboard - ربط لوحة التحكم`;
  await tg('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown' });
}

async function cmdReport(chatId: number, userId: number, msg: any, fullName: string) {
  if (!msg.reply_to_message) return tg('sendMessage', { chat_id: chatId, text: '❌ رد على رسالة الشخص المراد الإبلاغ عنه' });
  const targetName = `${msg.reply_to_message.from.first_name || ''}`.trim();
  const res = await tg('getChatAdministrators', { chat_id: chatId });
  if (!res.result) return;
  const adminMentions = res.result.map((a: any) => a.user.username ? `@${a.user.username}` : `[${a.user.first_name}](tg://user?id=${a.user.id})`).join(' ');
  await tg('sendMessage', {
    chat_id: chatId,
    text: `🚨 *بلاغ جديد*\n\n👤 المُبلّغ: ${fullName}\n🎯 المُبلّغ عنه: ${targetName}\n\n📢 المشرفين: ${adminMentions}`,
    parse_mode: 'Markdown', reply_to_message_id: msg.reply_to_message.message_id,
  });
}

async function cmdDice(chatId: number) {
  const dice1 = Math.floor(Math.random() * 6) + 1;
  const dice2 = Math.floor(Math.random() * 6) + 1;
  const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  await tg('sendMessage', { chat_id: chatId, text: `🎲 *رمي النرد*\n\n${diceEmojis[dice1-1]} ${diceEmojis[dice2-1]}\n\nالنتيجة: *${dice1 + dice2}* (${dice1} + ${dice2})`, parse_mode: 'Markdown' });
}

async function cmdCoinFlip(chatId: number) {
  const result = Math.random() < 0.5;
  await tg('sendMessage', { chat_id: chatId, text: `🪙 *رمي العملة*\n\n${result ? '🟡 طرة (رأس)' : '⚪ نقش (كتابة)'}`, parse_mode: 'Markdown' });
}

// ============ NEW FEATURE COMMANDS ============

// FEATURE 4: AFK System
async function cmdAfk(supabase: any, chatId: number, userId: number, fullName: string, text: string) {
  const reason = text.replace(/\/afk\s*/, '').trim() || 'بدون سبب';
  await supabase.from('afk_status').upsert({ user_id: userId, chat_id: chatId, reason, since: new Date().toISOString() }, { onConflict: 'user_id,chat_id' });
  await tg('sendMessage', { chat_id: chatId, text: `💤 ${fullName} الآن غير متاح\n📝 السبب: ${reason}` });
}

// FEATURE 5: Reputation System
async function cmdRep(supabase: any, chatId: number, userId: number, msg: any, parts: string[]) {
  if (!msg.reply_to_message) return tg('sendMessage', { chat_id: chatId, text: '❌ رد على رسالة الشخص لتقييمه' });
  const targetId = msg.reply_to_message.from.id;
  if (targetId === userId) return tg('sendMessage', { chat_id: chatId, text: '❌ لا يمكنك تقييم نفسك!' });
  const value = parts[1] === '-' ? -1 : 1;
  const targetName = `${msg.reply_to_message.from.first_name || ''}`.trim();

  const { data: existing } = await supabase.from('member_reputation')
    .select('id, value').eq('chat_id', chatId).eq('from_user_id', userId).eq('to_user_id', targetId).single();

  if (existing) {
    if (existing.value === value) return tg('sendMessage', { chat_id: chatId, text: '❌ لقد قيّمت هذا الشخص بالفعل بنفس التقييم' });
    await supabase.from('member_reputation').update({ value }).eq('id', existing.id);
    // Update member reputation: remove old, add new
    const diff = value - existing.value;
    const { data: member } = await supabase.from('members').select('reputation').eq('user_id', targetId).eq('chat_id', chatId).single();
    if (member) await supabase.from('members').update({ reputation: (member.reputation || 0) + diff }).eq('user_id', targetId).eq('chat_id', chatId);
  } else {
    await supabase.from('member_reputation').insert({ chat_id: chatId, from_user_id: userId, to_user_id: targetId, value });
    const { data: member } = await supabase.from('members').select('reputation').eq('user_id', targetId).eq('chat_id', chatId).single();
    if (member) await supabase.from('members').update({ reputation: (member.reputation || 0) + value }).eq('user_id', targetId).eq('chat_id', chatId);
  }

  await tg('sendMessage', { chat_id: chatId, text: `${value === 1 ? '👍' : '👎'} تم تقييم ${targetName} ${value === 1 ? 'إيجابياً' : 'سلبياً'}` });
}

// FEATURE 6: Achievements Display
async function cmdAchievements(supabase: any, chatId: number, userId: number) {
  const { data: unlocked } = await supabase.from('member_achievements')
    .select('achievement_id, achievements(name, icon, description)').eq('user_id', userId).eq('chat_id', chatId);
  const { data: allAchievements } = await supabase.from('achievements').select('*');

  let text = '🏅 *إنجازاتك*\n\n';
  if (allAchievements) {
    const unlockedIds = new Set((unlocked || []).map((u: any) => u.achievement_id));
    allAchievements.forEach((a: any) => {
      const status = unlockedIds.has(a.id) ? '✅' : '🔒';
      text += `${status} ${a.icon} *${a.name}*\n   ${a.description}\n\n`;
    });
  }
  const count = unlocked?.length || 0;
  const total = allAchievements?.length || 0;
  text += `\n📊 التقدم: ${count}/${total} إنجاز`;
  await tg('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown' });
}

// FEATURE 7: Full Profile
async function cmdProfile(supabase: any, chatId: number, userId: number, msg: any) {
  const targetId = msg.reply_to_message ? msg.reply_to_message.from.id : userId;
  const { data: member } = await supabase.from('members').select('*').eq('user_id', targetId).eq('chat_id', chatId).single();
  if (!member) return tg('sendMessage', { chat_id: chatId, text: '❌ لم يتم العثور على بيانات' });

  const { data: title } = await supabase.from('user_titles').select('title').eq('user_id', targetId).eq('chat_id', chatId).single();
  const { data: achievements } = await supabase.from('member_achievements').select('*', { count: 'exact', head: true }).eq('user_id', targetId).eq('chat_id', chatId);
  const { data: allAch } = await supabase.from('achievements').select('*', { count: 'exact', head: true });

  const nextLevel = member.level + 1;
  const currentLevelPoints = pointsForLevel(member.level);
  const nextLevelPoints = pointsForLevel(nextLevel);
  const progress = Math.min(100, Math.floor(((member.points - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100));
  const progressBar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));

  let text = `👤 *بروفايل ${member.full_name || member.username}*\n`;
  if (title) text += `🏷️ ${title.title}\n`;
  text += `\n⭐ المستوى: ${member.level}  [${progressBar}] ${progress}%\n`;
  text += `💎 النقاط: ${member.points} | 💰 العملات: ${member.coins}\n`;
  text += `💬 الرسائل: ${member.messages_count} | ⭐ السمعة: ${member.reputation || 0}\n`;
  text += `🔥 سلسلة يومية: ${member.daily_streak || 0} يوم\n`;
  text += `⚠️ التحذيرات: ${member.warnings}\n`;
  text += `🧠 إجابات صحيحة: ${member.quiz_correct || 0}\n`;
  text += `🎁 إجمالي الهدايا: ${member.total_gifted || 0} عملة\n`;
  text += `📅 عضو منذ: ${new Date(member.join_date).toLocaleDateString('ar-EG')}`;
  await tg('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown' });
}

// FEATURE 8: Reminders
async function cmdRemind(supabase: any, chatId: number, userId: number, text: string) {
  const content = text.replace(/\/remind\s*/, '').trim();
  const match = content.match(/^(\d+)\s+(.+)$/);
  if (!match) return tg('sendMessage', { chat_id: chatId, text: '❌ استخدم: /remind <دقائق> <الرسالة>' });
  const minutes = parseInt(match[1]);
  const message = match[2];
  if (minutes > 1440) return tg('sendMessage', { chat_id: chatId, text: '❌ الحد الأقصى 24 ساعة (1440 دقيقة)' });

  const remindAt = new Date(Date.now() + minutes * 60000).toISOString();
  await supabase.from('reminders').insert({ user_id: userId, chat_id: chatId, message, remind_at: remindAt });
  await tg('sendMessage', { chat_id: chatId, text: `⏰ تم تعيين تذكير بعد ${minutes} دقيقة\n📝 ${message}` });
}

// FEATURE 9: Polls
async function cmdPoll(supabase: any, chatId: number, userId: number, text: string) {
  const content = text.replace(/\/poll\s*/, '').trim();
  const parts = content.split('|').map(s => s.trim()).filter(Boolean);
  if (parts.length < 3) return tg('sendMessage', { chat_id: chatId, text: '❌ استخدم: /poll سؤال | خيار1 | خيار2 | ...' });

  const question = parts[0];
  const options = parts.slice(1);

  const { data: poll } = await supabase.from('polls').insert({ chat_id: chatId, question, options: JSON.stringify(options), created_by: userId }).select().single();

  const keyboard = {
    inline_keyboard: options.map((opt: string, i: number) => [{ text: `${opt} (0)`, callback_data: `poll_${poll.id}_${i}` }])
  };
  keyboard.inline_keyboard.push([{ text: '📊 النتائج', callback_data: `pollresult_${poll.id}` }]);

  await tg('sendMessage', {
    chat_id: chatId,
    text: `🗳️ *استطلاع رأي*\n\n❓ ${question}`,
    parse_mode: 'Markdown', reply_markup: keyboard,
  });
}

async function cmdEndPoll(supabase: any, chatId: number, userId: number, parts: string[]) {
  if (!(await isAdmin(chatId, userId))) return tg('sendMessage', { chat_id: chatId, text: '❌ هذا الأمر للمشرفين فقط' });
  if (!parts[1]) return tg('sendMessage', { chat_id: chatId, text: '❌ استخدم: /endpoll <id>' });
  await supabase.from('polls').update({ is_active: false }).eq('id', parts[1]).eq('chat_id', chatId);
  await tg('sendMessage', { chat_id: chatId, text: '✅ تم إغلاق الاستطلاع' });
}

// FEATURE 10: Lottery
async function cmdLottery(supabase: any, chatId: number, userId: number) {
  const { data: member } = await supabase.from('members').select('coins').eq('user_id', userId).eq('chat_id', chatId).single();
  if (!member || member.coins < 50) return tg('sendMessage', { chat_id: chatId, text: '❌ تحتاج 50 عملة لشراء تذكرة يانصيب' });

  const roundId = new Date().toISOString().split('T')[0]; // Daily round
  const { data: existing } = await supabase.from('lottery_entries').select('id').eq('chat_id', chatId).eq('user_id', userId).eq('round_id', roundId).single();
  if (existing) return tg('sendMessage', { chat_id: chatId, text: '❌ لقد اشتركت بالفعل في يانصيب اليوم' });

  await supabase.from('members').update({ coins: member.coins - 50 }).eq('user_id', userId).eq('chat_id', chatId);
  await supabase.from('lottery_entries').insert({ chat_id: chatId, user_id: userId, round_id: roundId });

  const { data: entries } = await supabase.from('lottery_entries').select('*', { count: 'exact', head: true }).eq('chat_id', chatId).eq('round_id', roundId);
  await tg('sendMessage', { chat_id: chatId, text: `🎰 تم شراء تذكرة يانصيب! 🎟️\n\n💰 الجائزة الحالية: ${(entries || 0) * 50} عملة\n📢 استخدم /draw لسحب الفائز (مشرفين فقط)` });
}

async function cmdDraw(supabase: any, chatId: number, userId: number) {
  if (!(await isAdmin(chatId, userId))) return tg('sendMessage', { chat_id: chatId, text: '❌ هذا الأمر للمشرفين فقط' });
  const roundId = new Date().toISOString().split('T')[0];
  const { data: entries } = await supabase.from('lottery_entries').select('user_id').eq('chat_id', chatId).eq('round_id', roundId);
  if (!entries?.length) return tg('sendMessage', { chat_id: chatId, text: '❌ لا يوجد مشتركين في اليانصيب' });

  const winnerId = pick(entries).user_id;
  const prize = entries.length * 50;
  const { data: winner } = await supabase.from('members').select('full_name, username, coins').eq('user_id', winnerId).eq('chat_id', chatId).single();
  if (winner) await supabase.from('members').update({ coins: winner.coins + prize }).eq('user_id', winnerId).eq('chat_id', chatId);

  // Clean up entries
  await supabase.from('lottery_entries').delete().eq('chat_id', chatId).eq('round_id', roundId);

  await tg('sendMessage', {
    chat_id: chatId,
    text: `🎰 *سحب اليانصيب!*\n\n🎉 الفائز: *${winner?.full_name || winner?.username}*\n💰 الجائزة: *${prize}* عملة!\n\n👥 عدد المشتركين: ${entries.length}`,
    parse_mode: 'Markdown',
  });
}

// FEATURE 11: AI Translation
async function cmdTranslate(chatId: number, msg: any) {
  if (!msg.reply_to_message?.text) return tg('sendMessage', { chat_id: chatId, text: '❌ رد على الرسالة المراد ترجمتها' });
  const textToTranslate = msg.reply_to_message.text;

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) return tg('sendMessage', { chat_id: chatId, text: '❌ الترجمة غير متاحة حالياً' });

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-lite',
      messages: [
        { role: 'system', content: 'أنت مترجم. إذا كان النص بالعربية ترجمه للإنجليزية والعكس. أعطِ الترجمة فقط بدون شرح.' },
        { role: 'user', content: textToTranslate }
      ],
    }),
  });
  if (!res.ok) return tg('sendMessage', { chat_id: chatId, text: '❌ فشل الترجمة' });
  const data = await res.json();
  const translation = data.choices?.[0]?.message?.content;
  if (translation) await tg('sendMessage', { chat_id: chatId, text: `🌐 *الترجمة*\n\n${translation}`, parse_mode: 'Markdown', reply_to_message_id: msg.reply_to_message.message_id });
}

// FEATURE 12: AI Summary
async function cmdSummary(supabase: any, chatId: number, userId: number) {
  if (!(await isAdmin(chatId, userId))) return tg('sendMessage', { chat_id: chatId, text: '❌ هذا الأمر للمشرفين فقط' });

  const { data: messages } = await supabase.from('messages_log')
    .select('user_name, message_preview').eq('chat_id', chatId).order('timestamp', { ascending: false }).limit(50);
  if (!messages?.length) return tg('sendMessage', { chat_id: chatId, text: '❌ لا توجد رسائل كافية' });

  const context = messages.map((m: any) => `${m.user_name}: ${m.message_preview}`).join('\n');
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) return tg('sendMessage', { chat_id: chatId, text: '❌ الملخص غير متاح' });

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-lite',
      messages: [
        { role: 'system', content: 'لخص هذه المحادثة في 5-7 نقاط رئيسية بالعربية. ركز على المواضيع المهمة والقرارات.' },
        { role: 'user', content: context }
      ],
    }),
  });
  if (!res.ok) return tg('sendMessage', { chat_id: chatId, text: '❌ فشل إنشاء الملخص' });
  const data = await res.json();
  const summary = data.choices?.[0]?.message?.content;
  if (summary) await tg('sendMessage', { chat_id: chatId, text: `📝 *ملخص آخر 50 رسالة*\n\n${summary}`, parse_mode: 'Markdown' });
}

// FEATURE 13: Challenges
async function cmdChallenge(supabase: any, chatId: number, userId: number, fullName: string, msg: any, parts: string[]) {
  if (!msg.reply_to_message) return tg('sendMessage', { chat_id: chatId, text: '❌ رد على رسالة الشخص لتحديه' });
  const targetId = msg.reply_to_message.from.id;
  if (targetId === userId) return tg('sendMessage', { chat_id: chatId, text: '❌ لا يمكنك تحدي نفسك!' });
  const bet = parseInt(parts[1]) || 50;
  if (bet < 10) return tg('sendMessage', { chat_id: chatId, text: '❌ الحد الأدنى للرهان 10 عملات' });

  const { data: challenger } = await supabase.from('members').select('coins').eq('user_id', userId).eq('chat_id', chatId).single();
  if (!challenger || challenger.coins < bet) return tg('sendMessage', { chat_id: chatId, text: '❌ رصيدك غير كافي' });

  const targetName = `${msg.reply_to_message.from.first_name || ''}`.trim();
  await tg('sendMessage', {
    chat_id: chatId,
    text: `⚔️ *تحدي!*\n\n${fullName} يتحدى ${targetName}\n💰 الرهان: ${bet} عملة\n\nيا ${targetName}، اقبل التحدي؟`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: '✅ أقبل', callback_data: `challenge_accept_${userId}_${targetId}_${bet}` },
        { text: '❌ أرفض', callback_data: `challenge_reject_${userId}_${targetId}` },
      ]]
    },
  });
}

async function cmdAccept(_supabase: any, chatId: number, _userId: number, _fullName: string, _msg: any) {
  await tg('sendMessage', { chat_id: chatId, text: '💡 استخدم أزرار التحدي للقبول أو الرفض' });
}

// FEATURE 14: Leaderboard (multi-category)
async function cmdLeaderboard(supabase: any, chatId: number) {
  await tg('sendMessage', {
    chat_id: chatId,
    text: '🏆 *لوحة الصدارة*\n\nاختر الفئة:',
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '💎 النقاط', callback_data: 'lb_points' }, { text: '💰 العملات', callback_data: 'lb_coins' }],
        [{ text: '💬 الرسائل', callback_data: 'lb_messages' }, { text: '⭐ السمعة', callback_data: 'lb_reputation' }],
        [{ text: '🔥 السلسلة', callback_data: 'lb_streak' }, { text: '⭐ المستوى', callback_data: 'lb_level' }],
      ]
    },
  });
}

// FEATURE 15: Link Dashboard
async function cmdLinkDashboard(supabase: any, chatId: number, userId: number, msg: any) {
  if (!(await isAdmin(chatId, userId)) && !isDeveloper(userId)) return tg('sendMessage', { chat_id: chatId, text: '❌ هذا الأمر للمشرفين فقط' });

  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const chatTitle = msg.chat.title || 'مجموعة';

  await supabase.from('dashboard_links').insert({ code, chat_id: chatId, chat_title: chatTitle });

  await tg('sendMessage', {
    chat_id: chatId,
    text: `🔗 *ربط لوحة التحكم*\n\nرمز الربط: \`${code}\`\n\n1. افتح لوحة التحكم\n2. سجل حساب جديد\n3. أدخل هذا الرمز\n\n⏰ الرمز صالح لاستخدام واحد فقط`,
    parse_mode: 'Markdown',
  });
}

// FEATURE 16: Anti-Raid
async function cmdAntiRaid(supabase: any, chatId: number, userId: number, parts: string[]) {
  if (!(await isAdmin(chatId, userId))) return tg('sendMessage', { chat_id: chatId, text: '❌ هذا الأمر للمشرفين فقط' });
  const action = parts[1] || 'on';
  if (action === 'on') {
    // Lock group - only admins can send
    await tg('setChatPermissions', {
      chat_id: chatId,
      permissions: { can_send_messages: false, can_send_media_messages: false, can_send_other_messages: false, can_add_web_page_previews: false },
    });
    await tg('sendMessage', { chat_id: chatId, text: '🛡️ *وضع مكافحة الغارة مفعّل!*\n\nتم قفل المجموعة. فقط المشرفين يمكنهم الإرسال.\n\nاستخدم /antiraid off لإلغاء القفل.', parse_mode: 'Markdown' });
  } else {
    await tg('setChatPermissions', {
      chat_id: chatId,
      permissions: { can_send_messages: true, can_send_media_messages: true, can_send_other_messages: true, can_add_web_page_previews: true },
    });
    await tg('sendMessage', { chat_id: chatId, text: '✅ تم إلغاء وضع مكافحة الغارة. المجموعة مفتوحة.' });
  }
}

// FEATURE 17: Slow Mode
async function cmdSlowMode(chatId: number, userId: number, parts: string[]) {
  if (!(await isAdmin(chatId, userId))) return tg('sendMessage', { chat_id: chatId, text: '❌ هذا الأمر للمشرفين فقط' });
  const seconds = parseInt(parts[1]) || 0;
  await tg('setChatSlowModeDelay', { chat_id: chatId, slow_mode_delay: seconds });
  await tg('sendMessage', { chat_id: chatId, text: seconds > 0 ? `🐌 تم تفعيل الوضع البطيء: ${seconds} ثانية بين كل رسالة` : '🚀 تم إلغاء الوضع البطيء' });
}

// FEATURE 18: Gambling
async function cmdGamble(supabase: any, chatId: number, userId: number, parts: string[]) {
  const amount = parseInt(parts[1]);
  if (isNaN(amount) || amount < 10) return tg('sendMessage', { chat_id: chatId, text: '❌ استخدم: /gamble <مبلغ> (الحد الأدنى 10)' });

  const { data: member } = await supabase.from('members').select('coins').eq('user_id', userId).eq('chat_id', chatId).single();
  if (!member || member.coins < amount) return tg('sendMessage', { chat_id: chatId, text: '❌ رصيدك غير كافي' });

  const roll = Math.random();
  let multiplier = 0;
  let result = '';

  if (roll < 0.4) { multiplier = 0; result = '💀 خسرت كل شيء!'; }
  else if (roll < 0.7) { multiplier = 1.5; result = '🎉 ربحت x1.5!'; }
  else if (roll < 0.9) { multiplier = 2; result = '🔥 ربحت x2!'; }
  else if (roll < 0.97) { multiplier = 3; result = '💎 جاكبوت صغير x3!'; }
  else { multiplier = 5; result = '👑 جاكبوت كبير x5!!'; }

  const winnings = Math.floor(amount * multiplier);
  const newCoins = member.coins - amount + winnings;
  await supabase.from('members').update({ coins: newCoins }).eq('user_id', userId).eq('chat_id', chatId);

  const change = winnings - amount;
  await tg('sendMessage', {
    chat_id: chatId,
    text: `🎰 *القمار*\n\n💰 الرهان: ${amount} عملة\n\n${result}\n\n${change >= 0 ? `✅ ربحت: +${change}` : `❌ خسرت: ${change}`} عملة\n💰 رصيدك: ${newCoins} عملة`,
    parse_mode: 'Markdown',
  });
}

// FEATURE 19: Steal Coins
async function cmdSteal(supabase: any, chatId: number, userId: number, fullName: string, msg: any) {
  if (!msg.reply_to_message) return tg('sendMessage', { chat_id: chatId, text: '❌ رد على رسالة الشخص لسرقته' });
  const targetId = msg.reply_to_message.from.id;
  if (targetId === userId) return tg('sendMessage', { chat_id: chatId, text: '❌ لا يمكنك سرقة نفسك!' });

  const targetName = `${msg.reply_to_message.from.first_name || ''}`.trim();
  const { data: target } = await supabase.from('members').select('coins').eq('user_id', targetId).eq('chat_id', chatId).single();
  const { data: thief } = await supabase.from('members').select('coins').eq('user_id', userId).eq('chat_id', chatId).single();
  if (!target || !thief) return;

  const success = Math.random() < 0.35; // 35% success
  if (success) {
    const stolen = Math.min(Math.floor(Math.random() * 50) + 10, target.coins);
    if (stolen <= 0) return tg('sendMessage', { chat_id: chatId, text: `❌ ${targetName} مفلس! ما في شي تسرقه 😂` });
    await supabase.from('members').update({ coins: target.coins - stolen }).eq('user_id', targetId).eq('chat_id', chatId);
    await supabase.from('members').update({ coins: thief.coins + stolen }).eq('user_id', userId).eq('chat_id', chatId);
    await tg('sendMessage', { chat_id: chatId, text: `🕵️ ${fullName} سرق *${stolen}* عملة من ${targetName}! 💰`, parse_mode: 'Markdown' });
  } else {
    const fine = Math.min(Math.floor(Math.random() * 30) + 5, thief.coins);
    await supabase.from('members').update({ coins: thief.coins - fine }).eq('user_id', userId).eq('chat_id', chatId);
    await tg('sendMessage', { chat_id: chatId, text: `🚔 ${fullName} حاول يسرق ${targetName} وانمسك!\n💸 غرامة: ${fine} عملة`, parse_mode: 'Markdown' });
  }
}

// FEATURE 20: Fun Marriage
async function cmdMarry(chatId: number, msg: any, fullName: string) {
  if (!msg.reply_to_message) return tg('sendMessage', { chat_id: chatId, text: '❌ رد على رسالة الشخص لطلب الزواج' });
  const targetName = `${msg.reply_to_message.from.first_name || ''}`.trim();
  const compatibility = Math.floor(Math.random() * 101);
  const results = [
    { min: 0, max: 20, text: '💔 الأبراج غير متوافقة... حاولوا مرة ثانية بعد 100 سنة' },
    { min: 21, max: 40, text: '🤔 ممكن ينجح الموضوع لو كل واحد يغير شخصيته 180 درجة' },
    { min: 41, max: 60, text: '💕 في أمل! بس محتاجين شوية شغل على العلاقة' },
    { min: 61, max: 80, text: '❤️ زوجين محترمين! مبروك عليكم' },
    { min: 81, max: 100, text: '💍 ما شاء الله! زواج العمر! وين الكوشة؟' },
  ];
  const result = results.find(r => compatibility >= r.min && compatibility <= r.max)!;
  await tg('sendMessage', {
    chat_id: chatId,
    text: `💒 *طلب زواج*\n\n${fullName} 💕 ${targetName}\n\n💘 نسبة التوافق: *${compatibility}%*\n\n${result.text}`,
    parse_mode: 'Markdown',
  });
}

// ============ PROTECTION ============
async function checkLinks(supabase: any, msg: any, chatId: number, userId: number, fullName: string): Promise<boolean> {
  const { data: settings } = await supabase.from('group_settings').select('links_allowed, max_warnings').eq('chat_id', chatId).single();
  if (!settings || settings.links_allowed) return false;
  const text = msg.text || msg.caption || '';
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/gi;
  if (!urlRegex.test(text)) return false;
  if (isDeveloper(userId) || await isAdmin(chatId, userId)) return false;

  await tg('deleteMessage', { chat_id: chatId, message_id: msg.message_id });
  const { data: member } = await supabase.from('members').select('warnings').eq('user_id', userId).eq('chat_id', chatId).single();
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

// Built-in greetings that work in all groups
const BUILTIN_RESPONSES: Record<string, string> = {
  'السلام عليكم': 'وعليكم السلام ورحمة الله وبركاته 🌸',
  'سلام عليكم': 'وعليكم السلام ورحمة الله 🌸',
  'السلام': 'وعليكم السلام 🌸',
  'مرحبا': 'أهلاً وسهلاً! 😊',
  'مرحبًا': 'أهلاً وسهلاً! 😊',
  'هاي': 'هلا والله! 👋',
  'هلا': 'هلا بيك! 🌟',
  'صباح الخير': 'صباح النور والسرور 🌞',
  'مساء الخير': 'مساء النور والورد 🌙',
  'تصبح على خير': 'وأنت من أهل الخير 🌙💤',
  'شكرا': 'العفو! 😊',
  'شكراً': 'العفو! ما سوينا شي 😊',
  'مع السلامة': 'في أمان الله 👋💕',
  'باي': 'باي باي! 👋',
};

async function checkAutoResponses(supabase: any, chatId: number, text: string): Promise<string | null> {
  const lower = text.toLowerCase().trim();
  // Check built-in responses first (exact or starts-with match)
  for (const [trigger, response] of Object.entries(BUILTIN_RESPONSES)) {
    if (lower === trigger || lower.startsWith(trigger + ' ') || lower.startsWith(trigger + '\n')) {
      return response;
    }
  }
  // Check custom responses from database
  const { data: responses } = await supabase.from('auto_responses').select('trigger_word, response').eq('chat_id', chatId);
  if (!responses) return null;
  const match = responses.find((r: any) => lower.includes(r.trigger_word.toLowerCase()));
  return match?.response || null;
}

// ============ WELCOME/GOODBYE ============
async function handleNewMembers(supabase: any, msg: any) {
  const chatId = msg.chat.id;
  const { data: settings } = await supabase.from('group_settings').select('welcome_enabled').eq('chat_id', chatId).single();
  if (settings && !settings.welcome_enabled) return;

  for (const member of msg.new_chat_members) {
    if (member.is_bot) continue;
    const name = `${member.first_name || ''} ${member.last_name || ''}`.trim();

    // FEATURE: Suspicious account detection + auto-restriction
    if (isSuspiciousAccount(member)) {
      await tg('sendMessage', { chat_id: chatId, text: `⚠️ *تنبيه:* حساب ${name} مشبوه (بدون يوزرنيم أو معلومات ناقصة)\n🔒 تم تقييده مؤقتاً لمدة ساعة`, parse_mode: 'Markdown' });
      // Auto-restrict suspicious new accounts for 1 hour
      await tg('restrictChatMember', {
        chat_id: chatId, user_id: member.id,
        until_date: Math.floor(Date.now() / 1000) + 3600,
        permissions: { can_send_messages: true, can_send_media_messages: false, can_send_other_messages: false, can_add_web_page_previews: false },
      });
      await logAdminAction(supabase, chatId, 0, 'نظام الحماية', member.id, name, 'auto_restrict', 'حساب مشبوه');
    }

    const welcome = pick(welcomeMessages).replace('{name}', name);
    await tg('sendMessage', { chat_id: chatId, text: welcome });
    await upsertMember(supabase, member.id, chatId, member.username || '', name);
  }
}

async function handleLeftMember(msg: any) {
  const member = msg.left_chat_member;
  if (member.is_bot) return;
  const name = `${member.first_name || ''} ${member.last_name || ''}`.trim();
  await tg('sendMessage', { chat_id: msg.chat.id, text: pick(goodbyeMessages).replace('{name}', name) });
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
    const { data: question } = await supabase.from('quiz_questions').select('answer').eq('id', questionId).single();
    if (question && answer === question.answer) {
      const { data: member } = await supabase.from('members').select('points, coins, level, quiz_correct').eq('user_id', userId).eq('chat_id', chatId).single();
      if (member) {
        const newPoints = member.points + 5;
        await supabase.from('members').update({
          points: newPoints, coins: member.coins + 5, level: calcLevel(newPoints), quiz_correct: (member.quiz_correct || 0) + 1,
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
    const { data: whisper } = await supabase.from('whispers').select('*').eq('id', whisperId).single();
    if (!whisper) return tg('answerCallbackQuery', { callback_query_id: query.id, text: '❌ الهمسة غير موجودة', show_alert: true });
    if (whisper.recipient_id !== userId) return tg('answerCallbackQuery', { callback_query_id: query.id, text: '🚫 هذه الهمسة ليست لك!', show_alert: true });
    await supabase.from('whispers').update({ is_read: true }).eq('id', whisperId);
    await tg('answerCallbackQuery', { callback_query_id: query.id, text: `🤫 من ${whisper.sender_name}:\n\n${whisper.message}`, show_alert: true });
    return;
  }

  // Judgment vote
  if (data.startsWith('judge_')) {
    await tg('answerCallbackQuery', { callback_query_id: query.id, text: `✅ صوّت ${fullName}!` });
    return;
  }

  // Poll vote
  if (data.startsWith('poll_')) {
    const parts = data.split('_');
    const pollId = parts[1];
    const optionIndex = parseInt(parts[2]);
    const { data: poll } = await supabase.from('polls').select('*').eq('id', pollId).single();
    if (!poll || !poll.is_active) return tg('answerCallbackQuery', { callback_query_id: query.id, text: '❌ الاستطلاع مغلق', show_alert: true });

    const { data: existing } = await supabase.from('poll_votes').select('id').eq('poll_id', pollId).eq('user_id', userId).single();
    if (existing) {
      await supabase.from('poll_votes').update({ option_index: optionIndex }).eq('id', existing.id);
      await tg('answerCallbackQuery', { callback_query_id: query.id, text: '✅ تم تغيير صوتك' });
    } else {
      await supabase.from('poll_votes').insert({ poll_id: pollId, user_id: userId, option_index: optionIndex });
      await tg('answerCallbackQuery', { callback_query_id: query.id, text: '✅ تم تسجيل صوتك' });
    }
    return;
  }

  // Poll results
  if (data.startsWith('pollresult_')) {
    const pollId = data.replace('pollresult_', '');
    const { data: poll } = await supabase.from('polls').select('*').eq('id', pollId).single();
    if (!poll) return;
    const { data: votes } = await supabase.from('poll_votes').select('option_index').eq('poll_id', pollId);
    const options = typeof poll.options === 'string' ? JSON.parse(poll.options) : poll.options;
    const counts = new Array(options.length).fill(0);
    (votes || []).forEach((v: any) => { if (counts[v.option_index] !== undefined) counts[v.option_index]++; });
    const total = votes?.length || 0;
    let resultText = `📊 *نتائج الاستطلاع*\n\n❓ ${poll.question}\n\n`;
    options.forEach((opt: string, i: number) => {
      const pct = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
      const bar = '▓'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
      resultText += `${opt}: ${bar} ${pct}% (${counts[i]})\n`;
    });
    resultText += `\n👥 إجمالي الأصوات: ${total}`;
    await tg('answerCallbackQuery', { callback_query_id: query.id, text: resultText, show_alert: true });
    return;
  }

  // Challenge accept/reject
  if (data.startsWith('challenge_accept_')) {
    const parts = data.split('_');
    const challengerId = parseInt(parts[2]);
    const targetId = parseInt(parts[3]);
    const bet = parseInt(parts[4]);
    if (userId !== targetId) return tg('answerCallbackQuery', { callback_query_id: query.id, text: '❌ هذا التحدي ليس لك', show_alert: true });

    const { data: challenger } = await supabase.from('members').select('coins, full_name').eq('user_id', challengerId).eq('chat_id', chatId).single();
    const { data: target } = await supabase.from('members').select('coins, full_name').eq('user_id', targetId).eq('chat_id', chatId).single();
    if (!challenger || !target || challenger.coins < bet || target.coins < bet) {
      return tg('answerCallbackQuery', { callback_query_id: query.id, text: '❌ أحد اللاعبين لا يملك رصيد كافي', show_alert: true });
    }

    const winnerId = Math.random() < 0.5 ? challengerId : targetId;
    const loserId = winnerId === challengerId ? targetId : challengerId;
    const winnerName = winnerId === challengerId ? challenger.full_name : target.full_name;
    const loserName = loserId === challengerId ? challenger.full_name : target.full_name;

    const { data: winner } = await supabase.from('members').select('coins').eq('user_id', winnerId).eq('chat_id', chatId).single();
    const { data: loser } = await supabase.from('members').select('coins').eq('user_id', loserId).eq('chat_id', chatId).single();
    await supabase.from('members').update({ coins: winner.coins + bet }).eq('user_id', winnerId).eq('chat_id', chatId);
    await supabase.from('members').update({ coins: loser.coins - bet }).eq('user_id', loserId).eq('chat_id', chatId);

    await tg('answerCallbackQuery', { callback_query_id: query.id, text: '⚔️ بدأ التحدي!' });
    await tg('sendMessage', {
      chat_id: chatId,
      text: `⚔️ *نتيجة التحدي!*\n\n🏆 الفائز: *${winnerName}*\n💀 الخاسر: *${loserName}*\n💰 الرهان: ${bet} عملة`,
      parse_mode: 'Markdown',
    });
    return;
  }

  if (data.startsWith('challenge_reject_')) {
    const parts = data.split('_');
    const targetId = parseInt(parts[3]);
    if (userId !== targetId) return tg('answerCallbackQuery', { callback_query_id: query.id, text: '❌ هذا التحدي ليس لك', show_alert: true });
    await tg('answerCallbackQuery', { callback_query_id: query.id, text: '❌ تم رفض التحدي' });
    await tg('sendMessage', { chat_id: chatId, text: `❌ ${fullName} رفض التحدي 🏳️` });
    return;
  }

  // Leaderboard categories
  if (data.startsWith('lb_')) {
    const category = data.replace('lb_', '');
    const fieldMap: Record<string, string> = {
      points: 'points', coins: 'coins', messages: 'messages_count',
      reputation: 'reputation', streak: 'daily_streak', level: 'level',
    };
    const labelMap: Record<string, string> = {
      points: '💎 النقاط', coins: '💰 العملات', messages: '💬 الرسائل',
      reputation: '⭐ السمعة', streak: '🔥 السلسلة', level: '⭐ المستوى',
    };
    const field = fieldMap[category] || 'points';
    const label = labelMap[category] || 'النقاط';

    const { data: members } = await supabase.from('members')
      .select(`full_name, username, ${field}`)
      .eq('chat_id', chatId).order(field, { ascending: false }).limit(10);

    if (!members?.length) { await tg('answerCallbackQuery', { callback_query_id: query.id, text: '❌ لا يوجد بيانات' }); return; }

    const medals = ['🥇', '🥈', '🥉'];
    let text = `🏆 *لوحة الصدارة — ${label}*\n\n`;
    members.forEach((m: any, i: number) => {
      const medal = medals[i] || `${i + 1}.`;
      text += `${medal} ${m.full_name || m.username} — ${m[field] || 0}\n`;
    });

    await tg('answerCallbackQuery', { callback_query_id: query.id });
    await tg('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown' });
    return;
  }

  // Settings toggle
  if (data.startsWith('setting_')) {
    if (!(await isAdmin(chatId, userId))) return tg('answerCallbackQuery', { callback_query_id: query.id, text: '❌ للمشرفين فقط', show_alert: true });
    const parts = data.split('_');
    const setting = parts[1];
    const settingChatId = parseInt(parts[2]);
    const fieldMap: Record<string, string> = { links: 'links_allowed', media: 'media_allowed', spam: 'spam_protection', welcome: 'welcome_enabled' };
    const field = fieldMap[setting];
    if (!field) return;
    const { data: current } = await supabase.from('group_settings').select(field).eq('chat_id', settingChatId).single();
    const newValue = !(current?.[field] ?? false);
    await supabase.from('group_settings').update({ [field]: newValue }).eq('chat_id', settingChatId);
    await tg('answerCallbackQuery', { callback_query_id: query.id, text: `✅ تم ${newValue ? 'تفعيل' : 'تعطيل'} الإعداد` });
    await cmdSettings(supabase, settingChatId, userId);
    return;
  }

  // Menu buttons
  if (data.startsWith('menu_')) {
    const menu = data.replace('menu_', '');
    await tg('answerCallbackQuery', { callback_query_id: query.id });
    switch (menu) {
      case 'commands': await cmdHelp(chatId); break;
      case 'stats': await cmdStats(supabase, chatId, userId, { reply_to_message: null, from: query.from }); break;
      case 'games':
        await tg('sendMessage', {
          chat_id: chatId, text: '🎮 *الألعاب*', parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🧠 كويز', callback_data: 'game_quiz' }, { text: '💻 اختراق', callback_data: 'game_hack' }],
              [{ text: '💘 توافق', callback_data: 'game_ship' }, { text: '🎱 كرة سحرية', callback_data: 'game_8ball' }],
              [{ text: '😂 نكتة', callback_data: 'game_joke' }, { text: '🔮 حظك', callback_data: 'game_fortune' }],
              [{ text: '🎲 نرد', callback_data: 'game_dice' }, { text: '🪙 عملة', callback_data: 'game_coinflip' }],
              [{ text: '🎰 قمار', callback_data: 'game_gamble' }, { text: '🕵️ سرقة', callback_data: 'game_steal' }],
            ]
          },
        });
        break;
      case 'top': await cmdTop(supabase, chatId); break;
      case 'wallet': await cmdWallet(supabase, chatId, userId); break;
      case 'shop': await cmdShop(chatId); break;
      case 'store': await cmdStore(supabase, chatId); break;
      case 'my': await cmdMy(supabase, chatId, userId); break;
      case 'achievements': await cmdAchievements(supabase, chatId, userId); break;
      case 'profile': await cmdProfile(supabase, chatId, userId, { reply_to_message: null, from: query.from }); break;
      case 'search':
        await tg('sendMessage', {
          chat_id: chatId, text: '🔍 *أدوات البحث*\n\n🌐 /search <سؤال> — بحث ويب\n▶️ /youtube <موضوع> — بحث يوتيوب\n📚 /book <كتاب> — بحث كتب وملخصات',
          parse_mode: 'Markdown',
        });
        break;
    }
    return;
}

// ============ STORE & PAYMENT SYSTEM ============

const PAYMENT_NUMBER = '+201225556948';

async function cmdStore(supabase: any, chatId: number) {
  const { data: items } = await supabase.from('store_items').select('*').eq('is_active', true).order('category');
  if (!items?.length) return tg('sendMessage', { chat_id: chatId, text: '❌ المتجر فارغ حالياً' });

  let text = '🏪 *متجر شادي*\n\n';
  let currentCat = '';
  const catLabels: Record<string, string> = { moderation: '🛡️ إدارة', feature: '✨ مميزات', promotion: '📢 ترويج', subscription: '💎 اشتراكات', general: '🔷 عام' };

  items.forEach((item: any, i: number) => {
    if (item.category !== currentCat) {
      currentCat = item.category;
      text += `\n${catLabels[currentCat] || currentCat}\n`;
    }
    text += `${i + 1}. *${item.name}* — ${item.price_coins} عملة أو ${item.price_cash} جنيه\n   ${item.description || ''}\n`;
  });

  text += `\n💡 للشراء بالعملات: /buy <رقم>\n💳 للشراء بالمال: /pay <رقم>`;
  await tg('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown' });
}

async function cmdBuy(supabase: any, chatId: number, userId: number, fullName: string, parts: string[], msg: any) {
  const { data: items } = await supabase.from('store_items').select('*').eq('is_active', true).order('category');
  if (!items?.length) return tg('sendMessage', { chat_id: chatId, text: '❌ المتجر فارغ' });

  const idx = parseInt(parts[1]) - 1;
  if (isNaN(idx) || idx < 0 || idx >= items.length) return tg('sendMessage', { chat_id: chatId, text: '❌ استخدم: /buy <رقم المنتج من /store>' });

  const item = items[idx];
  const { data: member } = await supabase.from('members').select('coins').eq('user_id', userId).eq('chat_id', chatId).single();
  if (!member || member.coins < item.price_coins) return tg('sendMessage', { chat_id: chatId, text: `❌ تحتاج ${item.price_coins} عملة (لديك ${member?.coins || 0})\n\n💳 أو ادفع ${item.price_cash} جنيه: /pay ${idx + 1}` });

  await supabase.from('members').update({ coins: member.coins - item.price_coins }).eq('user_id', userId).eq('chat_id', chatId);

  // Execute the service
  await executeStoreItem(supabase, item, chatId, userId, fullName, msg);

  await tg('sendMessage', { chat_id: chatId, text: `✅ تم شراء *${item.name}* بنجاح!\n💰 تم خصم ${item.price_coins} عملة`, parse_mode: 'Markdown' });
}

async function executeStoreItem(supabase: any, item: any, chatId: number, userId: number, fullName: string, msg: any) {
  switch (item.category) {
    case 'moderation':
      if (item.name.includes('كتم')) {
        await tg('restrictChatMember', {
          chat_id: chatId, user_id: userId,
          permissions: { can_send_messages: true, can_send_media_messages: true, can_send_other_messages: true, can_add_web_page_previews: true },
        });
      }
      // unban handled manually by developer
      break;
    case 'feature':
      if (item.name.includes('تثبيت') && msg.reply_to_message) {
        await tg('pinChatMessage', { chat_id: chatId, message_id: msg.reply_to_message.message_id });
      }
      if (item.name.includes('لقب')) {
        await tg('sendMessage', { chat_id: chatId, text: '💡 استخدم /buy_title <اللقب> لتحديد لقبك' });
      }
      break;
    case 'subscription': {
      const tier = item.name.includes('VIP') ? 'vip' : 'pro';
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from('subscriptions').upsert({ user_id: userId, chat_id: chatId, tier, expires_at: expiresAt }, { onConflict: 'user_id,chat_id' });
      break;
    }
  }
}

async function cmdPay(supabase: any, chatId: number, userId: number, fullName: string, parts: string[]) {
  const { data: items } = await supabase.from('store_items').select('*').eq('is_active', true).order('category');
  if (!items?.length) return tg('sendMessage', { chat_id: chatId, text: '❌ المتجر فارغ' });

  const idx = parseInt(parts[1]) - 1;
  if (isNaN(idx) || idx < 0 || idx >= items.length) return tg('sendMessage', { chat_id: chatId, text: '❌ استخدم: /pay <رقم المنتج من /store>' });

  const item = items[idx];

  // Create payment request
  await supabase.from('payment_requests').insert({
    user_id: userId, chat_id: chatId, user_name: fullName,
    service_type: item.name, service_details: item.id,
    amount: item.price_cash,
  });

  await tg('sendMessage', {
    chat_id: chatId,
    text: `💳 *طلب دفع*\n\n🛒 المنتج: *${item.name}*\n💰 المبلغ: *${item.price_cash} جنيه*\n\n📱 رقم التحويل (Orange Cash):\n\`${PAYMENT_NUMBER}\`\n\n📋 *التعليمات:*\n1. حوّل المبلغ على الرقم أعلاه\n2. أرسل إثبات الدفع (صورة) هنا\n3. ثم اكتب /confirm\n\n⏰ سيتم تفعيل الخدمة بعد التحقق من الدفع`,
    parse_mode: 'Markdown',
  });
}

async function cmdConfirm(supabase: any, chatId: number, userId: number, fullName: string, msg: any) {
  // Check if user has a pending payment
  const { data: pending } = await supabase.from('payment_requests')
    .select('*').eq('user_id', userId).eq('chat_id', chatId).eq('status', 'pending')
    .order('created_at', { ascending: false }).limit(1).single();

  if (!pending) return tg('sendMessage', { chat_id: chatId, text: '❌ لا يوجد طلب دفع معلّق. استخدم /pay أولاً' });

  // Save proof (photo file_id if available)
  let proofId = null;
  if (msg.reply_to_message?.photo) {
    proofId = msg.reply_to_message.photo[msg.reply_to_message.photo.length - 1].file_id;
  } else if (msg.photo) {
    proofId = msg.photo[msg.photo.length - 1].file_id;
  }

  await supabase.from('payment_requests').update({ status: 'awaiting_review', proof_file_id: proofId }).eq('id', pending.id);

  await tg('sendMessage', { chat_id: chatId, text: `✅ تم إرسال طلب التأكيد!\n\n🔄 الحالة: في انتظار المراجعة\n📝 سيتم تفعيل الخدمة بعد التحقق\n\n🆔 رقم الطلب: \`${pending.id.substring(0, 8)}\``, parse_mode: 'Markdown' });

  // Notify developer
  await tg('sendMessage', {
    chat_id: DEVELOPER_ID,
    text: `💳 *طلب دفع جديد!*\n\n👤 من: ${fullName} (${userId})\n🛒 الخدمة: ${pending.service_type}\n💰 المبلغ: ${pending.amount} جنيه\n🆔 ID: \`${pending.id.substring(0, 8)}\`\n\nللتفعيل: /activate ${pending.id.substring(0, 8)}`,
    parse_mode: 'Markdown',
  });
  // Forward proof photo to developer
  if (proofId) {
    await tg('sendPhoto', { chat_id: DEVELOPER_ID, photo: proofId, caption: `إثبات دفع من ${fullName}` });
  }
}

async function cmdActivate(supabase: any, chatId: number, userId: number, parts: string[]) {
  if (!isDeveloper(userId)) return tg('sendMessage', { chat_id: chatId, text: '❌ هذا الأمر للمطور فقط' });
  const shortId = parts[1];
  if (!shortId) return tg('sendMessage', { chat_id: chatId, text: '❌ استخدم: /activate <رقم_الطلب>' });

  const { data: requests } = await supabase.from('payment_requests')
    .select('*').or(`status.eq.pending,status.eq.awaiting_review`);

  const req = requests?.find((r: any) => r.id.startsWith(shortId));
  if (!req) return tg('sendMessage', { chat_id: chatId, text: '❌ طلب غير موجود' });

  await supabase.from('payment_requests').update({ status: 'approved', resolved_at: new Date().toISOString(), resolved_by: userId }).eq('id', req.id);

  // Execute the purchased service
  const { data: item } = await supabase.from('store_items').select('*').eq('id', req.service_details).single();
  if (item) {
    await executeStoreItem(supabase, item, req.chat_id, req.user_id, req.user_name, {});
  }

  // Notify user
  await tg('sendMessage', { chat_id: req.chat_id, text: `✅ تم تفعيل خدمة *${req.service_type}* لـ ${req.user_name}! 🎉\n\nشكراً لثقتك 💜`, parse_mode: 'Markdown' });
  await tg('sendMessage', { chat_id: chatId, text: `✅ تم تفعيل الطلب ${shortId}` });
}

async function cmdPending(supabase: any, chatId: number, userId: number) {
  if (!isDeveloper(userId)) return tg('sendMessage', { chat_id: chatId, text: '❌ هذا الأمر للمطور فقط' });

  const { data: requests } = await supabase.from('payment_requests')
    .select('*').or('status.eq.pending,status.eq.awaiting_review').order('created_at', { ascending: false }).limit(20);

  if (!requests?.length) return tg('sendMessage', { chat_id: chatId, text: '✅ لا توجد طلبات معلقة' });

  let text = '📋 *الطلبات المعلقة*\n\n';
  requests.forEach((r: any) => {
    text += `🆔 \`${r.id.substring(0, 8)}\`\n👤 ${r.user_name} | 💰 ${r.amount} جنيه\n🛒 ${r.service_type} | 📊 ${r.status}\n\n`;
  });
  text += '💡 /activate <id> للتفعيل';
  await tg('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown' });
}

async function cmdMy(supabase: any, chatId: number, userId: number) {
  const { data: member } = await supabase.from('members').select('coins, points, level').eq('user_id', userId).eq('chat_id', chatId).single();
  const { data: sub } = await supabase.from('subscriptions').select('tier, expires_at').eq('user_id', userId).eq('chat_id', chatId).single();
  const { data: purchases } = await supabase.from('payment_requests')
    .select('service_type, amount, status, created_at').eq('user_id', userId).eq('chat_id', chatId).order('created_at', { ascending: false }).limit(5);

  let text = `👤 *حسابك*\n\n`;
  text += `💰 العملات: ${member?.coins || 0}\n💎 النقاط: ${member?.points || 0}\n⭐ المستوى: ${member?.level || 1}\n`;

  if (sub && sub.tier !== 'free') {
    const expires = new Date(sub.expires_at);
    const isActive = expires > new Date();
    text += `\n💎 الاشتراك: *${sub.tier.toUpperCase()}* ${isActive ? '✅' : '❌ منتهي'}\n`;
    if (isActive) text += `📅 ينتهي: ${expires.toLocaleDateString('ar-EG')}\n`;
  } else {
    text += `\n💎 الاشتراك: Free\n`;
  }

  if (purchases?.length) {
    text += `\n📜 *آخر المشتريات:*\n`;
    purchases.forEach((p: any) => {
      const status = p.status === 'approved' ? '✅' : p.status === 'awaiting_review' ? '🔄' : '⏳';
      text += `${status} ${p.service_type} — ${p.amount} جنيه\n`;
    });
  }

  await tg('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown' });
}

// ============ SEARCH ENGINE ============

async function cmdSearch(chatId: number, text: string) {
  const query = text.replace(/\/search\s*/, '').trim();
  if (!query) return tg('sendMessage', { chat_id: chatId, text: '❌ استخدم: /search <سؤالك أو موضوع البحث>' });

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) return tg('sendMessage', { chat_id: chatId, text: '❌ البحث غير متاح حالياً' });

  await tg('sendMessage', { chat_id: chatId, text: '🔍 جاري البحث في الويب...' });

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: `أنت محرك بحث ويب متقدم. عند البحث عن أي موضوع:

1. ابحث عن المعلومات الأكثر دقة وحداثة
2. قدم النتائج في نقاط مرتبة ومنظمة
3. اذكر المصادر والمواقع التي يمكن الرجوع إليها (بروابط حقيقية إن أمكن)
4. إذا كان البحث عن شخص: قدم معلومات تفصيلية عنه (السيرة، الإنجازات، حسابات السوشيال ميديا إن وجدت)
5. إذا كان عن موضوع تقني أو علمي: قدم شرحاً واضحاً مع أمثلة
6. في النهاية، اذكر قائمة بأهم المواقع التي يمكن البحث فيها لمزيد من المعلومات

📌 تنسيق النتائج:
🔹 النتيجة الأولى
🔹 النتيجة الثانية
...
🌐 مصادر مقترحة: (اذكر 3-5 مواقع حقيقية مع روابطها)

اكتب بالعربية. كن دقيقاً ومختصراً. استخدم الإيموجي.` },
        { role: 'user', content: `ابحث عن: ${query}` }
      ],
    }),
  });
  if (!res.ok) return tg('sendMessage', { chat_id: chatId, text: '❌ فشل البحث. حاول مرة أخرى' });
  const data = await res.json();
  const result = data.choices?.[0]?.message?.content;
  if (result) {
    // Split long messages
    const fullText = `🔍 *نتائج البحث:* ${query}\n\n${result}`;
    if (fullText.length > 4000) {
      const mid = Math.floor(fullText.length / 2);
      const splitAt = fullText.lastIndexOf('\n', mid) || mid;
      await tg('sendMessage', { chat_id: chatId, text: fullText.substring(0, splitAt), parse_mode: 'Markdown' });
      await tg('sendMessage', { chat_id: chatId, text: fullText.substring(splitAt), parse_mode: 'Markdown' });
    } else {
      await tg('sendMessage', { chat_id: chatId, text: fullText, parse_mode: 'Markdown' });
    }
  }
}

async function cmdYoutube(chatId: number, text: string) {
  const query = text.replace(/\/youtube\s*/, '').trim();
  if (!query) return tg('sendMessage', { chat_id: chatId, text: '❌ استخدم: /youtube <ما تبحث عنه>' });

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) return tg('sendMessage', { chat_id: chatId, text: '❌ البحث غير متاح' });

  await tg('sendMessage', { chat_id: chatId, text: '▶️ جاري البحث عن أفضل الفيديوهات...' });

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: `أنت خبير بحث يوتيوب. عند البحث عن موضوع:

1. اقترح أفضل 5-7 فيديوهات يوتيوب (عناوين حقيقية من قنوات مشهورة)
2. لكل فيديو قدم:
   ▶️ العنوان الكامل
   📺 اسم القناة
   ⏱️ المدة التقريبية
   🔗 رابط البحث المباشر: https://www.youtube.com/results?search_query=<كلمات البحث بالإنجليزية مرمزة URL>
   📝 وصف مختصر (سطر واحد)
3. في النهاية، قدم رابط بحث شامل للموضوع على يوتيوب
4. اقترح كلمات بحث بالعربية والإنجليزية

اكتب بالعربية. استخدم إيموجي. رتّب حسب الأفضل والأكثر فائدة.` },
        { role: 'user', content: `ابحث عن فيديوهات: ${query}` }
      ],
    }),
  });
  if (!res.ok) return tg('sendMessage', { chat_id: chatId, text: '❌ فشل البحث' });
  const data = await res.json();
  const result = data.choices?.[0]?.message?.content;
  if (result) {
    const fullText = `▶️ *بحث يوتيوب:* ${query}\n\n${result}`;
    if (fullText.length > 4000) {
      const mid = Math.floor(fullText.length / 2);
      const splitAt = fullText.lastIndexOf('\n', mid) || mid;
      await tg('sendMessage', { chat_id: chatId, text: fullText.substring(0, splitAt), parse_mode: 'Markdown' });
      await tg('sendMessage', { chat_id: chatId, text: fullText.substring(splitAt), parse_mode: 'Markdown' });
    } else {
      await tg('sendMessage', { chat_id: chatId, text: fullText, parse_mode: 'Markdown' });
    }
  }
}

async function cmdBook(chatId: number, text: string) {
  const query = text.replace(/\/book\s*/, '').trim();
  if (!query) return tg('sendMessage', { chat_id: chatId, text: '❌ استخدم: /book <اسم الكتاب أو الموضوع>' });

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) return tg('sendMessage', { chat_id: chatId, text: '❌ البحث غير متاح' });

  await tg('sendMessage', { chat_id: chatId, text: '📚 جاري البحث عن الكتب وملفات PDF...' });

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: `أنت مساعد بحث كتب وملفات PDF متخصص. عند السؤال عن كتاب أو موضوع:

1. اقترح أفضل 5 كتب في الموضوع مع:
   📖 العنوان الكامل (بالعربية والإنجليزية)
   ✍️ المؤلف وسنة النشر
   📄 عدد الصفحات تقريباً
   ⭐ التقييم المتوقع

2. لكل كتاب قدم ملخصاً مركزاً (3-5 أسطر)

3. 🔗 روابط تحميل PDF مجانية (حقيقية):
   - مكتبة نور: https://www.noor-book.com/
   - أرشيف الإنترنت: https://archive.org/
   - PDF Drive: https://www.pdfdrive.com/
   - مكتبة الكتب: https://www.kutub-pdf.net/
   - Z-Library: https://z-lib.org/
   - Libgen: https://libgen.is/
   - اقترح رابط بحث مباشر لكل كتاب في هذه المواقع

4. قدم 5 أسئلة مفتاحية يجيب عنها الكتاب

5. إذا طُلب كتاب بعينه: قدم ملخصاً شاملاً مع أهم الأفكار والفصول

اكتب بالعربية. نظّم الإجابة بشكل واضح مع إيموجي.` },
        { role: 'user', content: `ابحث عن كتاب: ${query}` }
      ],
    }),
  });
  if (!res.ok) return tg('sendMessage', { chat_id: chatId, text: '❌ فشل البحث' });
  const data = await res.json();
  const result = data.choices?.[0]?.message?.content;
  if (result) {
    const fullText = `📚 *بحث الكتب:* ${query}\n\n${result}`;
    if (fullText.length > 4000) {
      const parts: string[] = [];
      let remaining = fullText;
      while (remaining.length > 4000) {
        const splitAt = remaining.lastIndexOf('\n', 4000) || 4000;
        parts.push(remaining.substring(0, splitAt));
        remaining = remaining.substring(splitAt);
      }
      parts.push(remaining);
      for (const part of parts) {
        await tg('sendMessage', { chat_id: chatId, text: part, parse_mode: 'Markdown' });
      }
    } else {
      await tg('sendMessage', { chat_id: chatId, text: fullText, parse_mode: 'Markdown' });
    }
  }
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
      case 'dice': await cmdDice(chatId); break;
      case 'coinflip': await cmdCoinFlip(chatId); break;
      case 'gamble': await tg('sendMessage', { chat_id: chatId, text: '💡 استخدم: /gamble <مبلغ>' }); break;
      case 'steal': await tg('sendMessage', { chat_id: chatId, text: '💡 رد على رسالة شخص واستخدم /steal' }); break;
    }
  }
}
