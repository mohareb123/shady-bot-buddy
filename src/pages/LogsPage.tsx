import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function LogsPage() {
  const { isDeveloper, userChatId } = useAuth();

  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin-logs", userChatId, isDeveloper],
    queryFn: async () => {
      let q = supabase.from("admin_logs").select("*").order("timestamp", { ascending: false }).limit(100);
      if (!isDeveloper && userChatId) q = q.eq("chat_id", userChatId);
      const { data } = await q;
      return data || [];
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">سجلات الإدارة</h2>
          <p className="text-muted-foreground mt-1">
            {isDeveloper ? "جميع الإجراءات الإدارية" : "إجراءات مجموعتك"}
          </p>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-center">جاري التحميل...</p>
        ) : logs && logs.length > 0 ? (
          <div className="space-y-3">
            {logs.map((log: any) => (
              <Card key={log.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground text-sm">{log.action}</span>
                        {log.target_name && <span className="text-sm text-muted-foreground">← {log.target_name}</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>بواسطة {log.admin_name}</span>
                        {log.reason && <span>— {log.reason}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString("ar-EG")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-8 text-center text-muted-foreground">لا توجد سجلات</CardContent></Card>
        )}
      </div>
    </DashboardLayout>
  );
}
