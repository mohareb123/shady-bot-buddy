import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, Users, MessageSquare, Shield, 
  HelpCircle, Bot, Settings, Bell, LogOut, Menu, X, Globe
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { path: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
  { path: "/members", label: "الأعضاء", icon: Users },
  { path: "/groups", label: "المجموعات", icon: Settings },
  { path: "/logs", label: "السجلات", icon: Shield },
  { path: "/responses", label: "الردود التلقائية", icon: MessageSquare },
  { path: "/questions", label: "الأسئلة", icon: HelpCircle },
  { path: "/notifications", label: "الإشعارات", icon: Bell },
  { path: "/browser", label: "المتصفح التفاعلي", icon: Globe },
];

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const { logout } = useAuth();

  return (
    <>
      <div className="p-4 md:p-6 border-b flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <Bot className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-bold text-foreground">بوت شادي</h1>
          <p className="text-xs text-muted-foreground">لوحة التحكم</p>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={logout}
        >
          <LogOut className="w-4 h-4" />
          تسجيل الخروج
        </Button>
      </div>
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div dir="rtl" className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 border-l bg-card flex-col shrink-0">
        <NavContent />
      </aside>

      {/* Mobile header + sheet */}
      <div className="flex-1 flex flex-col overflow-auto">
        <header className="md:hidden flex items-center justify-between p-4 border-b bg-card sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground text-sm">بوت شادي</span>
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 p-0 flex flex-col">
              <NavContent onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1">
          <div className="p-4 md:p-8 max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
