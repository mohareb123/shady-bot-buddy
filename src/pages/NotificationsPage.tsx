import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Send, Image, Video, Link, BarChart3, Sticker, Trash2, Upload, MessageSquareX, FileUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type NotificationType = "text" | "photo" | "video" | "link" | "poll" | "sticker" | "file";

export default function NotificationsPage() {
  const [message, setMessage] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [activeTab, setActiveTab] = useState<NotificationType>("text");
  const [uploading, setUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const anyFileInputRef = useRef<HTMLInputElement>(null);
  const stickerInputRef = useRef<HTMLInputElement>(null);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, maxSizeMB = 50) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: "خطأ", description: `الحد الأقصى لحجم الملف ${maxSizeMB} ميجابايت`, variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const { error } = await supabase.storage.from("notification-media").upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (error) throw error;

      const { data: urlData } = supabase.storage.from("notification-media").getPublicUrl(fileName);
      setMediaUrl(urlData.publicUrl);
      setUploadedFileName(file.name);
      toast({ title: "✅ تم رفع الملف بنجاح" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message || "فشل رفع الملف", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (stickerInputRef.current) stickerInputRef.current.value = "";
      if (anyFileInputRef.current) anyFileInputRef.current.value = "";
    }
  };

  const sendNotification = useMutation({
    mutationFn: async (payload: any) => {
      const msgText = payload.type === "poll"
        ? `📊 استفتاء: ${payload.question}`
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
      setMessage(""); setMediaUrl(""); setPollQuestion(""); setPollOptions(["", ""]); setUploadedFileName("");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err.message || "فشل إرسال الإشعار", variant: "destructive" });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "✅ تم حذف الإشعار" });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const deleteFromTelegram = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("telegram-bot", {
        body: { action: "delete_broadcast" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast({ title: "✅ تم", description: `تم حذف ${data?.deleted || 0} رسالة من تليغرام` });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل حذف الرسائل من تليغرام", variant: "destructive" });
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
      case "file":
        if (!mediaUrl.trim()) return;
        sendNotification.mutate({ type: "file", file_url: mediaUrl.trim(), caption: message.trim(), file_name: uploadedFileName });
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">الإشعارات</h2>
            <p className="text-muted-foreground mt-1">أرسل إشعارات متنوعة لجميع مستخدمي البوت</p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            onClick={() => deleteFromTelegram.mutate()}
            disabled={deleteFromTelegram.isPending}
          >
            <MessageSquareX className="w-4 h-4" />
            {deleteFromTelegram.isPending ? "جاري الحذف..." : "حذف من تليغرام"}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="w-5 h-5" /> إرسال إشعار جديد
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as NotificationType); setMediaUrl(""); setUploadedFileName(""); }}>
            <TabsList className="grid grid-cols-7 w-full">
                <TabsTrigger value="text" className="text-xs gap-1"><Send className="w-3 h-3" />نص</TabsTrigger>
                <TabsTrigger value="photo" className="text-xs gap-1"><Image className="w-3 h-3" />صورة</TabsTrigger>
                <TabsTrigger value="video" className="text-xs gap-1"><Video className="w-3 h-3" />فيديو</TabsTrigger>
                <TabsTrigger value="file" className="text-xs gap-1"><FileUp className="w-3 h-3" />ملف</TabsTrigger>
                <TabsTrigger value="link" className="text-xs gap-1"><Link className="w-3 h-3" />رابط</TabsTrigger>
                <TabsTrigger value="poll" className="text-xs gap-1"><BarChart3 className="w-3 h-3" />استفتاء</TabsTrigger>
                <TabsTrigger value="sticker" className="text-xs gap-1"><Sticker className="w-3 h-3" />ملصق</TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="space-y-3 mt-3">
                <Textarea placeholder="اكتب نص الإشعار..." value={message} onChange={(e) => setMessage(e.target.value)} rows={4} dir="rtl" />
              </TabsContent>

              <TabsContent value="photo" className="space-y-3 mt-3">
                <div className="flex gap-2">
                  <Input placeholder="رابط الصورة أو ارفع ملف" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} dir="ltr" className="flex-1" />
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    <Upload className="w-4 h-4" />
                  </Button>
                </div>
                {uploadedFileName && <p className="text-xs text-muted-foreground">📎 {uploadedFileName}</p>}
                <Textarea placeholder="نص توضيحي (اختياري)..." value={message} onChange={(e) => setMessage(e.target.value)} rows={2} dir="rtl" />
              </TabsContent>

              <TabsContent value="video" className="space-y-3 mt-3">
                <div className="flex gap-2">
                  <Input placeholder="رابط الفيديو أو ارفع ملف" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} dir="ltr" className="flex-1" />
                  <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />
                  <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    <Upload className="w-4 h-4" />
                  </Button>
                </div>
                {uploadedFileName && <p className="text-xs text-muted-foreground">📎 {uploadedFileName}</p>}
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
                <div className="flex gap-2">
                  <Input placeholder="معرّف الملصق (file_id) أو ارفع ملف webp" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} dir="ltr" className="flex-1" />
                  <input ref={stickerInputRef} type="file" accept=".webp,.png,.tgs,.webm,image/webp,image/png" onChange={handleFileUpload} className="hidden" />
                  <Button variant="outline" size="icon" onClick={() => stickerInputRef.current?.click()} disabled={uploading}>
                    <Upload className="w-4 h-4" />
                  </Button>
                </div>
                {uploadedFileName && <p className="text-xs text-muted-foreground">📎 {uploadedFileName}</p>}
                <p className="text-xs text-muted-foreground">يمكنك رفع ملصق (.webp) أو إدخال file_id مباشرة</p>
              </TabsContent>

              <TabsContent value="file" className="space-y-3 mt-3">
                <div className="flex gap-2">
                  <Input placeholder="رابط الملف أو ارفع ملف" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} dir="ltr" className="flex-1" />
                  <input ref={anyFileInputRef} type="file" onChange={(e) => handleFileUpload(e, 50)} className="hidden" />
                  <Button variant="outline" size="icon" onClick={() => anyFileInputRef.current?.click()} disabled={uploading}>
                    <Upload className="w-4 h-4" />
                  </Button>
                </div>
                {uploadedFileName && <p className="text-xs text-muted-foreground">📎 {uploadedFileName}</p>}
                <Textarea placeholder="نص توضيحي (اختياري)..." value={message} onChange={(e) => setMessage(e.target.value)} rows={2} dir="rtl" />
                <p className="text-xs text-muted-foreground">يدعم جميع الصيغ: PDF, ZIP, APK, EXE, PY, JS... إلخ (حد أقصى 50 ميجابايت)</p>
              </TabsContent>
            </Tabs>

            <Button onClick={handleSend} disabled={sendNotification.isPending || uploading} className="gap-2">
              <Send className="w-4 h-4" />
              {uploading ? "جاري الرفع..." : sendNotification.isPending ? "جاري الإرسال..." : "إرسال للجميع"}
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
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(n.created_at).toLocaleString("ar-EG")}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteNotification.mutate(n.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
