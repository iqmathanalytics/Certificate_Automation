import { useCallback, useEffect, useRef, useState } from "react";
import { Download, ImageIcon, Plus, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { CertificatePreview } from "@/components/certificate-preview";
import { ElementInspector } from "@/components/element-inspector";
import {
  DEFAULT_CERTIFICATE_LAYOUT,
  ELEMENT_LABELS,
  parseLayoutConfig,
  serializeLayoutConfig,
  type CertificateElementId,
  type CertificateLayoutConfig,
} from "@/lib/certificate-layout";
import { api, apiBase } from "@/lib/api-client";
import { getAuthToken } from "@/lib/auth";

type TemplateSummary = {
  id: string;
  name: string;
  isDefault: boolean;
};

type TemplateDetail = TemplateSummary & {
  bodyTemplate: string | null;
  layoutJson?: string | null;
};

const DEFAULT_BODY =
  "This is to certify that the above-named participant has successfully completed the training program conducted by IQmath Technologies, demonstrating dedication and proficiency in the subject matter.";

const PLACEHOLDER_DATA = {
  recipientName: "Student Name",
  credentialId: "IQ-FSD-82732",
  issuedOn: new Date().toISOString(),
};

export function CertificateTemplateEditor() {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [templateName, setTemplateName] = useState("");
  const [bodyTemplate, setBodyTemplate] = useState(DEFAULT_BODY);
  const [savedBody, setSavedBody] = useState(DEFAULT_BODY);
  const [layoutConfig, setLayoutConfig] = useState<CertificateLayoutConfig>(DEFAULT_CERTIFICATE_LAYOUT);
  const [savedLayout, setSavedLayout] = useState<CertificateLayoutConfig>(DEFAULT_CERTIFICATE_LAYOUT);
  const [selectedElement, setSelectedElement] = useState<CertificateElementId | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [templateImageUrl, setTemplateImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadTemplateList = useCallback(async () => {
    const data = await api<{ templates: TemplateSummary[] }>("/api/templates");
    setTemplates(data.templates);
    return data.templates;
  }, []);

  const loadTemplate = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const data = await api<{ template: TemplateDetail; imageUrl: string; hasImage: boolean }>(
        `/api/templates/${id}`,
      );
      const body = data.template.bodyTemplate ?? DEFAULT_BODY;
      const layout = parseLayoutConfig(data.template.layoutJson);
      setSelectedId(id);
      setTemplateName(data.template.name);
      setBodyTemplate(body);
      setSavedBody(body);
      setLayoutConfig(layout);
      setSavedLayout(layout);
      setTemplateImageUrl(data.hasImage ? `${apiBase}${data.imageUrl}` : null);
      setImageFile(null);
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
        setImagePreviewUrl(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load template");
    } finally {
      setLoading(false);
    }
  }, [imagePreviewUrl]);

  useEffect(() => {
    loadTemplateList()
      .then((list) => {
        const first = list.find((t) => t.isDefault) ?? list[0];
        if (first) return loadTemplate(first.id);
        setLoading(false);
      })
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : "Failed to load templates");
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDirty =
    bodyTemplate !== savedBody ||
    serializeLayoutConfig(layoutConfig) !== serializeLayoutConfig(savedLayout) ||
    imageFile !== null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const handleTemplateChange = async (id: string) => {
    if (isDirty && !window.confirm("You have unsaved changes. Switch template anyway?")) return;
    await loadTemplate(id);
  };

  const handleCreateTemplate = async () => {
    const name = window.prompt("New template name:", "Workshop Certificate");
    if (!name?.trim()) return;

    setCreating(true);
    try {
      const data = await api<{ template: TemplateSummary }>("/api/templates", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), copyFromId: selectedId || undefined }),
      });
      await loadTemplateList();
      await loadTemplate(data.template.id);
      toast.success(`Template "${data.template.name}" created`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      if (imageFile) {
        setUploadingImage(true);
        const form = new FormData();
        form.append("image", imageFile);
        const res = await fetch(`${apiBase}/api/templates/${selectedId}/image`, {
          method: "POST",
          headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
          body: form,
        });
        if (!res.ok) throw new Error("Image upload failed");
        setUploadingImage(false);
        setImageFile(null);
        setTemplateImageUrl(`${apiBase}/api/templates/${selectedId}/image?t=${Date.now()}`);
      }

      const layoutJson = serializeLayoutConfig(layoutConfig);
      const updated = await api<{ template: TemplateDetail }>(`/api/templates/${selectedId}`, {
        method: "PUT",
        body: JSON.stringify({
          name: templateName.trim() || undefined,
          bodyTemplate,
          layoutJson,
          recipientNameFont: layoutConfig.recipient.fontFamily,
          bodyFont: layoutConfig.body.fontFamily,
          recipientNameAlign: layoutConfig.recipient.textAlign === "justify" ? "center" : layoutConfig.recipient.textAlign,
          bodyAlign: layoutConfig.body.textAlign === "justify" ? "center" : layoutConfig.body.textAlign,
        }),
      });

      const body = updated.template.bodyTemplate ?? DEFAULT_BODY;
      setBodyTemplate(body);
      setSavedBody(body);
      setLayoutConfig(layoutConfig);
      setSavedLayout(layoutConfig);
      setTemplateName(updated.template.name);
      await loadTemplateList();
      toast.success("Certificate template saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  };

  const handlePreviewPdf = async () => {
    if (!selectedId) return;
    try {
      const res = await fetch(`${apiBase}/api/templates/${selectedId}/preview-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
        },
        body: JSON.stringify({
          recipientName: "Sample Student",
          credentialId: "IQ-FSD-82732",
          issuedOn: new Date().toISOString(),
          bodyText: bodyTemplate,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "PDF generation failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "certificate-preview.pdf";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Preview PDF downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const handleReset = () => {
    setBodyTemplate(savedBody);
    setLayoutConfig(savedLayout);
    setSelectedElement(null);
    setImageFile(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const updateSelectedStyle = (next: CertificateLayoutConfig[CertificateElementId]) => {
    if (!selectedElement) return;
    setLayoutConfig((c) => ({ ...c, [selectedElement]: next }));
  };

  const previewImageUrl = imagePreviewUrl ?? templateImageUrl ?? undefined;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader
          title="Certificate Templates"
          sub="Create multiple templates, edit layout Canva-style, and choose a template when issuing certificates."
        />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCreateTemplate} disabled={creating}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Template
          </Button>
          <Button variant="outline" size="sm" onClick={handlePreviewPdf} disabled={!selectedId}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Preview PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset} disabled={!isDirty || saving}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!isDirty || saving || !selectedId}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {saving ? (uploadingImage ? "Uploading…" : "Saving…") : "Save changes"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4">
        <div className="min-w-[200px] flex-1 space-y-2">
          <Label htmlFor="templateSelect">Active Template</Label>
          <select
            id="templateSelect"
            value={selectedId}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.isDefault ? " (default)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[200px] flex-1 space-y-2">
          <Label htmlFor="templateName">Template Name</Label>
          <Input
            id="templateName"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Template name"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Live Preview — click a text box to select it</p>
          {loading ? (
            <div className="flex aspect-[842/595] w-full animate-pulse items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
              Loading…
            </div>
          ) : (
            <CertificatePreview
              data={PLACEHOLDER_DATA}
              overrides={{
                bodyTemplate,
                ...(previewImageUrl ? { templateImageUrl: previewImageUrl } : {}),
              }}
              editableLayout
              layoutConfig={layoutConfig}
              selectedElement={selectedElement}
              onSelectElement={setSelectedElement}
              onLayoutConfigChange={setLayoutConfig}
              className="w-full"
            />
          )}
          <div className="flex flex-wrap gap-2">
            {(["recipient", "body", "credential", "issuedDate"] as CertificateElementId[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedElement(id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  selectedElement === id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {ELEMENT_LABELS[id]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-5 rounded-lg border bg-card p-5 shadow-sm">
          {selectedElement ? (
            <ElementInspector
              elementId={selectedElement}
              style={layoutConfig[selectedElement]}
              onChange={updateSelectedStyle}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a text box on the certificate to edit font, size, color, alignment, and box dimensions.
            </p>
          )}

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="bodyTemplate">Certificate Description (static)</Label>
            <Textarea
              id="bodyTemplate"
              value={bodyTemplate}
              onChange={(e) => {
                setBodyTemplate(e.target.value);
                if (!selectedElement) setSelectedElement("body");
              }}
              rows={5}
              className="resize-none text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Shown in the Description box. Drag the Issue Date box to position the date on the certificate.
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Certificate Template Image</Label>
            <div
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-4 transition hover:border-primary/60 hover:bg-muted/40"
              onClick={() => fileRef.current?.click()}
            >
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {imageFile ? imageFile.name : "Click to upload certificate template PNG/JPG"}
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
            <p className="text-xs text-muted-foreground">Recommended: 842 × 595 px (A4 landscape).</p>
          </div>
        </div>
      </div>
    </div>
  );
}
