import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Award, Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import { isAuthenticated, setAuthSession } from "@/lib/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/issue";

  const [email, setEmail] = useState("contact@iqmath.in");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated()) {
    return <Navigate to={from.startsWith("/") ? from : "/issue"} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api<{ token: string; email: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      setAuthSession(data.token, data.email);
      toast.success("Signed in");
      navigate(from.startsWith("/") ? from : "/issue", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-6 py-4">
          <Link to="/login" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1e3a5f] text-white">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-sm font-bold tracking-wide text-[#1e3a5f]">IQMATH TECHNOLOGIES</p>
              <p className="text-xs text-slate-500">Certificate Admin</p>
            </div>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-slate-900">Admin Sign In</h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to issue certificates and manage templates.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </>
              )}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
