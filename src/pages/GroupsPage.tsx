import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function GroupsPage() {
  const { data: groups, isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const { data } = await supabase.from("group_settings").select("*");
      return data || [];
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">المجموعات</h2>
          <p className="text-muted-foreground mt-1">إعدادات المجموعات المسجلة</p>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">جاري التحميل...</p>
        ) : groups && groups.length > 0 ? (
          <div className="grid gap-4">
            {groups.map((g: any) => (
              <Card key={g.chat_id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-foreground">مجموعة #{g.chat_id}</h3>
                    <span className="text-xs text-muted-foreground">
                      {new Date(g.created_at).toLocaleDateString("ar-EG")}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={g.links_allowed ? "default" : "destructive"}>
                      {g.links_allowed ? "✅" : "❌"} الروابط
                    </Badge>
                    <Badge variant={g.media_allowed ? "default" : "destructive"}>
                      {g.media_allowed ? "✅" : "❌"} الوسائط
                    </Badge>
                    <Badge variant={g.spam_protection ? "default" : "destructive"}>
                      {g.spam_protection ? "✅" : "❌"} حماية السبام
                    </Badge>
                    <Badge variant={g.welcome_enabled ? "default" : "destructive"}>
                      {g.welcome_enabled ? "✅" : "❌"} الترحيب
                    </Badge>
                    <Badge variant="secondary">
                      ⚠️ الحد الأقصى: {g.max_warnings}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              لا توجد مجموعات مسجلة بعد
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
