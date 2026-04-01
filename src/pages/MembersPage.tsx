import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MembersPage() {
  const { isDeveloper, userChatId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useQuery({
    queryKey: ["members", userChatId, isDeveloper],
    queryFn: async () => {
      let q = supabase.from("members").select("*").order("points", { ascending: false }).limit(100);
      if (!isDeveloper && userChatId) q = q.eq("chat_id", userChatId);
      const { data } = await q;
      return data || [];
    },
  });

  const promoteMember = useMutation({
    mutationFn: async ({ userId, chatId }: { userId: number; chatId: number }) => {
      const { data, error } = await supabase.functions.invoke("telegram-bot", {
        body: { action: "promote_member", user_id: userId, chat_id: chatId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "✅ تمت الترقية بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: () => toast({ title: "خطأ", description: "فشلت الترقية", variant: "destructive" }),
  });

  const demoteMember = useMutation({
    mutationFn: async ({ userId, chatId }: { userId: number; chatId: number }) => {
      const { data, error } = await supabase.functions.invoke("telegram-bot", {
        body: { action: "demote_member", user_id: userId, chat_id: chatId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "✅ تم التخفيض بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: () => toast({ title: "خطأ", description: "فشل التخفيض", variant: "destructive" }),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">الأعضاء</h2>
          <p className="text-muted-foreground mt-1">
            {isDeveloper ? "جميع الأعضاء في كل المجموعات" : "أعضاء مجموعتك"}
          </p>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-center">جاري التحميل...</p>
        ) : members && members.length > 0 ? (
          <>
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
                      {isDeveloper && <th className="text-right p-3 font-medium text-muted-foreground">إجراءات</th>}
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
                        {isDeveloper && (
                          <td className="p-3">
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" title="ترقية أدمن"
                                onClick={() => promoteMember.mutate({ userId: m.user_id, chatId: m.chat_id })}>
                                <ShieldCheck className="w-4 h-4 text-green-600" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" title="خفض أدمن"
                                onClick={() => demoteMember.mutate({ userId: m.user_id, chatId: m.chat_id })}>
                                <ShieldOff className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

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
                    {isDeveloper && (
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" variant="outline" className="text-xs gap-1"
                          onClick={() => promoteMember.mutate({ userId: m.user_id, chatId: m.chat_id })}>
                          <ShieldCheck className="w-3 h-3" /> ترقية
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs gap-1"
                          onClick={() => demoteMember.mutate({ userId: m.user_id, chatId: m.chat_id })}>
                          <ShieldOff className="w-3 h-3" /> خفض
                        </Button>
                      </div>
                    )}
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
