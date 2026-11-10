"use client";

import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/hooks/AuthGuard";
import { BookOpen } from "lucide-react";
import { clearTokens } from "@/lib/auth";
import { CONFIG } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const router = useRouter();
  const { isChecking } = useAuthGuard({ requireAuth: true });

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Verifying session...</p>
      </div>
    );
  }

  const handleLogout = () => {
    clearTokens();
    router.push(CONFIG.ROUTES.LOGIN);
  };

  return (
      <main className="dashboard-page">
        <header className="dashboard-topbar">
          <div className="dashboard-brand">
            <div className="dashboard-brand-mark" aria-hidden="true">NCF</div>
            <div>
              <p>Naga College Foundation</p>
              <span>STUDENT PORTAL</span>
            </div>
          </div>
          <Button className="dashboard-logout" variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </header>

        <section className="dashboard-content">
          <p className="dashboard-kicker">TRUTH AND WISDOM · EST. 1947</p>
          <h1>Welcome back!</h1>
          <p className="dashboard-lead">Your student portal is ready when you are.</p>
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle><BookOpen size={18} /> Your NCF account</CardTitle>
            </CardHeader>
            <CardContent>
            <p className="text-muted-foreground">
                You are signed in. Use this portal to continue your NCF journey.
            </p>
            </CardContent>
          </Card>
        </section>
      </main>
  );
}
