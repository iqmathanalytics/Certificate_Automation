import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import { CertificateTemplateEditor } from "@/pages/CertificateTemplateEditor";
import { BulkIssuancePage } from "@/pages/BulkIssuancePage";
import { VerifyCertificatePage } from "@/pages/VerifyCertificatePage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/certificate/:credentialId" element={<VerifyCertificatePage />} />
        <Route
          path="/*"
          element={
            <AppShell>
              <Routes>
                <Route path="/" element={<Navigate to="/issue" replace />} />
                <Route path="/issue" element={<BulkIssuancePage />} />
                <Route path="/template" element={<CertificateTemplateEditor />} />
              </Routes>
            </AppShell>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
