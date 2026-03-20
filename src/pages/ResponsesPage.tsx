import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ResponsesPage() {
  const queryClient = useQueryClient();
  const [trigger, setTrigger] = useState("");
  const [response, setResponse] = useState("");

  const { data: responses, isLoading } = useQuery({
    queryKey: ["auto-responses"],
    queryFn: async () => {
      const { data } = await supabase.from("auto_responses").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("auto_responses").insert({
        chat_id: 0, trigger_word: trigger, response, created_by: "لوحة التحكم",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-responses"] });
      setTrigger("");
      setResponse("");
      toast.success("تم إضافة الرد التلقائي");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("auto_responses").delete().eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-responses"] });
      toast.success("تم الحذف");
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">الردود التلقائية</h2>
          <p className="text-muted-foreground mt-1">إدارة الردود التلقائية للبوت</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex gap-3">
              <Input placeholder="الكلمة المفتاحية" value={trigger} onChange={(e) => setTrigger(e.target.value)} className="flex-1" />
              <Input placeholder="الرد" value={response} onChange={(e) => setResponse(e.target.value)} className="flex-[2]" />
              <Button onClick={() => addMutation.mutate()} disabled={!trigger || !response}>
                <Plus className="w-4 h-4 ml-2" /> إضافة
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {isLoading ? (
            <p className="text-muted-foreground text-center">جاري التحميل...</p>
          ) : responses && responses.length > 0 ? (
            responses.map((r: any) => (
              <Card key={r.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-foreground">🔑 {r.trigger_word}</span>
                    <span className="mx-3 text-muted-foreground">→</span>
                    <span className="text-muted-foreground">{r.response}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(r.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                لا توجد ردود تلقائية
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
