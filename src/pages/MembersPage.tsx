import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">المستوى</TableHead>
                  <TableHead className="text-right">النقاط</TableHead>
                  <TableHead className="text-right">العملات</TableHead>
                  <TableHead className="text-right">الرسائل</TableHead>
                  <TableHead className="text-right">التحذيرات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell></TableRow>
                ) : members && members.length > 0 ? (
                  members.map((m: any) => (
                    <TableRow key={`${m.user_id}-${m.chat_id}`}>
                      <TableCell className="font-medium">{m.full_name || m.username || m.user_id}</TableCell>
                      <TableCell><Badge variant="secondary">⭐ {m.level}</Badge></TableCell>
                      <TableCell>{m.points.toLocaleString("ar-EG")}</TableCell>
                      <TableCell>{m.coins.toLocaleString("ar-EG")}</TableCell>
                      <TableCell>{m.messages_count.toLocaleString("ar-EG")}</TableCell>
                      <TableCell>
                        {m.warnings > 0 ? (
                          <Badge variant="destructive">{m.warnings}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا يوجد أعضاء بعد</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
