import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Send, Image, Video, Link, BarChart3, Sticker } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type NotificationType = "text" | "photo" | "video" | "link" | "poll" | "sticker";

export default function NotificationsPage() {
  const [message, setMessage] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [activeTab, setActiveTab] = useState<NotificationType>("text");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await supabase.from("notifications")
        .select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const sendNotification = useMutation({
    mutationFn: async (payload: any) => {
      const msgText = payload.type === "poll"
        ? `📊 استطلاع: ${payload.question}`
        : payload.message || payload.caption || mediaUrl;

      const { data, error } = await supabase.from("notifications").insert({
        message: msgText, created_by: 6570434162, is_sent: false,
      }).select().single();
      if (error) throw error;

      return await supabase.functions.invoke("telegram-bot", {
        body: { action: "broadcast", notification_id: data.id, ...payload },
      });
    },
    onSuccess: () => {
      toast({ title: "✅ تم", description: "تم إرسال الإشعار لجميع المستخدمين" });
      setMessage(""); setMediaUrl(""); setPollQuestion(""); setPollOptions(["", ""]);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل إرسال الإشعار", variant: "destructive" });
    },
  });

  const handleSend = () => {
    switch (activeTab) {
      case "text":
        if (!message.trim()) return;
        sendNotification.mutate({ type: "text", message: message.trim() });
        break;
      case "photo":
        if (!mediaUrl.trim()) return;
        sendNotification.mutate({ type: "photo", photo_url: mediaUrl.trim(), caption: message.trim() });
        break;
      case "video":
        if (!mediaUrl.trim()) return;
        sendNotification.mutate({ type: "video", video_url: mediaUrl.trim(), caption: message.trim() });
        break;
      case "link":
        if (!mediaUrl.trim()) return;
        sendNotification.mutate({ type: "text", message: `${message.trim()}\n\n🔗 ${mediaUrl.trim()}` });
        break;
      case "poll":
        if (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) return;
        sendNotification.mutate({ type: "poll", question: pollQuestion.trim(), options: pollOptions.filter(o => o.trim()) });
        break;
      case "sticker":
        if (!mediaUrl.trim()) return;
        sendNotification.mutate({ type: "sticker", sticker_id: mediaUrl.trim() });
        break;
    }
  };

  const addPollOption = () => setPollOptions([...pollOptions, ""]);
  const updatePollOption = (i: number, v: string) => {
    const opts = [...pollOptions]; opts[i] = v; setPollOptions(opts);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">الإشعارات</h2>
          <p className="text-muted-foreground mt-1">أرسل إشعارات متنوعة لجميع مستخدمي البوت</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="w-5 h-5" /> إرسال إشعار جديد
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as NotificationType)}>
              <TabsList className="grid grid-cols-6 w-full">
                <TabsTrigger value="text" className="text-xs gap-1"><Send className="w-3 h-3" />نص</TabsTrigger>
                <TabsTrigger value="photo" className="text-xs gap-1"><Image className="w-3 h-3" />صورة</TabsTrigger>
                <TabsTrigger value="video" className="text-xs gap-1"><Video className="w-3 h-3" />فيديو</TabsTrigger>
                <TabsTrigger value="link" className="text-xs gap-1"><Link className="w-3 h-3" />رابط</TabsTrigger>
                <TabsTrigger value="poll" className="text-xs gap-1"><BarChart3 className="w-3 h-3" />استفتاء</TabsTrigger>
                <TabsTrigger value="sticker" className="text-xs gap-1"><Sticker className="w-3 h-3" />ملصق</TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="space-y-3 mt-3">
                <Textarea placeholder="اكتب نص الإشعار..." value={message} onChange={(e) => setMessage(e.target.value)} rows={4} dir="rtl" />
              </TabsContent>

              <TabsContent value="photo" className="space-y-3 mt-3">
                <Input placeholder="رابط الصورة (URL)" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} dir="ltr" />
                <Textarea placeholder="نص توضيحي (اختياري)..." value={message} onChange={(e) => setMessage(e.target.value)} rows={2} dir="rtl" />
              </TabsContent>

              <TabsContent value="video" className="space-y-3 mt-3">
                <Input placeholder="رابط الفيديو (URL)" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} dir="ltr" />
                <Textarea placeholder="نص توضيحي (اختياري)..." value={message} onChange={(e) => setMessage(e.target.value)} rows={2} dir="rtl" />
              </TabsContent>

              <TabsContent value="link" className="space-y-3 mt-3">
                <Input placeholder="الرابط (URL)" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} dir="ltr" />
                <Textarea placeholder="نص الرسالة..." value={message} onChange={(e) => setMessage(e.target.value)} rows={2} dir="rtl" />
              </TabsContent>

              <TabsContent value="poll" className="space-y-3 mt-3">
                <Input placeholder="سؤال الاستفتاء" value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} dir="rtl" />
                {pollOptions.map((opt, i) => (
                  <Input key={i} placeholder={`الخيار ${i + 1}`} value={opt} onChange={(e) => updatePollOption(i, e.target.value)} dir="rtl" />
                ))}
                {pollOptions.length < 10 && (
                  <Button variant="outline" size="sm" onClick={addPollOption}>+ إضافة خيار</Button>
                )}
              </TabsContent>

              <TabsContent value="sticker" className="space-y-3 mt-3">
                <Input placeholder="معرّف الملصق (file_id)" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} dir="ltr" />
                <p className="text-xs text-muted-foreground">يمكنك الحصول على file_id عن طريق إرسال الملصق للبوت في الخاص</p>
              </TabsContent>
            </Tabs>

            <Button onClick={handleSend} disabled={sendNotification.isPending} className="gap-2">
              <Send className="w-4 h-4" />
              {sendNotification.isPending ? "جاري الإرسال..." : "إرسال للجميع"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {isLoading ? (
            <p className="text-muted-foreground text-center">جاري التحميل...</p>
          ) : notifications && notifications.length > 0 ? (
            notifications.map((n: any) => (
              <Card key={n.id}>
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm text-foreground break-words">{n.message}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant={n.is_sent ? "default" : "secondary"}>
                      {n.is_sent ? "✅ تم الإرسال" : "⏳ قيد الإرسال"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(n.created_at).toLocaleString("ar-EG")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card><CardContent className="p-8 text-center text-muted-foreground">لا توجد إشعارات بعد</CardContent></Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
