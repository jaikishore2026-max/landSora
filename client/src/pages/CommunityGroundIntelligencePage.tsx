import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  CloudOff,
  FileImage,
  FileVideo,
  LocateFixed,
  MapPin,
  Menu,
  Radio,
  RefreshCw,
  ShieldCheck,
  Upload,
  Wifi,
  X,
} from "lucide-react";

const STORAGE_KEY = "landsora-community-ground-reports";
const CATEGORIES = [
  "New road or ground cracks",
  "Rockfall",
  "Mudslide",
  "Muddy or blocked drainage",
  "New water seepage",
  "Leaning trees or electric poles",
  "Road blockage",
  "Unusual slope activity",
  "Other",
] as const;
const SEVERITIES = ["Low", "Moderate", "High", "Critical"] as const;
const STATUSES = ["Pending upload", "Unverified", "Under review", "Corroborated", "Field verified", "Closed"] as const;
type ReportStatus = (typeof STATUSES)[number];
type Severity = (typeof SEVERITIES)[number];
type Report = {
  id: string;
  category: string;
  severity: Severity;
  description: string;
  photo?: string;
  video?: string;
  videoName?: string;
  latitude: number;
  longitude: number;
  reporterName?: string;
  reporterPhone?: string;
  observedAt: string;
  createdAt: string;
  updatedAt: string;
  status: ReportStatus;
  verification: "Not reviewed" | "Corroborated" | "Field verified";
  reviewerNotes?: string;
};

const nowForInput = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const readReports = (): Report[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};
const severityRank = (severity: Severity) => SEVERITIES.indexOf(severity);
const statusTone = (status: ReportStatus) => status.toLowerCase().replace(/\s+/g, "-");

