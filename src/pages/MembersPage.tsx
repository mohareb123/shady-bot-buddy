import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function MembersPage() {
  const { data: members, isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data } = await supabase.from("members")
        .select("*").order("points", { ascending: false }).limit(100);
      return data || [];
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">الأعضاء</h2>
          <p className="text-muted-foreground mt-1">قائمة أعضاء البوت ونقاطهم</p>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-center">جاري التحميل...</p>
        ) : members && members.length > 0 ? (
          <>
            {/* Desktop table */}
            <Card className="hidden md:block">
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right p-3 font-medium text-muted-foreground">الاسم</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">المستوى</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">النقاط</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">العملات</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">الرسائل</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">التحذيرات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m: any) => (
                      <tr key={`${m.user_id}-${m.chat_id}`} className="border-b last:border-0">
                        <td className="p-3 font-medium">{m.full_name || m.username || m.user_id}</td>
                        <td className="p-3"><Badge variant="secondary">⭐ {m.level}</Badge></td>
                        <td className="p-3">{m.points.toLocaleString("ar-EG")}</td>
                        <td className="p-3">{m.coins.toLocaleString("ar-EG")}</td>
                        <td className="p-3">{m.messages_count.toLocaleString("ar-EG")}</td>
                        <td className="p-3">
                          {m.warnings > 0 ? <Badge variant="destructive">{m.warnings}</Badge> : <span className="text-muted-foreground">0</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {members.map((m: any) => (
                <Card key={`${m.user_id}-${m.chat_id}`}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{m.full_name || m.username || m.user_id}</span>
                      <Badge variant="secondary">⭐ {m.level}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <div>💎 {m.points.toLocaleString("ar-EG")}</div>
                      <div>💰 {m.coins.toLocaleString("ar-EG")}</div>
                      <div>💬 {m.messages_count.toLocaleString("ar-EG")}</div>
                    </div>
                    {m.warnings > 0 && <Badge variant="destructive" className="text-xs">⚠️ {m.warnings} تحذيرات</Badge>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <Card><CardContent className="p-8 text-center text-muted-foreground">لا يوجد أعضاء بعد</CardContent></Card>
        )}
      </div>
    </DashboardLayout>
  );
}
