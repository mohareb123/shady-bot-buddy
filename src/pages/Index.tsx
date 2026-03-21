import { Link } from "react-router-dom";
import { Bot, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div dir="rtl" className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-8 max-w-lg">
        <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center mx-auto">
          <Bot className="w-10 h-10 text-primary-foreground" />
        </div>
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-foreground tracking-tight">بوت شادي</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            بوت تليغرام ذكي لإدارة المجموعات مع نظام نقاط وألعاب وردود ذكية
          </p>
        </div>
        <Link to="/login">
          <Button size="lg" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            دخول لوحة التحكم
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Index;
