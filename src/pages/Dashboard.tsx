import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, Settings, Shield } from "lucide-react";

export default function Dashboard() {
  const { isDeveloper, userChatId } = useAuth();

  const buildFilter = (query: any) => {
    if (!isDeveloper && userChatId) return query.eq("chat_id", userChatId);
    return query;
  };

  const { data: membersCount } = useQuery({
    queryKey: ["members-count", userChatId, isDeveloper],
    queryFn: async () => {
      let q = supabase.from("members").select("*", { count: "exact", head: true });
      q = buildFilter(q);
      const { count } = await q;
      return count || 0;
    },
  });

  const { data: messagesCount } = useQuery({
    queryKey: ["messages-count", userChatId, isDeveloper],
    queryFn: async () => {
      let q = supabase.from("messages_log").select("*", { count: "exact", head: true });
      q = buildFilter(q);
      const { count } = await q;
      return count || 0;
    },
  });

  const { data: groupsCount } = useQuery({
    queryKey: ["groups-count", userChatId, isDeveloper],
    queryFn: async () => {
      let q = supabase.from("group_settings").select("*", { count: "exact", head: true });
      q = buildFilter(q);
      const { count } = await q;
      return count || 0;
    },
  });

  const { data: logsCount } = useQuery({
    queryKey: ["logs-count", userChatId, isDeveloper],
    queryFn: async () => {
      let q = supabase.from("admin_logs").select("*", { count: "exact", head: true });
      q = buildFilter(q);
      const { count } = await q;
      return count || 0;
    },
  });

  const { data: recentLogs } = useQuery({
    queryKey: ["recent-logs", userChatId, isDeveloper],
    queryFn: async () => {
      let q = supabase.from("admin_logs").select("*").order("timestamp", { ascending: false }).limit(10);
      q = buildFilter(q);
      const { data } = await q;
      return data || [];
    },
  });

  const stats = [
    { label: "الأعضاء", value: membersCount ?? 0, icon: Users, color: "text-blue-500" },
    { label: "الرسائل", value: messagesCount ?? 0, icon: MessageSquare, color: "text-green-500" },
    { label: "المجموعات", value: groupsCount ?? 0, icon: Settings, color: "text-purple-500" },
    { label: "الإجراءات", value: logsCount ?? 0, icon: Shield, color: "text-orange-500" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-foreground">لوحة التحكم</h2>
          <p className="text-muted-foreground mt-1">
            {isDeveloper ? "نظرة عامة على جميع المجموعات" : "نظرة عامة على مجموعتك"}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-3xl font-bold text-foreground mt-1">{stat.value.toLocaleString("ar-EG")}</p>
                    </div>
                    <Icon className={`w-8 h-8 ${stat.color} opacity-80`} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>آخر الإجراءات الإدارية</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLogs && recentLogs.length > 0 ? (
              <div className="space-y-3">
                {recentLogs.map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                    <div className="flex items-center gap-3">
                      <Shield className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {log.action}: {log.target_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          بواسطة {log.admin_name} {log.reason ? `— ${log.reason}` : ""}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleDateString("ar-EG")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">لا توجد إجراءات بعد</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
