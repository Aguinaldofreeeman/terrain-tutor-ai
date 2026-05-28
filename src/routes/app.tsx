import { createFileRoute, Link, useNavigate, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/useAuth";
import { Sun, Moon } from "lucide-react";

export const Route = createFileRoute("/app")({
  component: AppShell,
});

function AppShell() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved === "dark" || saved === "light") return saved;
      // Default to dark mode for that premium look
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  const toggleTheme = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));

  return (
    <div className="min-h-screen bg-background flex flex-col transition-colors duration-300">
      <header className="border-b border-border bg-card/85 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/app" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded gradient-eco flex items-center justify-center text-white text-xs shadow-sm">🌎</div>
            <span className="font-semibold tracking-tight">GeoAmbiental AI</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link to="/app"><Button variant="ghost" size="sm" className="font-medium">Nova análise</Button></Link>
            <Link to="/historico"><Button variant="ghost" size="sm" className="font-medium">Histórico</Button></Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-foreground rounded-full"
              title={theme === "light" ? "Mudar para Modo Escuro" : "Mudar para Modo Claro"}
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </Button>
            <span className="text-xs text-muted-foreground hidden md:inline border-l border-border pl-3">{user.email}</span>
            <Button variant="outline" size="sm" className="border-border hover:bg-muted" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}>Sair</Button>
          </nav>
        </div>
      </header>
      <main className="flex-1 bg-background/50"><Outlet /></main>
    </div>
  );
}

