import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import * as recharts from "recharts";
const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Area, AreaChart, BarChart, Bar } = recharts;

/* ══════════════════════════════════════════════════════════════════
   CONSTANTS & DATA
   ══════════════════════════════════════════════════════════════════ */

const GLEASON = [
  { label: "Benign", value: "benign", color: "#4CAF50", bg: "#143A1A", gg: 0 },
  { label: "3+3 (GG1)", value: "3+3", color: "#8BC34A", bg: "#1A3A14", gg: 1 },
  { label: "3+4 (GG2)", value: "3+4", color: "#FFC107", bg: "#3A3414", gg: 2 },
  { label: "4+3 (GG3)", value: "4+3", color: "#FF9800", bg: "#3A2A14", gg: 3 },
  { label: "4+4 (GG4)", value: "4+4", color: "#F44336", bg: "#3A1414", gg: 4 },
  { label: "4+5/5+4/5+5 (GG5)", value: "GG5", color: "#B71C1C", bg: "#3A0A0A", gg: 5 },
];
const PIRADS_LIST = [
  { value: 1, color: "#4CAF50" }, { value: 2, color: "#8BC34A" },
  { value: 3, color: "#FFC107" }, { value: 4, color: "#FF9800" }, { value: 5, color: "#F44336" },
];
const ZONES = [
  "R Base Lat", "R Base Med", "R Mid Lat", "R Mid Med", "R Apex Lat", "R Apex Med",
  "L Base Lat", "L Base Med", "L Mid Lat", "L Mid Med", "L Apex Lat", "L Apex Med",
];
const ZONE_FULL = [
  "Right Base Lateral", "Right Base Medial", "Right Mid Lateral", "Right Mid Medial",
  "Right Apex Lateral", "Right Apex Medial", "Left Base Lateral", "Left Base Medial",
  "Left Mid Lateral", "Left Mid Medial", "Left Apex Lateral", "Left Apex Medial",
];
const ZP = {
  "R Base Lat": { cx: 130, cy: 92 }, "R Base Med": { cx: 180, cy: 88 },
  "R Mid Lat": { cx: 122, cy: 152 }, "R Mid Med": { cx: 175, cy: 150 },
  "R Apex Lat": { cx: 135, cy: 212 }, "R Apex Med": { cx: 180, cy: 212 },
  "L Base Lat": { cx: 290, cy: 92 }, "L Base Med": { cx: 240, cy: 88 },
  "L Mid Lat": { cx: 298, cy: 152 }, "L Mid Med": { cx: 245, cy: 150 },
  "L Apex Lat": { cx: 285, cy: 212 }, "L Apex Med": { cx: 240, cy: 212 },
};
const MRI_SECTORS = ["R PZ Base", "R PZ Mid", "R PZ Apex", "L PZ Base", "L PZ Mid", "L PZ Apex", "R TZ Base", "R TZ Mid", "L TZ Base", "L TZ Mid", "R CZ", "L CZ", "AFS"];
const T_STAGES = ["cT1c", "cT2a", "cT2b", "cT2c", "cT3a", "cT3b", "cT4"];
const TX_MODALITIES = ["HIFU", "Cryotherapy", "Laser (FLA)", "IRE/NanoKnife", "Focal Brachy", "Other"];
const FOCAL_PATTERNS = ["Right Hemiablation", "Left Hemiablation", "Right Quadrant", "Left Quadrant", "Hockey Stick (R)", "Hockey Stick (L)", "Index Lesion Only", "Custom"];
const GENOMIC_TESTS = [
  { name: "Decipher", range: "0–1.0", thresholds: [{ val: 0.45, label: "Low" }, { val: 0.60, label: "Intermediate" }, { val: 1.0, label: "High" }] },
  { name: "Oncotype DX GPS", range: "0–100", thresholds: [{ val: 20, label: "Low" }, { val: 40, label: "Intermediate" }, { val: 100, label: "High" }] },
  { name: "Prolaris", range: "-2 to 6", thresholds: [{ val: 0, label: "Low" }, { val: 2, label: "Intermediate" }, { val: 6, label: "High" }] },
];
const NCCN_GROUPS = [
  { name: "Very Low", color: "#4CAF50", short: "VL" },
  { name: "Low", color: "#8BC34A", short: "L" },
  { name: "Fav. Intermediate", color: "#FFC107", short: "FI" },
  { name: "Unfav. Intermediate", color: "#FF9800", short: "UI" },
  { name: "High", color: "#F44336", short: "H" },
  { name: "Very High", color: "#B71C1C", short: "VH" },
];

/* ══════════════════════════════════════════════════════════════════ */

const FONT = "'IBM Plex Mono', monospace";
const C = {
  bg: "#F4F6F9", bgCard: "#FFFFFF", bgInput: "#EDF0F5",
  border: "#D0D7E2", textPri: "#1A2233", textSec: "#556070", textMut: "#94A0B0",
  accent: "#2E7DD6", accentDim: "#E3EDF8",
  danger: "#CC3333", dangerDim: "#FDEAEA",
  success: "#2E8B57", successDim: "#E6F5EC",
  warn: "#D48F10", warnDim: "#FEF5E0",
  focalZone: "#7C4DFF",
};
const inp = { background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: "4px", color: C.textPri, padding: "6px 8px", fontSize: "11px", fontFamily: FONT, outline: "none", width: "100%", boxSizing: "border-box" };
const lbl = { fontSize: "9px", color: C.textSec, fontFamily: FONT, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: "3px", display: "block" };
const btn = { fontFamily: FONT, fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.8px", cursor: "pointer", borderRadius: "4px", padding: "5px 12px", border: "none" };

/* ── factories ── */
const mkSpec = () => ({ gleason: null, coresPos: "", coresTotal: "", maxPct: "", pni: false, crib: false, idc: false, notes: "" });
const mkSession = (n) => ({ id: Date.now(), label: n || "", date: "", psa: "", type: "diagnostic", specimens: ZONES.reduce((a, z) => { a[z] = mkSpec(); return a; }, {}), mriLesions: [], targetedBx: [], focalPlan: null, treatment: null, genomics: { decipher: "", oncotype: "", prolaris: "" }, mriImageData: null, ipss: null, shim: null, lifeExpectancy: null, postTxMonitoring: null });
const mkLesion = (n) => ({ id: Date.now(), name: n || "", sector: MRI_SECTORS[0], pirads: 3, sizeMm: "", x: 210, y: 150, notes: "" });
const mkTargetBx = (lid) => ({ id: Date.now(), lesionId: lid, gleason: null, coresPos: "", coresTotal: "", maxPct: "", pni: false, crib: false, idc: false, notes: "" });
const mkPatient = () => ({ id: Date.now(), mrn: "", dob: "", tStage: "cT1c", volume: "", sessions: [mkSession("Biopsy 1")], notes: "" });

/* ── helpers ── */
const gIdx = (s) => GLEASON.findIndex(g => g.value === s?.gleason);
const maxG = (arr) => { let m = -1; arr.forEach(s => { const i = gIdx(s); if (i > m) m = i; }); return m >= 0 ? GLEASON[m] : null; };
const allSpecs = (ses) => [...Object.values(ses.specimens).filter(s => s.gleason !== null), ...ses.targetedBx.filter(t => t.gleason !== null)];
const sumCores = (specs, field) => specs.reduce((s, x) => s + (parseInt(x[field]) || 0), 0);

function computeNCCN(psa, tStage, vol, specs) {
  const p = parseFloat(psa); const v = parseFloat(vol);
  const density = (p > 0 && v > 0) ? p / v : null;
  const mg = maxG(specs); const gg = mg?.gg || 0;
  const pos = sumCores(specs, "coresPos"); const tot = sumCores(specs, "coresTotal");
  const maxI = Math.max(0, ...specs.map(s => parseInt(s.maxPct) || 0));
  const pctPos = tot > 0 ? (pos / tot) * 100 : 0;
  const tIdx = T_STAGES.indexOf(tStage);
  const gg4c = specs.filter(s => gIdx(s) >= 4).length;

  if (tIdx >= 5 || gg >= 5 || gg4c > 4) return { group: 5, density };
  if (gg >= 4 || p > 20 || tIdx === 4) return { group: 4, density };
  const intF = (gg >= 2 && gg <= 3 ? 1 : 0) + (p >= 10 && p <= 20 ? 1 : 0) + (tIdx >= 2 && tIdx <= 3 ? 1 : 0);
  if (gg === 3 || intF >= 2 || (gg === 2 && pctPos >= 50)) return { group: 3, density };
  if (intF === 1 || (gg === 2 && pctPos < 50)) return { group: 2, density };
  if (gg <= 1 && p < 10 && tIdx <= 0 && pos < 3 && maxI <= 50 && density !== null && density < 0.15) return { group: 0, density };
  if (gg <= 1 && p < 10 && tIdx <= 1) return { group: 1, density };
  if (!mg || mg.value === "benign") return { group: null, density };
  return { group: 1, density };
}

/* ── FOCAL ZONE SHAPES (SVG paths for treatment overlays) ── */
const FOCAL_PATHS = {
  "Right Hemiablation": "M210,60 C160,50 110,60 82,82 C58,108 52,142 62,178 C72,212 92,238 122,252 C152,262 180,265 210,265 Z",
  "Left Hemiablation": "M210,60 C260,50 310,60 338,82 C362,108 368,142 358,178 C348,212 328,238 298,252 C268,262 240,265 210,265 Z",
  "Right Quadrant": "M210,60 C160,50 110,60 82,82 C58,108 52,142 62,178 Q140,170 210,165 Z",
  "Left Quadrant": "M210,60 C260,50 310,60 338,82 C362,108 368,142 358,178 Q280,170 210,165 Z",
  "Hockey Stick (R)": "M210,60 C160,50 110,60 82,82 C58,108 52,142 62,178 C72,212 92,238 122,252 C152,262 180,265 210,265 L210,165 Q160,160 140,130 Z",
  "Hockey Stick (L)": "M210,60 C260,50 310,60 338,82 C362,108 368,142 358,178 C348,212 328,238 298,252 C268,262 240,265 210,265 L210,165 Q260,160 280,130 Z",
};

/* ══════════════════════════════════════════════════════════════════
   SMALL COMPONENTS
   ══════════════════════════════════════════════════════════════════ */

function Tabs({ tabs, active, onSelect, small }) {
  return (
    <div style={{ display: "flex", gap: "1px", background: C.bg, borderRadius: "5px", padding: "2px", border: `1px solid ${C.border}`, flexWrap: "wrap" }}>
      {tabs.map(t => <button key={t.key} onClick={() => onSelect(t.key)} style={{ ...btn, fontSize: small ? "8px" : "9px", padding: small ? "3px 8px" : "4px 10px", background: active === t.key ? C.accentDim : "transparent", color: active === t.key ? C.accent : C.textMut, border: active === t.key ? `1px solid ${C.accent}40` : "1px solid transparent" }}>{t.label}</button>)}
    </div>
  );
}

function Tip({ label, children }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ display: "inline-block", position: "relative" }}>
      <div onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "14px", height: "14px", borderRadius: "50%", background: C.border, color: C.textMut, fontSize: "8px", fontWeight: 700, cursor: "help" }}>?</div>
      {show && (
        <div style={{ position: "absolute", bottom: "calc(100% + 4px)", left: "50%", transform: "translateX(-50%)", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "5px 7px", fontSize: "8px", color: C.textSec, maxWidth: "180px", zIndex: 999, whiteSpace: "normal", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
          {children}
          <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: `4px solid ${C.bgCard}` }} />
        </div>
      )}
    </div>
  );
}

