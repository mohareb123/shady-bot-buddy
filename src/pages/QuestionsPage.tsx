import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function QuestionsPage() {
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [options, setOptions] = useState("");
  const [category, setCategory] = useState("عام");

  const { data: questions, isLoading } = useQuery({
    queryKey: ["quiz-questions"],
    queryFn: async () => {
      const { data } = await supabase.from("quiz_questions").select("*").order("id");
      return data || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const optionsArr = options.split(",").map((o) => o.trim()).filter(Boolean);
      if (optionsArr.length < 2) throw new Error("أدخل خيارين على الأقل");
      if (!optionsArr.includes(answer)) throw new Error("الإجابة يجب أن تكون ضمن الخيارات");
      const { error } = await supabase.from("quiz_questions").insert({
        question, answer, options: optionsArr, category,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-questions"] });
      setQuestion(""); setAnswer(""); setOptions(""); setCategory("عام");
      toast.success("تم إضافة السؤال");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("quiz_questions").delete().eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-questions"] });
      toast.success("تم الحذف");
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">أسئلة الكويز</h2>
          <p className="text-muted-foreground mt-1">إضافة وإدارة أسئلة الاختبار</p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <Textarea placeholder="السؤال" value={question} onChange={(e) => setQuestion(e.target.value)} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input placeholder="الإجابة الصحيحة" value={answer} onChange={(e) => setAnswer(e.target.value)} />
              <Input placeholder="الخيارات (مفصولة بفاصلة)" value={options} onChange={(e) => setOptions(e.target.value)} />
              <Input placeholder="التصنيف" value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <Button onClick={() => addMutation.mutate()} disabled={!question || !answer || !options}>
              <Plus className="w-4 h-4 ml-2" /> إضافة سؤال
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {isLoading ? (
            <p className="text-muted-foreground text-center">جاري التحميل...</p>
          ) : questions && questions.length > 0 ? (
            questions.map((q: any) => {
              const opts = Array.isArray(q.options) ? q.options : JSON.parse(q.options || "[]");
              return (
                <Card key={q.id}>
                  <CardContent className="p-4 flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{q.question}</p>
                      <p className="text-sm text-green-600">✅ {q.answer}</p>
                      <p className="text-xs text-muted-foreground">
                        الخيارات: {opts.join(" | ")} — التصنيف: {q.category}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(q.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                لا توجد أسئلة
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
