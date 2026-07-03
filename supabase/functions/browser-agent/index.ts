import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const BB_API = "https://api.browserbase.com/v1";
const BB_KEY = Deno.env.get("BROWSERBASE_API_KEY")!;
const BB_PROJECT = Deno.env.get("BROWSERBASE_PROJECT_ID")!;
const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function bb(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BB_API}${path}`, {
    ...init,
    headers: {
      "X-BB-API-Key": BB_KEY,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`Browserbase ${path} [${res.status}]: ${text.slice(0, 500)}`);
  return data;
}

// ---------- Contexts (persistent login storage) ----------
async function createContext(siteName: string, description?: string) {
  const ctx = await bb("/contexts", {
    method: "POST",
    body: JSON.stringify({ projectId: BB_PROJECT }),
  });
  const { data, error } = await supabase.from("browser_contexts").insert({
    bb_context_id: ctx.id,
    site_name: siteName,
    description: description || null,
  }).select().single();
  if (error) throw error;
  return data;
}

// ---------- Sessions ----------
async function createSession(opts: { contextId?: string; siteName?: string; persist?: boolean; startedBy?: number }) {
  let bbContextId: string | undefined;
  let localContext: any = null;
  if (opts.contextId) {
    localContext = await supabase.from("browser_contexts").select("*").eq("id", opts.contextId).maybeSingle();
    if (localContext.data) bbContextId = localContext.data.bb_context_id;
  }

  const body: any = {
    projectId: BB_PROJECT,
    proxies: true,
    browserSettings: {
      solveCaptchas: true,
      viewport: { width: 1280, height: 800 },
      fingerprint: { devices: ["desktop"], locales: ["ar-EG", "en-US"], operatingSystems: ["windows"] },
    },
    keepAlive: true,
  };
  if (bbContextId) {
    body.browserSettings.context = { id: bbContextId, persist: opts.persist ?? true };
  }

  const session = await bb("/sessions", { method: "POST", body: JSON.stringify(body) });

  // Get live view (debug) URL
  let liveViewUrl: string | null = null;
  try {
    const debug = await bb(`/sessions/${session.id}/debug`);
    liveViewUrl = debug?.debuggerFullscreenUrl || debug?.debuggerUrl || null;
  } catch (_) { /* ignore */ }

  const { data, error } = await supabase.from("browser_sessions").insert({
    bb_session_id: session.id,
    context_id: localContext?.data?.id || null,
    site_name: opts.siteName || null,
    status: "running",
    live_view_url: liveViewUrl,
    connect_url: session.connectUrl,
    started_by: opts.startedBy || null,
  }).select().single();
  if (error) throw error;
  return data;
}

async function endSession(sessionId: string) {
  const { data: sess } = await supabase.from("browser_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (!sess) throw new Error("session not found");
  try {
    await bb(`/sessions/${sess.bb_session_id}`, {
      method: "POST",
      body: JSON.stringify({ projectId: BB_PROJECT, status: "REQUEST_RELEASE" }),
    });
  } catch (_) { /* ignore */ }
  await supabase.from("browser_sessions").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", sessionId);
  return { ok: true };
}

// ---------- Playwright control via CDP ----------
async function withPage(connectUrl: string, fn: (page: any, browser: any) => Promise<any>) {
  // deno-lint-ignore no-explicit-any
  const { chromium } = await import("https://esm.sh/playwright-core@1.47.0") as any;
  const browser = await chromium.connectOverCDP(connectUrl);
  try {
    const contexts = browser.contexts();
    const ctx = contexts.length ? contexts[0] : await browser.newContext();
    const pages = ctx.pages();
    const page = pages.length ? pages[0] : await ctx.newPage();
    return await fn(page, browser);
  } finally {
    await browser.close().catch(() => {});
  }
}

async function uploadScreenshot(sessionId: string, bytes: Uint8Array): Promise<string> {
  const path = `browser/${sessionId}/${Date.now()}.png`;
  const { error } = await supabase.storage.from("notification-media").upload(path, bytes, {
    contentType: "image/png",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("notification-media").getPublicUrl(path);
  return data.publicUrl;
}

async function logAction(sessionId: string, action_type: string, input: any, output: any, screenshot_url?: string | null, status = "success") {
  await supabase.from("browser_actions").insert({ session_id: sessionId, action_type, input, output, screenshot_url: screenshot_url || null, status });
}

async function runStep(sessionId: string, step: { action: string; [k: string]: any }) {
  const { data: sess } = await supabase.from("browser_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (!sess || !sess.connect_url) throw new Error("session not found or expired");

  return await withPage(sess.connect_url, async (page) => {
    let output: any = {};
    switch (step.action) {
      case "goto":
        await page.goto(step.url, { waitUntil: "domcontentloaded", timeout: 45000 });
        output = { url: page.url(), title: await page.title() };
        break;
      case "click":
        await page.click(step.selector, { timeout: 15000 });
        output = { clicked: step.selector };
        break;
      case "type":
        await page.fill(step.selector, step.text);
        output = { typed: step.selector };
        break;
      case "press":
        await page.keyboard.press(step.key);
        output = { key: step.key };
        break;
      case "wait":
        await page.waitForTimeout(step.ms || 1500);
        output = { waited: step.ms || 1500 };
        break;
      case "extract":
        output = { text: (await page.content()).slice(0, 8000) };
        break;
      case "eval":
        output = { result: await page.evaluate(step.script) };
        break;
      default:
        throw new Error(`unknown action: ${step.action}`);
    }
    const shot = await page.screenshot({ type: "png", fullPage: false });
    const url = await uploadScreenshot(sess.id, new Uint8Array(shot));
    await supabase.from("browser_sessions").update({ last_screenshot: url }).eq("id", sess.id);
    await logAction(sess.id, step.action, step, output, url);
    return { output, screenshot: url };
  });
}

async function screenshot(sessionId: string) {
  const { data: sess } = await supabase.from("browser_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (!sess || !sess.connect_url) throw new Error("session not found or expired");
  return await withPage(sess.connect_url, async (page) => {
    const shot = await page.screenshot({ type: "png", fullPage: false });
    const url = await uploadScreenshot(sess.id, new Uint8Array(shot));
    await supabase.from("browser_sessions").update({ last_screenshot: url }).eq("id", sess.id);
    return { screenshot: url, url: page.url(), title: await page.title() };
  });
}

// ---------- AI planner ----------
async function aiPlan(sessionId: string, goal: string) {
  const { data: sess } = await supabase.from("browser_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (!sess) throw new Error("session not found");

  const sys = `أنت شادي — وكيل متصفح ذكي يتحكم بـPlaywright.