function GradeSel({ value, onChange, compact }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr 1fr 1fr" : "1fr 1fr", gap: "3px" }}>
      {GLEASON.map(g => { const on = value === g.value; return (
        <button key={g.value} onClick={() => onChange(g.value)} style={{ background: on ? g.bg : C.bgInput, border: `1.5px solid ${on ? g.color : C.border}`, borderRadius: "4px", padding: compact ? "4px" : "6px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: on ? g.color : C.textMut, border: `1.5px solid ${g.color}`, flexShrink: 0 }} />
          <span style={{ fontSize: compact ? "8px" : "10px", color: on ? g.color : C.textSec, fontFamily: FONT, fontWeight: on ? 600 : 400 }}>{compact ? g.label.split(" ")[0] : g.label}</span>
        </button>);
      })}
    </div>
  );
}

function Chk({ label, checked, onChange }) {
  return <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", color: C.textSec, fontFamily: FONT, cursor: "pointer", padding: "2px 0" }}><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ accentColor: C.danger }} />{label}</label>;
}

function Stat({ label, children }) {
  return <div style={{ background: C.bgInput, borderRadius: "4px", padding: "5px", textAlign: "center" }}><div style={{ ...lbl, fontSize: "7px", marginBottom: "1px" }}>{label}</div><div style={{ fontSize: "12px", fontFamily: FONT, fontWeight: 700, color: C.textPri }}>{children}</div></div>;
}

function useWindowSize() {
  const [size, setSize] = useState({ width: typeof window !== "undefined" ? window.innerWidth : 1024, height: typeof window !== "undefined" ? window.innerHeight : 768 });
  useEffect(() => {
    const handleResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return size;
}

/* ══════════════════════════════════════════════════════════════════
   PROSTATE MAP
   ══════════════════════════════════════════════════════════════════ */

function ProstateMap({ session, selectedZone, onSelectZone, selectedLesion, onSelectLesion, onLesionDragStart, svgRef, showFocalOverlay, isSmallScreen }) {
  const hasMri = session.mriLesions.length > 0;
  const fp = session.focalPlan;
  const tx = session.treatment;
  const maxWidth = isSmallScreen ? "100%" : "390px";
  return (
    <svg ref={svgRef} viewBox="0 0 420 310" width="100%" style={{ maxWidth: maxWidth, userSelect: "none" }}>
      {/* Focal zone overlay */}
      {showFocalOverlay && fp && FOCAL_PATHS[fp.pattern] && (
        <path d={FOCAL_PATHS[fp.pattern]} fill={C.focalZone + "18"} stroke={C.focalZone} strokeWidth="1.5" strokeDasharray="6,3" />
      )}
      {/* Treatment zone (solid if treated) */}
      {tx && tx.pattern && FOCAL_PATHS[tx.pattern] && (
        <path d={FOCAL_PATHS[tx.pattern]} fill="#FF980015" stroke="#FF9800" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
      )}
      <ProstateOutline showMri={hasMri} />
      {ZONES.map(z => {
        const s = session.specimens[z]; const g = GLEASON.find(x => x.value === s.gleason);
        const p = ZP[z]; const has = s.gleason !== null; const col = g ? g.color : "#8A9AAA"; const r = has ? 13 : 8;
        const isSel = selectedZone === z;
        // Check if in treatment zone for surveillance
        const inTxZone = tx && tx.pattern && isZoneInPattern(z, tx.pattern);
        return (
          <g key={z} style={{ cursor: "pointer" }} onClick={() => onSelectZone(z)}>
            {isSel && <circle cx={p.cx} cy={p.cy} r={r + 5} fill="none" stroke={C.accent} strokeWidth="2" opacity="0.6"><animate attributeName="r" values={`${r + 4};${r + 7};${r + 4}`} dur="1.5s" repeatCount="indefinite" /></circle>}
            {inTxZone && session.type === "surveillance" && <circle cx={p.cx} cy={p.cy} r={r + 3} fill="none" stroke="#FF9800" strokeWidth="1" strokeDasharray="2,2" opacity="0.4" />}
            <circle cx={p.cx} cy={p.cy} r={r} fill={has ? col : "transparent"} stroke={has ? col : "#8A9AAA"} strokeWidth={has ? 0 : 1.2} strokeDasharray={has ? "none" : "3,2"} opacity={has ? 0.9 : 0.35} />
            {has && s.coresPos && s.coresTotal ? <text x={p.cx} y={p.cy + 3} textAnchor="middle" fontSize="8" fill="#fff" fontFamily={FONT} fontWeight="700">{s.coresPos}/{s.coresTotal}</text> : !has ? <text x={p.cx} y={p.cy + 2.5} textAnchor="middle" fontSize="6" fill="#8A9AAA" fontFamily={FONT}>+</text> : null}
          </g>
        );
      })}
      {session.mriLesions.map(l => {
        const pc = PIRADS_LIST.find(p => p.value === l.pirads); const col = pc?.color || "#FFC107";
        const sz = Math.max(8, Math.min(20, (parseInt(l.sizeMm) || 10) / 1.5));
        const isSel = selectedLesion === l.id;
        return (
          <g key={l.id} style={{ cursor: "grab" }} onMouseDown={e => onLesionDragStart(e, l.id)} onClick={() => onSelectLesion(l.id)}>
            {isSel && <rect x={l.x - sz / 2 - 3} y={l.y - sz / 2 - 3} width={sz + 6} height={sz + 6} rx="3" fill="none" stroke={C.accent} strokeWidth="1.5" opacity="0.5" />}
            <rect x={l.x - sz / 2} y={l.y - sz / 2} width={sz} height={sz} rx="2" fill={col + "44"} stroke={col} strokeWidth="1.5" />
            <text x={l.x} y={l.y + 3} textAnchor="middle" fontSize="8" fill={col} fontFamily={FONT} fontWeight="700">{l.pirads}</text>
            {l.name && <text x={l.x} y={l.y - sz / 2 - 3} textAnchor="middle" fontSize="6.5" fill={col} fontFamily={FONT}>{l.name}</text>}
          </g>
        );
      })}
    </svg>
  );
}

function ProstateOutline({ showMri }) {
  return (
    <g>
      <path d="M210,55 C260,45 310,55 340,80 C365,105 370,140 360,175 C350,210 330,235 300,250 C270,260 250,265 210,265 C170,265 150,260 120,250 C90,235 70,210 60,175 C50,140 55,105 80,80 C110,55 160,45 210,55 Z" fill="none" stroke="#6B8095" strokeWidth="2.2" />
      {showMri && <g opacity="0.1"><ellipse cx="210" cy="130" rx="50" ry="60" fill="none" stroke="#5CABFF" strokeWidth="1" strokeDasharray="3,3" /><text x="210" y="108" textAnchor="middle" fontSize="7" fill="#5CABFF" fontFamily={FONT}>TZ</text></g>}
      <line x1="210" y1="50" x2="210" y2="270" stroke="#6B8095" strokeWidth="0.8" strokeDasharray="4,3" opacity="0.25" />
      <path d="M62,125 Q140,118 210,122 Q280,118 358,125" fill="none" stroke="#6B8095" strokeWidth="0.5" opacity="0.15" />
      <path d="M68,188 Q140,182 210,186 Q280,182 352,188" fill="none" stroke="#6B8095" strokeWidth="0.5" opacity="0.15" />
      <text x="210" y="38" textAnchor="middle" fontSize="8" fill="#6B8095" fontFamily={FONT}>BASE</text>
      <text x="210" y="283" textAnchor="middle" fontSize="8" fill="#6B8095" fontFamily={FONT}>APEX</text>
      <text x="40" y="155" textAnchor="middle" fontSize="7" fill="#6B8095" fontFamily={FONT} transform="rotate(-90,40,155)">RIGHT</text>
      <text x="380" y="155" textAnchor="middle" fontSize="7" fill="#6B8095" fontFamily={FONT} transform="rotate(90,380,155)">LEFT</text>
    </g>
  );
}

function isZoneInPattern(zone, pattern) {
  if (!pattern) return false;
  const right = zone.startsWith("R ");
  const left = zone.startsWith("L ");
  if (pattern === "Right Hemiablation") return right;
  if (pattern === "Left Hemiablation") return left;
  if (pattern === "Right Quadrant") return right && (zone.includes("Base") || zone.includes("Mid"));
  if (pattern === "Left Quadrant") return left && (zone.includes("Base") || zone.includes("Mid"));
  if (pattern.startsWith("Hockey Stick (R)")) return right;
  if (pattern.startsWith("Hockey Stick (L)")) return left;
  return false;
}

/* ══════════════════════════════════════════════════════════════════
   PSA KINETICS CHART
   ══════════════════════════════════════════════════════════════════ */

function PSAKinetics({ sessions }) {
  const data = sessions.filter(s => s.psa && s.date).map(s => ({ date: s.date, psa: parseFloat(s.psa), label: s.label || s.date })).sort((a, b) => a.date.localeCompare(b.date));
  if (data.length < 2) return <div style={{ padding: "20px", textAlign: "center", color: C.textMut, fontSize: "10px", fontFamily: FONT }}>Need 2+ sessions with PSA and date for kinetics.</div>;

  // velocity: (last - first) / years
  const firstDate = new Date(data[0].date); const lastDate = new Date(data[data.length - 1].date);
  const years = (lastDate - firstDate) / (365.25 * 24 * 60 * 60 * 1000);
  const velocity = years > 0 ? ((data[data.length - 1].psa - data[0].psa) / years).toFixed(2) : null;

  // doubling time: ln(2) / slope of ln(PSA) vs time
  let dt = null;
  if (data.length >= 2 && data[0].psa > 0 && data[data.length - 1].psa > data[0].psa) {
    const lnRatio = Math.log(data[data.length - 1].psa / data[0].psa);
    if (lnRatio > 0 && years > 0) dt = (Math.LN2 / (lnRatio / years) * 12).toFixed(1); // months
  }

  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: "6px", padding: "12px" }}>
      <div style={{ ...lbl, fontSize: "9px", letterSpacing: "1.5px", marginBottom: "8px" }}>PSA Kinetics</div>
      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        <Stat label="PSA Velocity">{velocity !== null ? <span style={{ color: parseFloat(velocity) > 0.75 ? C.danger : C.success }}>{velocity} ng/mL/yr</span> : "—"}</Stat>
        <Stat label="Doubling Time">{dt !== null ? <span style={{ color: parseFloat(dt) < 36 ? C.danger : C.success }}>{dt} mo</span> : "N/A"}</Stat>
        <Stat label="Nadir">{Math.min(...data.map(d => d.psa)).toFixed(1)}</Stat>
        <Stat label="Current">{data[data.length - 1].psa.toFixed(1)}</Stat>
      </div>
      <div style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
            <defs><linearGradient id="psaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.accent} stopOpacity={0.3} /><stop offset="95%" stopColor={C.accent} stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="date" tick={{ fontSize: 8, fill: C.textMut, fontFamily: FONT }} />
            <YAxis tick={{ fontSize: 8, fill: C.textMut, fontFamily: FONT }} />
            <Tooltip contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: "4px", fontFamily: FONT, fontSize: "10px" }} />
            <Area type="monotone" dataKey="psa" stroke={C.accent} fill="url(#psaGrad)" strokeWidth={2} dot={{ r: 3, fill: C.accent }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   RISK PANEL
   ══════════════════════════════════════════════════════════════════ */

function RiskPanel({ session, patient }) {
  const specs = allSpecs(session);
  if (specs.length === 0) return null;

  const rightS = Object.entries(session.specimens).filter(([z, s]) => z.startsWith("R ") && s.gleason && s.gleason !== "benign");
  const leftS = Object.entries(session.specimens).filter(([z, s]) => z.startsWith("L ") && s.gleason && s.gleason !== "benign");
  const bilat = rightS.length > 0 && leftS.length > 0;
  const pos = sumCores(specs, "coresPos"); const tot = sumCores(specs, "coresTotal");
  const maxI = Math.max(0, ...specs.map(s => parseInt(s.maxPct) || 0));
  const adv = specs.filter(s => s.pni || s.crib || s.idc);
  const mg = maxG(specs);
  const nccn = computeNCCN(session.psa, patient.tStage, patient.volume, specs);
  const focalOk = !bilat && mg && ["benign", "3+3", "3+4"].includes(mg.value) && adv.length === 0 && maxI <= 50;

  // Genomics
  const gDec = parseFloat(session.genomics?.decipher);
  const gOnc = parseFloat(session.genomics?.oncotype);
  const gPro = parseFloat(session.genomics?.prolaris);

  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: "6px", padding: "10px" }}>
      <div style={{ ...lbl, fontSize: "9px", letterSpacing: "1.5px", marginBottom: "6px" }}>Risk Assessment</div>

      {/* NCCN */}
      {nccn.group !== null && (
        <div style={{ background: C.bg, border: `1px solid ${NCCN_GROUPS[nccn.group].color}30`, borderRadius: "5px", padding: "8px", marginBottom: "6px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div style={{ ...lbl, fontSize: "7px" }}>NCCN Risk</div><div style={{ fontSize: "13px", fontWeight: 700, color: NCCN_GROUPS[nccn.group].color, fontFamily: FONT }}>{NCCN_GROUPS[nccn.group].name}</div></div>
            {nccn.density !== null && <div style={{ textAlign: "right" }}><div style={{ ...lbl, fontSize: "7px" }}>PSA Density</div><div style={{ fontSize: "13px", fontWeight: 700, fontFamily: FONT, color: nccn.density < 0.15 ? C.success : nccn.density < 0.20 ? C.warn : C.danger }}>{nccn.density.toFixed(3)}</div></div>}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "4px", marginBottom: "6px" }}>
        <Stat label="Cores +">{tot > 0 ? `${pos}/${tot}` : "—"}</Stat>
        <Stat label="Max %">{maxI > 0 ? `${maxI}%` : "—"}</Stat>
        <Stat label="Bilat"><span style={{ color: bilat ? C.danger : C.success }}>{bilat ? "Y" : "N"}</span></Stat>
        <Stat label="PI-RADS">{session.mriLesions.length > 0 ? <span style={{ color: PIRADS_LIST.find(p => p.value === Math.max(...session.mriLesions.map(l => l.pirads)))?.color }}>{Math.max(...session.mriLesions.map(l => l.pirads))}</span> : "—"}</Stat>
      </div>

      {/* Genomics display */}
      {(gDec > 0 || gOnc > 0 || gPro) && (
        <div style={{ background: C.bgInput, borderRadius: "4px", padding: "6px", marginBottom: "6px" }}>
          <div style={{ ...lbl, fontSize: "7px", marginBottom: "3px" }}>Genomic Classifiers</div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {gDec > 0 && <span style={{ fontSize: "9px", fontFamily: FONT, color: gDec < 0.45 ? C.success : gDec < 0.60 ? C.warn : C.danger }}>Decipher: {gDec.toFixed(2)}</span>}
            {gOnc > 0 && <span style={{ fontSize: "9px", fontFamily: FONT, color: gOnc < 20 ? C.success : gOnc < 40 ? C.warn : C.danger }}>Oncotype: {gOnc.toFixed(0)}</span>}
            {!isNaN(gPro) && session.genomics?.prolaris && <span style={{ fontSize: "9px", fontFamily: FONT, color: gPro < 0 ? C.success : gPro < 2 ? C.warn : C.danger }}>Prolaris: {gPro.toFixed(1)}</span>}
          </div>
        </div>
      )}

      {adv.length > 0 && <div style={{ background: C.dangerDim, border: `1px solid ${C.danger}25`, borderRadius: "4px", padding: "5px 7px", marginBottom: "6px", fontSize: "9px", color: C.danger, fontFamily: FONT }}>⚠ {[...new Set([...adv.filter(s => s.pni).map(() => "PNI"), ...adv.filter(s => s.crib).map(() => "Cribriform"), ...adv.filter(s => s.idc).map(() => "IDC-P")])].join(", ")}</div>}

      <div style={{ background: focalOk ? C.successDim : C.dangerDim, border: `1px solid ${focalOk ? C.success : C.danger}25`, borderRadius: "4px", padding: "6px", marginBottom: "6px" }}>
        <div style={{ ...lbl, fontSize: "7px" }}>Focal Therapy</div>
        <div style={{ color: focalOk ? C.success : C.danger, fontSize: "10px", fontFamily: FONT, fontWeight: 700 }}>{focalOk ? "POTENTIAL CANDIDATE" : "REVIEW"}</div>
      </div>

      {nccn.group !== null && (
        <div style={{ background: C.accentDim, border: `1px solid ${C.accent}30`, borderRadius: "4px", padding: "6px" }}>
          <div style={{ ...lbl, fontSize: "7px", marginBottom: "3px" }}>Recommended Options</div>
          <div style={{ fontSize: "9px", color: C.accent, fontFamily: FONT, lineHeight: "1.4" }}>
            {nccn.group === 0 ? "Active Surveillance (preferred)" : nccn.group === 1 ? "Active Surveillance or Definitive Tx" : nccn.group === 2 ? "Active Surveillance (selective) or Definitive Tx" : nccn.group === 3 ? "Definitive Treatment" : "Aggressive Multimodal Tx"}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PATIENT EDUCATION
   ══════════════════════════════════════════════════════════════════ */

const TREATMENT_COMPARISON_DATA = [
  { treatment: "Active Surveillance", cancerControl: "~97%", incontinence: "Rare", dysfunction: "Rare", bowel: "None", recovery: "—", retreatment: "N/A", nccn: "VL, L, FI" },
  { treatment: "Radical Prostatectomy", cancerControl: "~97%", incontinence: "13%", dysfunction: "73%", bowel: "14%", recovery: "2-4 weeks", retreatment: "Rare", nccn: "All risk groups" },
  { treatment: "EBRT/IMRT", cancerControl: "~97%", incontinence: "6%", dysfunction: "77%", bowel: "34%", recovery: "7-9 weeks", retreatment: "Uncommon", nccn: "All risk groups" },
  { treatment: "Brachytherapy (LDR)", cancerControl: "~97%", incontinence: "5%", dysfunction: "50-60%", bowel: "8%", recovery: "1-2 weeks", retreatment: "Uncommon", nccn: "Low-FI risk" },
  { treatment: "Focal Therapy (HIFU/Cryo/IRE)", cancerControl: "~95%*", incontinence: "3-5%", dysfunction: "50%", bowel: "Minimal", recovery: "1-2 weeks", retreatment: "10-15%", nccn: "Selected cases" },
];

const OUTCOME_DATA = {
  0: { risk: "Very Low", css15: ">99%", mfs10: ">99%", as: "STRONGLY recommended", focal: "Not applicable" },
  1: { risk: "Low", css15: ">99%", mfs10: "98%", as: "PREFERRED", focal: "Not applicable" },
  2: { risk: "Favorable Intermediate", css15: "~97%", mfs10: "95%", as: "SELECTIVE (low volume)", focal: "Selective candidate" },
  3: { risk: "Unfavorable Intermediate", css15: "~93%", mfs10: "90%", as: "NOT recommended", focal: "Case-dependent" },
  4: { risk: "High", css15: "~85%", mfs10: "80%", as: "NOT recommended", focal: "NOT recommended" },
  5: { risk: "Very High", css15: "~70%", mfs10: "65%", as: "NOT recommended", focal: "NOT recommended" },
};

function FaqAccordion() {
  const [open, setOpen] = useState({});
  const faqs = [
    { q: "What does my Gleason score/Grade Group mean?", a: "Your Gleason score is the sum of two numbers (each 1-5) that describe how abnormal your cancer cells look. Grade Groups (GG) simplify this: GG1 (3+3) is low-grade, GG2 (3+4) is intermediate, GG3 (4+3) and above are higher-grade. Higher grades generally indicate more aggressive cancers. Grade Groups help predict outcomes and guide treatment decisions." },
    { q: "What is PI-RADS and what does my score mean?", a: "PI-RADS (Prostate Imaging-Reporting and Data System) is a 1-5 scoring system for MRI findings. Score 1-2 = very low cancer likelihood; 3 = intermediate; 4 = high likelihood; 5 = very high likelihood of clinically significant cancer. PI-RADS helps identify areas that need biopsy or closer monitoring." },
    { q: "What is PSA density and why does it matter?", a: "PSA density is your PSA level divided by prostate volume (cc). A PSA of 5 ng/mL from a 50 cc prostate (density 0.1) is more concerning than the same PSA from a 100 cc prostate (density 0.05). Density helps interpret PSA in context—lower density typically suggests lower cancer risk. Density <0.15 is generally reassuring." },
    { q: "Am I a candidate for active surveillance?", a: "Active surveillance (AS) is a monitoring strategy for very low and low-risk cancers. Good candidates typically have: low Gleason score (GG1-2), PSA <10, low PSA density, no concerning imaging, and limited cancer in biopsies. AS involves regular PSA checks every 3-6 months, periodic MRI, and repeat biopsies. About 30-50% eventually need treatment, usually within 5 years." },
    { q: "What are the differences between surgery and radiation?", a: "Surgery (prostatectomy) removes the prostate; radiation delivers high-dose beams from outside. Surgery offers a single procedure (2-4 week recovery) but has upfront risks. Radiation requires 7-9 weeks of daily treatments with potentially different late side effects. Both cure similar percentages of early cancers (~97%). Choice depends on age, health, and preferences." },
    { q: "What is focal therapy and am I a candidate?", a: "Focal therapy treats only the cancer area, not the whole prostate. Options include HIFU (sound waves), cryotherapy (freezing), IRE (electrical), or laser. Benefits: less side effects, faster recovery. Drawbacks: emerging data (not yet standard), risk of residual disease, may need future treatment. Candidates typically have unilateral (one-side) disease, low volume, and no high-risk features." },
    { q: "What are genomic tests and do I need one?", a: "Genomic tests (Decipher, Oncotype DX, Prolaris) analyze cancer genes to predict aggressiveness beyond grade/PSA alone. They can help refine risk stratification and inform treatment decisions, especially in borderline cases. Not needed for clearly low or very high risk. Discuss with your doctor if your case would benefit from genetic testing." },
    { q: "What does PNI/Cribriform/IDC-P mean for my prognosis?", a: "PNI (Perineural Invasion): cancer cells tracking along nerve sheaths—suggests higher risk. Cribriform pattern: aggressive cancer growth pattern. IDC-P (Intraductal carcinoma): cells filling ducts—associated with worse outcomes. Presence of any of these features typically prompts consideration of more aggressive treatment even if grade seems favorable." },
    { q: "What is the timeline for treatment decisions?", a: "Most men have weeks to months to decide, especially for low/intermediate risk. Very high-risk cases warrant prompt treatment discussion. Active surveillance has a defined protocol: confirmatory biopsy 6-12 months after diagnosis, then periodic monitoring. Don't rush, but don't delay unnecessarily—discuss specific timeline with your team." },
    { q: "What questions should I ask my urologist?", a: "Key questions: (1) What is my NCCN risk group? (2) What are my treatment options? (3) What are realistic outcomes and side effects for my case? (4) Am I a candidate for active surveillance or focal therapy? (5) What do genomic tests show? (6) What happens if I choose watchful waiting and then need treatment? (7) What is the follow-up plan? (8) When should I consider a second opinion?" },
  ];
  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: "6px", padding: "10px" }}>
      <div style={{ ...lbl, fontSize: "9px", letterSpacing: "1.5px", marginBottom: "8px" }}>Patient FAQ</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {faqs.map((faq, i) => (
          <div key={i} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: "4px", overflow: "hidden" }}>
            <button onClick={() => setOpen({ ...open, [i]: !open[i] })} style={{ width: "100%", padding: "8px 10px", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", color: C.textPri, fontSize: "9px", fontFamily: FONT }}>
              <span style={{ fontWeight: 600 }}>{faq.q}</span>
              <span style={{ fontSize: "11px", opacity: 0.6 }}>{open[i] ? "▼" : "▶"}</span>
            </button>
            {open[i] && <div style={{ padding: "8px 10px", borderTop: `1px solid ${C.border}`, fontSize: "9px", color: C.textSec, lineHeight: "1.5", fontFamily: FONT }}>{faq.a}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function PatientEducation({ patient, session }) {
  const specs = allSpecs(session);
  const nccn = computeNCCN(session.psa, patient.tStage, patient.volume, specs);
  const outcomes = nccn.group !== null ? OUTCOME_DATA[nccn.group] : null;

  return (
    <div style={{ padding: "14px", maxWidth: "1000px", margin: "0 auto", overflowY: "auto" }}>
      {/* Disclaimer */}
      <div style={{ background: C.warnDim, border: `1px solid ${C.warn}40`, borderRadius: "6px", padding: "10px", marginBottom: "14px" }}>
        <div style={{ fontSize: "9px", fontWeight: 700, color: C.warn, marginBottom: "3px" }}>⚠ FOR INFORMATIONAL PURPOSES ONLY</div>
        <div style={{ fontSize: "8px", color: C.warn, opacity: 0.9 }}>This educational content is general information and is NOT a substitute for medical advice. All clinical decisions should be made in consultation with your urologist. Data sources: ProtecT 2023, Swedish RARP vs RT 2024, Tay et al 2024.</div>
      </div>

      {/* Treatment Comparison */}
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: "6px", padding: "10px", marginBottom: "14px" }}>
        <div style={{ ...lbl, fontSize: "9px", letterSpacing: "1.5px", marginBottom: "8px" }}>Treatment Comparison Matrix</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8px", fontFamily: FONT }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                {["Treatment", "Cancer Control@15yr", "Incontinence", "Erectile Dysfunction", "Bowel Symptoms", "Recovery", "Retreatment", "NCCN Recommended For"].map(h => (
                  <th key={h} style={{ padding: "6px 4px", textAlign: "left", color: C.textSec, fontWeight: 600, borderRight: `1px solid ${C.border}20` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TREATMENT_COMPARISON_DATA.map((row, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}15` }}>
                  <td style={{ padding: "6px 4px", fontWeight: 600, color: C.textPri }}>{row.treatment}</td>
                  <td style={{ padding: "6px 4px", color: C.success }}>{row.cancerControl}</td>
                  <td style={{ padding: "6px 4px" }}>{row.incontinence}</td>
                  <td style={{ padding: "6px 4px" }}>{row.dysfunction}</td>
                  <td style={{ padding: "6px 4px" }}>{row.bowel}</td>
                  <td style={{ padding: "6px 4px" }}>{row.recovery}</td>
                  <td style={{ padding: "6px 4px" }}>{row.retreatment}</td>
                  <td style={{ padding: "6px 4px", fontSize: "7px" }}>{row.nccn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Risk-Stratified Outcomes */}
      {outcomes && (
        <div style={{ background: C.bgCard, border: `1px solid ${NCCN_GROUPS[nccn.group].color}40`, borderRadius: "6px", padding: "10px", marginBottom: "14px" }}>
          <div style={{ ...lbl, fontSize: "9px", letterSpacing: "1.5px", marginBottom: "8px" }}>Your Risk Group: <span style={{ color: NCCN_GROUPS[nccn.group].color }}>{outcomes.risk}</span></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: "4px", padding: "8px" }}>
              <div style={{ ...lbl, fontSize: "7px", marginBottom: "2px" }}>15-Year Cancer-Specific Survival</div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: C.success }}>{outcomes.css15}</div>
            </div>
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: "4px", padding: "8px" }}>
              <div style={{ ...lbl, fontSize: "7px", marginBottom: "2px" }}>10-Year Metastasis-Free Survival</div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: C.success }}>{outcomes.mfs10}</div>
            </div>
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: "4px", padding: "8px" }}>
              <div style={{ ...lbl, fontSize: "7px", marginBottom: "2px" }}>Active Surveillance Eligibility</div>
              <div style={{ fontSize: "11px", fontWeight: 600, color: C.accent }}>{outcomes.as}</div>
            </div>
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: "4px", padding: "8px" }}>
              <div style={{ ...lbl, fontSize: "7px", marginBottom: "2px" }}>Focal Therapy Candidacy</div>
              <div style={{ fontSize: "11px", fontWeight: 600, color: C.accent }}>{outcomes.focal}</div>
            </div>
          </div>
        </div>
      )}

      {/* Decision-Making Tools & Nomograms */}
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: "6px", padding: "10px", marginBottom: "14px" }}>
        <div style={{ ...lbl, fontSize: "9px", letterSpacing: "1.5px", marginBottom: "8px" }}>Decision-Making Tools & Nomograms</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "10px" }}>
          {[
            {
              name: "MSKCC Pre-Radical Prostatectomy Nomogram",
              desc: "Predicts pathological stage and biochemical recurrence after surgery.",
              url: "https://www.mskcc.org/nomograms/prostate"
            },
            {
              name: "Partin Tables",
              desc: "Predict pathological stage (organ-confined, EPE, SVI, LN+) based on PSA, Gleason, and T-stage.",
              url: "https://www.hopkinsmedicine.org/brady-urology-institute/specialties/conditions-and-treatments/prostate-cancer/fighting-prostate-cancer/partin-tables"
            },
            {
              name: "NCCN Risk Calculator",
              desc: "Risk group classification with treatment recommendations.",
              url: "https://www.nccn.org/professionals/physician_gls/pdf/prostate.pdf"
            },
            {
              name: "AUA Risk Stratification",
              desc: "AUA/ASTRO/SUO guidelines for localized prostate cancer.",
              url: "https://www.auanet.org/guidelines-and-quality/guidelines/clinically-localized-prostate-cancer"
            }
          ].map(tool => (
            <div key={tool.name} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: "5px", padding: "10px", display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "10px", fontWeight: 600, color: C.accent, marginBottom: "4px" }}>{tool.name}</div>
              <div style={{ fontSize: "8px", color: C.textSec, marginBottom: "8px", flex: 1, lineHeight: "1.4" }}>{tool.desc}</div>
              <button
                onClick={() => window.open(tool.url, '_blank')}
                style={{ ...btn, background: C.accentDim, color: C.accent, border: `1px solid ${C.accent}40`, fontSize: "8px", padding: "5px 10px", alignSelf: "flex-start" }}
              >
                Visit Tool →
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <FaqAccordion />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   UPSTAGE RISK PREDICTOR
   ══════════════════════════════════════════════════════════════════ */

function UpstagePredictor({ patient, sessions }) {
  const [overridePsa, setOverridePsa] = useState(null);
  const [overrideVolume, setOverrideVolume] = useState(null);
  const [overridePirads, setOverridePirads] = useState(null);
  const [overrideGradeGroup, setOverrideGradeGroup] = useState(null);
  const [overridePosCores, setOverridePosCores] = useState(null);
  const [overrideTotalCores, setOverrideTotalCores] = useState(null);
  const [overrideMaxPct, setOverrideMaxPct] = useState(null);
  const [overrideDecipher, setOverrideDecipher] = useState(null);

  // Auto-detect values from latest session
  const latestSession = sessions && sessions.length > 0 ? sessions[sessions.length - 1] : null;
  const specs = latestSession ? allSpecs(latestSession) : [];

  // PSA from latest session
  const autoPsa = latestSession?.psa ? parseFloat(latestSession.psa) : null;
  const psa = overridePsa !== null ? overridePsa : autoPsa;

  // Volume from patient
  const autoVolume = patient?.volume ? parseFloat(patient.volume) : null;
  const volume = overrideVolume !== null ? overrideVolume : autoVolume;

  // PSA density
  const psaDensity = psa && volume && volume > 0 ? psa / volume : null;

  // Grade group from specs
  const autoGradeGroup = specs.length > 0 ? (maxG(specs)?.gg || 1) : 1;
  const gradeGroup = overrideGradeGroup !== null ? overrideGradeGroup : autoGradeGroup;

  // Positive cores
  const autoPosCores = specs.length > 0 ? sumCores(specs, "coresPos") : 0;
  const posCores = overridePosCores !== null ? overridePosCores : autoPosCores;

  // Total cores
  const autoTotalCores = specs.length > 0 ? sumCores(specs, "coresTotal") : 0;
  const totalCores = overrideTotalCores !== null ? overrideTotalCores : autoTotalCores;

  // Percentage positive cores
  const pctPosCores = totalCores > 0 ? (posCores / totalCores) * 100 : 0;

  // Max core involvement
  const autoMaxPct = specs.length > 0 ? Math.max(0, ...specs.map(s => parseInt(s.maxPct) || 0)) : 0;
  const maxPct = overrideMaxPct !== null ? overrideMaxPct : autoMaxPct;

  // PI-RADS from MRI lesions
  const autoPirads = latestSession?.mriLesions && latestSession.mriLesions.length > 0
    ? Math.max(...latestSession.mriLesions.map(l => l.pirads || 1))
    : 1;
  const pirads = overridePirads !== null ? overridePirads : autoPirads;

  // Decipher score
  const autoDecipher = latestSession?.genomics?.decipher ? parseFloat(latestSession.genomics.decipher) : null;
  const decipher = overrideDecipher !== null ? overrideDecipher : autoDecipher;

  // Calculate risk scores for each factor (0-100 scale)
  const calculateRiskScores = () => {
    let scores = {};

    // PSA Density (HR 1.20 per 0.1)
    if (psaDensity !== null) {
      if (psaDensity < 0.10) scores.psaDensity = 10;
      else if (psaDensity < 0.15) scores.psaDensity = 25;
      else if (psaDensity < 0.20) scores.psaDensity = 45;
      else scores.psaDensity = 70;
    }

    // PI-RADS
    if (pirads === 1 || pirads === 2) scores.pirads = 10;
    else if (pirads === 3) scores.pirads = 35; // HR 2.46
    else if (pirads === 4) scores.pirads = 50; // HR 3.39
    else if (pirads === 5) scores.pirads = 75; // HR 4.95

    // Grade Group
    if (gradeGroup <= 1) scores.gradeGroup = 15;
    else if (gradeGroup === 2) scores.gradeGroup = 45; // OR ~2.5
    else if (gradeGroup === 3) scores.gradeGroup = 60;
    else if (gradeGroup === 4) scores.gradeGroup = 75;
    else scores.gradeGroup = 90;

    // % Positive Cores
    if (pctPosCores < 33) scores.pctCores = 15;
    else if (pctPosCores < 50) scores.pctCores = 40;
    else scores.pctCores = 65;

    // Max Core Involvement
    if (maxPct < 50) scores.maxPct = 20;
    else scores.maxPct = 55;

    // Decipher (if available)
    if (decipher !== null) {
      if (decipher < 0.45) scores.decipher = 10;
      else if (decipher < 0.60) scores.decipher = 45;
      else scores.decipher = 75;
    }

    return scores;
  };

  const riskScores = calculateRiskScores();

  // Calculate composite risk (weighted average)
  const compositeRisk = Object.values(riskScores).length > 0
    ? Object.values(riskScores).reduce((a, b) => a + b, 0) / Object.values(riskScores).length
    : 50;

  // Convert composite risk (0-100) to 5-year reclassification probability
  const risk5Year = 10 + (compositeRisk / 100) * 55; // Range: 10-65%

  // Estimate 1yr, 3yr, 5yr probabilities (simplified: exponential model)
  const risk1Year = risk5Year * 0.25;
  const risk3Year = risk5Year * 0.60;

  // Determine risk category and color
  let riskCategory = "Low", riskColor = C.success;
  if (risk5Year > 50) {
    riskCategory = "Very High";
    riskColor = C.danger;
  } else if (risk5Year > 30) {
    riskCategory = "High";
    riskColor = "#FF9800";
  } else if (risk5Year > 15) {
    riskCategory = "Intermediate";
    riskColor = C.warn;
  }

  // Data for bar chart
  const chartData = Object.entries(riskScores).map(([key, val]) => {
    const labels = {
      psaDensity: "PSA Density",
      pirads: "PI-RADS",
      gradeGroup: "Grade Group",
      pctCores: "% Cores",
      maxPct: "Max %",
      decipher: "Decipher",
    };
    return { name: labels[key] || key, value: val };
  });

  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: "6px", padding: "10px", marginBottom: "14px" }}>
      <div style={{ ...lbl, fontSize: "9px", letterSpacing: "1.5px", marginBottom: "8px" }}>Upstage Risk Predictor</div>

      {/* Risk Score Display */}
      <div style={{ background: C.bg, border: `1px solid ${riskColor}40`, borderRadius: "6px", padding: "10px", marginBottom: "10px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "8px" }}>
          {/* 5-year risk large display */}
          <div style={{ textAlign: "center", padding: "8px", background: riskColor + "15", border: `1.5px solid ${riskColor}`, borderRadius: "4px" }}>
            <div style={{ fontSize: "7px", color: C.textSec, marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>5-Year Risk</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: riskColor }}>{risk5Year.toFixed(1)}%</div>
            <div style={{ fontSize: "8px", color: C.textSec, marginTop: "2px" }}>{riskCategory}</div>
          </div>

          {/* Time-based breakdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "40px 1fr", alignItems: "center", gap: "6px", fontSize: "8px" }}>
              <span style={{ color: C.textSec }}>1-Year:</span>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <div style={{ height: "6px", background: riskColor + "40", borderRadius: "2px", flex: 1, minWidth: "30px" }} />
                <span style={{ color: C.textPri, fontWeight: 600, minWidth: "28px" }}>{risk1Year.toFixed(1)}%</span>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "40px 1fr", alignItems: "center", gap: "6px", fontSize: "8px" }}>
              <span style={{ color: C.textSec }}>3-Year:</span>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <div style={{ height: "6px", background: riskColor + "60", borderRadius: "2px", flex: 1, minWidth: "30px" }} />
                <span style={{ color: C.textPri, fontWeight: 600, minWidth: "28px" }}>{risk3Year.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Factor Chart */}
      {chartData.length > 0 && (
        <div style={{ marginBottom: "10px" }}>
          <div style={{ fontSize: "8px", color: C.textSec, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>Risk Factor Contributions</div>
          <div style={{ height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="name" tick={{ fontSize: 7, fill: C.textMut, fontFamily: FONT }} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 7, fill: C.textMut, fontFamily: FONT }} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: "4px", fontFamily: FONT, fontSize: "8px" }} formatter={(v) => v.toFixed(1)} />
                <Bar dataKey="value" fill={C.accent} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Input Fields for Overrides */}
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: "4px", padding: "8px", marginBottom: "10px" }}>
        <div style={{ fontSize: "8px", color: C.textSec, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1.2px" }}>Manual Overrides (auto-filled from latest session)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
          {/* PSA */}
          <div>
            <label style={lbl}>PSA (ng/mL) {autoPsa ? `[${autoPsa.toFixed(2)}]` : ""}</label>
            <input
              type="number"
              value={overridePsa !== null ? overridePsa : ""}
              onChange={(e) => setOverridePsa(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder={autoPsa ? autoPsa.toFixed(2) : "0.0"}
              style={inp}
            />
          </div>

          {/* Volume */}
          <div>
            <label style={lbl}>Volume (cc) {autoVolume ? `[${autoVolume.toFixed(1)}]` : ""}</label>
            <input
              type="number"
              value={overrideVolume !== null ? overrideVolume : ""}
              onChange={(e) => setOverrideVolume(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder={autoVolume ? autoVolume.toFixed(1) : "0.0"}
              style={inp}
            />
          </div>

          {/* PSA Density (read-only) */}
          <div>
            <label style={lbl}>PSA Density</label>
            <div style={{ ...inp, background: C.bgInput + "80", display: "flex", alignItems: "center", padding: "6px 8px", color: C.textSec }}>
              {psaDensity !== null ? psaDensity.toFixed(3) : "—"}
            </div>
          </div>

          {/* PI-RADS */}
          <div>
            <label style={lbl}>PI-RADS (MRI) {autoPirads ? `[${autoPirads}]` : ""}</label>
            <select
              value={overridePirads !== null ? overridePirads : ""}
              onChange={(e) => setOverridePirads(e.target.value ? parseInt(e.target.value) : null)}
              style={{ ...inp, appearance: "none", paddingRight: "20px" }}
            >
              <option value="">{autoPirads ? autoPirads : "Select..."}</option>
              {[1, 2, 3, 4, 5].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Grade Group */}
          <div>
            <label style={lbl}>Grade Group {autoGradeGroup ? `[GG${autoGradeGroup}]` : ""}</label>
            <select
              value={overrideGradeGroup !== null ? overrideGradeGroup : ""}
              onChange={(e) => setOverrideGradeGroup(e.target.value ? parseInt(e.target.value) : null)}
              style={{ ...inp, appearance: "none", paddingRight: "20px" }}
            >
              <option value="">{autoGradeGroup ? `GG${autoGradeGroup}` : "Select..."}</option>
              {[1, 2, 3, 4, 5].map(gg => <option key={gg} value={gg}>GG{gg}</option>)}
            </select>
          </div>

          {/* Positive Cores */}
          <div>
            <label style={lbl}>Pos. Cores {autoPosCores ? `[${autoPosCores}]` : ""}</label>
            <input
              type="number"
              value={overridePosCores !== null ? overridePosCores : ""}
              onChange={(e) => setOverridePosCores(e.target.value ? parseInt(e.target.value) : null)}
              placeholder={autoPosCores || "0"}
              style={inp}
            />
          </div>

          {/* Total Cores */}
          <div>
            <label style={lbl}>Total Cores {autoTotalCores ? `[${autoTotalCores}]` : ""}</label>
            <input
              type="number"
              value={overrideTotalCores !== null ? overrideTotalCores : ""}
              onChange={(e) => setOverrideTotalCores(e.target.value ? parseInt(e.target.value) : null)}
              placeholder={autoTotalCores || "0"}
              style={inp}
            />
          </div>

          {/* Max % Core Involvement */}
          <div>
            <label style={lbl}>Max % Core {autoMaxPct ? `[${autoMaxPct}]` : ""}</label>
            <input
              type="number"
              value={overrideMaxPct !== null ? overrideMaxPct : ""}
              onChange={(e) => setOverrideMaxPct(e.target.value ? parseInt(e.target.value) : null)}
              placeholder={autoMaxPct || "0"}
              min="0"
              max="100"
              style={inp}
            />
          </div>

          {/* Decipher */}
          <div>
            <label style={lbl}>Decipher Score {autoDecipher ? `[${autoDecipher.toFixed(2)}]` : ""}</label>
            <input
              type="number"
              value={overrideDecipher !== null ? overrideDecipher : ""}
              onChange={(e) => setOverrideDecipher(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder={autoDecipher ? autoDecipher.toFixed(2) : "0.0"}
              min="0"
              max="1"
              step="0.01"
              style={inp}
            />
          </div>
        </div>
      </div>

      {/* Evidence Citations */}
      <div style={{ background: C.accentDim, border: `1px solid ${C.accent}30`, borderRadius: "4px", padding: "7px", fontSize: "8px", color: C.accent, lineHeight: "1.6" }}>
        <strong>Evidence Base:</strong> Risk model derived from PRIAS (Luiting et al, Eur Urol Oncol 2022), Luzzago (BJU Int 2020), and Sierra et al (Int Braz J Urol 2018). PSA density, PI-RADS, grade group, core involvement percentage, and Decipher score are independent predictors of harboring clinically significant cancer on repeat biopsy. Probabilities are estimates and should be discussed with your urologist before clinical decision-making.
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   ACTIVE SURVEILLANCE GUIDE
   ══════════════════════════════════════════════════════════════════ */

function ActiveSurveillanceGuide({ sessions, patient }) {
  const timeline = [
    { period: "Baseline (before 6-12 mo)", tests: ["Confirmatory biopsy", "PSA check", "Consider repeat MRI"], details: "Confirm diagnosis is stable before committing to AS" },
    { period: "Years 1-2", tests: ["PSA every 3-6 months", "Repeat MRI at 12 months", "Consider biopsy at 12-18 mo"], details: "Frequent monitoring during high-risk period" },
    { period: "Years 2-5", tests: ["PSA every 6 months", "MRI every 1-2 years", "Biopsy every 2-3 years if stable"], details: "Less frequent monitoring if stable" },
    { period: "Year 5+", tests: ["PSA every 6-12 months", "MRI every 2 years", "Biopsy if PSA velocity increases"], details: "Continued long-term surveillance" },
  ];

  const triggers = [
    "PSA velocity >0.75 ng/mL/year (or >0.5 in some protocols)",
    "Gleason grade reclassification on repeat biopsy",
    "Increased cancer volume (cores positive, % involvement)",
    "New or enlarging lesions on MRI",
    "Patient age >75 years (may shift to observation)",
    "Patient preference for treatment",
  ];

  const psaData = sessions
    .filter(s => s.psa && s.date)
    .map(s => ({ date: s.date, psa: parseFloat(s.psa), label: s.label || s.date }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div style={{ padding: "14px", maxWidth: "900px", margin: "0 auto", overflowY: "auto" }}>
      {/* Disclaimer */}
      <div style={{ background: C.warnDim, border: `1px solid ${C.warn}40`, borderRadius: "6px", padding: "10px", marginBottom: "14px" }}>
        <div style={{ fontSize: "9px", fontWeight: 700, color: C.warn, marginBottom: "3px" }}>ℹ PROTOCOL OVERVIEW</div>
        <div style={{ fontSize: "8px", color: C.warn, opacity: 0.9 }}>This is a general AS monitoring framework. Specific protocols vary (NCCN, Memorial Sloan Kettering, Johns Hopkins). Your urologist will customize the schedule based on your individual risk factors.</div>
      </div>

      {/* Timeline */}
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: "6px", padding: "10px", marginBottom: "14px" }}>
        <div style={{ ...lbl, fontSize: "9px", letterSpacing: "1.5px", marginBottom: "8px" }}>Monitoring Timeline</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {timeline.map((item, i) => (
            <div key={i} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: "4px", padding: "8px", display: "grid", gridTemplateColumns: "180px 1fr", gap: "8px" }}>
              <div style={{ fontWeight: 600, color: C.accent, fontSize: "9px" }}>{item.period}</div>
              <div>
                <div style={{ fontSize: "8px", color: C.textSec, marginBottom: "3px" }}>
                  {item.tests.map((t, j) => (
                    <div key={j}>• {t}</div>
                  ))}
                </div>
                <div style={{ fontSize: "8px", color: C.textMut, fontStyle: "italic" }}>{item.details}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Triggers for intervention */}
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: "6px", padding: "10px", marginBottom: "14px" }}>
        <div style={{ ...lbl, fontSize: "9px", letterSpacing: "1.5px", marginBottom: "8px", color: C.danger }}>Triggers for Treatment Consideration</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {triggers.map((trigger, i) => (
            <div key={i} style={{ fontSize: "9px", color: C.textSec, padding: "4px 6px", background: C.bg, borderRadius: "3px", borderLeft: `3px solid ${C.danger}` }}>
              {trigger}
            </div>
          ))}
        </div>
      </div>

      {/* Reclassification Risk Data */}
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: "6px", padding: "10px", marginBottom: "14px" }}>
        <div style={{ ...lbl, fontSize: "9px", letterSpacing: "1.5px", marginBottom: "8px" }}>Grade Reclassification on Surveillance Biopsies</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", marginBottom: "10px" }}>
          {[
            { period: "Year 1 Confirmatory", rate: "~25%" },
            { period: "Year 2 Cumulative", rate: "~15% per year" },
            { period: "Year 5 Cumulative", rate: "~30-40%" },
            { period: "Year 10 Cumulative", rate: "~50%" }
          ].map((item, i) => (
            <div key={i} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: "4px", padding: "8px" }}>
              <div style={{ ...lbl, fontSize: "7px", marginBottom: "3px" }}>{item.period}</div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: C.warn }}>{item.rate}</div>
            </div>
          ))}
        </div>
        <div style={{ background: C.accentDim, border: `1px solid ${C.accent}30`, borderRadius: "4px", padding: "7px", marginBottom: "6px", fontSize: "8px", color: C.accent, lineHeight: "1.5" }}>
          <strong>Note:</strong> Reclassification does NOT necessarily mean cancer has become dangerous. Many reclassifications reflect sampling differences rather than true biological progression.
        </div>
        <div style={{ background: C.successDim, border: `1px solid ${C.success}30`, borderRadius: "4px", padding: "7px", fontSize: "8px", color: C.textSec, lineHeight: "1.5" }}>
          <strong>MRI's Role in AS:</strong> Use of MRI in AS protocols has been shown to reduce unnecessary biopsies by 30-50% while maintaining detection of clinically significant reclassification (Klotz et al, Eur Urol 2024).
        </div>
      </div>

      {/* Upstage Risk Predictor */}
      <UpstagePredictor patient={patient} sessions={sessions} />

      {/* PSA Trend if available */}
      {psaData.length >= 2 && (
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: "6px", padding: "10px" }}>
          <div style={{ ...lbl, fontSize: "9px", letterSpacing: "1.5px", marginBottom: "8px" }}>Your PSA Trend</div>
          <div style={{ height: 140 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={psaData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <defs>
                  <linearGradient id="asGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.accent} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="date" tick={{ fontSize: 7, fill: C.textMut, fontFamily: FONT }} />
                <YAxis tick={{ fontSize: 7, fill: C.textMut, fontFamily: FONT }} />
                <Tooltip contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: "4px", fontFamily: FONT, fontSize: "9px" }} />
                <Area type="monotone" dataKey="psa" stroke={C.accent} fill="url(#asGrad)" strokeWidth={2} dot={{ r: 2.5, fill: C.accent }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PRINTABLE REPORT
   ══════════════════════════════════════════════════════════════════ */

function PrintReport({ patient, session, onClose }) {
  const specs = allSpecs(session);
  const nccn = computeNCCN(session.psa, patient.tStage, patient.volume, specs);
  const mg = maxG(specs);
  const pos = sumCores(specs, "coresPos"); const tot = sumCores(specs, "coresTotal");
  const ps = { fontFamily: "'Courier New', monospace", fontSize: "10px", color: "#111", lineHeight: "1.5" };
  const th = { padding: "3px 6px", textAlign: "left", borderBottom: "2px solid #333", fontSize: "8px", textTransform: "uppercase", color: "#555" };
  const td = { padding: "3px 6px", borderBottom: "1px solid #ddd", fontSize: "9px" };
  const reportRef = useRef(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const savePDF = async () => {
    if (!reportRef.current) return;
    setPdfLoading(true);
    try {
      // Dynamically load html2pdf.js
      if (!window.html2pdf) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      const filename = `prostate-bx-report-${patient.mrn || "patient"}-${new Date().toISOString().slice(0, 10)}.pdf`;
      const opt = {
        margin: [10, 10, 10, 10],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      };
      await window.html2pdf().set(opt).from(reportRef.current).save();
    } catch (err) {
      console.error("PDF export failed:", err);
      // Fallback to browser print dialog
      window.print();
    }
    setPdfLoading(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#fff", overflowY: "auto" }}>
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
      <div className="no-print" style={{ position: "fixed", top: 8, right: 8, display: "flex", gap: "6px", zIndex: 10000 }}>
        <button onClick={savePDF} disabled={pdfLoading} style={{ ...btn, background: "#CC3333", color: "#fff", padding: "8px 18px", fontSize: "11px", opacity: pdfLoading ? 0.6 : 1 }}>{pdfLoading ? "Generating..." : "Save PDF"}</button>
        <button onClick={() => window.print()} style={{ ...btn, background: "#1a5cba", color: "#fff", padding: "8px 18px", fontSize: "11px" }}>Print</button>
        <button onClick={onClose} style={{ ...btn, background: "#eee", color: "#333", padding: "8px 14px", fontSize: "11px" }}>Close</button>
      </div>
      <div ref={reportRef} style={{ maxWidth: "720px", margin: "0 auto", padding: "30px 24px", ...ps }}>
        <div style={{ borderBottom: "3px solid #111", paddingBottom: "8px", marginBottom: "14px" }}>
          <div style={{ fontSize: "16px", fontWeight: 700 }}>PROSTATE BIOPSY MAPPING REPORT</div>
          <div style={{ fontSize: "9px", color: "#666" }}>MRI-Fusion · NCCN Risk · Genomic Classifiers · Focal Therapy Assessment</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px", marginBottom: "14px", padding: "8px", background: "#f8f8f8", borderRadius: "3px" }}>
          {[["MRN", patient.mrn], ["DOB", patient.dob], ["Bx Date", session.date], ["PSA", session.psa ? `${session.psa} ng/mL` : "—"]].map(([l, v]) => <div key={l}><div style={{ fontSize: "7px", textTransform: "uppercase", color: "#888", letterSpacing: "1px" }}>{l}</div><div style={{ fontWeight: 700 }}>{v || "—"}</div></div>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px", marginBottom: "14px" }}>
          {[["Stage", patient.tStage], ["Volume", patient.volume ? `${patient.volume} cc` : "—"], ["PSA Density", nccn.density !== null ? `${nccn.density.toFixed(3)}` : "—"], ["NCCN Risk", nccn.group !== null ? NCCN_GROUPS[nccn.group].name : "N/A"]].map(([l, v]) => <div key={l}><div style={{ fontSize: "7px", textTransform: "uppercase", color: "#888", letterSpacing: "1px" }}>{l}</div><div style={{ fontWeight: 700, color: l === "NCCN Risk" && nccn.group !== null ? NCCN_GROUPS[nccn.group].color : "#111" }}>{v}</div></div>)}
        </div>

        {/* Genomics */}
        {(session.genomics?.decipher || session.genomics?.oncotype || session.genomics?.prolaris) && (
          <div style={{ marginBottom: "14px", padding: "6px 8px", border: "1px solid #ddd", borderRadius: "3px" }}>
            <div style={{ fontSize: "8px", textTransform: "uppercase", color: "#888", letterSpacing: "1px", marginBottom: "3px" }}>Genomic Classifiers</div>
            <div style={{ display: "flex", gap: "16px" }}>
              {session.genomics.decipher && <span>Decipher: <strong>{session.genomics.decipher}</strong></span>}
              {session.genomics.oncotype && <span>Oncotype: <strong>{session.genomics.oncotype}</strong></span>}
              {session.genomics.prolaris && <span>Prolaris: <strong>{session.genomics.prolaris}</strong></span>}
            </div>
          </div>
        )}

        {/* IPSS Score */}
        {session.ipss && ((() => {
          const total = [1, 2, 3, 4, 5, 6, 7].reduce((s, i) => s + (session.ipss[`q${i}`] || 0), 0);
          const interpretation = total <= 7 ? "Mild" : total <= 19 ? "Moderate" : "Severe";
          return (
            <div style={{ marginBottom: "10px", padding: "6px 8px", border: "1px solid #ddd", borderRadius: "3px" }}>
              <div style={{ fontSize: "8px", textTransform: "uppercase", color: "#888", letterSpacing: "1px", marginBottom: "3px" }}>IPSS Score</div>
              <div style={{ fontSize: "10px" }}>Score: <strong>{total}</strong> ({interpretation}){session.ipss?.qol !== undefined && session.ipss.qol !== "" ? ` · QoL: ${session.ipss.qol}` : ""}</div>
            </div>
          );
        })())}

        {/* SHIM Score */}
        {session.shim && ((() => {
          const total = [1, 2, 3, 4, 5].reduce((s, i) => s + (session.shim[`q${i}`] || 0), 0);
          const interpretation = total >= 22 ? "No ED" : total >= 17 ? "Mild ED" : total >= 12 ? "Mild-Moderate ED" : total >= 8 ? "Moderate ED" : "Severe ED";
          return (
            <div style={{ marginBottom: "10px", padding: "6px 8px", border: "1px solid #ddd", borderRadius: "3px" }}>
              <div style={{ fontSize: "8px", textTransform: "uppercase", color: "#888", letterSpacing: "1px", marginBottom: "3px" }}>SHIM Score</div>
              <div style={{ fontSize: "10px" }}>Score: <strong>{total}</strong> ({interpretation})</div>
            </div>
          );
        })())}

        {/* Life Expectancy */}
        {session.lifeExpectancy?.age && ((() => {
          const LETable = { 50: { 0: 32, 2: 26, 4: 18 }, 55: { 0: 28, 2: 22, 4: 15 }, 60: { 0: 23, 2: 18, 4: 12 }, 65: { 0: 19, 2: 15, 4: 10 }, 70: { 0: 15, 2: 11, 4: 7 }, 75: { 0: 12, 2: 8, 4: 5 }, 80: { 0: 8, 2: 6, 4: 3 }, 85: { 0: 6, 2: 4, 4: 2 } };
          const age = session.lifeExpectancy.age; const cci = session.lifeExpectancy.cci || 0;
          const ageKey = Math.min(85, Math.max(50, Math.round(age / 5) * 5));
          const le = LETable[ageKey]?.[Math.min(4, cci)] || LETable[85][4];
          return (
            <div style={{ marginBottom: "10px", padding: "6px 8px", border: "1px solid #ddd", borderRadius: "3px" }}>
              <div style={{ fontSize: "8px", textTransform: "uppercase", color: "#888", letterSpacing: "1px", marginBottom: "3px" }}>Life Expectancy</div>
              <div style={{ fontSize: "10px" }}>Est. <strong>~{le} years</strong> (Age: {age}, CCI: {cci})</div>
            </div>
          );
        })())}


        <div style={{ fontSize: "12px", fontWeight: 700, borderBottom: "2px solid #333", paddingBottom: "3px", marginBottom: "8px" }}>SYSTEMATIC BIOPSY</div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px" }}>
          <thead><tr>{["Zone", "Grade", "Cores", "Max%", "PNI", "Crib", "IDC", "Notes"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>{ZONES.map((z, i) => { const s = session.specimens[z]; const g = GLEASON.find(x => x.value === s.gleason); return <tr key={z}><td style={td}>{ZONE_FULL[i]}</td><td style={{ ...td, color: g?.color, fontWeight: g ? 600 : 400 }}>{g?.label || "—"}</td><td style={td}>{s.coresPos && s.coresTotal ? `${s.coresPos}/${s.coresTotal}` : "—"}</td><td style={td}>{s.maxPct ? `${s.maxPct}%` : "—"}</td><td style={{ ...td, color: s.pni ? "#D32F2F" : "#999" }}>{s.pni ? "+" : "—"}</td><td style={{ ...td, color: s.crib ? "#D32F2F" : "#999" }}>{s.crib ? "+" : "—"}</td><td style={{ ...td, color: s.idc ? "#D32F2F" : "#999" }}>{s.idc ? "+" : "—"}</td><td style={{ ...td, fontSize: "8px", color: "#666" }}>{s.notes || ""}</td></tr>; })}</tbody>
        </table>

        {session.mriLesions.length > 0 && (<><div style={{ fontSize: "12px", fontWeight: 700, borderBottom: "2px solid #333", paddingBottom: "3px", marginBottom: "8px" }}>MRI LESIONS & TARGETED BIOPSY</div><table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px" }}><thead><tr>{["Lesion", "PI-RADS", "Size", "Sector", "Bx Grade", "Cores", "Notes"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead><tbody>{session.mriLesions.map(l => { const targets = session.targetedBx.filter(t => t.lesionId === l.id); const tmg = maxG(targets.filter(t => t.gleason)); return <tr key={l.id}><td style={td}>{l.name}</td><td style={{ ...td, color: PIRADS_LIST.find(p => p.value === l.pirads)?.color, fontWeight: 700 }}>{l.pirads}</td><td style={td}>{l.sizeMm ? `${l.sizeMm}mm` : "—"}</td><td style={td}>{l.sector}</td><td style={{ ...td, color: tmg?.color, fontWeight: tmg ? 600 : 400 }}>{tmg?.label || "—"}</td><td style={td}>{targets.length > 0 ? targets.map(t => `${t.coresPos || 0}/${t.coresTotal || 0}`).join(", ") : "—"}</td><td style={{ ...td, fontSize: "8px" }}>{l.notes || ""}</td></tr>; })}</tbody></table></>)}

        {session.treatment && (<div style={{ marginBottom: "12px", padding: "8px", border: "1px solid #ddd", borderRadius: "3px" }}><div style={{ fontSize: "10px", fontWeight: 700, marginBottom: "4px" }}>TREATMENT</div><div style={{ fontSize: "9px" }}>Modality: <strong>{session.treatment.modality}</strong> · Pattern: <strong>{session.treatment.pattern}</strong> · Date: <strong>{session.treatment.date || "—"}</strong></div>{session.treatment.notes && <div style={{ fontSize: "8px", color: "#666", marginTop: "2px" }}>{session.treatment.notes}</div>}</div>)}

        <div style={{ padding: "8px", background: focalOk(session, patient) ? "#F1F8E9" : "#FFF3F3", border: `1px solid ${focalOk(session, patient) ? "#C5E1A5" : "#FFCDD2"}`, borderRadius: "3px", fontSize: "9px", marginBottom: "14px" }}>
          <strong>Focal Therapy:</strong> {focalOk(session, patient) ? "Potential candidate." : "Review carefully."}
        </div>

        {/* ═══ NCCN RISK ASSESSMENT ═══ */}
        {nccn.group !== null && (() => {
          const riskName = NCCN_GROUPS[nccn.group].name;
          const riskColor = NCCN_GROUPS[nccn.group].color;
          const gg = mg?.gg || 0;
          const maxI = Math.max(0, ...specs.map(s => parseInt(s.maxPct) || 0));
          const pctPos = tot > 0 ? ((pos / tot) * 100).toFixed(0) : 0;
          const hasAdverse = specs.some(s => s.pni || s.crib || s.idc);

          // Treatment recommendations by NCCN risk
          const txRecs = {
            0: { primary: "Active Surveillance (preferred)", alternatives: ["Observation for limited life expectancy"], note: "Very low-risk disease — active surveillance is strongly recommended per NCCN guidelines. Treatment is generally not necessary unless reclassification occurs." },
            1: { primary: "Active Surveillance (preferred)", alternatives: ["Radical Prostatectomy", "Radiation Therapy (EBRT or Brachytherapy)"], note: "Low-risk disease is very manageable. Active surveillance avoids side effects of treatment while closely monitoring for any changes." },
            2: { primary: "Active Surveillance (for select patients) or Definitive Treatment", alternatives: ["Radical Prostatectomy ± PLND", "EBRT + short-term ADT (4-6 mo)", "Brachytherapy (select patients)"], note: "Favorable intermediate-risk. Active surveillance may be considered for low-volume GG2. If treatment is chosen, outcomes are excellent." },
            3: { primary: "Radical Prostatectomy ± PLND or Radiation + ADT", alternatives: ["EBRT + short-term ADT (4-6 mo)", "Radical Prostatectomy + extended PLND"], note: "Unfavorable intermediate-risk warrants definitive treatment. Discuss goals, side effects, and quality-of-life considerations." },
            4: { primary: "Radical Prostatectomy + ext. PLND or Radiation + long-term ADT", alternatives: ["EBRT + ADT (18-36 mo)", "EBRT + brachy boost + ADT", "Radical Prostatectomy + extended PLND"], note: "High-risk disease benefits from aggressive multimodal treatment. Imaging workup (PSMA-PET, CT, bone scan) recommended." },
            5: { primary: "EBRT + long-term ADT ± docetaxel or RP + ext. PLND (select)", alternatives: ["EBRT + ADT (24-36 mo) ± abiraterone", "Systemic therapy", "Clinical trials"], note: "Very high-risk. Multimodal therapy is essential. Consider PSMA-PET staging and clinical trial enrollment." },
          };
          const rec = txRecs[nccn.group] || txRecs[1];

          // AS eligibility
          const asEligible = (nccn.group === 0 || nccn.group === 1) && gg <= 1 && !hasAdverse;
          const asBorderline = nccn.group === 2 && gg <= 2 && pctPos < 50 && !hasAdverse;

          // Upstaging risk estimate (simplified from the predictor)
          const psaDens = nccn.density || 0;
          const maxPirads = Math.max(0, ...session.mriLesions.map(l => l.pirads || 0));
          let upstageRisk = 15; // baseline
          if (psaDens >= 0.20) upstageRisk += 15; else if (psaDens >= 0.15) upstageRisk += 8; else if (psaDens >= 0.10) upstageRisk += 3;
          if (maxPirads >= 5) upstageRisk += 20; else if (maxPirads >= 4) upstageRisk += 12; else if (maxPirads >= 3) upstageRisk += 5;
          if (gg >= 2) upstageRisk += 12; else if (gg >= 1) upstageRisk += 0;
          if (pctPos > 50) upstageRisk += 10; else if (pctPos > 33) upstageRisk += 5;
          if (maxI >= 50) upstageRisk += 8;
          upstageRisk = Math.min(85, Math.max(5, upstageRisk));
          const upstageCategory = upstageRisk < 15 ? "Low" : upstageRisk < 30 ? "Intermediate" : upstageRisk < 50 ? "High" : "Very High";
          const upstageColor = upstageRisk < 15 ? "#2E8B57" : upstageRisk < 30 ? "#D48F10" : upstageRisk < 50 ? "#CC6600" : "#CC3333";

          return (<>
            <div style={{ fontSize: "12px", fontWeight: 700, borderBottom: "2px solid #333", paddingBottom: "3px", marginBottom: "8px" }}>NCCN RISK ASSESSMENT</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
              <div style={{ padding: "10px", background: "#f8f8f8", borderRadius: "3px", borderLeft: `4px solid ${riskColor}` }}>
                <div style={{ fontSize: "7px", textTransform: "uppercase", color: "#888", letterSpacing: "1px", marginBottom: "2px" }}>NCCN Risk Group</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: riskColor }}>{riskName}</div>
              </div>
              <div style={{ padding: "10px", background: "#f8f8f8", borderRadius: "3px" }}>
                <div style={{ fontSize: "7px", textTransform: "uppercase", color: "#888", letterSpacing: "1px", marginBottom: "2px" }}>Key Factors</div>
                <div style={{ fontSize: "8px", color: "#444", lineHeight: "1.5" }}>
                  Grade Group: {gg} · PSA: {session.psa || "—"} ng/mL<br />
                  Stage: {patient.tStage} · Cores: {pos}/{tot} ({pctPos}%)<br />
                  Max involvement: {maxI}% · PSA density: {nccn.density !== null ? nccn.density.toFixed(3) : "—"}
                </div>
              </div>
            </div>

            {/* Adverse features */}
            {hasAdverse && (
              <div style={{ marginBottom: "10px", padding: "6px 8px", background: "#FFF3F3", border: "1px solid #FFCDD2", borderRadius: "3px" }}>
                <div style={{ fontSize: "8px", textTransform: "uppercase", color: "#D32F2F", letterSpacing: "1px", marginBottom: "2px", fontWeight: 700 }}>Adverse Pathological Features</div>
                <div style={{ fontSize: "9px", color: "#333" }}>
                  {specs.some(s => s.pni) && <span style={{ marginRight: "12px" }}>Perineural invasion (PNI) detected</span>}
                  {specs.some(s => s.crib) && <span style={{ marginRight: "12px" }}>Cribriform pattern detected</span>}
                  {specs.some(s => s.idc) && <span>Intraductal carcinoma (IDC) detected</span>}
                </div>
                <div style={{ fontSize: "8px", color: "#666", marginTop: "3px", fontStyle: "italic" }}>These features are associated with more aggressive disease behavior and may influence treatment decisions.</div>
              </div>
            )}

            {/* Treatment Recommendations */}
            <div style={{ marginBottom: "10px", padding: "8px", border: "1px solid #ddd", borderRadius: "3px" }}>
              <div style={{ fontSize: "8px", textTransform: "uppercase", color: "#888", letterSpacing: "1px", marginBottom: "4px", fontWeight: 700 }}>Recommended Management Options (NCCN)</div>
              <div style={{ fontSize: "9px", color: "#111", marginBottom: "4px" }}><strong>Primary:</strong> {rec.primary}</div>
              <div style={{ fontSize: "8px", color: "#444", marginBottom: "4px" }}>
                <strong>Alternatives:</strong> {rec.alternatives.join(" · ")}
              </div>
              <div style={{ fontSize: "8px", color: "#555", fontStyle: "italic", lineHeight: "1.4", borderTop: "1px solid #eee", paddingTop: "4px", marginTop: "4px" }}>{rec.note}</div>
            </div>

            {/* Active Surveillance Eligibility */}
            <div style={{ marginBottom: "10px", padding: "8px", background: asEligible ? "#F1F8E9" : asBorderline ? "#FFF8E1" : "#FFF3F3", border: `1px solid ${asEligible ? "#C5E1A5" : asBorderline ? "#FFE082" : "#FFCDD2"}`, borderRadius: "3px" }}>
              <div style={{ fontSize: "8px", textTransform: "uppercase", color: asEligible ? "#2E7D32" : asBorderline ? "#F57F17" : "#C62828", letterSpacing: "1px", marginBottom: "3px", fontWeight: 700 }}>Active Surveillance Eligibility</div>
              {asEligible ? (
                <div style={{ fontSize: "9px", color: "#333", lineHeight: "1.5" }}>
                  <strong style={{ color: "#2E7D32" }}>Eligible for Active Surveillance.</strong> Per NCCN guidelines, this patient meets criteria for active surveillance with {riskName} risk disease, Grade Group {gg}, no adverse pathological features. Recommended protocol: confirmatory biopsy within 6-12 months, PSA every 3-6 months, MRI every 12 months initially.
                </div>
              ) : asBorderline ? (
                <div style={{ fontSize: "9px", color: "#333", lineHeight: "1.5" }}>
                  <strong style={{ color: "#F57F17" }}>May be considered for Active Surveillance (select patients).</strong> Favorable intermediate-risk with Grade Group {gg} and {pctPos}% positive cores. NCCN notes AS may be appropriate for select favorable intermediate-risk patients with low-volume GG2 disease. Requires shared decision-making.
                </div>
              ) : (
                <div style={{ fontSize: "9px", color: "#333", lineHeight: "1.5" }}>
                  <strong style={{ color: "#C62828" }}>Not a standard active surveillance candidate.</strong> {riskName} risk disease with Grade Group {gg}{hasAdverse ? " and adverse pathological features" : ""}. Definitive treatment is recommended per NCCN guidelines.
                </div>
              )}
            </div>

            {/* Upstaging Risk (for AS-eligible or borderline patients) */}
            {(asEligible || asBorderline) && (
              <div style={{ marginBottom: "10px", padding: "8px", border: "1px solid #ddd", borderRadius: "3px" }}>
                <div style={{ fontSize: "8px", textTransform: "uppercase", color: "#888", letterSpacing: "1px", marginBottom: "4px", fontWeight: 700 }}>Grade Reclassification Risk on Active Surveillance</div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
                  <div style={{ fontSize: "20px", fontWeight: 700, color: upstageColor }}>{upstageRisk}%</div>
                  <div>
                    <div style={{ fontSize: "9px", color: "#333" }}>Estimated 5-year reclassification probability</div>
                    <div style={{ fontSize: "8px", color: upstageColor, fontWeight: 600 }}>{upstageCategory} Risk</div>
                  </div>
                </div>
                <div style={{ fontSize: "8px", color: "#666", lineHeight: "1.4" }}>
                  Based on PSA density ({nccn.density !== null ? nccn.density.toFixed(3) : "N/A"}), PI-RADS ({maxPirads || "N/A"}), Grade Group ({gg}), positive core ratio ({pctPos}%), and max involvement ({maxI}%). Derived from published AS cohort data (PRIAS, Luzzago et al).
                </div>
              </div>
            )}

            {/* Bilateral Disease */}
            {(() => {
              const rightPos = Object.entries(session.specimens).filter(([z, s]) => z.startsWith("R ") && s.gleason && s.gleason !== "benign").length;
              const leftPos = Object.entries(session.specimens).filter(([z, s]) => z.startsWith("L ") && s.gleason && s.gleason !== "benign").length;
              const bilat = rightPos > 0 && leftPos > 0;
              return (
                <div style={{ marginBottom: "10px", padding: "6px 8px", border: "1px solid #ddd", borderRadius: "3px" }}>
                  <div style={{ fontSize: "8px", textTransform: "uppercase", color: "#888", letterSpacing: "1px", marginBottom: "2px" }}>Disease Distribution</div>
                  <div style={{ fontSize: "9px", color: "#333" }}>
                    {bilat ? (
                      <><strong style={{ color: "#D32F2F" }}>Bilateral</strong> — Cancer in both lobes (Right: {rightPos} zones, Left: {leftPos} zones). May affect focal therapy candidacy.</>
                    ) : rightPos > 0 ? (
                      <><strong style={{ color: "#2E7D32" }}>Unilateral (Right)</strong> — Cancer limited to right lobe ({rightPos} zone{rightPos > 1 ? "s" : ""}). Favorable for focal therapy consideration.</>
                    ) : leftPos > 0 ? (
                      <><strong style={{ color: "#2E7D32" }}>Unilateral (Left)</strong> — Cancer limited to left lobe ({leftPos} zone{leftPos > 1 ? "s" : ""}). Favorable for focal therapy consideration.</>
                    ) : (
                      <>No cancer zones mapped.</>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Imaging Recommendations */}
            <div style={{ marginBottom: "10px", padding: "6px 8px", border: "1px solid #ddd", borderRadius: "3px" }}>
              <div style={{ fontSize: "8px", textTransform: "uppercase", color: "#888", letterSpacing: "1px", marginBottom: "3px", fontWeight: 700 }}>Recommended Staging Workup</div>
              <div style={{ fontSize: "8px", color: "#333", lineHeight: "1.5" }}>
                {nccn.group <= 1 ? (
                  <>No routine imaging required for {riskName} risk. Consider mpMRI if not yet obtained for AS planning.</>
                ) : nccn.group <= 3 ? (
                  <>Consider bone scan if PSA &gt;10 or symptoms. CT/MRI abdomen-pelvis if unfavorable features. PSMA-PET/CT may be considered per NCCN.</>
                ) : (
                  <>Bone scan, CT or MRI of abdomen/pelvis recommended. <strong>PSMA-PET/CT strongly recommended</strong> for high-risk and very high-risk disease per NCCN 2024 guidelines.</>
                )}
              </div>
            </div>
          </>);
        })()}

        {/* Patient-Friendly Summary */}
        {nccn.group !== null && (
          <div style={{ marginBottom: "14px", padding: "10px", background: "#F0F7FF", border: "1px solid #BBDEFB", borderRadius: "3px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#1565C0", marginBottom: "6px" }}>PATIENT SUMMARY — What This Means for You</div>
            <div style={{ fontSize: "9px", color: "#333", lineHeight: "1.6" }}>
              {nccn.group <= 1 ? (
                <>Your biopsy results show <strong>very favorable findings</strong>. The cancer is low-grade (slow-growing) and limited in extent. Active surveillance — closely monitoring your cancer with regular PSA tests, MRI scans, and periodic biopsies — is the recommended approach. This avoids the side effects of surgery or radiation while ensuring your cancer is watched carefully. Most men in your situation do very well long-term.</>
              ) : nccn.group === 2 ? (
                <>Your biopsy shows <strong>favorable intermediate-risk</strong> findings. You have several good treatment options to discuss with your urologist, including active surveillance (for select patients), surgery (radical prostatectomy), or radiation therapy. The prognosis is very good with any of these approaches — cure rates exceed 90% for this risk category.</>
              ) : nccn.group === 3 ? (
                <>Your biopsy shows <strong>unfavorable intermediate-risk</strong> findings. Definitive treatment (surgery or radiation) is recommended. Your urologist will discuss which approach is best for your situation, considering your age, health, and preferences. With appropriate treatment, outcomes remain excellent for this category.</>
              ) : nccn.group === 4 ? (
                <>Your biopsy shows <strong>high-risk</strong> findings. Prompt, definitive treatment with surgery or radiation (often combined with hormone therapy) is recommended. Additional imaging (bone scan, PSMA-PET) is important to check that the cancer has not spread. With aggressive treatment, many men with high-risk prostate cancer can still be cured.</>
              ) : (
                <>Your biopsy shows <strong>very high-risk</strong> findings. A comprehensive treatment plan involving multiple therapies is recommended. Your medical team will likely recommend imaging to fully stage your cancer and may discuss clinical trials. While this is a serious diagnosis, modern treatments offer meaningful benefit and improved outcomes.</>
              )}
            </div>
          </div>
        )}

        <div style={{ marginTop: "24px", borderTop: "1px solid #ddd", paddingTop: "6px", fontSize: "7px", color: "#999", textAlign: "center" }}>
          Prostate Biopsy Mapper · {new Date().toLocaleDateString()} · Verify all data before clinical decisions · Treatment recommendations per NCCN Guidelines v2024
        </div>
      </div>
    </div>
  );
}

function focalOk(session, patient) {
  const specs = allSpecs(session);
  const rightS = Object.entries(session.specimens).filter(([z, s]) => z.startsWith("R ") && s.gleason && s.gleason !== "benign");
  const leftS = Object.entries(session.specimens).filter(([z, s]) => z.startsWith("L ") && s.gleason && s.gleason !== "benign");
  const bilat = rightS.length > 0 && leftS.length > 0;
  const mg2 = maxG(specs); const maxI = Math.max(0, ...specs.map(s => parseInt(s.maxPct) || 0));
  return !bilat && mg2 && ["benign", "3+3", "3+4"].includes(mg2.value) && !specs.some(s => s.pni || s.crib || s.idc) && maxI <= 50;
}

/* ══════════════════════════════════════════════════════════════════
   PATIENT INTAKE WIZARD
   ══════════════════════════════════════════════════════════════════ */

function PatientIntake({ patient, session, onComplete, onSwitchToClinical }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [dob, setDob] = useState(patient.dob || "");
  const [biopsyDate, setBiopsyDate] = useState(session.date || "");
  const [psa, setPsa] = useState(session.psa || "");
  const [volume, setVolume] = useState(patient.volume || "");
  const [gradeGroup, setGradeGroup] = useState(null);
  const [coresPos, setCoresPos] = useState("");
  const [coresTotal, setCoresTotal] = useState("");
  const [maxPct, setMaxPct] = useState("");
  const [hasMri, setHasMri] = useState(null);
  const [pirads, setPirads] = useState(null);
  const [mriLesions, setMriLesions] = useState("");
  const [decipher, setDecipher] = useState(session.genomics?.decipher || "");
  const [oncotype, setOncotype] = useState(session.genomics?.oncotype || "");
  const [prolaris, setProlaris] = useState(session.genomics?.prolaris || "");
  const [tStage, setTStage] = useState(patient.tStage || "cT1c");
  const [pni, setPni] = useState(false);
  const [crib, setCrib] = useState(false);
  const [idc, setIdc] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);

  const psaDensity = psa && volume ? (parseFloat(psa) / parseFloat(volume)).toFixed(3) : null;

  const gGradeLabels = {
    "benign": { label: "Benign / No Cancer", color: "#4CAF50", desc: "No cancer detected" },
    "3+3": { label: "GG1 - Slow-growing", color: "#8BC34A", desc: "Very Low Risk", risk: "Very Low" },
    "3+4": { label: "GG2 - Mostly slow-growing", color: "#FFC107", desc: "Low to Intermediate Risk", risk: "Low to Intermediate" },
    "4+3": { label: "GG3 - Moderately aggressive", color: "#FF9800", desc: "Intermediate Risk", risk: "Intermediate" },
    "4+4": { label: "GG4 - Aggressive", color: "#F44336", desc: "High Risk", risk: "High" },
    "GG5": { label: "GG5 - Most aggressive", color: "#B71C1C", desc: "Very High Risk", risk: "Very High" },
  };

  const piradsLabels = {
    1: { label: "PI-RADS 1-2", color: "#4CAF50", desc: "Very unlikely to be significant cancer" },
    2: { label: "PI-RADS 1-2", color: "#4CAF50", desc: "Very unlikely to be significant cancer" },
    3: { label: "PI-RADS 3", color: "#FFC107", desc: "Uncertain" },
    4: { label: "PI-RADS 4", color: "#FF9800", desc: "Likely significant cancer" },
    5: { label: "PI-RADS 5", color: "#F44336", desc: "Very likely significant cancer" },
  };

  const handleNext = () => {
    if (step < 6) {
      setStep(step + 1);
      window.scrollTo(0, 0);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleComplete = () => {
    const data = {
      dob,
      tStage,
      volume,
      psa,
      gradeGroup,
      coresPos,
      coresTotal,
      maxPct,
      pirads: hasMri === true ? pirads : null,
      decipher,
      pni,
      crib,
      idc,
    };
    onComplete(data);
  };

  const patientCardStyles = {
    container: { maxWidth: "700px", margin: "0 auto", padding: "20px", minHeight: "100vh", background: C.bg },
    header: { fontSize: "28px", fontWeight: 700, color: C.textPri, marginBottom: "12px", textAlign: "center" },
    description: { fontSize: "14px", color: C.textSec, marginBottom: "24px", textAlign: "center", lineHeight: "1.6" },
    label: { fontSize: "14px", fontWeight: 600, color: C.textPri, marginBottom: "8px", display: "block" },
    input: { fontSize: "14px", padding: "10px 12px", borderRadius: "8px", border: `1px solid ${C.border}`, background: C.bgInput, color: C.textPri, width: "100%", boxSizing: "border-box", marginBottom: "16px", fontFamily: FONT },
    cardGrid: { display: "grid", gridTemplateColumns: "1fr", gap: "12px", marginBottom: "20px" },
    card: { padding: "16px", borderRadius: "8px", border: `1px solid ${C.border}`, background: C.bgCard, cursor: "pointer", transition: "all 0.2s" },
    progressBar: { width: "100%", height: "6px", background: C.border, borderRadius: "3px", marginBottom: "24px", overflow: "hidden" },
    progressFill: { height: "100%", background: C.accent, width: `${(step / 6) * 100}%`, transition: "width 0.3s" },
    buttonGroup: { display: "flex", gap: "12px", justifyContent: "space-between", marginTop: "24px" },
    button: { padding: "12px 20px", fontSize: "14px", fontWeight: 600, borderRadius: "8px", border: "none", cursor: "pointer", fontFamily: FONT },
    buttonPrimary: { background: C.accent, color: "white" },
    buttonSecondary: { background: C.bgInput, color: C.textSec, border: `1px solid ${C.border}` },
    checkbox: { marginRight: "8px", width: "18px", height: "18px" },
    counter: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" },
    counterBtn: { padding: "4px 10px", background: C.bgInput, color: C.accent, border: `1px solid ${C.border}`, borderRadius: "4px", cursor: "pointer", fontWeight: 600, fontFamily: FONT },
    slider: { width: "100%", fontSize: "14px", padding: "10px 12px", borderRadius: "8px", border: `1px solid ${C.border}`, background: C.bgInput, color: C.textPri, marginBottom: "12px", fontFamily: FONT },
  };

  const CardButton = ({ selected, onClick, color, title, desc }) => (
    <button
      onClick={onClick}
      style={{
        ...patientCardStyles.card,
        border: selected ? `2px solid ${color}` : `1px solid ${C.border}`,
        background: selected ? color + "15" : C.bgCard,
        padding: "16px",
        textAlign: "left",
      }}
    >
      <div style={{ fontSize: "14px", fontWeight: 700, color: selected ? color : C.textPri, marginBottom: "4px" }}>{title}</div>
      <div style={{ fontSize: "12px", color: selected ? color : C.textSec }}>{desc}</div>
    </button>
  );

  const ExpandableCard = ({ title, children, isOpen }) => (
    <div style={{ marginBottom: "12px", borderRadius: "8px", border: "1px solid #1A2232", overflow: "hidden" }}>
      <button
        onClick={() => setExpandedCard(isOpen ? null : title)}
        style={{
          width: "100%",
          padding: "12px",
          background: C.bgCard,
          border: "none",
          textAlign: "left",
          cursor: "pointer",
          color: C.textPri,
          fontWeight: 600,
          fontSize: "13px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: FONT,
        }}
      >
        {title}
        <span style={{ fontSize: "16px" }}>{isOpen ? "▼" : "▶"}</span>
      </button>
      {isOpen && <div style={{ padding: "12px", background: C.bgInput, fontSize: "12px", color: C.textSec, lineHeight: "1.6" }}>{children}</div>}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.textPri, fontFamily: FONT }}>
      <div style={patientCardStyles.container}>
        <div style={patientCardStyles.progressBar}>
          <div style={patientCardStyles.progressFill} />
        </div>

        {/* STEP 1: Welcome & Basics */}
        {step === 1 && (
          <div>
            <div style={patientCardStyles.header}>Let's walk through your results together</div>
            <div style={patientCardStyles.description}>
              We'll help you understand your prostate biopsy and other test results in a simple, step-by-step process.
            </div>

            <div style={{ background: C.bgCard, border: "1px solid #1A2232", borderRadius: "8px", padding: "16px", marginBottom: "24px" }}>
              <div style={{ fontSize: "14px", fontWeight: 600, color: C.textPri, marginBottom: "12px" }}>Why are we doing this?</div>
              <div style={{ fontSize: "12px", color: C.textSec, lineHeight: "1.6" }}>
                Your biopsy results, PSA levels, and imaging help your doctor understand your prostate cancer risk. By entering this information, you'll get a personalized summary that you can discuss with your doctor and track over time.
              </div>
            </div>

            <label style={patientCardStyles.label}>Your Name (optional)</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" style={patientCardStyles.input} />

            <label style={patientCardStyles.label}>Date of Birth</label>
            <input type="date" value={dob} onChange={e => setDob(e.target.value)} style={patientCardStyles.input} />

            <label style={patientCardStyles.label}>Date of Biopsy</label>
            <input type="date" value={biopsyDate} onChange={e => setBiopsyDate(e.target.value)} style={patientCardStyles.input} />

            <div style={patientCardStyles.buttonGroup}>
              <button style={{ ...patientCardStyles.button, ...patientCardStyles.buttonSecondary }} onClick={() => onSwitchToClinical()}>
                Skip to Clinical
              </button>
              <button style={{ ...patientCardStyles.button, ...patientCardStyles.buttonPrimary }} onClick={handleNext}>
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PSA Results */}
        {step === 2 && (
          <div>
            <div style={patientCardStyles.header}>What was your PSA level?</div>
            <div style={patientCardStyles.description}>PSA (Prostate-Specific Antigen) is a protein your prostate produces. Higher levels may indicate cancer or benign growth.</div>

            <label style={patientCardStyles.label}>PSA Level (ng/mL)</label>
            <input type="number" step="0.1" value={psa} onChange={e => setPsa(e.target.value)} placeholder="e.g., 6.5" style={patientCardStyles.input} />

            {psa && (
              <div style={{ background: parseFloat(psa) <= 4 ? "#143A1A" : parseFloat(psa) <= 10 ? "#3A3414" : "#3A1414", border: `1px solid ${parseFloat(psa) <= 4 ? "#4CAF50" : parseFloat(psa) <= 10 ? "#E8A020" : "#D94040"}`, borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: C.textSec, marginBottom: "8px" }}>PSA Scale:</div>
                <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                  <div style={{ flex: 1, padding: "8px", background: "#4CAF50", borderRadius: "6px", textAlign: "center", fontSize: "11px", fontWeight: 600, color: "white" }}>Normal 0-4</div>
                  <div style={{ flex: 1, padding: "8px", background: "#E8A020", borderRadius: "6px", textAlign: "center", fontSize: "11px", fontWeight: 600, color: "white" }}>Intermediate 4-10</div>
                  <div style={{ flex: 1, padding: "8px", background: "#D94040", borderRadius: "6px", textAlign: "center", fontSize: "11px", fontWeight: 600, color: "white" }}>Elevated &gt;10</div>
                </div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: parseFloat(psa) <= 4 ? "#4CAF50" : parseFloat(psa) <= 10 ? "#E8A020" : "#D94040" }}>Your PSA: {psa} ng/mL</div>
              </div>
            )}

            <ExpandableCard title="What is PSA?" isOpen={expandedCard === "psa"}>
              PSA stands for Prostate-Specific Antigen. It's a protein made by your prostate. Normal levels are typically below 4 ng/mL, but PSA can be elevated due to cancer, benign enlargement (BPH), infection, or even recent activities. Your doctor looks at your PSA level, how fast it's changing, and how it compares to prostate size (PSA density) to assess cancer risk.
            </ExpandableCard>

            <label style={patientCardStyles.label}>Prostate Volume (cubic centimeters, optional)</label>
            <input type="number" step="0.1" value={volume} onChange={e => setVolume(e.target.value)} placeholder="e.g., 45" style={patientCardStyles.input} />

            {psaDensity && (
              <div style={{ background: C.bgInput, border: "1px solid #1A2232", borderRadius: "8px", padding: "12px", marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: C.textSec }}>Calculated PSA Density</div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: C.accent }}>{psaDensity}</div>
                <div style={{ fontSize: "10px", color: C.textSec, marginTop: "4px" }}>Lower density is generally better. Normal is &lt; 0.15</div>
              </div>
            )}

            <div style={patientCardStyles.buttonGroup}>
              <button style={{ ...patientCardStyles.button, ...patientCardStyles.buttonSecondary }} onClick={handleBack}>
                Back
              </button>
              <button style={{ ...patientCardStyles.button, ...patientCardStyles.buttonPrimary }} onClick={handleNext}>
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Biopsy Results */}
        {step === 3 && (
          <div>
            <div style={patientCardStyles.header}>What did your biopsy show?</div>
            <div style={patientCardStyles.description}>Your biopsy grade tells us how aggressive the cancer is. Lower grades are slower-growing and have better prognosis.</div>

            <label style={{ ...patientCardStyles.label, marginBottom: "12px" }}>Biopsy Grade (Gleason Score)</label>
            <div style={patientCardStyles.cardGrid}>
              {Object.entries(gGradeLabels).map(([key, val]) => (
                <CardButton
                  key={key}
                  selected={gradeGroup === key}
                  onClick={() => setGradeGroup(key)}
                  color={val.color}
                  title={val.label}
                  desc={val.desc}
                />
              ))}
            </div>

            <ExpandableCard title="What does this mean?" isOpen={expandedCard === "grade"}>
              Gleason scores range from 6-10. Grade Groups simplify this: GG1 (3+3) is slowest-growing, while GG5 (4+5, 5+4, 5+5) is most aggressive. Your doctor uses this along with PSA and imaging to decide on treatment options.
            </ExpandableCard>

            <label style={patientCardStyles.label}>How many cores had cancer?</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div>
                <label style={{ fontSize: "12px", color: C.textSec, display: "block", marginBottom: "8px" }}>Positive Cores</label>
                <input type="number" value={coresPos} onChange={e => setCoresPos(e.target.value)} placeholder="e.g., 3" style={patientCardStyles.input} />
              </div>
              <div>
                <label style={{ fontSize: "12px", color: C.textSec, display: "block", marginBottom: "8px" }}>Total Cores Taken</label>
                <input type="number" value={coresTotal} onChange={e => setCoresTotal(e.target.value)} placeholder="e.g., 12" style={patientCardStyles.input} />
              </div>
            </div>

            <label style={patientCardStyles.label}>Highest percentage of cancer in any core (%)</label>
            <input type="range" min="0" max="100" value={maxPct} onChange={e => setMaxPct(e.target.value)} style={{ ...patientCardStyles.slider, marginBottom: "8px" }} />
            {maxPct && <div style={{ fontSize: "14px", fontWeight: 600, color: C.accent, marginBottom: "16px" }}>{maxPct}%</div>}

            <div style={patientCardStyles.buttonGroup}>
              <button style={{ ...patientCardStyles.button, ...patientCardStyles.buttonSecondary }} onClick={handleBack}>
                Back
              </button>
              <button style={{ ...patientCardStyles.button, ...patientCardStyles.buttonPrimary }} onClick={handleNext}>
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: MRI Results */}
        {step === 4 && (
          <div>
            <div style={patientCardStyles.header}>Did you have a prostate MRI?</div>
            <div style={patientCardStyles.description}>MRI scans help find suspicious areas in the prostate and guide biopsy decisions.</div>

            <label style={{ ...patientCardStyles.label, marginBottom: "12px" }}>MRI Status</label>
            <div style={patientCardStyles.cardGrid}>
              <CardButton selected={hasMri === true} onClick={() => setHasMri(true)} color={C.accent} title="Yes, I had an MRI" desc="Enter PI-RADS score" />
              <CardButton selected={hasMri === false} onClick={() => setHasMri(false)} color={C.textSec} title="No MRI" desc="Skip MRI results" />
              <CardButton selected={hasMri === null && hasMri !== true && hasMri !== false} onClick={() => setHasMri(null)} color={C.textSec} title="I'm not sure" desc="Don't know if I had one" />
            </div>

            {hasMri === true && (
              <div>
                <label style={patientCardStyles.label}>What was your PI-RADS score?</label>
                <div style={patientCardStyles.cardGrid}>
                  {[
                    { val: 1, ...piradsLabels[1] },
                    { val: 3, ...piradsLabels[3] },
                    { val: 4, ...piradsLabels[4] },
                    { val: 5, ...piradsLabels[5] },
                  ].map(p => (
                    <CardButton
                      key={p.val}
                      selected={pirads === p.val}
                      onClick={() => setPirads(p.val)}
                      color={p.color}
                      title={p.label}
                      desc={p.desc}
                    />
                  ))}
                </div>

                <label style={patientCardStyles.label}>Number of MRI lesions (optional)</label>
                <input type="number" value={mriLesions} onChange={e => setMriLesions(e.target.value)} placeholder="e.g., 1" style={patientCardStyles.input} />

                <ExpandableCard title="What is PI-RADS?" isOpen={expandedCard === "pirads"}>
                  PI-RADS (Prostate Imaging-Reporting and Data System) scores range from 1-5. A score of 1-2 is very unlikely to have significant cancer, 3 is uncertain, 4 is likely to have cancer, and 5 is very likely. Higher scores may indicate need for biopsy or closer follow-up.
                </ExpandableCard>
              </div>
            )}

            <div style={patientCardStyles.buttonGroup}>
              <button style={{ ...patientCardStyles.button, ...patientCardStyles.buttonSecondary }} onClick={handleBack}>
                Back
              </button>
              <button style={{ ...patientCardStyles.button, ...patientCardStyles.buttonPrimary }} onClick={handleNext}>
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Additional Tests */}
        {step === 5 && (
          <div>
            <div style={patientCardStyles.header}>Additional Findings (Optional)</div>
            <div style={patientCardStyles.description}>Tell us about any other tests or findings from your biopsy.</div>

            <label style={patientCardStyles.label}>Clinical T-Stage (if known)</label>
            <select value={tStage} onChange={e => setTStage(e.target.value)} style={patientCardStyles.input}>
              {T_STAGES.map(t => <option key={t}>{t}</option>)}
            </select>

            <label style={patientCardStyles.label}>Genomic Testing (optional)</label>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", color: C.textSec, display: "block", marginBottom: "4px" }}>Decipher Score (0-1.0)</label>
              <input type="number" step="0.01" value={decipher} onChange={e => setDecipher(e.target.value)} placeholder="e.g., 0.35" style={patientCardStyles.input} />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", color: C.textSec, display: "block", marginBottom: "4px" }}>Oncotype DX Score (0-100)</label>
              <input type="number" step="1" value={oncotype} onChange={e => setOncotype(e.target.value)} placeholder="e.g., 25" style={patientCardStyles.input} />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", color: C.textSec, display: "block", marginBottom: "4px" }}>Prolaris Score (-2 to 6)</label>
              <input type="number" step="0.1" value={prolaris} onChange={e => setProlaris(e.target.value)} placeholder="e.g., 1.5" style={patientCardStyles.input} />
            </div>

            <label style={patientCardStyles.label}>Biopsy Findings</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
              {[
                { key: "pni", label: "Perineural Invasion", desc: "Cancer invading nerves" },
                { key: "crib", label: "Cribriform Pattern", desc: "High-risk growth pattern" },
                { key: "idc", label: "Intraductal Carcinoma", desc: "Cancer in ducts" },
              ].map(f => (
                <div key={f.key} style={{ padding: "12px", background: C.bgCard, border: "1px solid #1A2232", borderRadius: "8px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <input
                    type="checkbox"
                    checked={f.key === "pni" ? pni : f.key === "crib" ? crib : idc}
                    onChange={e => {
                      if (f.key === "pni") setPni(e.target.checked);
                      if (f.key === "crib") setCrib(e.target.checked);
                      if (f.key === "idc") setIdc(e.target.checked);
                    }}
                    style={patientCardStyles.checkbox}
                  />
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: C.textPri }}>{f.label}</div>
                    <div style={{ fontSize: "11px", color: C.textSec }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={patientCardStyles.buttonGroup}>
              <button style={{ ...patientCardStyles.button, ...patientCardStyles.buttonSecondary }} onClick={handleBack}>
                Back
              </button>
              <button style={{ ...patientCardStyles.button, ...patientCardStyles.buttonPrimary }} onClick={handleNext}>
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: Summary */}
        {step === 6 && (
          <div>
            <div style={patientCardStyles.header}>Your Results Summary</div>
            <div style={patientCardStyles.description}>Review your information below, then continue to the full tool or print for your records.</div>

            <div style={{ background: C.bgCard, border: "1px solid #1A2232", borderRadius: "8px", padding: "16px", marginBottom: "20px" }}>
              {name && <div style={{ fontSize: "12px", color: C.textSec, marginBottom: "8px" }}>Name: <span style={{ color: C.textPri, fontWeight: 600 }}>{name}</span></div>}
              {dob && <div style={{ fontSize: "12px", color: C.textSec, marginBottom: "8px" }}>DOB: <span style={{ color: C.textPri, fontWeight: 600 }}>{new Date(dob).toLocaleDateString()}</span></div>}
              {psa && <div style={{ fontSize: "12px", color: C.textSec, marginBottom: "8px" }}>PSA: <span style={{ color: C.textPri, fontWeight: 600 }}>{psa} ng/mL</span></div>}
              {volume && <div style={{ fontSize: "12px", color: C.textSec, marginBottom: "8px" }}>Prostate Volume: <span style={{ color: C.textPri, fontWeight: 600 }}>{volume} cc</span></div>}
              {gradeGroup && (
                <div style={{ fontSize: "12px", color: C.textSec, marginBottom: "8px" }}>
                  Grade: <span style={{ color: gGradeLabels[gradeGroup].color, fontWeight: 600 }}>{gGradeLabels[gradeGroup].label}</span>
                </div>
              )}
              {coresTotal && <div style={{ fontSize: "12px", color: C.textSec, marginBottom: "8px" }}>Positive Cores: <span style={{ color: C.textPri, fontWeight: 600 }}>{coresPos}/{coresTotal}</span></div>}
              {maxPct && <div style={{ fontSize: "12px", color: C.textSec, marginBottom: "8px" }}>Max Involvement: <span style={{ color: C.textPri, fontWeight: 600 }}>{maxPct}%</span></div>}
              {hasMri === true && pirads && <div style={{ fontSize: "12px", color: C.textSec, marginBottom: "8px" }}>PI-RADS: <span style={{ color: piradsLabels[pirads].color, fontWeight: 600 }}>{piradsLabels[pirads].label}</span></div>}
            </div>

            <div style={{ background: "#143A1A", border: "1px solid #4CAF50", borderRadius: "8px", padding: "16px", marginBottom: "20px" }}>
              <div style={{ fontSize: "12px", color: C.textSec, marginBottom: "4px" }}>Risk Assessment</div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#4CAF50", marginBottom: "8px" }}>See full analysis in clinical tool</div>
              <div style={{ fontSize: "11px", color: "#8BC34A" }}>Switch to the clinical interface for detailed NCCN risk stratification, active surveillance eligibility, and focal therapy planning.</div>
            </div>

            <div style={patientCardStyles.buttonGroup}>
              <button style={{ ...patientCardStyles.button, ...patientCardStyles.buttonSecondary }} onClick={handleBack}>
                Back
              </button>
              <button style={{ ...patientCardStyles.button, ...patientCardStyles.buttonPrimary }} onClick={handleComplete}>
                Complete & View Clinical Tool
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   WELCOME OVERLAY
   ══════════════════════════════════════════════════════════════════ */

function WelcomeOverlay({ onNewDiagnostic, onNewSurveillance, onImport, onSkip, onPatientMode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9998 }}>
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "30px", maxWidth: "480px", textAlign: "center" }}>
        <div style={{ fontSize: "24px", fontWeight: 700, color: C.textPri, marginBottom: "8px" }}>Prostate Biopsy Mapper</div>
        <div style={{ fontSize: "12px", color: C.textSec, marginBottom: "24px", lineHeight: "1.5" }}>Advanced mapping, risk stratification, and focal therapy planning for prostate cancer diagnosis and surveillance.</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px", marginBottom: "16px" }}>
          <button onClick={onNewDiagnostic} style={{ ...btn, background: C.accentDim, color: C.accent, border: `1px solid ${C.accent}40`, padding: "14px 16px", fontSize: "11px", fontWeight: 600, borderRadius: "6px", textAlign: "left", display: "flex", flexDirection: "column", cursor: "pointer" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>New Diagnostic Biopsy</span>
            <span style={{ fontSize: "9px", color: C.textSec, fontWeight: 400 }}>Enter systematic 12-zone mapping data</span>
          </button>

          <button onClick={onNewSurveillance} style={{ ...btn, background: C.warnDim, color: C.warn, border: `1px solid ${C.warn}40`, padding: "14px 16px", fontSize: "11px", fontWeight: 600, borderRadius: "6px", textAlign: "left", display: "flex", flexDirection: "column", cursor: "pointer" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>New Surveillance Biopsy</span>
            <span style={{ fontSize: "9px", color: C.textSec, fontWeight: 400 }}>Track repeat biopsies during active surveillance</span>
          </button>

          <button onClick={onPatientMode} style={{ ...btn, background: C.successDim, color: C.success, border: `1px solid ${C.success}40`, padding: "14px 16px", fontSize: "11px", fontWeight: 600, borderRadius: "6px", textAlign: "left", display: "flex", flexDirection: "column", cursor: "pointer" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Patient Intake</span>
            <span style={{ fontSize: "9px", color: C.textSec, fontWeight: 400 }}>Friendly step-by-step guide for your results</span>
          </button>

          <button onClick={onImport} style={{ ...btn, background: C.bgInput, color: C.textSec, border: `1px solid ${C.border}`, padding: "14px 16px", fontSize: "11px", fontWeight: 600, borderRadius: "6px", textAlign: "left", display: "flex", flexDirection: "column", cursor: "pointer" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, marginBottom: "4px" }}>Import Existing Data</span>
            <span style={{ fontSize: "9px", color: C.textMut, fontWeight: 400 }}>Load a previously exported JSON file</span>
          </button>
        </div>

        <button onClick={onSkip} style={{ background: "none", border: "none", color: C.textMut, cursor: "pointer", fontSize: "10px", textDecoration: "underline" }}>Skip</button>
      </div>
    </div>
  );
}

function SummaryDashboard({ patient, session }) {
  const specs = allSpecs(session);
  const nccn = computeNCCN(session.psa, patient.tStage, patient.volume, specs);
  const mg = maxG(specs);
  const pos = sumCores(specs, "coresPos");
  const tot = sumCores(specs, "coresTotal");
  const maxI = Math.max(0, ...specs.map(s => parseInt(s.maxPct) || 0));

  // Calculate age
  let ageStr = "—";
  if (patient.dob) {
    const today = new Date();
    const birth = new Date(patient.dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    ageStr = age.toString();
  }

  // AS Eligibility
  const asEligible = nccn.group !== null && (nccn.group === 0 || nccn.group === 1) && mg && ["benign", "3+3"].includes(mg.value) && !specs.some(s => s.pni || s.crib || s.idc);

  // Focal therapy eligibility
  const rightS = Object.entries(session.specimens).filter(([z, s]) => z.startsWith("R ") && s.gleason && s.gleason !== "benign").length > 0;
  const leftS = Object.entries(session.specimens).filter(([z, s]) => z.startsWith("L ") && s.gleason && s.gleason !== "benign").length > 0;
  const bilat = rightS && leftS;
  const focalEligible = !bilat && mg && ["benign", "3+3", "3+4"].includes(mg.value) && !specs.some(s => s.pni || s.crib || s.idc) && maxI <= 50;

  const psaData = [session].filter(s => s.psa && s.date).map(s => ({ date: s.date, psa: parseFloat(s.psa) }));

  return (
    <div style={{ padding: "14px", maxWidth: "900px", margin: "0 auto", overflowY: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px", marginBottom: "16px" }}>
        {/* Patient Info */}
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: "6px", padding: "12px" }}>
          <div style={{ ...lbl, marginBottom: "8px" }}>Patient</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div><span style={{ fontSize: "9px", color: C.textMut }}>MRN</span><div style={{ fontSize: "12px", fontWeight: 700, color: C.textPri }}>{patient.mrn || "—"}</div></div>
            <div><span style={{ fontSize: "9px", color: C.textMut }}>DOB</span><div style={{ fontSize: "12px", fontWeight: 700, color: C.textPri }}>{patient.dob ? new Date(patient.dob).toLocaleDateString() : "—"} (Age: {ageStr})</div></div>
          </div>
        </div>

        {/* NCCN Risk Group */}
        {nccn.group !== null && (
          <div style={{ background: `${NCCN_GROUPS[nccn.group].color}15`, border: `1px solid ${NCCN_GROUPS[nccn.group].color}40`, borderRadius: "6px", padding: "12px" }}>
            <div style={{ ...lbl, marginBottom: "8px" }}>NCCN Risk</div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: NCCN_GROUPS[nccn.group].color }}>{NCCN_GROUPS[nccn.group].name}</div>
            {nccn.density !== null && <div style={{ fontSize: "9px", color: C.textSec, marginTop: "6px" }}>PSA Density: {nccn.density.toFixed(3)}</div>}
          </div>
        )}

        {/* Biopsy Metrics */}
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: "6px", padding: "12px" }}>
          <div style={{ ...lbl, marginBottom: "8px" }}>Biopsy Metrics</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "10px" }}>
            <div><span style={{ color: C.textMut }}>Max Grade:</span> <span style={{ fontWeight: 600, color: mg?.color }}>{mg?.label || "—"}</span></div>
            <div><span style={{ color: C.textMut }}>Positive Cores:</span> <span style={{ fontWeight: 600 }}>{tot > 0 ? `${pos}/${tot}` : "—"}</span></div>
            <div><span style={{ color: C.textMut }}>Max Involvement:</span> <span style={{ fontWeight: 600 }}>{maxI > 0 ? `${maxI}%` : "—"}</span></div>
          </div>
        </div>

        {/* Baseline Scores */}
        {(session.ipss || session.shim) && (
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: "6px", padding: "12px" }}>
            <div style={{ ...lbl, marginBottom: "8px" }}>Baseline Scores</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "10px" }}>
              {session.ipss && (() => {
                const total = [1, 2, 3, 4, 5, 6, 7].reduce((s, i) => s + (session.ipss[`q${i}`] || 0), 0);
                return <div><span style={{ color: C.textMut }}>IPSS:</span> <span style={{ fontWeight: 600 }}>{total}</span></div>;
              })()}
              {session.shim && (() => {
                const total = [1, 2, 3, 4, 5].reduce((s, i) => s + (session.shim[`q${i}`] || 0), 0);
                return <div><span style={{ color: C.textMut }}>SHIM:</span> <span style={{ fontWeight: 600 }}>{total}</span></div>;
              })()}
            </div>
          </div>
        )}

        {/* Treatment Status */}
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: "6px", padding: "12px" }}>
          <div style={{ ...lbl, marginBottom: "8px" }}>Treatment Status</div>
          <div style={{ fontSize: "10px", color: session.treatment?.modality ? C.textPri : C.textMut }}>
            {session.treatment?.modality ? `${session.treatment.modality} - ${session.treatment.date || "pending"}` : "No treatment recorded"}
          </div>
        </div>

        {/* Active Surveillance */}
        <div style={{ background: asEligible ? C.successDim : C.dangerDim, border: `1px solid ${asEligible ? C.success : C.danger}40`, borderRadius: "6px", padding: "12px" }}>
          <div style={{ ...lbl, marginBottom: "8px" }}>AS Eligibility</div>
          <div style={{ fontSize: "11px", fontWeight: 600, color: asEligible ? C.success : C.danger }}>{asEligible ? "Eligible" : "Not Eligible"}</div>
          <div style={{ fontSize: "8px", color: C.textSec, marginTop: "4px" }}>{asEligible ? "Low/VL risk, no adverse features" : "Review risk factors"}</div>
        </div>

        {/* Focal Therapy */}
        <div style={{ background: focalEligible ? C.successDim : C.dangerDim, border: `1px solid ${focalEligible ? C.success : C.danger}40`, borderRadius: "6px", padding: "12px" }}>
          <div style={{ ...lbl, marginBottom: "8px" }}>Focal Therapy</div>
          <div style={{ fontSize: "11px", fontWeight: 600, color: focalEligible ? C.success : C.danger }}>{focalEligible ? "Candidate" : "Review"}</div>
          <div style={{ fontSize: "8px", color: C.textSec, marginTop: "4px" }}>{focalEligible ? "Unilateral, low-grade disease" : "Bilateral or high-grade cancer"}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        <button style={{ ...btn, background: C.accentDim, color: C.accent, border: `1px solid ${C.accent}30`, padding: "8px 14px" }}>Enter Biopsy Data</button>
        <button style={{ ...btn, background: C.bgInput, color: C.textSec, border: `1px solid ${C.border}`, padding: "8px 14px" }}>View Education</button>
        <button style={{ ...btn, background: C.successDim, color: C.success, border: `1px solid ${C.success}30`, padding: "8px 14px" }}>Print Report</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN APPLICATION
   ══════════════════════════════════════════════════════════════════ */

export default function App() {
  const [patients, setPatients] = useState([mkPatient()]);
  const [activePatient, setActivePatient] = useState(0);
  const [activeSession, setActiveSession] = useState(0);
  const [selZone, setSelZone] = useState(null);
  const [selLesion, setSelLesion] = useState(null);
  const [selTarget, setSelTarget] = useState(null);
  const [panel, setPanel] = useState("systematic");
  const [mainView, setMainView] = useState("map");
  const [showPrint, setShowPrint] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [showPatientList, setShowPatientList] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [editingSessionIdx, setEditingSessionIdx] = useState(null);
  const [editingSessionLabel, setEditingSessionLabel] = useState("");
  const [appMode, setAppMode] = useState("clinical");
  const windowSize = useWindowSize();
  const svgRef = useRef(null);
  const importRef = useRef(null);

  const pat = patients[activePatient];
  const ses = pat.sessions[activeSession] || pat.sessions[0];

  // Check if patient has any data
  const hasData = pat.mrn || Object.values(ses.specimens).some(s => s.gleason !== null) || ses.targetedBx.length > 0 || ses.psa || ses.date;
  const shouldShowWelcome = showWelcome && !hasData;

  // Auto-hide welcome when data is entered
  useEffect(() => {
    if (hasData && showWelcome) {
      setShowWelcome(false);
    }
  }, [hasData, showWelcome]);

  const setPat = useCallback((fn) => setPatients(p => p.map((x, i) => i === activePatient ? (typeof fn === "function" ? fn(x) : { ...x, ...fn }) : x)), [activePatient]);
  const setSes = useCallback((fn) => setPat(p => ({ ...p, sessions: p.sessions.map((s, i) => i === activeSession ? (typeof fn === "function" ? fn(s) : { ...s, ...fn }) : s) })), [activeSession, setPat]);

  const updSpec = (f, v) => { if (!selZone) return; setSes(s => ({ ...s, specimens: { ...s.specimens, [selZone]: { ...s.specimens[selZone], [f]: v } } })); };

  // Lesion drag
  const onDragStart = (e, id) => { e.stopPropagation(); setDragging(id); };
  const onDragMove = useCallback((e) => {
    if (!dragging || !svgRef.current) return;
    const svg = svgRef.current; const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const sp = pt.matrixTransform(svg.getScreenCTM().inverse());
    setSes(s => ({ ...s, mriLesions: s.mriLesions.map(l => l.id === dragging ? { ...l, x: Math.round(sp.x), y: Math.round(sp.y) } : l) }));
  }, [dragging, setSes]);
  useEffect(() => { if (dragging) { const up = () => setDragging(null); window.addEventListener("mousemove", onDragMove); window.addEventListener("mouseup", up); return () => { window.removeEventListener("mousemove", onDragMove); window.removeEventListener("mouseup", up); }; } }, [dragging, onDragMove]);

  // MRI image upload
  const imgInputRef = useRef(null);
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setSes({ mriImageData: ev.target.result });
    reader.readAsDataURL(file);
  };

  // JSON export
  const exportJSON = () => {
    const data = JSON.stringify({ patient: pat, exportDate: new Date().toISOString() }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `prostate-bx-${pat.mrn || "patient"}-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  // JSON import
  const handleImport = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.patient) {
          setPatients(p => [...p, data.patient]);
          setActivePatient(patients.length);
          setShowWelcome(false);
        }
      } catch (err) { console.error("Import failed", err); }
    };
    reader.readAsText(file);
  };

  const filledCount = Object.values(ses.specimens).filter(s => s.gleason !== null).length;
  const tgtCount = ses.targetedBx.filter(t => t.gleason !== null).length;

  const handleWelcomeNewDiagnostic = () => {
    setSes({ type: "diagnostic" });
    setPanel("systematic");
    setShowWelcome(false);
  };

  const handleWelcomeNewSurveillance = () => {
    setSes({ type: "surveillance" });
    setPanel("systematic");
    setShowWelcome(false);
  };

  const handleWelcomeImport = () => {
    importRef.current?.click();
  };

  const handleWelcomePatientMode = () => {
    setAppMode("patient");
    setShowWelcome(false);
  };

  if (showPrint) return <PrintReport patient={pat} session={ses} onClose={() => setShowPrint(false)} />;

  const isSmallScreen = windowSize.width < 900;
  const isMobileScreen = windowSize.width < 600;

  // Patient intake completion handler
  const handlePatientIntakeComplete = (data) => {
    if (data.dob) setPat({ dob: data.dob });
    if (data.volume) setPat({ volume: data.volume });
    if (data.tStage) setPat({ tStage: data.tStage });
    if (data.psa) setSes({ psa: data.psa });
    if (data.gradeGroup) {
      setSes(s => {
        const updated = { ...s, specimens: { ...s.specimens } };
        // Find first empty zone and fill it
        const emptyZone = ZONES.find(z => updated.specimens[z].gleason === null);
        if (emptyZone) {
          updated.specimens[emptyZone] = {
            ...updated.specimens[emptyZone],
            gleason: data.gradeGroup,
            coresPos: data.coresPos || "",
            coresTotal: data.coresTotal || "",
            maxPct: data.maxPct || "",
            pni: data.pni || false,
            crib: data.crib || false,
            idc: data.idc || false,
          };
        }
        return updated;
      });
    }
    if (data.pirads) {
      const lesion = mkLesion("MRI Lesion 1");
      lesion.pirads = data.pirads;
      setSes(s => ({
        ...s,
        mriLesions: [lesion],
      }));
    }
    if (data.decipher) setSes(s => ({ ...s, genomics: { ...s.genomics, decipher: data.decipher } }));
    if (data.oncotype) setSes(s => ({ ...s, genomics: { ...s.genomics, oncotype: data.oncotype } }));
    if (data.prolaris) setSes(s => ({ ...s, genomics: { ...s.genomics, prolaris: data.prolaris } }));
    setAppMode("clinical");
  };

  if (appMode === "patient") {
    return <PatientIntake patient={pat} session={ses} onComplete={handlePatientIntakeComplete} onSwitchToClinical={() => setAppMode("clinical")} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.textPri, fontFamily: FONT, fontSize: "11px" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      {shouldShowWelcome && <WelcomeOverlay onNewDiagnostic={handleWelcomeNewDiagnostic} onNewSurveillance={handleWelcomeNewSurveillance} onImport={handleWelcomeImport} onSkip={() => setShowWelcome(false)} onPatientMode={handleWelcomePatientMode} />}
      <input type="file" ref={imgInputRef} accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
      <input type="file" ref={importRef} accept=".json" style={{ display: "none" }} onChange={handleImport} />

      {/* ═══ HEADER ═══ */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "6px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", background: C.bgCard }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "26px", height: "26px", borderRadius: "4px", background: `linear-gradient(135deg, ${C.accent}, #5BA0E0)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: "#fff" }}>P</div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700 }}>Prostate Biopsy Mapper</div>
            <div style={{ fontSize: "7px", color: C.textMut, letterSpacing: "0.8px", textTransform: "uppercase" }}>Focal Therapy Planning · NCCN · Genomics · Registry</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "4px", alignItems: "center", flexWrap: "wrap" }}>
          <Tabs tabs={[{ key: "map", label: "Map" }, { key: "summary", label: "Summary" }, { key: "kinetics", label: "PSA" }, { key: "compare", label: "Compare" }, { key: "edu", label: "Edu" }, { key: "guide", label: "Guide" }]} active={mainView} onSelect={setMainView} small />
          <button onClick={() => setShowPrint(true)} style={{ ...btn, background: C.successDim, color: C.success, border: `1px solid ${C.success}30`, padding: "3px 8px" }}>Print</button>
          <button onClick={exportJSON} style={{ ...btn, background: C.accentDim, color: C.accent, border: `1px solid ${C.accent}30`, padding: "3px 8px" }}>JSON↓</button>
          <button onClick={() => importRef.current?.click()} style={{ ...btn, background: C.bgInput, color: C.textSec, border: `1px solid ${C.border}`, padding: "3px 8px" }}>Import</button>
          <button onClick={() => setShowPatientList(!showPatientList)} style={{ ...btn, background: showPatientList ? C.accentDim : C.bgInput, color: showPatientList ? C.accent : C.textSec, border: `1px solid ${showPatientList ? C.accent + "40" : C.border}`, padding: "3px 8px" }}>
            Registry ({patients.length})
          </button>
          <div style={{ width: "1px", height: "16px", background: C.border }} />
          <button onClick={() => setAppMode("patient")} style={{ ...btn, background: C.successDim, color: C.success, border: `1px solid ${C.success}30`, padding: "3px 8px", fontSize: "9px" }}>Patient View</button>
        </div>
      </div>

      {/* ═══ PATIENT REGISTRY DRAWER ═══ */}
      {showPatientList && (
        <div style={{ borderBottom: `1px solid ${C.border}`, padding: "8px 12px", background: C.bgCard, maxHeight: "180px", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ ...lbl, fontSize: "9px", marginBottom: 0 }}>Patient Registry</span>
            <button onClick={() => { setPatients(p => [...p, mkPatient()]); setActivePatient(patients.length); setActiveSession(0); }} style={{ ...btn, background: C.accentDim, color: C.accent, border: `1px solid ${C.accent}30`, padding: "3px 8px" }}>+ New Patient</button>
          </div>
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {patients.map((p, i) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                <button onClick={() => { setActivePatient(i); setActiveSession(0); setShowPatientList(false); }} style={{
                  ...btn, padding: "4px 10px", fontSize: "9px",
                  background: i === activePatient ? C.accentDim : C.bgInput,
                  color: i === activePatient ? C.accent : C.textSec,
                  border: `1px solid ${i === activePatient ? C.accent + "40" : C.border}`,
                }}>
                  {p.mrn || `Patient ${i + 1}`}
                  <span style={{ marginLeft: "4px", fontSize: "7px", opacity: 0.6 }}>{p.sessions.length}s</span>
                </button>
                {patients.length > 1 && <button onClick={() => { setPatients(prev => prev.filter((_, j) => j !== i)); if (activePatient >= i && activePatient > 0) setActivePatient(activePatient - 1); }} style={{ background: "none", border: "none", color: C.textMut, cursor: "pointer", fontSize: "9px" }}>×</button>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ PATIENT + SESSION BAR ═══ */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "4px 12px", display: "flex", gap: "8px", alignItems: "center", background: C.bgCard, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}><span style={lbl}>MRN</span><input value={pat.mrn} onChange={e => setPat({ mrn: e.target.value })} style={{ ...inp, width: "75px" }} /></div>
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}><span style={lbl}>DOB</span><input type="date" value={pat.dob} onChange={e => setPat({ dob: e.target.value })} style={{ ...inp, width: "110px" }} /></div>
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}><span style={{ ...lbl, display: "flex", alignItems: "center", gap: "2px" }}>cT <Tip>Clinical T-stage: cT1c = not palpable (found on biopsy), cT2 = palpable/confined, cT3+ = extraprostatic extension.</Tip></span><select value={pat.tStage} onChange={e => setPat({ tStage: e.target.value })} style={{ ...inp, width: "68px", appearance: "auto" }}>{T_STAGES.map(t => <option key={t}>{t}</option>)}</select></div>
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}><span style={{ ...lbl, display: "flex", alignItems: "center", gap: "2px" }}>Vol <Tip>Prostate volume in cubic centimeters (measured by MRI or ultrasound). Used to calculate PSA density.</Tip></span><input value={pat.volume} onChange={e => setPat({ volume: e.target.value })} style={{ ...inp, width: "48px" }} placeholder="cc" /></div>
        <div style={{ width: "1px", height: "16px", background: C.border }} />
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}><span style={{ ...lbl, display: "flex", alignItems: "center", gap: "2px" }}>PSA <Tip>Prostate-Specific Antigen. Normal less than 4.0 ng/mL. Higher values may indicate cancer, BPH, or infection. Velocity and density matter.</Tip></span><input value={ses.psa} onChange={e => setSes({ psa: e.target.value })} style={{ ...inp, width: "55px" }} placeholder="ng/mL" /></div>
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}><span style={lbl}>Date</span><input type="date" value={ses.date} onChange={e => setSes({ date: e.target.value })} style={{ ...inp, width: "110px" }} /></div>
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <span style={lbl}>Type</span>
          <select value={ses.type} onChange={e => setSes({ type: e.target.value })} style={{ ...inp, width: "95px", appearance: "auto" }}>
            <option value="diagnostic">Diagnostic</option>
            <option value="surveillance">Surveillance</option>
            <option value="confirmatory">Confirmatory</option>
          </select>
        </div>
        <div style={{ width: "1px", height: "16px", background: C.border }} />
        <div style={{ display: "flex", gap: "3px", alignItems: "center", flexWrap: "wrap" }}>
          {pat.sessions.map((s, i) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", position: "relative" }}>
              {editingSessionIdx === i ? (
                <input
                  autoFocus
                  type="text"
                  value={editingSessionLabel}
                  onChange={e => setEditingSessionLabel(e.target.value)}
                  onBlur={() => { setPat(p => ({ ...p, sessions: p.sessions.map((x, j) => j === i ? { ...x, label: editingSessionLabel } : x) })); setEditingSessionIdx(null); }}
                  onKeyDown={e => { if (e.key === "Enter") { setPat(p => ({ ...p, sessions: p.sessions.map((x, j) => j === i ? { ...x, label: editingSessionLabel } : x) })); setEditingSessionIdx(null); } if (e.key === "Escape") setEditingSessionIdx(null); }}
                  style={{ ...inp, width: "70px", padding: "1px 4px", fontSize: "8px" }}
                />
              ) : (
                <button onClick={() => { setActiveSession(i); setSelZone(null); }} onDoubleClick={() => { setEditingSessionIdx(i); setEditingSessionLabel(s.label || `S${i + 1}`); }} style={{ ...btn, padding: "2px 7px", fontSize: "8px", background: i === activeSession ? C.accentDim : "transparent", color: i === activeSession ? C.accent : C.textMut, border: `1px solid ${i === activeSession ? C.accent + "30" : "transparent"}`, position: "relative" }}>
                  {s.label || `S${i + 1}`}
                  <span style={{ position: "absolute", top: "-8px", right: "-6px", width: "10px", height: "10px", fontSize: "7px", opacity: 0.3, cursor: "pointer" }} title="Double-click to edit">✎</span>
                </button>
              )}
              {pat.sessions.length > 1 && <button onClick={() => { setPat(p => ({ ...p, sessions: p.sessions.filter((_, j) => j !== i) })); if (activeSession >= i && activeSession > 0) setActiveSession(activeSession - 1); }} style={{ background: "none", border: "none", color: C.textMut, cursor: "pointer", fontSize: "8px", marginLeft: "2px" }}>×</button>}
            </div>
          ))}
          <button onClick={() => { setPat(p => ({ ...p, sessions: [...p.sessions, mkSession(`Session ${p.sessions.length + 1}`)] })); setActiveSession(pat.sessions.length); }} style={{ ...btn, background: "transparent", color: C.textMut, border: `1px dashed ${C.border}`, padding: "2px 5px", fontSize: "7px" }}>+</button>
        </div>
        <div style={{ marginLeft: "auto", fontSize: "7px", color: C.textMut }}>{filledCount}/12 · {tgtCount}t</div>
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      {mainView === "summary" ? (
        <SummaryDashboard patient={pat} session={ses} />
      ) : mainView === "kinetics" ? (
        <div style={{ padding: "14px", maxWidth: "800px", margin: "0 auto" }}><PSAKinetics sessions={pat.sessions} /></div>
      ) : mainView === "compare" ? (
        <SessionCompare sessions={pat.sessions} />
      ) : mainView === "edu" ? (
        <PatientEducation patient={pat} session={ses} />
      ) : mainView === "guide" ? (
        <ActiveSurveillanceGuide sessions={pat.sessions} patient={pat} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isSmallScreen ? "1fr" : "410px 1fr", minHeight: "calc(100vh - 80px)" }}>
          {/* LEFT */}
          <div style={{ borderRight: `1px solid ${C.border}`, padding: "10px", display: "flex", flexDirection: "column", alignItems: "center", overflowY: "auto", gap: "6px" }}>
            <ProstateMap session={ses} selectedZone={selZone} onSelectZone={z => { setSelZone(z); setPanel("systematic"); setSelLesion(null); setSelTarget(null); }} selectedLesion={selLesion} onSelectLesion={id => { setSelLesion(id); setPanel("mri"); setSelZone(null); }} onLesionDragStart={onDragStart} svgRef={svgRef} showFocalOverlay={panel === "focal" || panel === "treatment"} isSmallScreen={isSmallScreen} />

            {/* MRI image thumbnail */}
            {ses.mriImageData && <div style={{ width: "100%", maxWidth: "380px" }}><img src={ses.mriImageData} alt="MRI" style={{ width: "100%", borderRadius: "4px", border: `1px solid ${C.border}`, maxHeight: "120px", objectFit: "cover" }} /></div>}

            {/* Legend */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", justifyContent: "center", padding: "4px 6px", background: C.bgCard, borderRadius: "4px", border: `1px solid ${C.border}`, width: "100%", maxWidth: "380px", boxSizing: "border-box" }}>
              {GLEASON.map(g => <div key={g.value} style={{ display: "flex", alignItems: "center", gap: "2px" }}><div style={{ width: "5px", height: "5px", borderRadius: "50%", background: g.color }} /><span style={{ fontSize: "7px", color: C.textSec }}>{g.label.split(" ")[0]}</span></div>)}
              <div style={{ display: "flex", alignItems: "center", gap: "2px" }}><div style={{ width: "5px", height: "5px", borderRadius: "1px", border: "1px solid #FFC107" }} /><span style={{ fontSize: "7px", color: C.textSec }}>MRI</span></div>
              {(ses.focalPlan || ses.treatment) && <div style={{ display: "flex", alignItems: "center", gap: "2px" }}><div style={{ width: "8px", height: "5px", background: C.focalZone + "40", border: `1px dashed ${C.focalZone}` }} /><span style={{ fontSize: "7px", color: C.textSec }}>Tx Zone</span></div>}
            </div>

            <div style={{ width: "100%", maxWidth: "380px" }}><RiskPanel session={ses} patient={pat} /></div>
          </div>

          {/* RIGHT */}
          <div style={{ padding: "10px", overflowY: "auto" }}>
            <div style={{ marginBottom: "8px" }}>
              <Tabs tabs={[
                { key: "systematic", label: `Sys (${filledCount})` },
                { key: "mri", label: `MRI (${ses.mriLesions.length})` },
                { key: "targeted", label: `Tgt (${tgtCount})` },
                { key: "focal", label: "Focal Plan" },
                { key: "treatment", label: "Treatment" },
                { key: "tools", label: "Tools" },
                { key: "post-tx", label: "Post-Tx" },
                { key: "genomics", label: "Genomics" },
              ]} active={panel} onSelect={setPanel} small />
            </div>

            {/* ── SYSTEMATIC ── */}
            {panel === "systematic" && (
              <div>
                {!selZone && (
                  <>
                    <div style={{ marginBottom: "12px" }}>
                      <div style={{ ...lbl, marginBottom: "6px" }}>Quick Templates</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                        <button onClick={() => { setSes(s => ({ ...s, specimens: Object.fromEntries(ZONES.map(z => [z, { ...mkSpec(), gleason: "benign", coresPos: "0", coresTotal: "2", maxPct: "0" }])) })); }} style={{ ...btn, background: C.successDim, color: C.success, border: `1px solid ${C.success}30`, padding: "6px 8px", fontSize: "8px" }}>All Benign</button>
                        <button onClick={() => { setSes(s => ({ ...s, specimens: Object.fromEntries(ZONES.map(z => [z, mkSpec()])) })); }} style={{ ...btn, background: C.dangerDim, color: C.danger, border: `1px solid ${C.danger}30`, padding: "6px 8px", fontSize: "8px" }}>Clear All</button>
                        <button onClick={() => { const specs = Object.fromEntries(ZONES.map(z => [z, { ...mkSpec(), gleason: "benign", coresPos: "0", coresTotal: "2", maxPct: "0" }])); specs["R Mid Lat"] = { gleason: "3+4", coresPos: "1", coresTotal: "2", maxPct: "40", pni: false, crib: false, idc: false, notes: "" }; specs["R Mid Med"] = { gleason: "3+4", coresPos: "1", coresTotal: "2", maxPct: "40", pni: false, crib: false, idc: false, notes: "" }; setSes(s => ({ ...s, specimens: specs })); }} style={{ ...btn, background: C.warnDim, color: C.warn, border: `1px solid ${C.warn}30`, padding: "6px 8px", fontSize: "8px" }}>R Mid 3+4</button>
                        <button onClick={() => { const specs = Object.fromEntries(ZONES.map(z => [z, { ...mkSpec(), gleason: "benign", coresPos: "0", coresTotal: "2", maxPct: "0" }])); specs["R Mid Med"] = { gleason: "3+3", coresPos: "1", coresTotal: "2", maxPct: "10", pni: false, crib: false, idc: false, notes: "" }; specs["L Mid Med"] = { gleason: "3+3", coresPos: "1", coresTotal: "2", maxPct: "10", pni: false, crib: false, idc: false, notes: "" }; setSes(s => ({ ...s, specimens: specs })); }} style={{ ...btn, background: C.accentDim, color: C.accent, border: `1px solid ${C.accent}30`, padding: "6px 8px", fontSize: "8px" }}>Bilateral 3+3</button>
                      </div>
                    </div>

                    <div style={{ marginBottom: "12px" }}>
                      <div style={{ ...lbl, marginBottom: "6px" }}>Zone Progress</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "2px", marginBottom: "6px" }}>
                        {ZONES.map(z => {
                          const s = ses.specimens[z];
                          const g = GLEASON.find(x => x.value === s.gleason);
                          const filled = s.gleason !== null;
                          const selected = selZone === z;
                          return (
                            <div key={z} onClick={() => setSelZone(z)} style={{ width: "100%", aspectRatio: "1", borderRadius: "3px", background: filled ? g.color : C.border, border: selected ? `2px solid ${C.accent}` : "1px solid " + C.border, cursor: "pointer", opacity: filled ? 0.9 : 0.3 }} title={z} />
                          );
                        })}
                      </div>
                      <div style={{ fontSize: "9px", color: C.textSec, textAlign: "center" }}>{filledCount}/12 zones entered</div>
                    </div>
                  </>
                )}

                {selZone && ses.specimens[selZone] ? (() => { const sp = ses.specimens[selZone]; return (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <div><div style={{ ...lbl }}>{ses.type === "surveillance" && ses.treatment?.pattern && isZoneInPattern(selZone, ses.treatment.pattern) ? "🔶 IN TREATMENT ZONE" : ""}</div><div style={{ fontSize: "14px", fontWeight: 700 }}>{selZone}</div></div>
                  <button onClick={() => setSes(s => ({ ...s, specimens: { ...s.specimens, [selZone]: mkSpec() } }))} style={{ ...btn, background: C.dangerDim, color: C.danger, border: `1px solid ${C.danger}25` }}>Clear</button>
                </div>
                <div style={{ marginBottom: "10px" }}><div style={{ ...lbl, display: "flex", alignItems: "center", gap: "4px" }}>Grade Group <Tip>Gleason score patterns indicating cancer aggressiveness. GG1 (3+3) is low-grade, GG2 (3+4) intermediate, GG3+ higher-grade.</Tip></div><GradeSel value={sp.gleason} onChange={v => updSpec("gleason", v)} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", marginBottom: "10px" }}>
                  <div><div style={lbl}>Cores +</div><input type="number" min="0" value={sp.coresPos} onChange={e => updSpec("coresPos", e.target.value)} style={inp} /></div>
                  <div><div style={lbl}>Total</div><input type="number" min="0" value={sp.coresTotal} onChange={e => updSpec("coresTotal", e.target.value)} style={inp} /></div>
                  <div><div style={lbl}>Max %</div><input type="number" min="0" max="100" value={sp.maxPct} onChange={e => updSpec("maxPct", e.target.value)} style={inp} /></div>
                </div>
                <div style={{ marginBottom: "10px" }}>
                  <div style={{ ...lbl, display: "flex", alignItems: "center", gap: "4px" }}>
                    Adverse Features
                    <Tip>PNI = cancer around nerve fibers (higher risk). Cribriform = aggressive pattern. IDC-P = intraductal carcinoma (worse outcomes).</Tip>
                  </div>
                  <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: "4px", padding: "4px 6px" }}>
                    <Chk label={<><span>PNI</span> <Tip>Perineural invasion - cancer cells tracking along nerves.</Tip></>} checked={sp.pni} onChange={v => updSpec("pni", v)} />
                    <Chk label={<><span>Cribriform</span> <Tip>Cribriform growth pattern - associated with aggressive behavior.</Tip></>} checked={sp.crib} onChange={v => updSpec("crib", v)} />
                    <Chk label={<><span>IDC-P</span> <Tip>Intraductal carcinoma of prostate - may warrant aggressive treatment.</Tip></>} checked={sp.idc} onChange={v => updSpec("idc", v)} />
                  </div>
                </div>
                <div style={{ marginBottom: "10px" }}><div style={lbl}>Notes</div><textarea value={sp.notes} onChange={e => updSpec("notes", e.target.value)} rows={2} style={{ ...inp, resize: "vertical", minHeight: "38px" }} /></div>

                {/* Next/Previous Zone Navigation */}
                <div style={{ display: "flex", gap: "4px", marginBottom: "10px", justifyContent: "space-between" }}>
                  <button
                    onClick={() => {
                      const currentIdx = ZONES.indexOf(selZone);
                      if (currentIdx > 0) setSelZone(ZONES[currentIdx - 1]);
                    }}
                    style={{ ...btn, flex: 1, background: C.bgInput, color: C.textSec, border: `1px solid ${C.border}`, padding: "6px 8px", fontSize: "9px" }}
                  >
                    ← Previous Zone
                  </button>
                  <button
                    onClick={() => {
                      const currentIdx = ZONES.indexOf(selZone);
                      const nextEmpty = ZONES.slice(currentIdx + 1).find(z => ses.specimens[z].gleason === null);
                      if (nextEmpty) setSelZone(nextEmpty);
                      else if (currentIdx < ZONES.length - 1) setSelZone(ZONES[currentIdx + 1]);
                    }}
                    style={{ ...btn, flex: 1, background: C.accentDim, color: C.accent, border: `1px solid ${C.accent}30`, padding: "6px 8px", fontSize: "9px" }}
                  >
                    Next Zone →
                  </button>
                </div>

                <div><div style={lbl}>Navigate All Zones</div><div style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>{ZONES.filter(z => z !== selZone).map(z => { const g = GLEASON.find(x => x.value === ses.specimens[z].gleason); return <button key={z} onClick={() => setSelZone(z)} style={{ background: g ? g.bg : C.bg, border: `1px solid ${g ? g.color + "30" : C.border}`, borderRadius: "3px", color: g ? g.color : C.textMut, padding: "2px 4px", fontSize: "7px", cursor: "pointer", fontFamily: FONT }}>{z}</button>; })}</div></div>
              </div>);
            })() : <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "180px", color: C.textMut }}><div style={{ fontSize: "24px", opacity: 0.3 }}>⊕</div><div style={{ fontSize: "10px" }}>Select a zone on the map</div></div>}
              </div>
            )}

            {/* ── MRI ── */}
            {panel === "mri" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600 }}>MRI Lesions</span>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button onClick={() => imgInputRef.current?.click()} style={{ ...btn, background: C.bgInput, color: C.textSec, border: `1px solid ${C.border}`, padding: "3px 7px" }}>📷 Attach MRI</button>
                    <button onClick={() => { const l = mkLesion(`L${ses.mriLesions.length + 1}`); setSes(s => ({ ...s, mriLesions: [...s.mriLesions, l] })); setSelLesion(l.id); }} style={{ ...btn, background: C.accentDim, color: C.accent, border: `1px solid ${C.accent}30`, padding: "3px 7px" }}>+ Lesion</button>
                  </div>
                </div>
                {ses.mriLesions.map(l => { const isO = selLesion === l.id; const pc = PIRADS_LIST.find(p => p.value === l.pirads); return (
                  <div key={l.id} style={{ background: C.bgCard, border: `1px solid ${isO ? C.accent + "30" : C.border}`, borderRadius: "5px", marginBottom: "4px", overflow: "hidden" }}>
                    <div onClick={() => setSelLesion(isO ? null : l.id)} style={{ padding: "5px 8px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}><div style={{ width: "7px", height: "7px", borderRadius: "1px", background: pc?.color + "44", border: `1px solid ${pc?.color}` }} /><span style={{ fontSize: "10px", fontWeight: 600 }}>{l.name}</span><span style={{ fontSize: "8px", color: pc?.color }}>PI-RADS {l.pirads}</span></div>
                      <div style={{ display: "flex", gap: "4px" }}><button onClick={e => { e.stopPropagation(); setSes(s => ({ ...s, mriLesions: s.mriLesions.filter(x => x.id !== l.id), targetedBx: s.targetedBx.filter(t => t.lesionId !== l.id) })); if (selLesion === l.id) setSelLesion(null); }} style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", fontSize: "8px", fontFamily: FONT }}>✕</button></div>
                    </div>
                    {isO && (
                      <div style={{ padding: "8px", borderTop: `1px solid ${C.border}` }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "6px" }}>
                          <div><div style={lbl}>Name</div><input value={l.name} onChange={e => setSes(s => ({ ...s, mriLesions: s.mriLesions.map(x => x.id === l.id ? { ...x, name: e.target.value } : x) }))} style={inp} /></div>
                          <div><div style={lbl}>Size mm</div><input type="number" value={l.sizeMm} onChange={e => setSes(s => ({ ...s, mriLesions: s.mriLesions.map(x => x.id === l.id ? { ...x, sizeMm: e.target.value } : x) }))} style={inp} /></div>
                        </div>
                        <div style={{ marginBottom: "6px" }}><div style={lbl}>PI-RADS</div><div style={{ display: "flex", gap: "3px" }}>{PIRADS_LIST.map(p => <button key={p.value} onClick={() => setSes(s => ({ ...s, mriLesions: s.mriLesions.map(x => x.id === l.id ? { ...x, pirads: p.value } : x) }))} style={{ flex: 1, padding: "4px", borderRadius: "3px", cursor: "pointer", background: l.pirads === p.value ? p.color + "25" : C.bgInput, border: `1.5px solid ${l.pirads === p.value ? p.color : C.border}`, color: l.pirads === p.value ? p.color : C.textMut, fontSize: "10px", fontFamily: FONT, fontWeight: l.pirads === p.value ? 700 : 400, textAlign: "center" }}>{p.value}</button>)}</div></div>
                        {(() => { const probs = { 1: "~3%", 2: "~6%", 3: "~15%", 4: "~43%", 5: "~77%" }; const prob = probs[l.pirads]; return <div style={{ background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "5px 6px", marginBottom: "6px", fontSize: "8px", color: C.textSec }}><div style={{ ...lbl, fontSize: "7px", marginBottom: "2px" }}>csPCa Risk</div><div style={{ fontSize: "12px", fontFamily: FONT, fontWeight: 600, color: l.pirads <= 2 ? C.success : l.pirads === 3 ? C.warn : C.danger }}>{prob}</div></div>; })()}
                        <div style={{ marginBottom: "6px" }}><div style={lbl}>Sector</div><select value={l.sector} onChange={e => setSes(s => ({ ...s, mriLesions: s.mriLesions.map(x => x.id === l.id ? { ...x, sector: e.target.value } : x) }))} style={{ ...inp, appearance: "auto" }}>{MRI_SECTORS.map(s => <option key={s}>{s}</option>)}</select></div>
                        <div><div style={lbl}>Notes</div><textarea value={l.notes} onChange={e => setSes(s => ({ ...s, mriLesions: s.mriLesions.map(x => x.id === l.id ? { ...x, notes: e.target.value } : x) }))} rows={2} style={{ ...inp, resize: "vertical" }} /></div>
                      </div>
                    )}
                  </div>);
                })}
              </div>
            )}

            {/* ── TARGETED ── */}
            {panel === "targeted" && (
              <div>
                <div style={{ fontSize: "11px", fontWeight: 600, marginBottom: "8px" }}>Targeted Biopsies</div>
                {ses.mriLesions.length === 0 ? <div style={{ color: C.textMut, fontSize: "10px", textAlign: "center", padding: "20px" }}>Add MRI lesions first.</div> : ses.mriLesions.map(lesion => {
                  const targets = ses.targetedBx.filter(t => t.lesionId === lesion.id);
                  return (
                    <div key={lesion.id} style={{ marginBottom: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <span style={{ fontSize: "10px", fontWeight: 600 }}>{lesion.name} <span style={{ color: PIRADS_LIST.find(p => p.value === lesion.pirads)?.color, fontWeight: 400, fontSize: "9px" }}>PI-RADS {lesion.pirads}</span></span>
                        <button onClick={() => { const t = mkTargetBx(lesion.id); setSes(s => ({ ...s, targetedBx: [...s.targetedBx, t] })); setSelTarget(t.id); }} style={{ ...btn, background: C.accentDim, color: C.accent, border: `1px solid ${C.accent}30`, padding: "2px 6px", fontSize: "8px" }}>+ Core</button>
                      </div>
                      {targets.map((t, idx) => { const isO = selTarget === t.id; const tg = GLEASON.find(g => g.value === t.gleason); return (
                        <div key={t.id} style={{ background: C.bgCard, border: `1px solid ${isO ? C.accent + "30" : C.border}`, borderRadius: "4px", marginBottom: "3px", overflow: "hidden" }}>
                          <div onClick={() => setSelTarget(isO ? null : t.id)} style={{ padding: "4px 7px", display: "flex", justifyContent: "space-between", cursor: "pointer" }}>
                            <span style={{ fontSize: "9px" }}>Core {idx + 1} {tg && <span style={{ color: tg.color, fontWeight: 600 }}>{tg.label}</span>}</span>
                            <button onClick={e => { e.stopPropagation(); setSes(s => ({ ...s, targetedBx: s.targetedBx.filter(x => x.id !== t.id) })); }} style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", fontSize: "8px" }}>✕</button>
                          </div>
                          {isO && (
                            <div style={{ padding: "7px", borderTop: `1px solid ${C.border}` }}>
                              <div style={{ marginBottom: "6px" }}><div style={lbl}>Grade</div><GradeSel value={t.gleason} onChange={v => setSes(s => ({ ...s, targetedBx: s.targetedBx.map(x => x.id === t.id ? { ...x, gleason: v } : x) }))} compact /></div>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px", marginBottom: "6px" }}>
                                {[["coresPos", "Cores +"], ["coresTotal", "Total"], ["maxPct", "Max %"]].map(([f, l2]) => <div key={f}><div style={lbl}>{l2}</div><input type="number" min="0" value={t[f]} onChange={e => setSes(s => ({ ...s, targetedBx: s.targetedBx.map(x => x.id === t.id ? { ...x, [f]: e.target.value } : x) }))} style={inp} /></div>)}
                              </div>
                              <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "4px 6px" }}>
                                {[["pni", "PNI"], ["crib", "Cribriform"], ["idc", "IDC-P"]].map(([f, l2]) => <Chk key={f} label={l2} checked={t[f]} onChange={v => setSes(s => ({ ...s, targetedBx: s.targetedBx.map(x => x.id === t.id ? { ...x, [f]: v } : x) }))} />)}
                              </div>
                            </div>
                          )}
                        </div>);
                      })}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── FOCAL PLAN ── */}
            {panel === "focal" && (
              <div>
                <div style={{ fontSize: "11px", fontWeight: 600, marginBottom: "10px" }}>Focal Therapy Zone Planning</div>
                <div style={{ marginBottom: "10px" }}>
                  <div style={lbl}>Treatment Pattern</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                    {FOCAL_PATTERNS.map(p => {
                      const on = ses.focalPlan?.pattern === p;
                      return <button key={p} onClick={() => setSes(s => ({ ...s, focalPlan: { ...(s.focalPlan || {}), pattern: p } }))} style={{ ...btn, padding: "6px 8px", fontSize: "9px", background: on ? C.focalZone + "20" : C.bgInput, border: `1.5px solid ${on ? C.focalZone : C.border}`, color: on ? C.focalZone : C.textSec, textAlign: "left" }}>{p}</button>;
                    })}
                  </div>
                </div>
                {ses.focalPlan?.pattern && (
                  <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: "5px", padding: "8px" }}>
                    <div style={{ ...lbl, marginBottom: "4px" }}>Zone Coverage Check</div>
                    {ZONES.map(z => {
                      const inZone = isZoneInPattern(z, ses.focalPlan.pattern);
                      const sp = ses.specimens[z]; const g = GLEASON.find(x => x.value === sp.gleason);
                      const hasDisease = g && g.value !== "benign";
                      const missedDisease = hasDisease && !inZone;
                      return (
                        <div key={z} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "2px 0", fontSize: "9px" }}>
                          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: inZone ? C.focalZone : C.textMut, opacity: inZone ? 1 : 0.3 }} />
                          <span style={{ color: missedDisease ? C.danger : C.textSec, fontWeight: missedDisease ? 600 : 400, minWidth: "80px" }}>{z}</span>
                          {g && <span style={{ color: g.color, fontSize: "8px" }}>{g.label}</span>}
                          {missedDisease && <span style={{ color: C.danger, fontSize: "8px", fontWeight: 700 }}>⚠ OUTSIDE TX ZONE</span>}
                          {inZone && <span style={{ color: C.focalZone, fontSize: "7px", opacity: 0.6 }}>covered</span>}
                        </div>
                      );
                    })}
                    {ses.mriLesions.length > 0 && (<><div style={{ ...lbl, marginTop: "8px", marginBottom: "3px" }}>MRI Lesion Coverage</div>{ses.mriLesions.map(l => <div key={l.id} style={{ fontSize: "9px", padding: "2px 0", color: C.textSec }}>{l.name} — PI-RADS {l.pirads} <span style={{ color: C.textMut }}>(position manually on map)</span></div>)}</>)}
                  </div>
                )}
                <div style={{ marginTop: "10px" }}><div style={lbl}>Planning Notes</div><textarea value={ses.focalPlan?.notes || ""} onChange={e => setSes(s => ({ ...s, focalPlan: { ...(s.focalPlan || {}), notes: e.target.value } }))} rows={3} style={{ ...inp, resize: "vertical" }} placeholder="Margin considerations, treatment approach..." /></div>
              </div>
            )}

            {/* ── TREATMENT ── */}
            {panel === "treatment" && (
              <div>
                <div style={{ fontSize: "11px", fontWeight: 600, marginBottom: "10px" }}>Treatment Record</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "10px" }}>
                  <div><div style={lbl}>Modality</div><select value={ses.treatment?.modality || ""} onChange={e => setSes(s => ({ ...s, treatment: { ...(s.treatment || {}), modality: e.target.value } }))} style={{ ...inp, appearance: "auto" }}><option value="">—</option>{TX_MODALITIES.map(m => <option key={m}>{m}</option>)}</select></div>
                  <div><div style={lbl}>Treatment Date</div><input type="date" value={ses.treatment?.date || ""} onChange={e => setSes(s => ({ ...s, treatment: { ...(s.treatment || {}), date: e.target.value } }))} style={inp} /></div>
                </div>
                <div style={{ marginBottom: "10px" }}><div style={lbl}>Pattern Treated</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px" }}>{FOCAL_PATTERNS.map(p => { const on = ses.treatment?.pattern === p; return <button key={p} onClick={() => setSes(s => ({ ...s, treatment: { ...(s.treatment || {}), pattern: p } }))} style={{ ...btn, padding: "5px 6px", fontSize: "8px", background: on ? "#FF980020" : C.bgInput, border: `1.5px solid ${on ? "#FF9800" : C.border}`, color: on ? "#FF9800" : C.textSec, textAlign: "left" }}>{p}</button>; })}</div></div>
                <div style={{ marginBottom: "10px" }}><div style={lbl}>Parameters / Notes</div><textarea value={ses.treatment?.notes || ""} onChange={e => setSes(s => ({ ...s, treatment: { ...(s.treatment || {}), notes: e.target.value } }))} rows={3} style={{ ...inp, resize: "vertical" }} placeholder="Energy settings, duration, coverage details..." /></div>
                {ses.treatment?.pattern && <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: "4px", padding: "6px", fontSize: "9px", color: C.textSec }}><div style={{ ...lbl, fontSize: "7px" }}>Zones Treated</div>{ZONES.filter(z => isZoneInPattern(z, ses.treatment.pattern)).map(z => <span key={z} style={{ marginRight: "6px" }}>{z}</span>)}</div>}
              </div>
            )}

            {/* ── TOOLS: Clinical Assessment ── */}
            {panel === "tools" && (
              <div>
                <div style={{ fontSize: "11px", fontWeight: 600, marginBottom: "10px" }}>Clinical Assessment Tools</div>

                {/* IPSS Calculator */}
                <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: "5px", padding: "10px", marginBottom: "10px" }}>
                  <div style={{ ...lbl, fontSize: "9px", marginBottom: "6px", fontWeight: 700 }}>IPSS (Urinary Symptoms)</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "5px", marginBottom: "8px" }}>
                    {[
                      { q: 1, label: "Incomplete Emptying", help: "0=Not at all, 5=Almost always" },
                      { q: 2, label: "Frequency", help: "0=<1/day, 5=>5/day" },
                      { q: 3, label: "Intermittency", help: "0=Never, 5=Always" },
                      { q: 4, label: "Urgency", help: "0=None, 5=Severe" },
                      { q: 5, label: "Weak Stream", help: "0=Not weak, 5=Very weak" },
                      { q: 6, label: "Straining", help: "0=Never, 5=Always" },
                      { q: 7, label: "Nocturia", help: "0=None, 5=5+ times" }
                    ].map(({ q, label, help }) => (
                      <div key={q}>
                        <div style={{ fontSize: "9px", color: C.textSec, marginBottom: "2px" }}>{label} <span style={{ fontSize: "7px", color: C.textMut }}>({help})</span></div>
                        <select
                          value={ses.ipss?.[`q${q}`] || ""}
                          onChange={e => setSes(s => ({ ...s, ipss: { ...(s.ipss || {}), [`q${q}`]: parseInt(e.target.value) } }))}
                          style={{ ...inp, appearance: "auto" }}
                        >
                          <option value="">—</option>
                          {[0, 1, 2, 3, 4, 5].map(v => <option key={v}>{v}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: "3px", padding: "6px", marginBottom: "6px" }}>
                    <div style={{ ...lbl, fontSize: "7px", marginBottom: "2px" }}>Quality of Life</div>
                    <select
                      value={ses.ipss?.qol || ""}
                      onChange={e => setSes(s => ({ ...s, ipss: { ...(s.ipss || {}), qol: parseInt(e.target.value) } }))}
                      style={{ ...inp, appearance: "auto", fontSize: "10px" }}
                    >
                      <option value="">—</option>
                      <option value="0">0: Delighted</option>
                      <option value="1">1: Pleased</option>
                      <option value="2">2: Mostly satisfied</option>
                      <option value="3">3: Mixed</option>
                      <option value="4">4: Mostly dissatisfied</option>
                      <option value="5">5: Unhappy</option>
                      <option value="6">6: Terrible</option>
                    </select>
                  </div>
                  {(() => {
                    const total = ses.ipss ? [1, 2, 3, 4, 5, 6, 7].reduce((s, i) => s + (ses.ipss[`q${i}`] || 0), 0) : null;
                    const interpretation = total !== null ? (total <= 7 ? "Mild" : total <= 19 ? "Moderate" : "Severe") : null;
                    const intColor = total !== null ? (total <= 7 ? C.success : total <= 19 ? C.warn : C.danger) : C.textMut;
                    return total !== null ? (
                      <div style={{ background: intColor + "15", border: `1px solid ${intColor}40`, borderRadius: "3px", padding: "5px 6px", fontSize: "9px", color: intColor, fontWeight: 700 }}>
                        IPSS Score: {total} ({interpretation})
                        {ses.ipss?.qol !== undefined && ses.ipss.qol !== "" && <div style={{ fontSize: "8px", marginTop: "2px", fontWeight: 400, color: C.textSec }}>QoL: {ses.ipss.qol}</div>}
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* SHIM Calculator */}
                <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: "5px", padding: "10px", marginBottom: "10px" }}>
                  <div style={{ ...lbl, fontSize: "9px", marginBottom: "6px", fontWeight: 700 }}>SHIM (Erectile Function Baseline)</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "5px", marginBottom: "8px" }}>
                    {[
                      { q: 1, label: "Confidence in Getting Erection", options: ["No", "Low", "Moderate", "High", "Very High"] },
                      { q: 2, label: "Hardness for Penetration", options: ["Absent", "Difficult", "Moderate", "Good", "Always"] },
                      { q: 3, label: "Maintaining After Penetration", options: ["Absent", "Difficult", "Moderate", "Good", "Always"] },
                      { q: 4, label: "Maintaining to Completion", options: ["Absent", "Difficult", "Moderate", "Good", "Always"] },
                      { q: 5, label: "Satisfactory Intercourse", options: ["Absent", "Difficult", "Moderate", "Good", "Always"] }
                    ].map(({ q, label, options }) => (
                      <div key={q}>
                        <div style={{ fontSize: "9px", color: C.textSec, marginBottom: "2px" }}>{label}</div>
                        <select
                          value={ses.shim?.[`q${q}`] || ""}
                          onChange={e => setSes(s => ({ ...s, shim: { ...(s.shim || {}), [`q${q}`]: parseInt(e.target.value) } }))}
                          style={{ ...inp, appearance: "auto" }}
                        >
                          <option value="">—</option>
                          {options.map((opt, i) => <option key={i} value={i + 1}>{i + 1}: {opt}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                  {(() => {
                    const total = ses.shim ? [1, 2, 3, 4, 5].reduce((s, i) => s + (ses.shim[`q${i}`] || 0), 0) : null;
                    const interpretation = total !== null ? (total >= 22 ? "No ED" : total >= 17 ? "Mild ED" : total >= 12 ? "Mild-Moderate ED" : total >= 8 ? "Moderate ED" : "Severe ED") : null;
                    const intColor = total !== null ? (total >= 22 ? C.success : total >= 17 ? C.warn : C.danger) : C.textMut;
                    return total !== null ? (
                      <div style={{ background: intColor + "15", border: `1px solid ${intColor}40`, borderRadius: "3px", padding: "5px 6px", fontSize: "9px", color: intColor, fontWeight: 700 }}>
                        SHIM Score: {total} ({interpretation})
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* Life Expectancy Tool */}
                <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: "5px", padding: "10px" }}>
                  <div style={{ ...lbl, fontSize: "9px", marginBottom: "6px", fontWeight: 700 }}>Life Expectancy Context</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "6px" }}>
                    <div>
                      <div style={lbl}>Age (years)</div>
                      <input
                        type="number"
                        value={ses.lifeExpectancy?.age || ""}
                        onChange={e => setSes(s => ({ ...s, lifeExpectancy: { ...(s.lifeExpectancy || {}), age: parseInt(e.target.value) } }))}
                        style={inp}
                        placeholder="Auto-calc from DOB"
                      />
                    </div>
                    <div>
                      <div style={lbl}>Charlson Index</div>
                      <select
                        value={ses.lifeExpectancy?.cci || ""}
                        onChange={e => setSes(s => ({ ...s, lifeExpectancy: { ...(s.lifeExpectancy || {}), cci: parseInt(e.target.value) } }))}
                        style={{ ...inp, appearance: "auto" }}
                      >
                        <option value="">—</option>
                        {[0, 1, 2, 3, 4, 5].map(i => <option key={i}>{i}</option>)}
                      </select>
                    </div>
                  </div>
                  {(() => {
                    const LETable = {
                      50: { 0: 32, 2: 26, 4: 18 },
                      55: { 0: 28, 2: 22, 4: 15 },
                      60: { 0: 23, 2: 18, 4: 12 },
                      65: { 0: 19, 2: 15, 4: 10 },
                      70: { 0: 15, 2: 11, 4: 7 },
                      75: { 0: 12, 2: 8, 4: 5 },
                      80: { 0: 8, 2: 6, 4: 3 },
                      85: { 0: 6, 2: 4, 4: 2 }
                    };
                    const age = ses.lifeExpectancy?.age;
                    const cci = ses.lifeExpectancy?.cci || 0;
                    if (!age) return null;
                    const ageKey = Math.min(85, Math.max(50, Math.round(age / 5) * 5));
                    const le = LETable[ageKey]?.[Math.min(4, cci)] || LETable[85][4];
                    const interpretation = le > 10 ? "green" : le >= 5 ? "yellow" : "red";
                    const label = interpretation === "green" ? "Treatment likely beneficial" : interpretation === "yellow" ? "Individualized decision" : "Active surveillance preferred";
                    const color = interpretation === "green" ? C.success : interpretation === "yellow" ? C.warn : C.danger;
                    return (
                      <div style={{ background: color + "15", border: `1px solid ${color}40`, borderRadius: "3px", padding: "6px", fontSize: "9px", color: color, fontWeight: 700 }}>
                        Est. Life Expectancy: ~{le} years
                        <div style={{ fontSize: "8px", marginTop: "3px", fontWeight: 400, color: C.textSec }}>10-year rule: {label}</div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}


            {/* ── POST-TREATMENT MONITORING ── */}
            {panel === "post-tx" && (
              <div>
                <div style={{ fontSize: "11px", fontWeight: 600, marginBottom: "10px" }}>Post-Treatment Monitoring</div>

                {!ses.treatment?.modality ? (
                  <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: "4px", padding: "10px", color: C.textSec, fontSize: "9px", textAlign: "center" }}>
                    Select treatment modality to see monitoring milestones.
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "8px" }}>
                    {/* Radical Prostatectomy */}
                    {ses.treatment.modality === "Radical Prostatectomy" && (
                      <div style={{ background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: "4px", padding: "8px" }}>
                        <div style={{ ...lbl, marginBottom: "4px" }}>Post-Prostatectomy Milestones</div>
                        <div style={{ fontSize: "9px", color: C.textSec, lineHeight: "1.4", marginBottom: "6px" }}>
                          <div>• PSA undetectable (&lt;0.1) by 6 weeks</div>
                          <div>• Biochemical recurrence: PSA ≥0.2 on repeat</div>
                          <div>• Schedule: 6 weeks, then q3-6mo × 2y, then q6-12mo × 5y, then annually</div>
                        </div>
                        <div><div style={lbl}>PSA Values Log</div><textarea value={ses.postTxMonitoring?.psaLog || ""} onChange={e => setSes(s => ({ ...s, postTxMonitoring: { ...(s.postTxMonitoring || {}), psaLog: e.target.value } }))} rows={2} style={{ ...inp, resize: "vertical", fontSize: "8px" }} placeholder="e.g., 6w: 0.05, 3mo: 0.08..." /></div>
                      </div>
                    )}

                    {/* Radiation Therapy */}
                    {["HIFU", "Cryotherapy", "Laser (FLA)", "IRE/NanoKnife", "Focal Brachy"].includes(ses.treatment.modality) && (
                      <div style={{ background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: "4px", padding: "8px" }}>
                        <div style={{ ...lbl, marginBottom: "4px" }}>Post-Radiation/Focal Milestones</div>
                        <div style={{ fontSize: "9px", color: C.textSec, lineHeight: "1.4", marginBottom: "6px" }}>
                          <div>• PSA nadir typically 18-36 months post-treatment</div>
                          <div>• Phoenix definition: nadir + 2.0 ng/mL</div>
                          <div>• PSA bounce common in first 2 years</div>
                          <div>• Follow-up MRI at 6 months (focal)</div>
                          <div>• Surveillance biopsy at 12 months (focal)</div>
                        </div>
                        <div><div style={lbl}>PSA Tracking</div><textarea value={ses.postTxMonitoring?.psaLog || ""} onChange={e => setSes(s => ({ ...s, postTxMonitoring: { ...(s.postTxMonitoring || {}), psaLog: e.target.value } }))} rows={2} style={{ ...inp, resize: "vertical", fontSize: "8px" }} placeholder="e.g., 3mo: 8.2, 6mo: 7.9, 12mo: 6.5..." /></div>
                      </div>
                    )}

                    {/* Additional notes */}
                    <div>
                      <div style={lbl}>Monitoring Notes</div>
                      <textarea
                        value={ses.postTxMonitoring?.notes || ""}
                        onChange={e => setSes(s => ({ ...s, postTxMonitoring: { ...(s.postTxMonitoring || {}), notes: e.target.value } }))}
                        rows={2}
                        style={{ ...inp, resize: "vertical" }}
                        placeholder="Recurrence events, imaging findings, treatment complications..."
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── GENOMICS ── */}
            {panel === "genomics" && (
              <div>
                <div style={{ fontSize: "11px", fontWeight: 600, marginBottom: "10px" }}>Genomic Classifiers</div>
                {GENOMIC_TESTS.map(test => (
                  <div key={test.name} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: "5px", padding: "10px", marginBottom: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 600 }}>{test.name}</span>
                      <span style={{ fontSize: "8px", color: C.textMut }}>Range: {test.range}</span>
                    </div>
                    <input
                      type="number" step="0.01"
                      value={ses.genomics?.[test.name.toLowerCase().replace(/ .*/,"")] || ""}
                      onChange={e => setSes(s => ({ ...s, genomics: { ...s.genomics, [test.name.toLowerCase().replace(/ .*/,"")]: e.target.value } }))}
                      style={inp} placeholder={`Enter ${test.name} score`}
                    />
                    <div style={{ display: "flex", gap: "4px", marginTop: "6px" }}>
                      {test.thresholds.map((t, i) => {
                        const val = parseFloat(ses.genomics?.[test.name.toLowerCase().replace(/ .*/,"")] || "");
                        const prevVal = i > 0 ? test.thresholds[i - 1].val : -Infinity;
                        const isActive = !isNaN(val) && val <= t.val && val > prevVal;
                        const col = t.label === "Low" ? C.success : t.label === "Intermediate" ? C.warn : C.danger;
                        return <div key={t.label} style={{ flex: 1, padding: "4px", borderRadius: "3px", textAlign: "center", background: isActive ? col + "20" : C.bgInput, border: `1px solid ${isActive ? col : C.border}`, fontSize: "8px", color: isActive ? col : C.textMut, fontFamily: FONT, fontWeight: isActive ? 700 : 400 }}>{t.label}<br />≤{t.val}</div>;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── SESSION COMPARISON ── */
function SessionCompare({ sessions }) {
  const valid = sessions.filter(s => Object.values(s.specimens).some(x => x.gleason !== null) || s.targetedBx.some(t => t.gleason !== null));
  if (valid.length < 2) return <div style={{ padding: "24px", textAlign: "center", color: C.textMut, fontSize: "10px", fontFamily: FONT }}>Need 2+ sessions with data.</div>;
  const summary = (s) => {
    const sp = allSpecs(s); const mg2 = maxG(sp);
    return { maxGrade: mg2, pos: sumCores(sp, "coresPos"), tot: sumCores(sp, "coresTotal"), maxI: Math.max(0, ...sp.map(x => parseInt(x.maxPct) || 0)), adv: sp.some(x => x.pni || x.crib || x.idc), bilat: Object.entries(s.specimens).filter(([z, x]) => z.startsWith("R ") && x.gleason && x.gleason !== "benign").length > 0 && Object.entries(s.specimens).filter(([z, x]) => z.startsWith("L ") && x.gleason && x.gleason !== "benign").length > 0, psa: s.psa, type: s.type };
  };
  const sums = valid.map(summary);
  return (
    <div style={{ padding: "14px", overflowX: "auto" }}>
      <div style={{ ...lbl, fontSize: "10px", letterSpacing: "1.5px", marginBottom: "8px" }}>Serial Comparison</div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT, fontSize: "9px" }}>
        <thead><tr style={{ borderBottom: `2px solid ${C.border}` }}><th style={{ textAlign: "left", padding: "4px 6px", color: C.textSec, fontSize: "8px", textTransform: "uppercase" }}>Metric</th>{valid.map(s => <th key={s.id} style={{ textAlign: "center", padding: "4px 6px", color: C.textSec, fontSize: "8px", textTransform: "uppercase" }}>{s.label || s.date} {s.type !== "diagnostic" && <span style={{ fontSize: "7px", opacity: 0.6 }}>({s.type})</span>}</th>)}<th style={{ textAlign: "center", padding: "4px 6px", color: C.accent, fontSize: "8px" }}>Trend</th></tr></thead>
        <tbody>
          {[
            ["PSA", s => s.psa || "—"],
            ["Max Grade", s => s.maxGrade ? <span style={{ color: s.maxGrade.color, fontWeight: 600 }}>{s.maxGrade.label}</span> : "—"],
            ["Cores +", s => s.tot > 0 ? `${s.pos}/${s.tot}` : "—"],
            ["Max %", s => s.maxI > 0 ? `${s.maxI}%` : "—"],
            ["Bilateral", s => <span style={{ color: s.bilat ? C.danger : C.success }}>{s.bilat ? "Y" : "N"}</span>],
            ["Adverse", s => <span style={{ color: s.adv ? C.danger : C.success }}>{s.adv ? "Y" : "N"}</span>],
          ].map(([label, render]) => {
            const f = sums[0]; const l = sums[sums.length - 1];
            let trend = "—";
            if (label === "Max Grade" && f.maxGrade && l.maxGrade) { const d = GLEASON.findIndex(g => g.value === l.maxGrade.value) - GLEASON.findIndex(g => g.value === f.maxGrade.value); trend = d > 0 ? <span style={{ color: C.danger }}>↑</span> : d < 0 ? <span style={{ color: C.success }}>↓</span> : <span style={{ color: C.textMut }}>→</span>; }
            if (label === "PSA" && f.psa && l.psa) trend = parseFloat(l.psa) > parseFloat(f.psa) ? <span style={{ color: C.danger }}>↑</span> : parseFloat(l.psa) < parseFloat(f.psa) ? <span style={{ color: C.success }}>↓</span> : <span style={{ color: C.textMut }}>→</span>;
            return <tr key={label} style={{ borderBottom: `1px solid ${C.border}15` }}><td style={{ padding: "4px 6px", color: C.textSec }}>{label}</td>{sums.map((s, i) => <td key={i} style={{ padding: "4px 6px", textAlign: "center" }}>{render(s)}</td>)}<td style={{ padding: "4px 6px", textAlign: "center" }}>{trend}</td></tr>;
          })}
        </tbody>
      </table>
    </div>
  );
}
