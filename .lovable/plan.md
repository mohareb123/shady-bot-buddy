- بوت تليغرام "شادي" - خطة البناء الكاملة

## المرحلة 1: البنية التحتية

- **تفعيل Lovable Cloud** وإنشاء قاعدة البيانات
- **ربط Telegram Connector** عبر الـ Gateway
- **إنشاء جداول قاعدة البيانات**: members, admin_logs, messages_log, auto_responses, whispers, group_settings, quiz_questions, user_titles
- **إضافة 20 سؤال افتراضي و يمكن لمستخدم البوت إضافةأسئلةمخصصة** لجدول quiz_questions

صنع حلقة وصل بين البوت و اي ذكاء اصطناعي بدون  api للرد علي جميع انواع الكلام

## المرحلة 2: Edge Functions - الأوامر الأساسية

- **telegram-poll**: استقبال الرسائل عبر getUpdates مع pg_cron
- **telegram-webhook-handler**: معالجة الرسائل الواردة وتوزيعها على الأوامر المناسبة
- **معالجة الأوامر**: `/start`, `/daily`, `/stats`, `/top`, `/wallet`, `/gift`, `/shop`, `/buy_unwarn`, `/buy_points`, `/buy_title`
- **نظام النقاط والعملات**: +1 نقطة لكل رسالة، مكافأة يومية، نظام المستويات

## المرحلة 3: Edge Functions - الألعاب والترفيه

- `/quiz` مع أزرار اختيار + `/hack` + `/judgment` + `/ship`
- `/8ball` + `/fortune` + `/joke` + `/roast` + `/compliment` + `/wisdom`
- جميعها ترسل ردوداً عربية مضحكة

## المرحلة 4: Edge Functions - الإدارة والحماية

- أوامر الإدارة: `/ban`, `/kick`, `/mute`, `/unmute`, `/warn`, `/promote`
- نظام التحذيرات مع طرد تلقائي عند الحد الأقصى
- حماية الروابط: حذف تلقائي + تحذير
- `/settings` مع أزرار inline للتبديل
- `/addresponse`, `/responses`, `/delresponse`

## المرحلة 5: Edge Functions - الردود الذكية والهمسات

- **ردود ذكية**: تحيات، شكر، أسئلة عامة، كلمات عاطفية
- **منطق الرد**: في الخاص يرد دائماً، في المجموعة يرد عند ذكر "شادي" أو 7% عشوائياً مع تبريد 8 ثو