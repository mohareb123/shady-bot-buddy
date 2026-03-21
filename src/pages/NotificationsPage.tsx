import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
        message: msg,
        created_by: 6570434162,
        is_sent: false,
      }).select().single();
      if (error) throw error;

      // Trigger the broadcast via edge function
      const res = await supabase.functions.invoke("telegram-bot", {
        body: { action: "broadcast", notification_id: data.id, message: msg },
      });
      return res;
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
              <Bell className="w-5 h-5" />
              إرسال إشعار جديد
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="اكتب نص الإشعار هنا..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              dir="rtl"
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

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">سجل الإشعارات</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الرسالة</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell></TableRow>
                ) : notifications && notifications.length > 0 ? (
                  notifications.map((n: any) => (
                    <TableRow key={n.id}>
                      <TableCell className="max-w-xs truncate">{n.message}</TableCell>
                      <TableCell>
                        <Badge variant={n.is_sent ? "default" : "secondary"}>
                          {n.is_sent ? "✅ تم الإرسال" : "⏳ قيد الإرسال"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(n.created_at).toLocaleString("ar-EG")}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">لا توجد إشعارات بعد</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
