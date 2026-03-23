import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Bot, Lock, Mail, Key, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [devPassword, setDevPassword] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [linkCode, setLinkCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { loginWithPassword, login, register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleDevLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginWithPassword(devPassword)) {
      navigate("/dashboard");
    } else {
      toast({ title: "خطأ", description: "كلمة المرور غير صحيحة", variant: "destructive" });
      setDevPassword("");
    }
  };

  const handleUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const success = await login(email, password);
    setLoading(false);
    if (success) {
      navigate("/dashboard");
    } else {
      toast({ title: "خطأ", description: "بيانات الدخول غير صحيحة", variant: "destructive" });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkCode) {
      toast({ title: "خطأ", description: "أدخل رمز ربط المجموعة", variant: "destructive" });
      return;
    }
    setLoading(true);
    const result = await register(email, password, linkCode);
    setLoading(false);
    if (result.success) {
      toast({ title: "نجاح", description: "تم إنشاء الحساب وربط المجموعة بنجاح!" });
      navigate("/dashboard");
    } else {
      toast({ title: "خطأ", description: result.error || "فشل إنشاء الحساب", variant: "destructive" });
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto">
            <Bot className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl">لوحة تحكم شادي</CardTitle>
          <p className="text-sm text-muted-foreground">سجل دخولك للوصول للوحة التحكم</p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="dev" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="dev">المطور</TabsTrigger>
              <TabsTrigger value="login">دخول</TabsTrigger>
              <TabsTrigger value="register">تسجيل</TabsTrigger>
            </TabsList>

            <TabsContent value="dev">
              <form onSubmit={handleDevLogin} className="space-y-4">
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="password" placeholder="كلمة مرور المطور" value={devPassword} onChange={(e) => setDevPassword(e.target.value)} className="pr-10" autoFocus />
                </div>
                <Button type="submit" className="w-full">دخول كمطور</Button>
              </form>
            </TabsContent>

            <TabsContent value="login">
              <form onSubmit={handleUserLogin} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} className="pr-10" />
                </div>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>{loading ? "جاري الدخول..." : "دخول"}</Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} className="pr-10" />
                </div>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" />
                </div>
                <div className="relative">
                  <Key className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="text" placeholder="رمز ربط المجموعة (من /linkdashboard)" value={linkCode} onChange={(e) => setLinkCode(e.target.value)} className="pr-10" />
                </div>
                <p className="text-xs text-muted-foreground">أرسل /linkdashboard في مجموعتك للحصول على رمز الربط</p>
                <Button type="submit" className="w-full" disabled={loading}>
                  <UserPlus className="w-4 h-4 ml-2" />
                  {loading ? "جاري التسجيل..." : "إنشاء حساب"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
