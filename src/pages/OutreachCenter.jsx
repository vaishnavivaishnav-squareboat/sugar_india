import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Zap, Copy, Check, Mail, Send, RefreshCw, MapPin, Search, ArrowUpRight, SendHorizonal, Clock, ChevronRight, CornerDownRight, X, Paperclip } from "lucide-react";

const API = `${import.meta.env.VITE_BACKEND_URL}/api`;

const segColor = (s) => ({
  Hotel: "#793518", Restaurant: "#3D6B56", Cafe: "#8FA39A",
  Bakery: "#793518", CloudKitchen: "#D4956A", Catering: "#6B5E44",
  Mithai: "#A0522D", IceCream: "#C4878A",
  Beverage: "#4A7FA5", FoodProcessing: "#7B6D47", Organic: "#5A8A3C", Brewery: "#7B4F72",
}[s] || "#5C736A");

const priorityColor = (p) => p === "High" ? "#793518" : p === "Medium" ? "#793518" : "#5C736A";

const StatusBadge = ({ status }) => {
  const cfg = {
    sent:            { cls: "bg-green-100 text-green-700",   label: "sent" },
    follow_up_sent:  { cls: "bg-blue-100 text-blue-700",     label: "follow-up sent" },
    draft:           { cls: "bg-[#EDF0EA] text-[#5C736A]",   label: "draft" },
  };
  const { cls, label } = cfg[status] || cfg.draft;
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>;
};

