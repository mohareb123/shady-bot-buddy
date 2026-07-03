import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Globe, Play, Square, Camera, Sparkles, Plus, Trash2, ExternalLink, Loader2 } from "lucide-react";

async function call(action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("browser-agent", { body: { action, ...payload } });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || "فشل الإجراء");
  return data.data;
}

export default function BrowserPage() {
  const qc = useQueryClient();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [newContextName, setNewContextName] = useState("");
  const [selectedContext, setSelectedContext] = useState<string>("");
  const [siteName, setSiteName] = useState("");
  const [aiGoal, setAiGoal] = useState("");
  const [gotoUrl, setGotoUrl] = useState("https://google.com");

  const contexts = useQuery({ queryKey: ["bb-contexts"], queryFn: () => call("list_contexts") });
  const sessions = useQuery({ queryKey: ["bb-sessions"], queryFn: () => call("list_sessions"), refetchInterval: 5000 });
  const actions = useQuery({
    queryKey: ["bb-actions", activeSessionId],
    queryFn: () => call("list_actions", { session_id: activeSessionId }),
    enabled: !!activeSessionId,
    refetchInterval: 3000,
  });

  const active = sessions.data?.find((s: any) => s.id === activeSessionId);

  const createContext = useMutation({
    mutationFn: () => call("create_context", { site_name: newContextName }),
    onSuccess: () => { toast.success("تم إنشاء الـContext"); setNewContextName(""); qc.invalidateQueries({ queryKey: ["bb-contexts"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteContext = useMutation({
    mutationFn: (id: string) => call("delete_context", { id }),
    onSuccess: () => { toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["bb-contexts"] }); },
  });

  const startSession = useMutation({
    mutationFn: () => call("create_session", { context_id: selectedContext || undefined, site_name: siteName || undefined, persist: true }),
    onSuccess: (s: any) => { toast.success("تم بدء جلسة المتصفح"); setActiveSessionId(s.id); qc.invalidateQueries({ queryKey: ["bb-sessions"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const endSession = useMutation({
    mutationFn: (id: string) => call("end_session", { session_id: id }),
    onSuccess: () => { toast.success("تم إنهاء الجلسة"); qc.invalidateQueries({ queryKey: ["bb-sessions"] }); },
  });

  const runGoto = useMutation({
    mutationFn: () => call("run_step", { session_id: activeSessionId, step: { action: "goto", url: gotoUrl } }),
    onSuccess: () => { toast.success("تم الانتقال"); qc.invalidateQueries({ queryKey: ["bb-sessions"] }); qc.invalidateQueries({ queryKey: ["bb-actions", activeSessionId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const takeShot = useMutation({
    mutationFn: () => call("screenshot", { session_id: activeSessionId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bb-sessions"] }); qc.invalidateQueries({ queryKey: ["bb-actions", activeSessionId] }); },
  });

  const aiRun = useMutation({
    mutationFn: () => call("ai_execute", { session_id: activeSessionId, goal: aiGoal }),
    onSuccess: (r: any) => { toast.success(`نُفذت ${r.results?.length || 0} خطوة`); qc.invalidateQueries({ queryKey: ["bb-sessions"] }); qc.invalidateQueries({ queryKey: ["bb-actions", activeSessionId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Globe className="w-6 h-6" /> المتصفح التفاعلي</h1>
          <p className="text-sm text-muted-foreground mt-1">تحكم بمتصفح حقيقي في السحابة عبر Browserbase — تسجيل دخول محفوظ، أوامر AI، تخطي كابتشا.</p>
        </div>

        <Tabs defaultValue="live">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="live">الجلسة الحية</TabsTrigger>
            <TabsTrigger value="contexts">الحسابات المحفوظة</TabsTrigger>
            <TabsTrigger value="history">السجل</TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">بدء جلسة جديدة</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Context (اختياري)</label>
                    <select className="w-full mt-1 h-10 rounded-md border bg-background px-3 text-sm" value={selectedContext} onChange={e => setSelectedContext(e.target.value)}>
                      <option value="">بدون (جلسة جديدة نظيفة)</option>
                      {contexts.data?.map((c: any) => (<option key={c.id} value={c.id}>{c.site_name}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">اسم الموقع</label>
                    <Input value={siteName} onChange={e => setSiteName(e.target.value)} placeholder="مثال: فيسبوك" />
                  </div>
                  <div className="flex items-end">
                    <Button className="w-full" onClick={() => startSession.mutate()} disabled={startSession.isPending}>
                      {startSession.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} بدء
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">اختر جلسة نشطة</CardTitle>
                {active && <Badge variant={active.status === "running" ? "default" : "secondary"}>{active.status}</Badge>}
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {sessions.data?.filter((s: any) => s.status === "running").map((s: any) => (
                    <Button key={s.id} variant={activeSessionId === s.id ? "default" : "outline"} size="sm" onClick={() => setActiveSessionId(s.id)}>
                      {s.site_name || s.bb_session_id.slice(0, 8)}
                    </Button>
                  ))}
                  {!sessions.data?.some((s: any) => s.status === "running") && <p className="text-sm text-muted-foreground">لا توجد جلسات نشطة.</p>}
                </div>
              </CardContent>
            </Card>

            {active && (
              <>
                <Card>
                  <CardHeader><CardTitle className="text-base">البث المباشر (تفاعلي — سجل دخول بنفسك)</CardTitle></CardHeader>
                  <CardContent>
                    {active.live_view_url ? (
                      <div className="space-y-2">
                        <div className="aspect-video w-full rounded-lg overflow-hidden border bg-black">
                          <iframe src={active.live_view_url} className="w-full h-full" sandbox="allow-same-origin allow-scripts allow-forms allow-popups" allow="clipboard-read; clipboard-write" />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Button size="sm" variant="outline" asChild>
                            <a href={active.live_view_url} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4 ml-1" /> فتح في نافذة كاملة</a>
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => endSession.mutate(active.id)}>
                            <Square className="w-4 h-4 ml-1" /> إنهاء الجلسة
                          </Button>
                        </div>
                      </div>
                    ) : <p className="text-sm text-muted-foreground">لا يوجد رابط بث. جرّب إعادة إنشاء الجلسة.</p>}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">تحكم يدوي سريع</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Input value={gotoUrl} onChange={e => setGotoUrl(e.target.value)} placeholder="https://..." />
                      <Button onClick={() => runGoto.mutate()} disabled={runGoto.isPending}>انتقال</Button>
                      <Button variant="outline" onClick={() => takeShot.mutate()} disabled={takeShot.isPending}><Camera className="w-4 h-4" /></Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4" /> تنفيذ بالذكاء الاصطناعي</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea rows={3} value={aiGoal} onChange={e => setAiGoal(e.target.value)}
                      placeholder="مثال: افتح تويتر وابحث عن 'ذكاء اصطناعي' واستخرج أول 5 تغريدات" />
                    <Button onClick={() => aiRun.mutate()} disabled={aiRun.isPending || !aiGoal}>
                      {aiRun.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Sparkles className="w-4 h-4 ml-1" />} نفّذ
                    </Button>
                  </CardContent>
                </Card>

                {active.last_screenshot && (
                  <Card>
                    <CardHeader><CardTitle className="text-base">آخر لقطة شاشة</CardTitle></CardHeader>
                    <CardContent><img src={active.last_screenshot} alt="screenshot" className="w-full rounded border" /></CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="contexts" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">إنشاء Context جديد (لحفظ تسجيل دخول موقع)</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input value={newContextName} onChange={e => setNewContextName(e.target.value)} placeholder="اسم الموقع (فيسبوك، جوجل، تويتر...)" />
                  <Button onClick={() => createContext.mutate()} disabled={!newContextName || createContext.isPending}><Plus className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-3 md:grid-cols-2">
              {contexts.data?.map((c: any) => (
                <Card key={c.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{c.site_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{c.bb_context_id.slice(0, 20)}...</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => deleteContext.mutate(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </CardContent>
                </Card>
              ))}
              {!contexts.data?.length && <p className="text-sm text-muted-foreground col-span-full">لا توجد contexts محفوظة.</p>}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader><CardTitle className="text-base">سجل الإجراءات {active ? `— ${active.site_name || active.bb_session_id.slice(0, 8)}` : ""}</CardTitle></CardHeader>
              <CardContent className="space-y-2 max-h-[70vh] overflow-auto">
                {!activeSessionId && <p className="text-sm text-muted-foreground">اختر جلسة من التبويب الأول.</p>}
                {actions.data?.map((a: any) => (
                  <div key={a.id} className="border rounded p-2 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge variant={a.status === "success" ? "default" : "destructive"}>{a.action_type}</Badge>
                      <span className="text-muted-foreground">{new Date(a.created_at).toLocaleTimeString("ar")}</span>
                    </div>
                    {a.screenshot_url && <img src={a.screenshot_url} className="w-full rounded border" />}
                    <pre className="overflow-auto bg-muted p-1 rounded">{JSON.stringify(a.input, null, 2)}</pre>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}