function ReportForm({ onSaved }: { onSaved: (report: Report) => void }) {
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState<Severity>("Moderate");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<string>();
  const [video, setVideo] = useState<string>();
  const [videoName, setVideoName] = useState<string>();
  const [coordinates, setCoordinates] = useState({ latitude: "", longitude: "" });
  const [reporterName, setReporterName] = useState("");
  const [reporterPhone, setReporterPhone] = useState("");
  const [observedAt, setObservedAt] = useState(nowForInput);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const readFile = (file: File, callback: (value: string) => void) => {
    if (file.size > 8 * 1024 * 1024) {
      setError("Files must be smaller than 8 MB so they can be safely saved offline.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => callback(String(reader.result));
    reader.onerror = () => setError("The selected file could not be read.");
    reader.readAsDataURL(file);
  };
  const locate = () => {
    if (!navigator.geolocation) {
      setError("Location access is not available on this device. Enter a map location manually.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => setCoordinates({ latitude: position.coords.latitude.toFixed(6), longitude: position.coords.longitude.toFixed(6) }),
      () => setError("Location permission was not granted. Enter a map location manually."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const latitude = Number(coordinates.latitude);
    const longitude = Number(coordinates.longitude);
    if (!category || !description.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude) || !consent) {
      setError("Choose a category, describe the condition, add a valid location, and accept the consent statement.");
      return;
    }
    const timestamp = new Date().toISOString();
    const report: Report = {
      id: `CGI-${Date.now().toString(36).toUpperCase()}`,
      category,
      severity,
      description: description.trim(),
      photo,
      video,
      videoName,
      latitude,
      longitude,
      reporterName: reporterName.trim() || undefined,
      reporterPhone: reporterPhone.trim() || undefined,
      observedAt: new Date(observedAt).toISOString(),
      createdAt: timestamp,
      updatedAt: timestamp,
      status: "Pending upload",
      verification: "Not reviewed",
    };
    onSaved(report);
    setSaved(true);
    setCategory("");
    setDescription("");
    setPhoto(undefined);
    setVideo(undefined);
    setVideoName(undefined);
    setCoordinates({ latitude: "", longitude: "" });
    setReporterName("");
    setReporterPhone("");
    setConsent(false);
  };
  return (
    <form className="cgi-form" onSubmit={submit}>
      <div className="cgi-form-heading"><span className="cgi-kicker">FIELD REPORT / OFFLINE-FIRST</span><h2>Report a Ground Condition</h2><p>Community and public-data feature — physical field sensors are not yet installed.</p></div>
      {error && <div className="cgi-form-error" role="alert"><AlertTriangle size={16} />{error}<button type="button" onClick={() => setError("")} aria-label="Dismiss error"><X size={15} /></button></div>}
      {saved && <div className="cgi-form-success" role="status"><Check size={16} />Saved locally as <strong>Pending upload</strong>. It will remain on this device until a connection is available.</div>}
      <div className="cgi-form-grid">
        <label>Report category<select required value={category} onChange={event => setCategory(event.target.value)}><option value="">Select a condition</option>{CATEGORIES.map(item => <option key={item}>{item}</option>)}</select></label>
        <label>Severity<select value={severity} onChange={event => setSeverity(event.target.value as Severity)}>{SEVERITIES.map(item => <option key={item}>{item}</option>)}</select></label>
      </div>
      <label>Description<textarea required rows={4} value={description} onChange={event => setDescription(event.target.value)} placeholder="What did you observe? Include nearby landmarks and direction of travel." /></label>
      <div className="cgi-form-grid">
        <label><span>Photo upload <small>(optional)</small></span><input type="file" accept="image/*" onChange={event => { const file = event.target.files?.[0]; if (file) readFile(file, setPhoto); }} /></label>
        <label><span>Short video upload <small>(optional)</small></span><input type="file" accept="video/*" onChange={event => { const file = event.target.files?.[0]; if (file) { setVideoName(file.name); readFile(file, setVideo); } }} /></label>
      </div>
      <fieldset className="cgi-location-fieldset"><legend>GPS location / manual map location</legend><div className="cgi-location-actions"><button type="button" className="cgi-secondary-button" onClick={locate}><LocateFixed size={15} />Use my GPS</button><span>or enter coordinates</span></div><div className="cgi-form-grid"><label>Latitude<input inputMode="decimal" required value={coordinates.latitude} onChange={event => setCoordinates(current => ({ ...current, latitude: event.target.value }))} placeholder="e.g. 12.9716" /></label><label>Longitude<input inputMode="decimal" required value={coordinates.longitude} onChange={event => setCoordinates(current => ({ ...current, longitude: event.target.value }))} placeholder="e.g. 77.5946" /></label></div><div className="cgi-mini-map" role="button" tabIndex={0} onClick={event => { const rect = event.currentTarget.getBoundingClientRect(); setCoordinates({ latitude: (90 - (event.clientY - rect.top) / rect.height * 180).toFixed(6), longitude: (-180 + (event.clientX - rect.left) / rect.width * 360).toFixed(6) }); }} onKeyDown={event => { if (event.key === "Enter") setError("Use the map with a pointer or enter coordinates manually."); }}><span>Tap to set a map location</span><MapPin size={20} /></div></fieldset>
      <div className="cgi-form-grid"><label>Reporter name <small>(optional)</small><input value={reporterName} onChange={event => setReporterName(event.target.value)} /></label><label>Reporter phone number <small>(optional)</small><input type="tel" value={reporterPhone} onChange={event => setReporterPhone(event.target.value)} /></label></div>
      <label>Date and time observed<input type="datetime-local" required value={observedAt} onChange={event => setObservedAt(event.target.value)} /></label>
      <label className="cgi-consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /> <span>I consent to Landsora storing this report for community situational awareness. I understand this is not an official warning.</span></label>
      <button className="cgi-primary-button" type="submit"><Upload size={16} />Save report</button>
    </form>
  );
}

function ReportCard({ report }: { report: Report }) {
  return <article className="cgi-report-card">
    <div className="cgi-report-card-top"><span className={`cgi-status-badge ${statusTone(report.status)}`}>{report.status}</span><span className={`cgi-severity ${report.severity.toLowerCase()}`}>{report.severity}</span></div>
    <h3>{report.category}</h3><p>{report.description}</p>
    {report.photo ? <img className="cgi-photo-preview" src={report.photo} alt="Submitted ground condition" /> : <div className="cgi-no-photo"><FileImage size={16} /> No photo attached</div>}
    <div className="cgi-report-meta"><span><MapPin size={13} />{report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}</span><span>{new Date(report.observedAt).toLocaleString()}</span><span>Data source: Community submitted</span><span>Verification: {report.verification}</span><span>Last updated: {new Date(report.updatedAt).toLocaleString()}</span>{report.video && <video className="cgi-video-preview" controls preload="metadata" src={report.video} aria-label={`Submitted video for ${report.id}`} />}{report.videoName && <span><FileVideo size={13} />{report.videoName}</span>}</div>
  </article>;
}

function ContextPanel({ reports }: { reports: Report[] }) {
  const cards = [
    ["Rainfall estimate", "Data source not connected", "Unavailable", "estimated"],
    ["Current weather", "No verified public data available", "Unavailable", "measured"],
    ["Terrain and slope angle", "No verified public data available", "Unavailable", "estimated"],
    ["Historical landslide information", "No verified public data available", "Unavailable", "measured"],
    ["Community report count", String(reports.length), "Available locally", "user-reported"],
  ];
  return <section className="cgi-context"><div className="cgi-section-heading"><span className="cgi-kicker">PUBLIC DATA CONTEXT</span><h2>Context without invented readings</h2><p>Only connected, timestamped sources are shown as available.</p></div><div className="cgi-context-grid">{cards.map(([name, value, availability, type]) => <article className="cgi-context-card" key={name}><h3>{name}</h3><strong>{value}</strong><span>Source: {value.includes("not") || value.includes("No") ? "Not connected" : "Local community queue"}</span><span>Timestamp: {new Date().toLocaleString()}</span><span>Data age: just now</span><span>Confidence: {availability === "Available locally" ? "Medium" : "Low"} · Type: {type}</span><b className={availability === "Available locally" ? "available" : "unavailable"}>{availability}</b></article>)}</div></section>;
}

function Advisory({ reports }: { reports: Report[] }) {
  const verified = reports.filter(report => report.verification === "Field verified").length;
  return <section className="cgi-advisory"><div><span className="cgi-kicker">COMMUNITY ADVISORY</span><h2>Ground conditions need local context</h2><p>This is an automated advisory based on available public data and community reports. It is not an official evacuation order. Follow instructions from local authorities.</p></div><div className="cgi-advisory-grid"><span><b>Regional rainfall</b>Unavailable</span><span><b>Terrain susceptibility</b>Unavailable</span><span><b>Historical incidents</b>Not connected</span><span><b>Community reports</b>{reports.length}</span><span><b>Verified reports</b>{verified}</span><span><b>Overall concern</b>{reports.length ? "Moderate" : "Low"}</span><span><b>Confidence</b>{reports.length ? "Medium" : "Low"}</span><span><b>Ground sensor status</b>Not installed</span></div><small>Last updated: {new Date().toLocaleString()} · Community reports are not equivalent to physical sensors.</small></section>;
}

function CommunityMap({ reports }: { reports: Report[] }) {
  return <section className="cgi-map-panel"><div className="cgi-section-heading"><span className="cgi-kicker">COMMUNITY MAP</span><h2>Reported ground conditions</h2><p>Markers represent user reports only. No fake sensor stations are shown.</p></div><div className="cgi-map"><div className="cgi-map-label">COMMUNITY REPORTS · DEMONSTRATION-READY LOCAL QUEUE</div>{reports.map(report => <span key={report.id} className={`cgi-map-marker ${statusTone(report.status)} ${report.severity.toLowerCase()}`} style={{ left: `${Math.min(92, Math.max(8, ((report.longitude + 180) % 360) / 360 * 100))}%`, top: `${Math.min(86, Math.max(12, (90 - report.latitude) / 180 * 100))}%` }} title={`${report.category} — ${report.status}`} />)}{!reports.length && <div className="cgi-map-empty"><MapPin size={24} />Saved reports will appear here</div>}</div><div className="cgi-map-legend">{STATUSES.map(status => <span key={status}><i className={`cgi-map-dot ${statusTone(status)}`} />{status}</span>)}</div></section>;
}

function AdminReview({ reports, updateReport }: { reports: Report[]; updateReport: (id: string, change: Partial<Report>) => void }) {
  const [status, setStatus] = useState("All statuses");
  const [severity, setSeverity] = useState("All severities");
  const [category, setCategory] = useState("All categories");
  const [sort, setSort] = useState("newest");
  const filtered = useMemo(() => reports.filter(report => (status === "All statuses" || report.status === status) && (severity === "All severities" || report.severity === severity) && (category === "All categories" || report.category === category)).sort((a, b) => sort === "severity" ? severityRank(b.severity) - severityRank(a.severity) : b.createdAt.localeCompare(a.createdAt)), [reports, status, severity, category, sort]);
  return <section className="cgi-admin"><div className="cgi-section-heading"><span className="cgi-kicker">AUTHORIZED REVIEW</span><h2>Report Review</h2><p>Reviewer controls are available only to authenticated administrators.</p></div><div className="cgi-filters"><select value={status} onChange={event => setStatus(event.target.value)}><option>All statuses</option>{STATUSES.map(item => <option key={item}>{item}</option>)}</select><select value={severity} onChange={event => setSeverity(event.target.value)}><option>All severities</option>{SEVERITIES.map(item => <option key={item}>{item}</option>)}</select><select value={category} onChange={event => setCategory(event.target.value)}><option>All categories</option>{CATEGORIES.map(item => <option key={item}>{item}</option>)}</select><select value={sort} onChange={event => setSort(event.target.value)}><option value="newest">Newest first</option><option value="severity">Highest severity</option></select></div><CommunityMap reports={filtered} /><div className="cgi-admin-list">{filtered.map(report => <article className="cgi-review-row" key={report.id}><div><strong>{report.id}</strong><h3>{report.category}</h3><p>{report.description}</p><small>{report.latitude}, {report.longitude} · {new Date(report.createdAt).toLocaleString()}</small></div><div className="cgi-review-controls"><select value={report.status} onChange={event => { const next = event.target.value as ReportStatus; updateReport(report.id, { status: next, verification: next === "Corroborated" ? "Corroborated" : next === "Field verified" ? "Field verified" : "Not reviewed" }); }} aria-label={`Change status for ${report.id}`}>{STATUSES.map(item => <option key={item}>{item}</option>)}</select><input defaultValue={report.reviewerNotes ?? ""} placeholder="Reviewer notes" onBlur={event => updateReport(report.id, { reviewerNotes: event.target.value })} /><button type="button" className="cgi-secondary-button" onClick={() => updateReport(report.id, { status: "Corroborated", verification: "Corroborated" })}><ShieldCheck size={14} />Corroborate</button><button type="button" className="cgi-secondary-button" onClick={() => updateReport(report.id, { status: "Field verified", verification: "Field verified" })}><Check size={14} />Field verify</button></div></article>)}{!filtered.length && <div className="cgi-empty-state">No reports match these filters.</div>}</div></section>;
}

export default function CommunityGroundIntelligencePage() {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  const [syncNotice, setSyncNotice] = useState("");
  const [reports, setReports] = useState<Report[]>(readReports);
  const path = location.split("?")[0];
  const isReview = path === "/report-review";
  const active = isReview ? "review" : path === "/community-reports" ? "reports" : "report";
  useEffect(() => { const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(reports)); save(); }, [reports]);
  useEffect(() => { const on = () => { setOnline(true); if (reports.some(report => report.status === "Pending upload")) { setSyncNotice("Connection restored. Sync was attempted; no backend is connected, so reports remain safely queued."); window.setTimeout(() => setSyncNotice(""), 7000); } }; const off = () => setOnline(false); window.addEventListener("online", on); window.addEventListener("offline", off); return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); }; }, [reports]);
  const addReport = (report: Report) => setReports(current => [report, ...current]);
  const updateReport = (id: string, change: Partial<Report>) => setReports(current => current.map(report => report.id === id ? { ...report, ...change, updatedAt: new Date().toISOString() } : report));
  const pending = reports.filter(report => report.status === "Pending upload").length;
  const setTab = (tab: string) => setLocation(tab === "report" ? "/community-ground-intelligence" : tab === "reports" ? "/community-reports" : "/report-review");
  return <div className="cgi-shell">
    <header className="cgi-header"><Link href="/" className="cgi-brand"><img src="/assets/lews-logo.png" alt="" /><span><b>Landsora</b><small>COMMUNITY GROUND INTELLIGENCE</small></span></Link><div className={`cgi-network ${online ? "online" : "offline"}`}>{online ? <Wifi size={15} /> : <CloudOff size={15} />}{online ? "Online" : "Offline"}{pending > 0 && <em>{pending} pending</em>}</div><Link href="/dashboard" className="cgi-console-link">Existing Live Console <ChevronRight size={15} /></Link></header>
    <main className="cgi-main"><div className="cgi-title-row"><div><span className="cgi-kicker">ADDITIVE RURAL MONITORING LAYER</span><h1>Community Ground Intelligence</h1><p>Report local conditions before physical field sensors are installed.</p></div><div className="cgi-title-actions"><Link href="/community-reports" className="cgi-secondary-button">View Community Reports</Link><Link href="/community-ground-intelligence" className="cgi-secondary-button"><RefreshCw size={14} />Refresh sync</Link></div></div>
      <nav className="cgi-tabs" aria-label="Community Ground Intelligence"><button className={active === "report" ? "active" : ""} onClick={() => setTab("report")}><Radio size={15} />Report Ground Condition</button><button className={active === "reports" ? "active" : ""} onClick={() => setTab("reports")}><Menu size={15} />Community Reports</button>{user?.role === "admin" && <button className={active === "review" ? "active" : ""} onClick={() => setTab("review")}><ShieldCheck size={15} />Report Review</button>}</nav>
      {!online && <div className="cgi-offline-banner"><CloudOff size={16} /><span>You are offline. Reports are saved on this device and remain <strong>Pending upload</strong>; synchronization will be attempted when the connection returns.</span></div>}
      {syncNotice && online && <div className="cgi-form-success"><RefreshCw size={16} />{syncNotice}</div>}
      {active === "report" && <><div className="cgi-feature-grid"><ReportForm onSaved={addReport} /><div className="cgi-side-stack"><Advisory reports={reports} /><ContextPanel reports={reports} /></div></div><CommunityMap reports={reports} /><section className="cgi-roadmap"><span className="cgi-kicker">NEXT HORIZON</span><h2>Landsora Expansion Roadmap</h2><div><span><b>Phase 1</b>Public data and community reporting</span><span><b>Phase 2</b>Partnerships with local authorities and universities</span><span><b>Phase 3</b>Pilot rain gauges and ground sensors</span><span><b>Phase 4</b>Validated local early-warning system</span></div></section></>}
      {active === "reports" && <section className="cgi-reports-page"><div className="cgi-section-heading"><span className="cgi-kicker">SAVED REPORTS</span><h2>Community Reports</h2><p>Reports remain available in this browser even during a temporary connection loss.</p></div>{reports.length ? reports.map(report => <ReportCard key={report.id} report={report} />) : <div className="cgi-empty-state">No community reports yet. Use Report Ground Condition to add the first observation.</div>}</section>}
      {active === "review" && (isAuthenticated && user?.role === "admin" ? <AdminReview reports={reports} updateReport={updateReport} /> : <div className="cgi-access-denied"><ShieldCheck size={28} /><h2>Administrator access required</h2><p>Review tools are not exposed to normal public users.</p><Link href="/login" className="cgi-primary-button">Sign in</Link></div>)}
    </main>
  </div>;
}
