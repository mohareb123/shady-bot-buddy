import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function LogsPage() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin-logs"],
    queryFn: async () => {
      const { data } = await supabase.from("admin_logs")
        .select("*").order("timestamp", { ascending: false }).limit(100);
      return data || [];
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">سجلات الإدارة</h2>
          <p className="text-muted-foreground mt-1">جميع الإجراءات الإدارية</p>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الإجراء</TableHead>
                  <TableHead className="text-right">الهدف</TableHead>
                  <TableHead className="text-right">المشرف</TableHead>
                  <TableHead className="text-right">السبب</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell></TableRow>
                ) : logs && logs.length > 0 ? (
                  logs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.action}</TableCell>
                      <TableCell>{log.target_name}</TableCell>
                      <TableCell>{log.admin_name}</TableCell>
                      <TableCell className="text-muted-foreground">{log.reason || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(log.timestamp).toLocaleString("ar-EG")}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد سجلات</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
