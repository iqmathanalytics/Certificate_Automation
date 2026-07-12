import { Link, useLocation, useNavigate } from "react-router-dom";
import { Award, FileSpreadsheet, LayoutTemplate, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearAuthSession, getAuthEmail } from "@/lib/auth";

const NAV = [
  { to: "/issue", label: "Issue Certificates", icon: FileSpreadsheet },
  { to: "/template", label: "Template Editor", icon: LayoutTemplate },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const email = getAuthEmail();

  const handleLogout = () => {
    clearAuthSession();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/issue" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-sm font-bold tracking-wide text-primary">IQMATH TECHNOLOGIES</p>
              <p className="text-xs text-muted-foreground">Certificate Automation</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-1">
              {NAV.map(({ to, label, icon: Icon }) => {
                const active = location.pathname === to;
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </Link>
                );
              })}
            </nav>
            {email && (
              <span className="hidden text-xs text-muted-foreground md:inline">{email}</span>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