export default function OutreachCenter() {
  const [tab, setTab] = useState("generate"); // "generate" | "history"
  const [emails, setEmails] = useState([]);
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [activeEmail, setActiveEmail] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [markSentLoading, setMarkSentLoading] = useState(false);
  const [markSentError, setMarkSentError] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [leadSearch, setLeadSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [followUpSending, setFollowUpSending] = useState(false);
  const [followUpResult, setFollowUpResult] = useState(null);
  const navigate = useNavigate();

  // Auto-dismiss banners after 5 seconds
  useEffect(() => {
    if (!bulkResult) return;
    const t = setTimeout(() => setBulkResult(null), 5000);
    return () => clearTimeout(t);
  }, [bulkResult]);

  useEffect(() => {
    if (!followUpResult) return;
    const t = setTimeout(() => setFollowUpResult(null), 5000);
    return () => clearTimeout(t);
  }, [followUpResult]);

  const refreshPage = () => window.location.reload();

  const handleBulkSend = async () => {
    if (!window.confirm("Send personalized emails to all new leads?")) return;
    setBulkSending(true);
    setBulkResult(null);
    try {
      const { data: { task_id } } = await axios.post(`${API}/outreach/bulk-send`);
      const poll = async () => {
        const { data } = await axios.get(`${API}/outreach/bulk-send/${task_id}`);
        if (data.status === "completed") {
          setBulkResult(data.result);
          const emailRes = await axios.get(`${API}/outreach/emails`);
          setEmails(emailRes.data);
          setBulkSending(false);
          // refreshPage();
        } else if (data.status === "failed") {
          setBulkResult({ error: data.error || "Task failed." });
          setBulkSending(false);
        } else {
          setTimeout(poll, 3000);
        }
      };
      setTimeout(poll, 3000);
    } catch (err) {
      setBulkResult({ error: err?.response?.data?.detail || err.message });
      setBulkSending(false);
    }
  };

  const handleFollowUp = async () => {
    if (!window.confirm("Send follow-up emails to contacted leads with no response in the last 3 days?")) return;
    setFollowUpSending(true);
    setFollowUpResult(null);
    try {
      const { data: { task_id } } = await axios.post(`${API}/outreach/follow-up`);
      const poll = async () => {
        const { data } = await axios.get(`${API}/outreach/follow-up/${task_id}`);
        if (data.status === "completed") {
          setFollowUpResult(data.result);
          const emailRes = await axios.get(`${API}/outreach/emails`);
          setEmails(emailRes.data);
          setFollowUpSending(false);
          // refreshPage();
        } else if (data.status === "failed") {
          setFollowUpResult({ error: data.error || "Task failed." });
          setFollowUpSending(false);
        } else {
          setTimeout(poll, 3000);
        }
      };
      setTimeout(poll, 3000);
    } catch (err) {
      setFollowUpResult({ error: err?.response?.data?.detail || err.message });
      setFollowUpSending(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const [emailRes, leadRes] = await Promise.all([
        axios.get(`${API}/outreach/emails`),
        axios.get(`${API}/leads`, { params: { limit: 200 } })
      ]);
      setEmails(emailRes.data);
      setLeads(leadRes.data.leads || []);
      setLoading(false);
    };
    init();
  }, []);

  const handleGenerateEmail = async () => {
    if (!selectedLead) return;
    setGenerating(true);
    setGenerateError("");
    try {
      const res = await axios.post(`${API}/leads/${selectedLead.id}/generate-email`);
      setEmails(prev => [res.data, ...prev.filter(e => e.lead_id !== res.data.lead_id)]);
      setActiveEmail(res.data);
      setMarkSentError("");
    } catch (err) {
      setGenerateError(err?.response?.data?.detail || err.message || "Email generation failed.");
    }
    setGenerating(false);
  };

  const markSent = async (emailId) => {
    setMarkSentLoading(true);
    setMarkSentError("");
    try {
      const res = await axios.put(`${API}/outreach/${emailId}/mark-sent`);
      setEmails(prev => prev.map(e => e.id === emailId ? res.data : e));
      if (activeEmail?.id === emailId) setActiveEmail(res.data);
      refreshPage();
    } catch (err) {
      setMarkSentError(err?.response?.data?.detail || err.message || "Failed to send email.");
    }
    setMarkSentLoading(false);
  };

  const copyEmail = () => {
    if (!activeEmail) return;
    navigator.clipboard.writeText(`Subject: ${activeEmail.subject}\n\n${activeEmail.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Only show leads with status "new" in the Generate Email tab
  const draftLeadIds = new Set(
    emails.filter(e => e.status === "draft").map(e => e.lead_id)
  );

  const filteredLeads = leads.filter(l =>
    l.status === "new" &&
    (!leadSearch ||
      l.business_name.toLowerCase().includes(leadSearch.toLowerCase()) ||
      l.city.toLowerCase().includes(leadSearch.toLowerCase()))
  );

  const filteredEmails = emails.filter(e =>
    !historySearch ||
    e.lead_name?.toLowerCase().includes(historySearch.toLowerCase()) ||
    e.lead_city?.toLowerCase().includes(historySearch.toLowerCase()) ||
    e.subject?.toLowerCase().includes(historySearch.toLowerCase())
  );

  if (loading) {
    return <div className="p-6 animate-pulse"><div className="h-8 bg-[#EAECE6] rounded w-48 mb-6" /></div>;
  }

  return (
    <div className="p-6" style={{ backgroundColor: "#F7F4EC", minHeight: "100vh" }}>

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#5C736A] mb-1" style={{ letterSpacing: '0.2em' }}>AI Outreach</p>
          <h1 className="text-2xl font-bold text-[#567937]" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>Outreach Center</h1>
          <p className="text-sm text-[#5C736A] mt-1">Generate and manage AI-personalized sales emails</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            data-testid="follow-up-btn"
            onClick={handleFollowUp}
            disabled={followUpSending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#3D6B8A] hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {followUpSending
              ? <><RefreshCw size={14} className="animate-spin" /> Sending...</>
              : <><CornerDownRight size={14} /> Send Follow-ups</>}
          </button>
          <button
            data-testid="bulk-send-btn"
            onClick={handleBulkSend}
            disabled={bulkSending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#793518] hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {bulkSending
              ? <><RefreshCw size={14} className="animate-spin" /> Sending...</>
              : <><SendHorizonal size={14} /> Bulk Send All</>}
          </button>
        </div>
      </div>

      {/* Bulk result banner */}
      {bulkResult && (
        <div className={`mb-4 p-3 rounded-lg text-xs border flex items-start justify-between gap-3 ${
          bulkResult.error ? "bg-red-50 border-red-200 text-red-700" : "bg-[#EDF0EA] border-[#C8D5C0] text-[#3D5A30]"
        }`}>
          <span className="flex-1">
            {bulkResult.error
              ? <>❌ Bulk send failed: {bulkResult.error}</>
              : <>
                  ✅ Bulk send complete — <strong>{bulkResult.sent?.length ?? 0} sent</strong>,{" "}
                  {bulkResult.skipped?.length ?? 0} skipped,{" "}
                  {bulkResult.errors?.length ?? 0} errors
                  {bulkResult.errors?.length > 0 && (
                    <span className="ml-2 text-red-600">({bulkResult.errors.map(e => e.name).join(", ")})</span>
                  )}
                </>
            }
          </span>
          <button onClick={() => setBulkResult(null)} className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity">
            <X size={13} />
          </button>
        </div>
      )}

      {/* Follow-up result banner */}
      {followUpResult && (
        <div className={`mb-4 p-3 rounded-lg text-xs border flex items-start justify-between gap-3 ${
          followUpResult.error ? "bg-red-50 border-red-200 text-red-700" : "bg-blue-50 border-blue-200 text-blue-800"
        }`}>
          <span className="flex-1">
            {followUpResult.error
              ? <>❌ Follow-up failed: {followUpResult.error}</>
              : <>
                  <CornerDownRight size={12} className="inline mr-1" />
                  Follow-ups complete — <strong>{followUpResult.sent?.length ?? 0} sent</strong>,{" "}
                  {followUpResult.skipped?.length ?? 0} skipped,{" "}
                  {followUpResult.errors?.length ?? 0} errors
                  {followUpResult.total_processed === 0 && <span className="ml-2 text-blue-600">(no leads due for follow-up yet)</span>}
                </>
            }
          </span>
          <button onClick={() => setFollowUpResult(null)} className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity">
            <X size={13} />
          </button>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-5 bg-white border border-[#DCE1D9] rounded-xl p-1 w-fit">
        {[
          { id: "generate", label: "Generate Email", icon: Zap },
          { id: "history",  label: `History (${emails.length})`, icon: Clock },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === id
                ? "bg-[#567937] text-white shadow-sm"
                : "text-[#5C736A] hover:bg-[#F0F3EF]"
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          TAB 1 — GENERATE
      ══════════════════════════════════════════════════════ */}
      {tab === "generate" && (
        <div className="grid grid-cols-5 gap-4">

          {/* LEFT: lead selector */}
          <div className="col-span-2 space-y-3">
            <div className="bg-white border border-[#DCE1D9] rounded-xl p-4">
              <p className="text-xs uppercase tracking-widest text-[#5C736A] mb-3" style={{ letterSpacing: '0.15em' }}>Select a Lead <span className="normal-case text-[#9CA3AF] ml-1">({filteredLeads.length})</span></p>
              <div className="relative mb-3">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  value={leadSearch}
                  onChange={e => setLeadSearch(e.target.value)}
                  placeholder="Search by name or city…"
                  className="w-full pl-8 border border-[#DCE1D9] rounded-md py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#567937]"
                />
              </div>
              <div className="space-y-1 max-h-[420px] overflow-y-auto">
                {filteredLeads.slice(0, 50).map((lead, i) => (
                  <button
                    key={lead.id}
                    data-testid={`lead-selector-${i}`}
                    onClick={() => { setSelectedLead(lead); setGenerateError(""); setActiveEmail(null); }}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                      selectedLead?.id === lead.id
                        ? "border-[#567937] bg-[#567937]/5"
                        : "border-transparent hover:bg-[#F7F4EC]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-[#16221E] truncate flex-1">{lead.business_name}</p>
                      <ChevronRight size={11} className="text-[#9CA3AF] flex-shrink-0 ml-1" />
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[10px] text-[#9CA3AF] flex items-center gap-1">
                        <MapPin size={9} /> {lead.city}
                      </span>
                      <div className="flex items-center gap-1">
                        {draftLeadIds.has(lead.id) && (
                          <span className="text-[9px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">draft</span>
                        )}
                        <span className="text-[9px] text-white px-1.5 py-0.5 rounded" style={{ backgroundColor: segColor(lead.segment) }}>{lead.segment}</span>
                        <span className="text-[9px] font-bold" style={{ color: priorityColor(lead.priority) }}>{lead.ai_score}</span>
                      </div>
                    </div>
                  </button>
                ))}
                {filteredLeads.length === 0 && (
                  <p className="text-xs text-[#9CA3AF] text-center py-6">
                    {leadSearch ? "No leads match your search" : "No new or draft leads found"}
                  </p>
                )}
              </div>
            </div>

            {/* Generate button card */}
            {selectedLead && (
              <div className="bg-[#567937] text-white rounded-xl p-4">
                <p className="text-xs text-white/50 uppercase tracking-widest mb-1" style={{ letterSpacing: '0.15em' }}>Selected</p>
                <p className="font-semibold text-sm">{selectedLead.business_name}</p>
                <p className="text-xs text-white/60 mt-0.5">{selectedLead.segment} · {selectedLead.city}</p>
                <div className="flex gap-2 mt-3">
                  <button
                    data-testid="generate-email-outreach-btn"
                    onClick={handleGenerateEmail}
                    disabled={generating}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[#567937] text-xs font-semibold bg-white hover:bg-[#F0F0F0] disabled:opacity-60 transition-opacity"
                  >
                    {generating ? <><RefreshCw size={12} className="animate-spin" /> Generating…</> : <><Zap size={12} /> Generate Email</>}
                  </button>
                  <button
                    data-testid="view-lead-detail-btn"
                    onClick={() => navigate(`/leads/${selectedLead.id}`)}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    title="View lead detail"
                  >
                    <ArrowUpRight size={14} />
                  </button>
                </div>
                {generateError && (
                  <p className="mt-2 text-[10px] text-red-200 bg-red-900/30 rounded px-2 py-1.5 leading-snug">⚠ {generateError}</p>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: email preview */}
          <div className="col-span-3">
            {activeEmail ? (
              <div className="bg-white border border-[#DCE1D9] rounded-xl overflow-hidden">
                <div className="bg-[#F7F4EC] border-b border-[#DCE1D9] px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-[#9CA3AF] uppercase tracking-widest mb-1">Subject</p>
                      <p className="text-sm font-semibold text-[#16221E]">{activeEmail.subject}</p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={copyEmail} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#DCE1D9] text-xs text-[#5C736A] hover:bg-[#EDF0EA]">
                        {copied ? <><Check size={12} className="text-green-600" /> Copied</> : <><Copy size={12} /> Copy</>}
                      </button>
                      {activeEmail.status === "draft" && (
                        <button
                          onClick={() => markSent(activeEmail.id)}
                          disabled={markSentLoading}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-white bg-[#793518] hover:opacity-90 disabled:opacity-60"
                        >
                          {markSentLoading
                            ? <><RefreshCw size={12} className="animate-spin" /> Sending…</>
                            : <><Send size={12} /> Send Email</>}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-xs text-[#9CA3AF]">
                    <span className="flex items-center gap-1"><Mail size={11} /> To: {activeEmail.lead_name}</span>
                    <span>·</span>
                    <span>{new Date(activeEmail.generated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                    <StatusBadge status={activeEmail.status} />
                  </div>
                  {/* Attachment */}
                  <div className="mt-3">
                    <a
                      href="/DhampurGreen_HOReCa_RateList_2026.html"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#C3A32E]/40 bg-[#C3A32E]/8 text-[#876929] text-[11px] font-medium hover:bg-[#C3A32E]/15 transition-colors"
                      style={{ backgroundColor: 'rgba(195,163,46,0.08)' }}
                    >
                      <Paperclip size={11} />
                      DhampurGreen_HOReCa_RateList_2026.html
                    </a>
                  </div>
                  {markSentError && (
                    <p className="mt-2 text-[10px] text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">⚠ {markSentError}</p>
                  )}
                </div>
                <div className="p-5 max-h-[480px] overflow-y-auto">
                  <pre className="text-xs text-[#16221E] whitespace-pre-wrap font-sans leading-relaxed">{activeEmail.body}</pre>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-[#DCE1D9] rounded-xl h-full min-h-[320px] flex flex-col items-center justify-center text-center p-12">
                <Mail size={36} className="text-[#DCE1D9] mb-3" strokeWidth={1} />
                <p className="text-sm font-medium text-[#16221E]">No email preview</p>
                <p className="text-xs text-[#9CA3AF] mt-1">Select a lead on the left and click<br /><strong>Generate Email</strong></p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 2 — HISTORY
      ══════════════════════════════════════════════════════ */}
      {tab === "history" && (
        <div className="grid grid-cols-5 gap-4">

          {/* Table */}
          <div className="col-span-3">
            <div className="bg-white border border-[#DCE1D9] rounded-xl overflow-hidden">
              {/* search */}
              <div className="px-4 py-3 border-b border-[#F0F3EF] flex items-center gap-2">
                <Search size={13} className="text-[#9CA3AF]" />
                <input
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  placeholder="Search by lead, city or subject…"
                  className="flex-1 text-xs bg-transparent focus:outline-none text-[#16221E] placeholder:text-[#9CA3AF]"
                />
              </div>

              {/* table header */}
              <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-[#F7F4EC] border-b border-[#F0F3EF] text-[10px] uppercase tracking-widest text-[#9CA3AF]">
                <div className="col-span-3">Lead</div>
                <div className="col-span-4">Subject</div>
                <div className="col-span-2">City</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1 text-right">Date</div>
              </div>

              {/* rows */}
              <div className="divide-y divide-[#F0F3EF] max-h-[560px] overflow-y-auto">
                {filteredEmails.length === 0 ? (
                  <p className="text-xs text-[#9CA3AF] text-center py-10">No emails found</p>
                ) : filteredEmails.map((email, i) => (
                  <button
                    key={email.id}
                    data-testid={`email-history-item-${i}`}
                    onClick={() => { setActiveEmail(email); setMarkSentError(""); }}
                    className={`w-full grid grid-cols-12 gap-2 px-4 py-3 text-left transition-colors ${
                      activeEmail?.id === email.id ? "bg-[#567937]/5" : "hover:bg-[#F7F4EC]"
                    }`}
                  >
                    <div className="col-span-3 flex items-center gap-2 min-w-0">
                      {activeEmail?.id === email.id && <div className="w-1 h-4 rounded bg-[#567937] flex-shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#16221E] truncate">{email.lead_name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {email.lead_segment && (
                            <span className="text-[9px] text-white px-1 py-0.5 rounded" style={{ backgroundColor: segColor(email.lead_segment) }}>
                              {email.lead_segment}
                            </span>
                          )}
                          {email.email_type === "follow_up" && (
                            <span className="text-[9px] text-blue-700 bg-blue-100 px-1 py-0.5 rounded flex items-center gap-0.5">
                              <CornerDownRight size={8} /> follow-up
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="col-span-4 flex items-center min-w-0">
                      <p className="text-xs text-[#5C736A] truncate">{email.subject || "—"}</p>
                    </div>
                    <div className="col-span-2 flex items-center">
                      <span className="text-xs text-[#9CA3AF] truncate">{email.lead_city}</span>
                    </div>
                    <div className="col-span-2 flex items-center">
                      <StatusBadge status={email.status} />
                    </div>
                    <div className="col-span-1 flex items-center justify-end">
                      <span className="text-[10px] text-[#9CA3AF]">
                        {new Date(email.sent_at || email.generated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview panel */}
          <div className="col-span-2">
            {activeEmail ? (
              <div className="bg-white border border-[#DCE1D9] rounded-xl overflow-hidden sticky top-4">
                <div className="bg-[#F7F4EC] border-b border-[#DCE1D9] px-4 py-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-xs font-semibold text-[#16221E] flex-1 leading-snug">{activeEmail.subject}</p>
                    <StatusBadge status={activeEmail.status} />
                  </div>
                  <p className="text-[10px] text-[#9CA3AF] flex items-center gap-1">
                    <Mail size={10} /> {activeEmail.lead_name} · {activeEmail.lead_city}
                  </p>
                  <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                    {new Date(activeEmail.generated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  {/* Attachment */}
                  <a
                    href="/DhampurGreen_HOReCa_RateList_2026.html"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#C3A32E]/40 text-[#876929] text-[11px] font-medium hover:bg-[#C3A32E]/15 transition-colors w-full truncate"
                    style={{ backgroundColor: 'rgba(195,163,46,0.08)' }}
                  >
                    <Paperclip size={11} className="flex-shrink-0" />
                    <span className="truncate">DhampurGreen_HOReCa_RateList_2026.html</span>
                  </a>
                  <div className="flex gap-1.5 mt-2">
                    <button onClick={copyEmail} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#DCE1D9] text-xs text-[#5C736A] hover:bg-[#EDF0EA]">
                      {copied ? <><Check size={11} className="text-green-600" /> Copied</> : <><Copy size={11} /> Copy</>}
                    </button>
                    {activeEmail.status === "draft" && (
                      <button
                        onClick={() => markSent(activeEmail.id)}
                        disabled={markSentLoading}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs text-white bg-[#793518] hover:opacity-90 disabled:opacity-60"
                      >
                        {markSentLoading
                          ? <><RefreshCw size={11} className="animate-spin" /> Sending…</>
                          : <><Send size={11} /> Send Email</>}
                      </button>
                    )}
                  </div>
                  {markSentError && (
                    <p className="mt-2 text-[10px] text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">⚠ {markSentError}</p>
                  )}
                </div>
                <div className="p-4 max-h-[440px] overflow-y-auto">
                  <pre className="text-xs text-[#16221E] whitespace-pre-wrap font-sans leading-relaxed">{activeEmail.body}</pre>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-[#DCE1D9] rounded-xl h-full min-h-[200px] flex flex-col items-center justify-center text-center p-8">
                <Mail size={28} className="text-[#DCE1D9] mb-2" strokeWidth={1} />
                <p className="text-xs text-[#9CA3AF]">Click a row to preview</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
