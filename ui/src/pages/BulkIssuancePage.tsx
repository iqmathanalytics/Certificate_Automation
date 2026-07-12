import { useCallback, useEffect, useRef, useState } from "react";
import { FileSpreadsheet, Loader2, Mail, RefreshCw, Upload } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, apiForm } from "@/lib/api-client";

type TemplateOption = {
  id: string;
  name: string;
  isDefault: boolean;
};

type BatchSummary = {
  id: string;
  batchCode: string;
  title: string | null;
  issuedDate: string;
  status: string;
  totalCount: number;
  generated: number;
  emailed: number;
  failed: number;
  idPrefix: string | null;
  templateId: string | null;
  createdAt: string;
  template?: { name: string } | null;
};

type BatchDetail = BatchSummary & {
  certificates: Array<{
    id: string;
    recipientName: string;
    email: string;
    credentialId: string;
    status: string;
    emailStatus: string;
    emailError: string | null;
  }>;
};

export function BulkIssuancePage() {
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [smtpFrom, setSmtpFrom] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeBatch, setActiveBatch] = useState<BatchDetail | null>(null);
  const [issuedDate, setIssuedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState("");
  const [idPrefix, setIdPrefix] = useState("IQ-FSD");
  const [startingNumber, setStartingNumber] = useState("");
  const [nextIdPreview, setNextIdPreview] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState("");
  const [sendEmails, setSendEmails] = useState(true);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadTemplates = useCallback(async () => {
    try {
      const data = await api<{ templates: TemplateOption[] }>("/api/templates");
      setTemplates(data.templates);
      const defaultTpl = data.templates.find((t) => t.isDefault) ?? data.templates[0];
      if (defaultTpl) setTemplateId((prev) => prev || defaultTpl.id);
    } catch {
      /* templates optional on first load */
    }
  }, []);

  const loadBatches = useCallback(async () => {
    try {
      const data = await api<{ batches: BatchSummary[]; emailConfigured: boolean }>("/api/batches");
      setBatches(data.batches);
      setEmailConfigured(data.emailConfigured);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load batches");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEmailStatus = useCallback(async () => {
    try {
      const data = await api<{ configured: boolean; fromEmail: string | null }>("/api/email/status");
      setEmailConfigured(data.configured);
      setSmtpFrom(data.fromEmail);
    } catch {
      /* ignore */
    }
  }, []);

  const loadBatchDetail = useCallback(async (id: string) => {
    try {
      const data = await api<{ batch: BatchDetail }>(`/api/batches/${id}`);
      setActiveBatch(data.batch);
      return data.batch;
    } catch {
      return null;
    }
  }, []);

  const refreshIdPreview = useCallback(async (prefix: string) => {
    const trimmed = prefix.trim();
    if (!trimmed) {
      setNextIdPreview(null);
      return;
    }
    try {
      const data = await api<{ nextId: string }>(
        `/api/batches/id-preview?prefix=${encodeURIComponent(trimmed)}`,
      );
      setNextIdPreview(data.nextId);
    } catch {
      setNextIdPreview(null);
    }
  }, []);

  useEffect(() => {
    loadBatches();
    loadTemplates();
    loadEmailStatus();
  }, [loadBatches, loadTemplates, loadEmailStatus]);

  useEffect(() => {
    const timer = setTimeout(() => refreshIdPreview(idPrefix), 300);
    return () => clearTimeout(timer);
  }, [idPrefix, refreshIdPreview]);

  useEffect(() => {
    if (!activeBatch || !["PENDING", "PROCESSING"].includes(activeBatch.status)) return;
    const interval = setInterval(() => {
      loadBatchDetail(activeBatch.id).then((batch) => {
        if (batch && !["PENDING", "PROCESSING"].includes(batch.status)) {
          loadBatches();
        }
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [activeBatch, loadBatchDetail, loadBatches]);

  const handleSubmit = async () => {
    if (!csvFile) {
      toast.error("Please upload a CSV file with Name and Email columns.");
      return;
    }
    if (!idPrefix.trim()) {
      toast.error("Enter a certificate ID prefix (e.g. IQ-FSD).");
      return;
    }
    if (!templateId) {
      toast.error("Select a certificate template.");
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("csv", csvFile);
      form.append("issuedDate", new Date(issuedDate).toISOString());
      form.append("idPrefix", idPrefix.trim());
      form.append("templateId", templateId);
      if (startingNumber.trim()) form.append("startingNumber", startingNumber.trim());
      if (title.trim()) form.append("title", title.trim());
      form.append("sendEmails", sendEmails ? "true" : "false");

      const data = await apiForm<{ message: string; batch: { id: string } }>("/api/batches", form);
      toast.success(data.message);
      setCsvFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await loadBatches();
      refreshIdPreview(idPrefix);

      const batchId = data.batch.id;
      const detail = await loadBatchDetail(batchId);
      if (detail) setActiveBatch(detail);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendEmails = async (batchId: string) => {
    try {
      await api(`/api/batches/${batchId}/send-emails`, { method: "POST" });
      toast.success("Emails are being sent.");
      setTimeout(() => loadBatchDetail(batchId), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail.trim()) {
      toast.error("Enter an email address for the test.");
      return;
    }
    setSendingTest(true);
    try {
      const data = await api<{ message: string }>("/api/email/test", {
        method: "POST",
        body: JSON.stringify({ to: testEmail.trim() }),
      });
      toast.success(data.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSendingTest(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "text-emerald-600";
      case "PROCESSING":
      case "PENDING":
        return "text-amber-600";
      case "FAILED":
        return "text-red-600";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <PageHeader
        title="Issue Certificates"
        sub="Upload a CSV of student names and emails. Choose a template and certificate ID prefix — numbers auto-increment (e.g. IQ-FSD-82732, IQ-FSD-82733)."
      />

      {!emailConfigured && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Email is not configured yet. Certificates will still be generated, but emails won't be sent until SMTP
          settings are added to <code className="rounded bg-amber-100 px-1">api/.env</code>. See{" "}
          <code className="rounded bg-amber-100 px-1">api/SMTP_SETUP.md</code> for setup steps.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-5 rounded-lg border bg-card p-5 shadow-sm">
          <p className="text-sm font-semibold">New Batch</p>

          <div className="space-y-2">
            <Label htmlFor="templateId">Certificate Template</Label>
            <select
              id="templateId"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              {templates.length === 0 ? (
                <option value="">Default Template</option>
              ) : (
                templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.isDefault ? " (default)" : ""}
                  </option>
                ))
              )}
            </select>
            <p className="text-xs text-muted-foreground">
              Create or edit templates in the Template Editor.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="idPrefix">Certificate ID Prefix</Label>
              <Input
                id="idPrefix"
                value={idPrefix}
                onChange={(e) => setIdPrefix(e.target.value)}
                placeholder="IQ-FSD"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startingNumber">Starting Number (optional)</Label>
              <Input
                id="startingNumber"
                type="number"
                min={1}
                value={startingNumber}
                onChange={(e) => setStartingNumber(e.target.value)}
                placeholder="82732"
              />
            </div>
          </div>
          {nextIdPreview && (
            <p className="text-xs text-muted-foreground">
              Next certificate number: <span className="font-mono font-medium text-foreground">{nextIdPreview}</span>
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="issuedDate">Certificate Issue Date</Label>
            <Input
              id="issuedDate"
              type="date"
              value={issuedDate}
              onChange={(e) => setIssuedDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Batch Title (optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Python Workshop March 2026"
            />
          </div>

          <div className="space-y-2">
            <Label>Student CSV</Label>
            <div
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 transition hover:border-primary/60 hover:bg-muted/40"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {csvFile ? csvFile.name : "Upload CSV with Name and Email columns"}
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">
              Example: <code>Name,Email</code> then <code>John Doe,john@example.com</code>
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={sendEmails}
              onChange={(e) => setSendEmails(e.target.checked)}
              className="rounded border-input"
            />
            Send certificate emails automatically after generation
          </label>

          <Button onClick={handleSubmit} disabled={submitting || !csvFile} className="w-full">
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Generate Certificates
              </>
            )}
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-4 rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Recent Batches</p>
              <Button variant="ghost" size="sm" onClick={loadBatches}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : batches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No batches yet. Upload a CSV to get started.</p>
            ) : (
              <div className="space-y-2">
                {batches.map((batch) => (
                  <button
                    key={batch.id}
                    type="button"
                    onClick={() => loadBatchDetail(batch.id)}
                    className={`w-full rounded-lg border p-3 text-left transition hover:bg-muted/50 ${
                      activeBatch?.id === batch.id ? "border-primary bg-muted/30" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{batch.batchCode}</span>
                      <span className={`text-xs font-medium uppercase ${statusColor(batch.status)}`}>
                        {batch.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {batch.template?.name ?? "Template"} · {batch.generated}/{batch.totalCount} generated ·{" "}
                      {batch.emailed} emailed
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-lg border bg-card p-5 shadow-sm">
            <p className="text-sm font-semibold">SMTP / Email Test</p>
            {emailConfigured ? (
              <p className="text-xs text-emerald-700">
                SMTP configured{smtpFrom ? ` — sending from ${smtpFrom}` : ""}.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Add SMTP settings to <code>api/.env</code> and restart the API. See <code>api/SMTP_SETUP.md</code>.
              </p>
            )}
            <div className="flex gap-2">
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                disabled={!emailConfigured || sendingTest}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestEmail}
                disabled={!emailConfigured || sendingTest}
              >
                {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {activeBatch && (
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{activeBatch.batchCode}</h2>
              <p className="text-sm text-muted-foreground">
                {activeBatch.template?.name ?? "Template"} · {activeBatch.idPrefix ?? "—"} ·{" "}
                {activeBatch.generated}/{activeBatch.totalCount} generated · {activeBatch.emailed} emailed ·{" "}
                {activeBatch.failed} failed
              </p>
            </div>
            {activeBatch.status === "COMPLETED" && emailConfigured && (
              <Button variant="outline" size="sm" onClick={() => handleResendEmails(activeBatch.id)}>
                <Mail className="mr-1.5 h-3.5 w-3.5" />
                Resend Emails
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">Email</th>
                  <th className="pb-2 pr-4 font-medium">Certificate No</th>
                  <th className="pb-2 pr-4 font-medium">PDF</th>
                  <th className="pb-2 font-medium">Email</th>
                </tr>
              </thead>
              <tbody>
                {activeBatch.certificates.map((cert) => (
                  <tr key={cert.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{cert.recipientName}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{cert.email}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{cert.credentialId}</td>
                    <td className={`py-2 pr-4 ${statusColor(cert.status)}`}>{cert.status}</td>
                    <td className={`py-2 ${statusColor(cert.emailStatus)}`}>
                      {cert.emailStatus}
                      {cert.emailError && (
                        <span className="ml-1 text-xs text-red-500" title={cert.emailError}>
                          !
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
