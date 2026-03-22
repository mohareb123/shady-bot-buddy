import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Bell, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function NotificationsPage() {
  const [message, setMessage] = useState("");
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
    mutationFn: async (msg: string) => {
      const { data, error } = await supabase.from("notifications").insert({
        message: msg, created_by: 6570434162, is_sent: false,
      }).select().single();
      if (error) throw error;
      return await supabase.functions.invoke("telegram-bot", {
        body: { action: "broadcast", notification_id: data.id, message: msg },
      });
    },
    onSuccess: () => {
      toast({ title: "✅ تم", description: "تم إرسال الإشعار لجميع المستخدمين" });
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل إرسال الإشعار", variant: "destructive" });
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">الإشعارات</h2>
          <p className="text-muted-foreground mt-1">أرسل إشعارات مهمة لجميع مستخدمي البوت</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="w-5 h-5" /> إرسال إشعار جديد
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="اكتب نص الإشعار هنا..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4} dir="rtl"
            />
            <Button
              onClick={() => message.trim() && sendNotification.mutate(message.trim())}
              disabled={!message.trim() || sendNotification.isPending}
              className="gap-2"
            >
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
