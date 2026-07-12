import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CertificateTemplateEditor } from "@/pages/CertificateTemplateEditor";
import { BulkIssuancePage } from "@/pages/BulkIssuancePage";
import { LoginPage } from "@/pages/LoginPage";
import { VerifyCertificatePage } from "@/pages/VerifyCertificatePage";
import { APP_BASENAME, isCredentialSlug } from "@/lib/routes";
import { isAuthenticated } from "@/lib/auth";

function RootRedirect() {
  return <Navigate to={isAuthenticated() ? "/issue" : "/login"} replace />;
}

function VerifyRoute() {
  const { credentialId } = useParams<{ credentialId: string }>();
  if (!isCredentialSlug(credentialId)) {
    return <Navigate to="/login" replace />;
  }
  return <VerifyCertificatePage />;
}

export default function App() {
  return (
    <BrowserRouter basename={APP_BASENAME}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/issue"
          element={
            <ProtectedRoute>
              <AppShell>
                <BulkIssuancePage />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/template"
          element={
            <ProtectedRoute>
              <AppShell>
                <CertificateTemplateEditor />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route path="/:credentialId" element={<VerifyRoute />} />
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
