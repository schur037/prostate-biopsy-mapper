import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import * as recharts from "recharts";
const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Area, AreaChart } = recharts;

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
  bg: "#060A10", bgCard: "#0B1018", bgInput: "#10161F",
  border: "#1A2232", textPri: "#D8E4F0", textSec: "#7A8EA0", textMut: "#3E5060",
  accent: "#3B8BEB", accentDim: "#1A3058",
  danger: "#D94040", dangerDim: "#2A1215",
  success: "#3AA060", successDim: "#122A1A",
  warn: "#E8A020", warnDim: "#2A2212",
  focalZone: "#7C4DFF",
};
const inp = { background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: "4px", color: C.textPri, padding: "6px 8px", fontSize: "11px", fontFamily: FONT, outline: "none", width: "100%", boxSizing: "border-box" };
const lbl = { fontSize: "9px", color: C.textSec, fontFamily: FONT, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: "3px", display: "block" };
const btn = { fontFamily: FONT, fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.8px", cursor: "pointer", borderRadius: "4px", padding: "5px 12px", border: "none" };

/* ── factories ── */
const mkSpec = () => ({ gleason: null, coresPos: "", coresTotal: "", maxPct: "", pni: false, crib: false, idc: false, notes: "" });
const mkSession = (n) => ({ id: Date.now(), label: n || "", date: "", psa: "", type: "diagnostic", specimens: ZONES.reduce((a, z) => { a[z] = mkSpec(); return a; }, {}), mriLesions: [], targetedBx: [], focalPlan: null, treatment: null, genomics: { decipher: "", oncotype: "", prolaris: "" }, mriImageData: null });
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

/* ══════════════════════════════════════════════════════════════════
   PROSTATE MAP
   ══════════════════════════════════════════════════════════════════ */

function ProstateMap({ session, selectedZone, onSelectZone, selectedLesion, onSelectLesion, onLesionDragStart, svgRef, showFocalOverlay }) {
  const hasMri = session.mriLesions.length > 0;
  const fp = session.focalPlan;
  const tx = session.treatment;
  return (
    <svg ref={svgRef} viewBox="0 0 420 310" width="100%" style={{ maxWidth: "390px", userSelect: "none" }}>
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
        const p = ZP[z]; const has = s.gleason !== null; const col = g ? g.color : "#5A6A7A"; const r = has ? 13 : 8;
        const isSel = selectedZone === z;
        // Check if in treatment zone for surveillance
        const inTxZone = tx && tx.pattern && isZoneInPattern(z, tx.pattern);
        return (
          <g key={z} style={{ cursor: "pointer" }} onClick={() => onSelectZone(z)}>
            {isSel && <circle cx={p.cx} cy={p.cy} r={r + 5} fill="none" stroke={C.accent} strokeWidth="2" opacity="0.6"><animate attributeName="r" values={`${r + 4};${r + 7};${r + 4}`} dur="1.5s" repeatCount="indefinite" /></circle>}
            {inTxZone && session.type === "surveillance" && <circle cx={p.cx} cy={p.cy} r={r + 3} fill="none" stroke="#FF9800" strokeWidth="1" strokeDasharray="2,2" opacity="0.4" />}
            <circle cx={p.cx} cy={p.cy} r={r} fill={has ? col : "transparent"} stroke={has ? col : "#5A6A7A"} strokeWidth={has ? 0 : 1.2} strokeDasharray={has ? "none" : "3,2"} opacity={has ? 0.9 : 0.35} />
            {has && s.coresPos && s.coresTotal ? <text x={p.cx} y={p.cy + 3} textAnchor="middle" fontSize="8" fill="#fff" fontFamily={FONT} fontWeight="700">{s.coresPos}/{s.coresTotal}</text> : !has ? <text x={p.cx} y={p.cy + 2.5} textAnchor="middle" fontSize="6" fill="#5A6A7A" fontFamily={FONT}>+</text> : null}
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
      <path d="M210,55 C260,45 310,55 340,80 C365,105 370,140 360,175 C350,210 330,235 300,250 C270,260 250,265 210,265 C170,265 150,260 120,250 C90,235 70,210 60,175 C50,140 55,105 80,80 C110,55 160,45 210,55 Z" fill="none" stroke="#4A6278" strokeWidth="2.2" />
      {showMri && <g opacity="0.1"><ellipse cx="210" cy="130" rx="50" ry="60" fill="none" stroke="#5CABFF" strokeWidth="1" strokeDasharray="3,3" /><text x="210" y="108" textAnchor="middle" fontSize="7" fill="#5CABFF" fontFamily={FONT}>TZ</text></g>}
      <line x1="210" y1="50" x2="210" y2="270" stroke="#4A6278" strokeWidth="0.8" strokeDasharray="4,3" opacity="0.25" />
      <path d="M62,125 Q140,118 210,122 Q280,118 358,125" fill="none" stroke="#4A6278" strokeWidth="0.5" opacity="0.15" />
      <path d="M68,188 Q140,182 210,186 Q280,182 352,188" fill="none" stroke="#4A6278" strokeWidth="0.5" opacity="0.15" />
      <text x="210" y="38" textAnchor="middle" fontSize="8" fill="#4A6278" fontFamily={FONT}>BASE</text>
      <text x="210" y="283" textAnchor="middle" fontSize="8" fill="#4A6278" fontFamily={FONT}>APEX</text>
      <text x="40" y="155" textAnchor="middle" fontSize="7" fill="#4A6278" fontFamily={FONT} transform="rotate(-90,40,155)">RIGHT</text>
      <text x="380" y="155" textAnchor="middle" fontSize="7" fill="#4A6278" fontFamily={FONT} transform="rotate(90,380,155)">LEFT</text>
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

      <div style={{ background: focalOk ? C.successDim : C.dangerDim, border: `1px solid ${focalOk ? C.success : C.danger}25`, borderRadius: "4px", padding: "6px" }}>
        <div style={{ ...lbl, fontSize: "7px" }}>Focal Therapy</div>
        <div style={{ color: focalOk ? C.success : C.danger, fontSize: "10px", fontFamily: FONT, fontWeight: 700 }}>{focalOk ? "POTENTIAL CANDIDATE" : "REVIEW"}</div>
      </div>
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

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#fff", overflowY: "auto" }}>
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
      <div className="no-print" style={{ position: "fixed", top: 8, right: 8, display: "flex", gap: "6px", zIndex: 10000 }}>
        <button onClick={() => window.print()} style={{ ...btn, background: "#1a5cba", color: "#fff", padding: "8px 18px", fontSize: "11px" }}>🖨 Print</button>
        <button onClick={onClose} style={{ ...btn, background: "#eee", color: "#333", padding: "8px 14px", fontSize: "11px" }}>✕</button>
      </div>
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "30px 24px", ...ps }}>
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

        <div style={{ fontSize: "12px", fontWeight: 700, borderBottom: "2px solid #333", paddingBottom: "3px", marginBottom: "8px" }}>SYSTEMATIC BIOPSY</div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px" }}>
          <thead><tr>{["Zone", "Grade", "Cores", "Max%", "PNI", "Crib", "IDC", "Notes"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>{ZONES.map((z, i) => { const s = session.specimens[z]; const g = GLEASON.find(x => x.value === s.gleason); return <tr key={z}><td style={td}>{ZONE_FULL[i]}</td><td style={{ ...td, color: g?.color, fontWeight: g ? 600 : 400 }}>{g?.label || "—"}</td><td style={td}>{s.coresPos && s.coresTotal ? `${s.coresPos}/${s.coresTotal}` : "—"}</td><td style={td}>{s.maxPct ? `${s.maxPct}%` : "—"}</td><td style={{ ...td, color: s.pni ? "#D32F2F" : "#999" }}>{s.pni ? "+" : "—"}</td><td style={{ ...td, color: s.crib ? "#D32F2F" : "#999" }}>{s.crib ? "+" : "—"}</td><td style={{ ...td, color: s.idc ? "#D32F2F" : "#999" }}>{s.idc ? "+" : "—"}</td><td style={{ ...td, fontSize: "8px", color: "#666" }}>{s.notes || ""}</td></tr>; })}</tbody>
        </table>

        {session.mriLesions.length > 0 && (<><div style={{ fontSize: "12px", fontWeight: 700, borderBottom: "2px solid #333", paddingBottom: "3px", marginBottom: "8px" }}>MRI LESIONS & TARGETED BIOPSY</div><table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px" }}><thead><tr>{["Lesion", "PI-RADS", "Size", "Sector", "Bx Grade", "Cores", "Notes"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead><tbody>{session.mriLesions.map(l => { const targets = session.targetedBx.filter(t => t.lesionId === l.id); const tmg = maxG(targets.filter(t => t.gleason)); return <tr key={l.id}><td style={td}>{l.name}</td><td style={{ ...td, color: PIRADS_LIST.find(p => p.value === l.pirads)?.color, fontWeight: 700 }}>{l.pirads}</td><td style={td}>{l.sizeMm ? `${l.sizeMm}mm` : "—"}</td><td style={td}>{l.sector}</td><td style={{ ...td, color: tmg?.color, fontWeight: tmg ? 600 : 400 }}>{tmg?.label || "—"}</td><td style={td}>{targets.length > 0 ? targets.map(t => `${t.coresPos || 0}/${t.coresTotal || 0}`).join(", ") : "—"}</td><td style={{ ...td, fontSize: "8px" }}>{l.notes || ""}</td></tr>; })}</tbody></table></>)}

        {session.treatment && (<div style={{ marginBottom: "12px", padding: "8px", border: "1px solid #ddd", borderRadius: "3px" }}><div style={{ fontSize: "10px", fontWeight: 700, marginBottom: "4px" }}>TREATMENT</div><div style={{ fontSize: "9px" }}>Modality: <strong>{session.treatment.modality}</strong> · Pattern: <strong>{session.treatment.pattern}</strong> · Date: <strong>{session.treatment.date || "—"}</strong></div>{session.treatment.notes && <div style={{ fontSize: "8px", color: "#666", marginTop: "2px" }}>{session.treatment.notes}</div>}</div>)}

        <div style={{ padding: "8px", background: focalOk(session, patient) ? "#F1F8E9" : "#FFF3F3", border: `1px solid ${focalOk(session, patient) ? "#C5E1A5" : "#FFCDD2"}`, borderRadius: "3px", fontSize: "9px" }}>
          <strong>Focal Therapy:</strong> {focalOk(session, patient) ? "Potential candidate." : "Review carefully."}
        </div>

        <div style={{ marginTop: "24px", borderTop: "1px solid #ddd", paddingTop: "6px", fontSize: "7px", color: "#999", textAlign: "center" }}>
          Prostate Biopsy Mapper · {new Date().toLocaleDateString()} · Verify all data before clinical decisions
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
  const svgRef = useRef(null);

  const pat = patients[activePatient];
  const ses = pat.sessions[activeSession] || pat.sessions[0];

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
  const importRef = useRef(null);
  const handleImport = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.patient) {
          setPatients(p => [...p, data.patient]);
          setActivePatient(patients.length);
        }
      } catch (err) { console.error("Import failed", err); }
    };
    reader.readAsText(file);
  };

  const filledCount = Object.values(ses.specimens).filter(s => s.gleason !== null).length;
  const tgtCount = ses.targetedBx.filter(t => t.gleason !== null).length;

  if (showPrint) return <PrintReport patient={pat} session={ses} onClose={() => setShowPrint(false)} />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.textPri, fontFamily: FONT, fontSize: "11px" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <input type="file" ref={imgInputRef} accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
      <input type="file" ref={importRef} accept=".json" style={{ display: "none" }} onChange={handleImport} />

      {/* ═══ HEADER ═══ */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "6px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", background: C.bgCard }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "26px", height: "26px", borderRadius: "4px", background: `linear-gradient(135deg, #14283C, ${C.accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: "#fff" }}>P</div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700 }}>Prostate Biopsy Mapper</div>
            <div style={{ fontSize: "7px", color: C.textMut, letterSpacing: "0.8px", textTransform: "uppercase" }}>Focal Therapy Planning · NCCN · Genomics · Registry</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          <Tabs tabs={[{ key: "map", label: "Map" }, { key: "kinetics", label: "PSA" }, { key: "compare", label: "Compare" }]} active={mainView} onSelect={setMainView} small />
          <button onClick={() => setShowPrint(true)} style={{ ...btn, background: "#1A2E1A", color: C.success, border: `1px solid ${C.success}30`, padding: "3px 8px" }}>Print</button>
          <button onClick={exportJSON} style={{ ...btn, background: C.accentDim, color: C.accent, border: `1px solid ${C.accent}30`, padding: "3px 8px" }}>JSON↓</button>
          <button onClick={() => importRef.current?.click()} style={{ ...btn, background: C.bgInput, color: C.textSec, border: `1px solid ${C.border}`, padding: "3px 8px" }}>Import</button>
          <button onClick={() => setShowPatientList(!showPatientList)} style={{ ...btn, background: showPatientList ? C.accentDim : C.bgInput, color: showPatientList ? C.accent : C.textSec, border: `1px solid ${showPatientList ? C.accent + "40" : C.border}`, padding: "3px 8px" }}>
            Registry ({patients.length})
          </button>
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
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}><span style={lbl}>cT</span><select value={pat.tStage} onChange={e => setPat({ tStage: e.target.value })} style={{ ...inp, width: "68px", appearance: "auto" }}>{T_STAGES.map(t => <option key={t}>{t}</option>)}</select></div>
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}><span style={lbl}>Vol</span><input value={pat.volume} onChange={e => setPat({ volume: e.target.value })} style={{ ...inp, width: "48px" }} placeholder="cc" /></div>
        <div style={{ width: "1px", height: "16px", background: C.border }} />
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}><span style={lbl}>PSA</span><input value={ses.psa} onChange={e => setSes({ psa: e.target.value })} style={{ ...inp, width: "55px" }} placeholder="ng/mL" /></div>
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
            <div key={s.id} style={{ display: "flex", alignItems: "center" }}>
              <button onClick={() => { setActiveSession(i); setSelZone(null); }} style={{ ...btn, padding: "2px 7px", fontSize: "8px", background: i === activeSession ? C.accentDim : "transparent", color: i === activeSession ? C.accent : C.textMut, border: `1px solid ${i === activeSession ? C.accent + "30" : "transparent"}` }}>{s.label || `S${i + 1}`}</button>
              {pat.sessions.length > 1 && <button onClick={() => { setPat(p => ({ ...p, sessions: p.sessions.filter((_, j) => j !== i) })); if (activeSession >= i && activeSession > 0) setActiveSession(activeSession - 1); }} style={{ background: "none", border: "none", color: C.textMut, cursor: "pointer", fontSize: "8px" }}>×</button>}
            </div>
          ))}
          <button onClick={() => { setPat(p => ({ ...p, sessions: [...p.sessions, mkSession(`Session ${p.sessions.length + 1}`)] })); setActiveSession(pat.sessions.length); }} style={{ ...btn, background: "transparent", color: C.textMut, border: `1px dashed ${C.border}`, padding: "2px 5px", fontSize: "7px" }}>+</button>
        </div>
        <div style={{ marginLeft: "auto", fontSize: "7px", color: C.textMut }}>{filledCount}/12 · {tgtCount}t</div>
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      {mainView === "kinetics" ? (
        <div style={{ padding: "14px", maxWidth: "800px", margin: "0 auto" }}><PSAKinetics sessions={pat.sessions} /></div>
      ) : mainView === "compare" ? (
        <SessionCompare sessions={pat.sessions} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "410px 1fr", minHeight: "calc(100vh - 80px)" }}>
          {/* LEFT */}
          <div style={{ borderRight: `1px solid ${C.border}`, padding: "10px", display: "flex", flexDirection: "column", alignItems: "center", overflowY: "auto", gap: "6px" }}>
            <ProstateMap session={ses} selectedZone={selZone} onSelectZone={z => { setSelZone(z); setPanel("systematic"); setSelLesion(null); setSelTarget(null); }} selectedLesion={selLesion} onSelectLesion={id => { setSelLesion(id); setPanel("mri"); setSelZone(null); }} onLesionDragStart={onDragStart} svgRef={svgRef} showFocalOverlay={panel === "focal" || panel === "treatment"} />

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
                { key: "genomics", label: "Genomics" },
              ]} active={panel} onSelect={setPanel} small />
            </div>

            {/* ── SYSTEMATIC ── */}
            {panel === "systematic" && (selZone && ses.specimens[selZone] ? (() => { const sp = ses.specimens[selZone]; return (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <div><div style={{ ...lbl }}>{ses.type === "surveillance" && ses.treatment?.pattern && isZoneInPattern(selZone, ses.treatment.pattern) ? "🔶 IN TREATMENT ZONE" : ""}</div><div style={{ fontSize: "14px", fontWeight: 700 }}>{selZone}</div></div>
                  <button onClick={() => setSes(s => ({ ...s, specimens: { ...s.specimens, [selZone]: mkSpec() } }))} style={{ ...btn, background: C.dangerDim, color: C.danger, border: `1px solid ${C.danger}25` }}>Clear</button>
                </div>
                <div style={{ marginBottom: "10px" }}><div style={lbl}>Grade Group</div><GradeSel value={sp.gleason} onChange={v => updSpec("gleason", v)} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", marginBottom: "10px" }}>
                  <div><div style={lbl}>Cores +</div><input type="number" min="0" value={sp.coresPos} onChange={e => updSpec("coresPos", e.target.value)} style={inp} /></div>
                  <div><div style={lbl}>Total</div><input type="number" min="0" value={sp.coresTotal} onChange={e => updSpec("coresTotal", e.target.value)} style={inp} /></div>
                  <div><div style={lbl}>Max %</div><input type="number" min="0" max="100" value={sp.maxPct} onChange={e => updSpec("maxPct", e.target.value)} style={inp} /></div>
                </div>
                <div style={{ marginBottom: "10px" }}><div style={lbl}>Adverse</div><div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: "4px", padding: "4px 6px" }}><Chk label="PNI" checked={sp.pni} onChange={v => updSpec("pni", v)} /><Chk label="Cribriform" checked={sp.crib} onChange={v => updSpec("crib", v)} /><Chk label="IDC-P" checked={sp.idc} onChange={v => updSpec("idc", v)} /></div></div>
                <div style={{ marginBottom: "10px" }}><div style={lbl}>Notes</div><textarea value={sp.notes} onChange={e => updSpec("notes", e.target.value)} rows={2} style={{ ...inp, resize: "vertical", minHeight: "38px" }} /></div>
                <div><div style={lbl}>Navigate</div><div style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>{ZONES.filter(z => z !== selZone).map(z => { const g = GLEASON.find(x => x.value === ses.specimens[z].gleason); return <button key={z} onClick={() => setSelZone(z)} style={{ background: g ? g.bg : C.bg, border: `1px solid ${g ? g.color + "30" : C.border}`, borderRadius: "3px", color: g ? g.color : C.textMut, padding: "2px 4px", fontSize: "7px", cursor: "pointer", fontFamily: FONT }}>{z}</button>; })}</div></div>
              </div>);
            })() : <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "180px", color: C.textMut }}><div style={{ fontSize: "24px", opacity: 0.3 }}>⊕</div><div style={{ fontSize: "10px" }}>Select a zone on the map</div></div>)}

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
