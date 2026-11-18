import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageContainer, PageHeader } from "@/components/page";
import { useToast } from "@/hooks/use-toast";
import { Mail, Copy, Send, Trash2, Loader2, CheckCircle2, Clock, Check, Upload, FileSpreadsheet, AlertTriangle, Download } from "lucide-react";

interface ParsedCsvRow {
  rowNumber: number;
  rollNo: string;
  name: string;
  email: string;
  role: string;
  cohortIds: number[];
  status: "valid" | "duplicate" | "malformed";
  reason?: string;
}

interface CsvImportReport {
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  duplicates: { rowNumber: number; email: string; firstSeenRow: number }[];
  malformed: { rowNumber: number; rawEmail: string; reason: string }[];
}

interface Cohort { id: number; name: string; teacherName: string | null }
interface Invite {
  id: number;
  email: string;
  name: string | null;
  role: string;
  cohortIds: number[] | null;
  acceptedAt: string | null;
  createdAt: string;
  inviteUrl: string;
}

async function api<T = unknown>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, { headers: { "Content-Type": "application/json" }, ...opts });
  if (!res.ok) {
    let msg = res.statusText;
    try { const j = await res.json(); msg = j?.error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export default function AdminInvitesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: cohorts } = useQuery({ queryKey: ["admin-cohorts"], queryFn: () => api<Cohort[]>("/admin/cohorts") });
  const { data: invites, isLoading } = useQuery({ queryKey: ["admin-invites"], queryFn: () => api<Invite[]>("/admin/invites") });

  const [emails, setEmails] = useState("");
  const [role, setRole] = useState("student");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [csvRows, setCsvRows] = useState<ParsedCsvRow[]>([]);
  const [csvMode, setCsvMode] = useState<"partial" | "atomic">("partial");
  const [onDuplicate, setOnDuplicate] = useState<"update" | "skip">("update");
  const [csvReport, setCsvReport] = useState<CsvImportReport | null>(null);

  const parseCsvText = (rawText: string) => {
    const lines = rawText.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim().length > 0);
    if (lines.length === 0) {
      setCsvRows([]);
      return;
    }
    const headerCols = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ""));
    const hasHeader = headerCols.includes("email") || headerCols.includes("name") || headerCols.includes("roll_no");
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const idxRoll = hasHeader ? Math.max(headerCols.indexOf("roll_no"), headerCols.indexOf("student_id")) : 0;
    const idxName = hasHeader ? headerCols.indexOf("name") : 1;
    const idxEmail = hasHeader ? headerCols.indexOf("email") : 2;
    const idxRole = hasHeader ? headerCols.indexOf("role") : 3;

    const seen = new Map<string, number>();
    const parsed: ParsedCsvRow[] = dataLines.map((line, i) => {
      const rowNumber = hasHeader ? i + 2 : i + 1;
      const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const rollNo = idxRoll >= 0 ? cols[idxRoll] || "" : "";
      const name = idxName >= 0 ? cols[idxName] || "" : cols[0] || "";
      const email = (idxEmail >= 0 ? cols[idxEmail] || "" : cols[1] || "").toLowerCase();
      const rowRole = (idxRole >= 0 && cols[idxRole] ? cols[idxRole] : "student").toLowerCase();

      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return { rowNumber, rollNo, name, email, role: rowRole, cohortIds: [], status: "malformed", reason: "Invalid or missing email address" };
      }
      if (!name) {
        return { rowNumber, rollNo, name, email, role: rowRole, cohortIds: [], status: "malformed", reason: "Missing student full name" };
      }
      if (rowRole !== "student" && rowRole !== "teacher") {
        return { rowNumber, rollNo, name, email, role: rowRole, cohortIds: [], status: "malformed", reason: `Invalid role "${rowRole}"` };
      }
      if (seen.has(email)) {
        return { rowNumber, rollNo, name, email, role: rowRole, cohortIds: [], status: "duplicate", reason: `Duplicate of row #${seen.get(email)}` };
      }
      seen.set(email, rowNumber);
      return { rowNumber, rollNo, name, email, role: rowRole, cohortIds: [], status: "valid" };
    });
    setCsvRows(parsed);
    setCsvReport(null);
  };

  const downloadSampleCsv = () => {
    const sample = [
      "roll_no,name,email,role",
      "26BCOM001,Aarav Naik,aarav.naik@dempocollege.edu.in,student",
      "26BCOM002,sanika.kamath@dempocollege.edu.in,Sanika Kamath,student",
      "26BCOM003,Rohan Dessai,rohan.dessai@dempocollege.edu.in,student",
      "26BCOM004,Aarav Naik Duplicate,aarav.naik@dempocollege.edu.in,student",
      "26BBA019,Meera Sardesai,meera.sardesai@dempocollege.edu.in,student",
      "FAC012,Prof. Vidya Prabhu,vidya.prabhu@dempocollege.edu.in,teacher",
    ].join("\n");
    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dempo-vidya-roster-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCsvMutation = useMutation({
    mutationFn: () =>
      api<CsvImportReport>("/admin/invites/csv", {
        method: "POST",
        body: JSON.stringify({
          rows: csvRows.map((r) => ({
            rowNumber: r.rowNumber,
            rollNo: r.rollNo || null,
            name: r.name || null,
            email: r.email,
            role: r.role,
            cohortIds: r.cohortIds,
          })),
          mode: csvMode,
          onDuplicate,
          defaultCohortIds: Array.from(selected),
        }),
      }),
    onSuccess: (report) => {
      setCsvReport(report);
      toast({
        title: "CSV Roster Import Complete",
        description: `${report.created} created · ${report.updated} updated · ${report.skipped} skipped · ${report.malformed.length} malformed`,
      });
      invalidate();
    },
    onError: (e: Error) =>
      toast({ title: "CSV Import Failed", description: e.message, variant: "destructive" }),
  });

  const cohortName = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of cohorts ?? []) m.set(c.id, c.name);
    return m;
  }, [cohorts]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-invites"] });
  const toggleCohort = (id: number) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const copy = (url: string, notify = true) =>
    navigator.clipboard?.writeText(url).then(() => notify && toast({ title: "Invite link copied" })).catch(() => {});

  const send = useMutation({
    mutationFn: () =>
      api<{ created: number; updated: number; invalid: string[] }>("/admin/invites/bulk", {
        method: "POST",
        body: JSON.stringify({ emails, role, cohortIds: Array.from(selected) }),
      }),
    onSuccess: (r) => {
      const parts = [];
      if (r.created) parts.push(`${r.created} invited`);
      if (r.updated) parts.push(`${r.updated} updated`);
      if (r.invalid.length) parts.push(`${r.invalid.length} skipped`);
      toast({
        title: "Invites sent",
        description: (parts.join(" · ") || "Done") + (r.invalid.length ? ` — invalid: ${r.invalid.slice(0, 5).join(", ")}` : ""),
      });
      setEmails("");
      invalidate();
    },
    onError: (e: Error) => toast({ title: "Could not send invites", description: e.message, variant: "destructive" }),
  });

  const resend = useMutation({
    mutationFn: (id: number) => api(`/admin/invites/${id}/resend`, { method: "POST" }),
    onSuccess: () => toast({ title: "Invite re-sent (if email is configured)" }),
    onError: (e: Error) => toast({ title: "Could not resend", description: e.message, variant: "destructive" }),
  });
  const revoke = useMutation({
    mutationFn: (id: number) => api(`/admin/invites/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast({ title: "Invite revoked" }); invalidate(); },
    onError: (e: Error) => toast({ title: "Could not revoke", description: e.message, variant: "destructive" }),
  });

  const emailCount = emails.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean).length;

  return (
    <PageContainer className="animate-in fade-in duration-300">
      <PageHeader
        title="Roster & Institutional Invitations"
        description="Onboard 2,000+ students via structured CSV roster upload or quick email invite. Access is strictly allow-listed by verified institutional email."
      />

      {/* Task 5: Structured CSV Bulk Roster Import */}
      <Card className="shadow-sm mb-8 border-primary/20">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-5 h-5 text-primary shrink-0" />
              <div>
                <h2 className="font-semibold text-base">Bulk CSV Roster Import (Up to 2,500 Students)</h2>
                <p className="text-xs text-muted-foreground">
                  Required columns: <code>roll_no, name, email, role</code>. Validates malformed rows &amp; duplicate emails before import.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={downloadSampleCsv}>
                <Download className="w-4 h-4 mr-1.5" /> Sample CSV
              </Button>
              <Label
                htmlFor="csv-upload"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3 cursor-pointer"
              >
                <Upload className="w-4 h-4 mr-1.5" /> Upload CSV File
              </Label>
              <input
                id="csv-upload"
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => parseCsvText(String(reader.result || ""));
                  reader.readAsText(file);
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Transaction Mode on Malformed Rows</Label>
              <Select value={csvMode} onValueChange={(v) => setCsvMode(v as "partial" | "atomic")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="partial">Partial Commit (Import valid rows, flag malformed rows)</SelectItem>
                  <SelectItem value="atomic">All-or-Nothing Atomic (Abort if any row is malformed)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Duplicate Email Policy</Label>
              <Select value={onDuplicate} onValueChange={(v) => setOnDuplicate(v as "update" | "skip")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="update">Idempotent Update (Update name &amp; cohort mapping)</SelectItem>
                  <SelectItem value="skip">Skip Existing Accounts</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {csvRows.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="secondary">{csvRows.length} Total Rows</Badge>
                <Badge className="bg-success/15 text-success border-success/30">
                  {csvRows.filter((r) => r.status === "valid").length} Valid
                </Badge>
                <Badge className="bg-warning/15 text-warning border-warning/30">
                  {csvRows.filter((r) => r.status === "duplicate").length} Intra-CSV Duplicates
                </Badge>
                <Badge className="bg-danger/15 text-danger border-danger/30">
                  {csvRows.filter((r) => r.status === "malformed").length} Malformed Rows
                </Badge>
              </div>

              <div className="max-h-60 overflow-y-auto border rounded-lg divide-y text-xs">
                {csvRows.slice(0, 100).map((r) => (
                  <div key={r.rowNumber} className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-mono text-muted-foreground mr-2">Row #{r.rowNumber}</span>
                      <span className="font-medium">{r.name || "(Missing Name)"}</span>
                      {r.rollNo && <span className="ml-1.5 text-muted-foreground">({r.rollNo})</span>}
                      <span className="ml-2 font-mono">{r.email || "(Empty Email)"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.status === "valid" && <span className="text-success font-medium">Ready ({r.role})</span>}
                      {r.status === "duplicate" && (
                        <span className="text-warning flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> {r.reason}
                        </span>
                      )}
                      {r.status === "malformed" && (
                        <span className="text-danger flex items-center gap-1 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5" /> {r.reason}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setCsvRows([]); setCsvReport(null); }}>
                  Clear Preview
                </Button>
                <Button
                  size="sm"
                  disabled={importCsvMutation.isPending || (csvMode === "atomic" && csvRows.some((r) => r.status === "malformed"))}
                  onClick={() => importCsvMutation.mutate()}
                >
                  {importCsvMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Commit CSV Roster ({csvRows.filter((r) => r.status === "valid").length} valid rows)
                </Button>
              </div>
            </div>
          )}

          {csvReport && (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-1">
              <div className="font-semibold">Import Audit Summary</div>
              <p className="text-xs text-muted-foreground">
                Processed {csvReport.totalRows} rows: <strong>{csvReport.created} created</strong>,{" "}
                <strong>{csvReport.updated} updated</strong>, <strong>{csvReport.skipped} skipped</strong>,{" "}
                <strong>{csvReport.duplicates.length} duplicate rows ignored</strong>,{" "}
                <strong>{csvReport.malformed.length} malformed rows rejected</strong>.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite form (handles one or many) */}
      <Card className="shadow-sm mb-8">
        <CardContent className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="emails">Emails</Label>
            <Textarea
              id="emails"
              rows={4}
              placeholder="Paste emails — one per line, or separated by commas/spaces&#10;maya@example.com&#10;jae@example.com"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{emailCount} email{emailCount === 1 ? "" : "s"} detected.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-full sm:w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 flex-1">
              <Label>Add to cohorts (optional)</Label>
              {cohorts && cohorts.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {cohorts.map((c) => {
                    const on = selected.has(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCohort(c.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${on ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-input"}`}
                        title={c.teacherName ? `${c.name} — ${c.teacherName}` : c.name}
                      >
                        {on && <Check className="w-3.5 h-3.5" />}
                        {c.name}
                        {c.teacherName && <span className={`text-xs ${on ? "text-primary-foreground/80" : "text-muted-foreground"}`}>· {c.teacherName}</span>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No cohorts yet — create one on the Cohorts page to assign invitees.</p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button disabled={emailCount === 0 || send.isPending} onClick={() => send.mutate()}>
              {send.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send {emailCount || ""} invite{emailCount === 1 ? "" : "s"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Invite emails send automatically once MSG91 is configured. Until then, copy each invite link from the list below to share.
          </p>
        </CardContent>
      </Card>

      <h2 className="text-lg font-serif font-semibold mb-3">Invited ({invites?.length ?? 0})</h2>
      <Card className="shadow-sm">
        <CardContent className="p-0 divide-y">
          {isLoading ? (
            <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
          ) : invites && invites.length > 0 ? (
            invites.map((inv) => (
              <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{inv.name || inv.email}</span>
                    <Badge variant="secondary" className="capitalize">{inv.role}</Badge>
                    {inv.acceptedAt ? (
                      <span className="inline-flex items-center gap-1 text-xs text-success"><CheckCircle2 className="w-3.5 h-3.5" /> Joined</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3.5 h-3.5" /> Pending</span>
                    )}
                  </div>
                  {inv.name && <div className="text-sm text-muted-foreground truncate">{inv.email}</div>}
                  {inv.cohortIds && inv.cohortIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {inv.cohortIds.map((cid) => (
                        <span key={cid} className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {cohortName.get(cid) || `Cohort ${cid}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => copy(inv.inviteUrl)} title="Copy invite link"><Copy className="w-4 h-4" /></Button>
                  {!inv.acceptedAt && (
                    <Button variant="ghost" size="sm" onClick={() => resend.mutate(inv.id)} disabled={resend.isPending} title="Resend email"><Send className="w-4 h-4" /></Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => revoke.mutate(inv.id)} disabled={revoke.isPending} title="Revoke access"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <Mail className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-sm">No invitations yet. Add emails above to give people access.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
