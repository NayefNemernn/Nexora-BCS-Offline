import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import {
  getLicenseKeyStatus, setupLicenseKey, listLicenses, createLicense,
  downloadLicenseFile, renewLicense, addDeviceToLicense, deleteLicense,
  updateLicenseNotes,
} from "../api/superadmin.api";
import {
  Key, Plus, Download, RefreshCw, Monitor, Trash2, FileText,
  CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Copy, Eye, EyeOff,
} from "lucide-react";

/* ── Tiny helpers ────────────────────────────────────────────────────────────── */
const daysLeft = (d) => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null;
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString() : "—";

const StatusBadge = ({ expiresAt }) => {
  const days = daysLeft(expiresAt);
  if (days === null) return null;
  if (days < 0)  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">Expired</span>;
  if (days < 30) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">{days}d left</span>;
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400">{days}d left</span>;
};

const Modal = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className={`bg-white dark:bg-[#16161f] rounded-2xl w-full ${wide ? "max-w-2xl" : "max-w-md"} shadow-2xl max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-white/[0.08]`}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/[0.08]">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">{title}</h3>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition">✕</button>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  </div>
);

const Field = ({ label, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</label>
    {children}
  </div>
);

const inp = "w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/[0.1] bg-gray-50 dark:bg-white/[0.04] text-sm text-gray-900 dark:text-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition placeholder-gray-400";
const btn = (color="blue") => `px-4 py-2 rounded-xl text-sm font-bold transition ${
  color === "blue"   ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25" :
  color === "green"  ? "bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-600/20" :
  color === "red"    ? "bg-red-600 hover:bg-red-700 text-white" :
  color === "amber"  ? "bg-amber-500 hover:bg-amber-600 text-white" :
                       "bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.1]"
}`;

/* ── Key Setup Panel ─────────────────────────────────────────────────────────── */
function KeySetupPanel({ onConfigured }) {
  const [pemText, setPemText]   = useState("");
  const [loading, setLoading]   = useState(false);
  const fileRef                 = useRef();

  const onFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPemText(ev.target.result);
    reader.readAsText(f);
  };

  const handleSave = async () => {
    if (!pemText.trim()) return toast.error("Paste or upload your private.pem file.");
    setLoading(true);
    try {
      await setupLicenseKey(pemText);
      toast.success("Private key saved. You can now create licenses.");
      onConfigured();
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto mt-12 p-8 rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
          <Key size={18} className="text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">Private Key Setup</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">One-time setup required to sign licenses</p>
        </div>
      </div>

      <div className="space-y-3 mb-5 text-sm text-gray-600 dark:text-gray-400">
        <p>1. Run <code className="bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono">node tools/generate-keys.js</code> in your project to create the key pair.</p>
        <p>2. Open <code className="bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono">tools/keys/private.pem</code> and paste its contents below, or use the file picker.</p>
        <p>3. The key is stored securely on this machine only — never distributed.</p>
      </div>

      <div className="space-y-3">
        <textarea
          rows={6} value={pemText} onChange={e => setPemText(e.target.value)}
          placeholder={"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"}
          className={`${inp} font-mono text-xs resize-none`}
        />
        <div className="flex gap-2">
          <button onClick={() => fileRef.current?.click()} className={btn("gray")}>
            📂 Browse File
          </button>
          <input ref={fileRef} type="file" accept=".pem" className="hidden" onChange={onFile} />
          <button onClick={handleSave} disabled={loading} className={`${btn("blue")} flex-1`}>
            {loading ? "Saving…" : "Save Private Key"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Create License Modal ────────────────────────────────────────────────────── */
function CreateLicenseModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    storeName: "", adminUsername: "", adminPassword: "",
    maxDevices: 1, daysValid: 365, notes: "",
  });
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleCreate = async () => {
    if (!form.storeName || !form.adminUsername || !form.adminPassword)
      return toast.error("Store name, username and password are required.");
    setLoading(true);
    try {
      const res = await createLicense(form);
      setResult(res);
      toast.success("License created!");
      onCreated();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to create license.");
    } finally { setLoading(false); }
  };

  const downloadFile = (content, filename) => {
    const a = document.createElement("a");
    a.href = "data:application/json;charset=utf-8," + encodeURIComponent(content);
    a.download = filename;
    a.click();
  };

  const copyCode = (txt) => { navigator.clipboard?.writeText(txt); toast.success("Copied!"); };

  if (result) return (
    <Modal title="License Created ✅" onClose={onClose} wide>
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 space-y-2 text-sm">
          <p><span className="text-gray-500">Store:</span> <strong className="text-gray-900 dark:text-white">{result.storeName}</strong></p>
          <p><span className="text-gray-500">Admin:</span> <strong className="text-gray-900 dark:text-white">{result.adminUsername}</strong></p>
          <p><span className="text-gray-500">Expires:</span> <strong className="text-gray-900 dark:text-white">{fmtDate(result.expiresAt)}</strong></p>
          <p><span className="text-gray-500">Max Devices:</span> <strong className="text-gray-900 dark:text-white">{result.maxDevices}</strong></p>
          <p className="text-amber-600 dark:text-amber-400 font-semibold text-xs">⚠ Share the admin password separately — not from the .nexora file.</p>
        </div>

        <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.08]">
          <p className="text-xs text-gray-500 mb-2 font-semibold">License ID (for renewal & add-device operations):</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono text-gray-700 dark:text-gray-300 break-all">{result.licenseId}</code>
            <button onClick={() => copyCode(result.licenseId)} className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition"><Copy size={13}/></button>
          </div>
        </div>

        <button onClick={() => downloadFile(result.nexoraContent, result.filename)}
          className={`${btn("blue")} w-full flex items-center justify-center gap-2`}>
          <Download size={15}/> Download {result.filename}
        </button>
        <p className="text-center text-xs text-gray-400">Give the client: app installer + this .nexora file</p>
      </div>
    </Modal>
  );

  return (
    <Modal title="Create New License" onClose={onClose} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Store Name">
            <input className={inp} placeholder="Al Noor Pharmacy" value={form.storeName} onChange={f("storeName")} />
          </Field>
          <Field label="Admin Username">
            <input className={inp} placeholder="admin" value={form.adminUsername} onChange={f("adminUsername")} />
          </Field>
        </div>
        <Field label="Admin Password">
          <div className="relative">
            <input className={`${inp} pr-10`} type={showPass ? "text" : "password"}
              placeholder="Strong password for the admin" value={form.adminPassword} onChange={f("adminPassword")} />
            <button onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
              {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
            </button>
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400">Share this password directly with the client — not via the .nexora file.</p>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Max Devices">
            <input className={inp} type="number" min={1} max={20} value={form.maxDevices} onChange={f("maxDevices")} />
          </Field>
          <Field label="Valid for (days)">
            <input className={inp} type="number" min={1} value={form.daysValid} onChange={f("daysValid")} />
            <p className="text-xs text-gray-400">365 = 1 year · 730 = 2 years</p>
          </Field>
        </div>
        <Field label="Internal Notes (optional)">
          <input className={inp} placeholder="Client contact, location, etc." value={form.notes} onChange={f("notes")} />
        </Field>
        <button onClick={handleCreate} disabled={loading} className={`${btn("blue")} w-full`}>
          {loading ? "Generating…" : "Generate License"}
        </button>
      </div>
    </Modal>
  );
}

/* ── License Row ─────────────────────────────────────────────────────────────── */
function LicenseRow({ record, onRefresh }) {
  const [expanded,     setExpanded]     = useState(false);
  const [renewModal,   setRenewModal]   = useState(false);
  const [deviceModal,  setDeviceModal]  = useState(false);
  const [notesModal,   setNotesModal]   = useState(false);
  const [renewDays,    setRenewDays]    = useState(365);
  const [macInput,     setMacInput]     = useState("");
  const [notesText,    setNotesText]    = useState(record.notes || "");
  const [renewResult,  setRenewResult]  = useState(null);
  const [deviceResult, setDeviceResult] = useState(null);
  const [loading,      setLoading]      = useState(false);

  const days = daysLeft(record.expiresAt);
  const copyCode = (txt) => { navigator.clipboard?.writeText(txt); toast.success("Code copied — paste it in the client's app."); };

  const handleDownload = async () => {
    try {
      const res = await downloadLicenseFile(record.licenseId);
      const a = document.createElement("a");
      a.href = "data:application/json;charset=utf-8," + encodeURIComponent(res.nexoraContent);
      a.download = res.filename;
      a.click();
    } catch { toast.error("Download failed"); }
  };

  const handleRenew = async () => {
    setLoading(true);
    try {
      const res = await renewLicense(record.licenseId, Number(renewDays));
      setRenewResult(res);
      toast.success("Renewal code generated.");
      onRefresh();
    } catch (e) { toast.error(e.response?.data?.message || "Failed"); }
    finally { setLoading(false); }
  };

  const handleAddDevice = async () => {
    if (!macInput.trim()) return toast.error("Enter a MAC address.");
    setLoading(true);
    try {
      const res = await addDeviceToLicense(record.licenseId, macInput.trim());
      setDeviceResult(res);
      toast.success("Device code generated.");
      onRefresh();
    } catch (e) { toast.error(e.response?.data?.message || "Failed"); }
    finally { setLoading(false); }
  };

  const handleSaveNotes = async () => {
    try {
      await updateLicenseNotes(record.licenseId, notesText);
      toast.success("Notes saved.");
      setNotesModal(false);
      onRefresh();
    } catch { toast.error("Failed"); }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete license record for "${record.storeName}"? The client's app will still work until expiry.`)) return;
    try {
      await deleteLicense(record.licenseId);
      toast.success("Record deleted.");
      onRefresh();
    } catch { toast.error("Failed"); }
  };

  return (
    <>
      <div className={`bg-white dark:bg-[#13131e] border border-gray-100 dark:border-white/[0.06] rounded-2xl overflow-hidden transition-all ${days !== null && days < 0 ? "border-red-200 dark:border-red-500/20" : ""}`}>
        {/* Header row */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
            <FileText size={16} className="text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-gray-900 dark:text-white truncate">{record.storeName}</span>
              <StatusBadge expiresAt={record.expiresAt} />
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="text-xs text-gray-400">Admin: <span className="text-gray-600 dark:text-gray-300 font-medium">{record.adminUsername}</span></span>
              <span className="text-xs text-gray-400">Expires: <span className="text-gray-600 dark:text-gray-300">{fmtDate(record.expiresAt)}</span></span>
              <span className="text-xs text-gray-400">Devices: <span className="text-gray-600 dark:text-gray-300">{record.addedDevices?.length || 0}/{record.maxDevices}</span></span>
              {record.notes && <span className="text-xs text-gray-400 italic truncate max-w-[160px]">{record.notes}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={handleDownload} title="Re-download .nexora"
              className="p-2 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition">
              <Download size={14}/>
            </button>
            <button onClick={() => setRenewModal(true)} title="Generate renewal code"
              className="p-2 rounded-lg text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10 transition">
              <RefreshCw size={14}/>
            </button>
            <button onClick={() => setDeviceModal(true)} title="Add device"
              className="p-2 rounded-lg text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition">
              <Monitor size={14}/>
            </button>
            <button onClick={() => setNotesModal(true)} title="Edit notes"
              className="p-2 rounded-lg text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition">
              <FileText size={14}/>
            </button>
            <button onClick={handleDelete} title="Delete record"
              className="p-2 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition">
              <Trash2 size={14}/>
            </button>
            <button onClick={() => setExpanded(p => !p)}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition ml-1">
              {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
            </button>
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="border-t border-gray-100 dark:border-white/[0.06] px-4 py-3 grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-gray-400 mb-1 font-semibold uppercase tracking-wide">License ID</p>
              <div className="flex items-center gap-1.5">
                <code className="font-mono text-gray-700 dark:text-gray-300 break-all text-[11px]">{record.licenseId}</code>
                <button onClick={() => { navigator.clipboard?.writeText(record.licenseId); toast.success("Copied"); }} className="shrink-0 p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10"><Copy size={11}/></button>
              </div>
            </div>
            <div>
              <p className="text-gray-400 mb-1 font-semibold uppercase tracking-wide">Issued</p>
              <p className="text-gray-700 dark:text-gray-300">{fmtDate(record.issuedAt)}</p>
            </div>
            {record.addedDevices?.length > 0 && (
              <div className="col-span-2">
                <p className="text-gray-400 mb-1.5 font-semibold uppercase tracking-wide">Authorized Devices</p>
                <div className="space-y-1">
                  {record.addedDevices.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Monitor size={11} className="text-gray-400"/>
                      <code className="font-mono text-gray-600 dark:text-gray-400">{d.mac}</code>
                      <span className="text-gray-400">— added {fmtDate(d.addedAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {record.renewalHistory?.length > 0 && (
              <div className="col-span-2">
                <p className="text-gray-400 mb-1.5 font-semibold uppercase tracking-wide">Renewal History</p>
                <div className="space-y-1">
                  {record.renewalHistory.map((r, i) => (
                    <p key={i} className="text-gray-600 dark:text-gray-400">
                      {fmtDate(r.renewedAt)} → extended to {fmtDate(r.newExpiresAt)}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Renew Modal */}
      {renewModal && (
        <Modal title={`Renew — ${record.storeName}`} onClose={() => { setRenewModal(false); setRenewResult(null); }}>
          {renewResult ? (
            <div className="space-y-4">
              <p className="text-sm text-green-600 dark:text-green-400 font-semibold">✅ Renewal code generated. New expiry: {fmtDate(renewResult.newExpiresAt)}</p>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08]">
                <p className="text-xs text-gray-400 mb-2">Tell the client to go to Settings → License → Enter Renewal Code and paste this:</p>
                <textarea rows={4} readOnly className={`${inp} font-mono text-xs resize-none`} value={renewResult.renewalCode}/>
              </div>
              <button onClick={() => copyCode(renewResult.renewalCode)} className={`${btn("blue")} w-full flex items-center justify-center gap-2`}>
                <Copy size={14}/> Copy Renewal Code
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <Field label="Days to add">
                <input className={inp} type="number" min={1} value={renewDays} onChange={e => setRenewDays(e.target.value)}/>
                <p className="text-xs text-gray-400">Current expiry: {fmtDate(record.expiresAt)}</p>
              </Field>
              <button onClick={handleRenew} disabled={loading} className={`${btn("green")} w-full`}>
                {loading ? "Generating…" : "Generate Renewal Code"}
              </button>
            </div>
          )}
        </Modal>
      )}

      {/* Add Device Modal */}
      {deviceModal && (
        <Modal title={`Add Device — ${record.storeName}`} onClose={() => { setDeviceModal(false); setDeviceResult(null); setMacInput(""); }}>
          {deviceResult ? (
            <div className="space-y-4">
              <p className="text-sm text-green-600 dark:text-green-400 font-semibold">✅ Device code generated for {deviceResult.macAddress}</p>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08]">
                <p className="text-xs text-gray-400 mb-2">Tell the client to go to Settings → License → Add Device and paste this:</p>
                <textarea rows={4} readOnly className={`${inp} font-mono text-xs resize-none`} value={deviceResult.deviceCode}/>
              </div>
              <button onClick={() => copyCode(deviceResult.deviceCode)} className={`${btn("blue")} w-full flex items-center justify-center gap-2`}>
                <Copy size={14}/> Copy Device Code
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Ask the client to tell you their MAC address. They can find it in the app at<br/>
                <strong>Settings → License → Machine Info</strong>.
              </p>
              <Field label="Client MAC Address">
                <input className={inp} placeholder="aa:bb:cc:dd:ee:ff" value={macInput} onChange={e => setMacInput(e.target.value)}/>
              </Field>
              <button onClick={handleAddDevice} disabled={loading} className={`${btn("blue")} w-full`}>
                {loading ? "Generating…" : "Generate Device Code"}
              </button>
            </div>
          )}
        </Modal>
      )}

      {/* Notes Modal */}
      {notesModal && (
        <Modal title={`Notes — ${record.storeName}`} onClose={() => setNotesModal(false)}>
          <div className="space-y-3">
            <Field label="Internal Notes">
              <textarea rows={4} className={`${inp} resize-none`} value={notesText} onChange={e => setNotesText(e.target.value)} placeholder="Client contact, location, renewal history notes…"/>
            </Field>
            <button onClick={handleSaveNotes} className={`${btn("blue")} w-full`}>Save Notes</button>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ── Main Tab Component ───────────────────────────────────────────────────────── */
export default function LicenseManagerTab() {
  const [keyReady,     setKeyReady]     = useState(null); // null=loading, true/false
  const [licenses,     setLicenses]     = useState([]);
  const [loadingList,  setLoadingList]  = useState(true);
  const [createModal,  setCreateModal]  = useState(false);
  const [search,       setSearch]       = useState("");

  const checkKey = async () => {
    try {
      const res = await getLicenseKeyStatus();
      setKeyReady(res.configured);
    } catch { setKeyReady(false); }
  };

  const loadLicenses = async () => {
    setLoadingList(true);
    try {
      const list = await listLicenses();
      setLicenses(list);
    } catch { toast.error("Failed to load licenses"); }
    finally { setLoadingList(false); }
  };

  useEffect(() => { checkKey(); loadLicenses(); }, []);

  const filtered = licenses.filter(l =>
    l.storeName.toLowerCase().includes(search.toLowerCase()) ||
    l.adminUsername.toLowerCase().includes(search.toLowerCase()) ||
    l.licenseId.includes(search.toLowerCase())
  );

  const expired  = licenses.filter(l => daysLeft(l.expiresAt) < 0).length;
  const expiring = licenses.filter(l => { const d = daysLeft(l.expiresAt); return d >= 0 && d < 30; }).length;

  if (keyReady === null) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading…</p>
    </div>
  );

  if (!keyReady) return (
    <div className="flex-1 overflow-y-auto p-6">
      <KeySetupPanel onConfigured={() => { setKeyReady(true); }} />
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-white/[0.05] shrink-0">
        <input
          type="text" placeholder="Search licenses…" value={search} onChange={e => setSearch(e.target.value)}
          className="pl-4 pr-4 py-2 border border-gray-200 dark:border-white/[0.08] rounded-xl text-[13px] bg-gray-50 dark:bg-white/[0.04] dark:text-white w-56 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition placeholder-gray-400"/>
        <div className="flex-1 flex items-center gap-3">
          {expired > 0  && <span className="text-xs font-bold text-red-500">{expired} expired</span>}
          {expiring > 0 && <span className="text-xs font-bold text-amber-500">{expiring} expiring soon</span>}
        </div>
        <button onClick={() => { loadLicenses(); }} className={`${btn("gray")} flex items-center gap-1.5`}>
          <RefreshCw size={13}/> Refresh
        </button>
        <button onClick={() => setCreateModal(true)} className={`${btn("blue")} flex items-center gap-1.5`}>
          <Plus size={14}/> New License
        </button>
      </div>

      {/* Stats strip */}
      <div className="flex gap-4 px-6 py-3 border-b border-gray-100 dark:border-white/[0.04] shrink-0">
        {[
          { label: "Total", value: licenses.length, color: "text-gray-700 dark:text-gray-200" },
          { label: "Active", value: licenses.filter(l => daysLeft(l.expiresAt) >= 0).length, color: "text-green-600 dark:text-green-400" },
          { label: "Expiring <30d", value: expiring, color: "text-amber-600 dark:text-amber-400" },
          { label: "Expired", value: expired, color: "text-red-600 dark:text-red-400" },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{s.label}</span>
            <span className={`text-sm font-black ${s.color}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* License list */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {loadingList ? (
          <p className="text-center text-sm text-gray-400 mt-16">Loading licenses…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center mt-20">
            <p className="text-4xl mb-3">🔑</p>
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              {licenses.length === 0 ? "No licenses yet — create your first one." : "No matches found."}
            </p>
            {licenses.length === 0 && (
              <button onClick={() => setCreateModal(true)} className={`${btn("blue")} mt-4`}>
                <Plus size={14} className="inline mr-1"/> Create First License
              </button>
            )}
          </div>
        ) : (
          filtered.map(r => (
            <LicenseRow key={r.licenseId} record={r} onRefresh={loadLicenses} />
          ))
        )}
      </div>

      {createModal && (
        <CreateLicenseModal
          onClose={() => setCreateModal(false)}
          onCreated={() => { setCreateModal(false); loadLicenses(); }}
        />
      )}
    </div>
  );
}