الهدف: ${goal}

أرجع خطة JSON فقط بهذا الشكل:
{ "steps": [{"action":"goto","url":"..."}, {"action":"click","selector":"..."}, {"action":"type","selector":"...","text":"..."}, {"action":"wait","ms":2000}, {"action":"extract"}] }

الأفعال المتاحة: goto, click, type, press (key), wait (ms), extract, eval (script).
استعمل selectors دقيقة (aria-label أو نص) وخطوات صغيرة قابلة للتنفيذ.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: sys }, { role: "user", content: goal }],
      response_format: { type: "json_object" },
    }),
  });
  const j = await res.json();
  const content = j?.choices?.[0]?.message?.content || "{}";
  let plan: any = {};
  try { plan = JSON.parse(content); } catch { plan = { steps: [] }; }

  const results: any[] = [];
  for (const step of (plan.steps || []).slice(0, 20)) {
    try {
      const r = await runStep(sess.id, step);
      results.push({ step, ...r });
    } catch (e: any) {
      results.push({ step, error: String(e.message || e) });
      await logAction(sess.id, step.action, step, { error: String(e.message || e) }, null, "error");
      break;
    }
  }
  return { plan, results };
}

// ---------- Router ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;
    let data: any = {};

    switch (action) {
      case "list_contexts":
        data = (await supabase.from("browser_contexts").select("*").order("created_at", { ascending: false })).data;
        break;
      case "create_context":
        data = await createContext(body.site_name, body.description);
        break;
      case "delete_context":
        await supabase.from("browser_contexts").delete().eq("id", body.id);
        data = { ok: true };
        break;
      case "list_sessions":
        data = (await supabase.from("browser_sessions").select("*").order("created_at", { ascending: false }).limit(50)).data;
        break;
      case "create_session":
        data = await createSession({ contextId: body.context_id, siteName: body.site_name, persist: body.persist, startedBy: body.started_by });
        break;
      case "end_session":
        data = await endSession(body.session_id);
        break;
      case "run_step":
        data = await runStep(body.session_id, body.step);
        break;
      case "screenshot":
        data = await screenshot(body.session_id);
        break;
      case "ai_execute":
        data = await aiPlan(body.session_id, body.goal);
        break;
      case "list_actions":
        data = (await supabase.from("browser_actions").select("*").eq("session_id", body.session_id).order("created_at", { ascending: false }).limit(100)).data;
        break;
      default:
        return new Response(JSON.stringify({ error: "unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("browser-agent error", e);
    return new Response(JSON.stringify({ success: false, error: String(e.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});