import { createFileRoute, Link, useNavigate, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/useAuth";

export const Route = createFileRoute("/app")({
  component: AppShell,
});

function AppShell() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/app" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded gradient-eco flex items-center justify-center text-white text-xs">🌎</div>
            <span className="font-semibold">GeoAmbiental AI</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/app"><Button variant="ghost" size="sm">Nova análise</Button></Link>
            <Link to="/historico"><Button variant="ghost" size="sm">Histórico</Button></Link>
            <span className="text-xs text-muted-foreground hidden md:inline">{user.email}</span>
            <Button variant="outline" size="sm" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}>Sair</Button>
          </nav>
        </div>
      </header>
      <main className="flex-1"><Outlet /></main>
    </div>
  );
}
