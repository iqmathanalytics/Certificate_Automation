import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Award, CheckCircle2, ExternalLink, ShieldX } from "lucide-react";
import { api } from "@/lib/api-client";

type VerifyResponse = {
  valid: boolean;
  certificate?: {
    credentialId: string;
    recipientName: string;
    issuedDate: string;
    description: string | null;
    batchTitle: string | null;
    brandName: string;
    verifyUrl: string;
  };
  error?: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function VerifyCertificatePage() {
  const { credentialId } = useParams<{ credentialId: string }>();
  const [data, setData] = useState<VerifyResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!credentialId) {
      setLoading(false);
      return;
    }
    api<VerifyResponse>(`/api/verify/${encodeURIComponent(credentialId)}`)
      .then(setData)
      .catch(() => setData({ valid: false, error: "Certificate not found" }))
      .finally(() => setLoading(false));
  }, [credentialId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1e3a5f] text-white">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-sm font-bold tracking-wide text-[#1e3a5f]">IQMATH TECHNOLOGIES</p>
              <p className="text-xs text-slate-500">Certificate Verification</p>
            </div>
          </Link>
          <a
            href="https://www.iqmath.in"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-[#2563eb]"
          >
            www.iqmath.in
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        {loading ? (
          <div className="rounded-2xl border bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent" />
            <p className="mt-4 text-slate-500">Verifying certificate…</p>
          </div>
        ) : data?.valid && data.certificate ? (
          <div className="overflow-hidden rounded-2xl border bg-white shadow-lg">
            <div className="bg-gradient-to-r from-[#0f172a] via-[#1e3a5f] to-[#2563eb] px-8 py-6 text-white">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-emerald-300" />
                <div>
                  <p className="text-sm uppercase tracking-widest text-blue-200">Verified Certificate</p>
                  <h1 className="text-2xl font-bold">Authentic Certificate</h1>
                </div>
              </div>
            </div>

            <div className="space-y-6 p-8">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Recipient</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{data.certificate.recipientName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Certificate Number</p>
                  <p className="mt-1 font-mono text-lg font-semibold text-[#1e3a5f]">
                    {data.certificate.credentialId}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Issued Date</p>
                  <p className="mt-1 text-slate-700">{formatDate(data.certificate.issuedDate)}</p>
                </div>
                {data.certificate.batchTitle && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Program</p>
                    <p className="mt-1 text-slate-700">{data.certificate.batchTitle}</p>
                  </div>
                )}
              </div>

              {data.certificate.description && (
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Description</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{data.certificate.description}</p>
                </div>
              )}

              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                This certificate was issued by {data.certificate.brandName} and is valid.
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border bg-white p-12 text-center shadow-sm">
            <ShieldX className="mx-auto h-12 w-12 text-red-400" />
            <h1 className="mt-4 text-xl font-semibold text-slate-900">Certificate Not Found</h1>
            <p className="mt-2 text-slate-500">
              {credentialId
                ? `No valid certificate was found for "${credentialId}".`
                : "Please provide a certificate number in the URL."}
            </p>
            <p className="mt-4 text-sm text-slate-400">
              Format: <code className="rounded bg-slate-100 px-2 py-0.5">www.iqmath.in/certificate/IQ-XXX-XXXXX</code>
            </p>
          </div>
        )}
      </main>

      <footer className="border-t bg-white py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} IQmath Technologies ·{" "}
        <a href="https://www.iqmath.in" className="text-[#2563eb] hover:underline">
          www.iqmath.in
        </a>
      </footer>
    </div>
  );
}
