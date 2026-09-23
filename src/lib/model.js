// Pure attendance logic, framework-agnostic. Ported unchanged from the vanilla app
// so the maths stays identical — only the rendering layer changed.

export const DN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export const MN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const WD = [1,2,3,4,5,6,0];

const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
export const parseYMD = (s) => { const p = s.split('-').map(Number); return new Date(p[0], p[1]-1, p[2]); };
export const today = () => ymd(new Date());
export const addDays = (s, n) => { const d = parseYMD(s); d.setDate(d.getDate()+n); return ymd(d); };
export const fmtDay = (s) => { const d = parseYMD(s); return `${DN[d.getDay()]} ${d.getDate()} ${MN[d.getMonth()]}`; };
export const fmtShort = (s) => { const d = parseYMD(s); return `${d.getDate()} ${MN[d.getMonth()]}`; };
export const dayLabel = (s) => { const t = today(); if (s === t) return `Today, ${fmtDay(s)}`; if (s === addDays(t,1)) return `Tomorrow, ${fmtDay(s)}`; return fmtDay(s); };
export const uid = () => Math.random().toString(36).slice(2,9);
export const sum = (o) => Object.keys(o).reduce((a,k) => a + o[k], 0);

export function blankSem(name, status) {
  return { id: uid(), name, status: status || 'upcoming', mode: 'each', target: 75, start: '', end: '',
    subjects: [], tt: {}, extras: [], holidays: [], rec: {} };
}
export function fixSem(s) {
  const b = blankSem(s.name || 'Semester');
  for (const k in b) if (s[k] === undefined) s[k] = b[k];
  s.subjects.forEach((x) => { if (x.baseDate === undefined) x.baseDate = ((+x.baseA||0)||(+x.baseH||0)) ? (s.baseDate||'') : ''; });
  return s;
}
export const subOf = (s, id) => s.subjects.find((x) => x.id === id);
export const tOf = (sub, s) => { const v = (s.mode === 'each' && sub && sub.target != null && sub.target !== '') ? +sub.target : s.target; return Math.min(1, Math.max(0.01, v/100)); };
export function counted(x, date) { return !!(x && x.baseDate) && date <= x.baseDate; }
export function stampBase(x) { x.baseDate = ((+x.baseA||0)||(+x.baseH||0)) ? (x.baseDate || today()) : ''; }

export function semStats(s) {
  const A = {}, H = {};
  s.subjects.forEach((x) => { const h = +x.baseH || 0; H[x.id] = h; A[x.id] = Math.min(+x.baseA || 0, h); });
  for (const k in s.rec) {
    const st = s.rec[k]; if (st === 'C') continue;
    const kp = k.split('|'); const sub0 = subOf(s, kp[1]);
    if (!sub0 || counted(sub0, kp[0])) continue;
    const sid = kp[1]; if (!(sid in A)) continue;
    H[sid]++; if (st === 'P') A[sid]++;
  }
  return { A, H };
}
export function slotsOn(s, date) {
  const out = []; const wd = parseYMD(date).getDay();
  if (s.holidays.indexOf(date) < 0) {
    const day = s.tt[wd] || {};
    s.subjects.forEach((x) => { const n = +day[x.id] || 0; for (let i=0;i<n;i++) out.push({ key: `${date}|${x.id}|${i}`, sub: x.id, extra: false }); });
  }
  s.extras.forEach((e) => { if (e.date === date && subOf(s, e.sub)) out.push({ key: `${date}|${e.sub}|x${e.id}`, sub: e.sub, extra: true, xid: e.id }); });
  return out;
}
export function remaining(s, from) {
  if (!s.end) return null;
  const R = {}; s.subjects.forEach((x) => { R[x.id] = 0; });
  let d = from, g = 0;
  while (d <= s.end && g++ < 800) {
    slotsOn(s, d).forEach((sl) => { if (!(sl.key in s.rec) && !counted(subOf(s, sl.sub), d)) R[sl.sub]++; });
    d = addDays(d, 1);
  }
  return R;
}
export function calc(A, H, R, t) {
  const pct = H > 0 ? (A/H)*100 : null;
  const skip = Math.max(0, Math.floor(A/t - H + 1e-9));
  let need = 0, cant = false;
  if (pct != null && A/H < t - 1e-9) { if (t >= 1) cant = true; else need = Math.ceil((t*H - A)/(1-t) - 1e-9); }
  let proj = null;
  if (R != null) {
    const fH = H + R, req = Math.max(0, Math.ceil(t*fH - 1e-9) - A), feasible = req <= R;
    proj = { R, req, feasible, bunk: feasible ? R - req : 0, best: fH > 0 ? ((A+R)/fH)*100 : null };
  }
  return { A, H, pct, skip, need, cant, proj };
}
export function summary(s) {
  const st = semStats(s), R = remaining(s, today());
  const subs = s.subjects.map((x) => { const t = tOf(x, s); return { s: x, t, ...calc(st.A[x.id], st.H[x.id], R ? R[x.id] : null, t) }; });
  const t = Math.min(1, Math.max(0.01, s.target/100));
  const total = { ...calc(sum(st.A), sum(st.H), R ? sum(R) : null, t), t };
  return { subs, total };
}
// Walk the next days assuming the student attends everything not planned as a bunk.
export function planDays(s, n, planned) {
  const st = semStats(s), a = { ...st.A }, h = { ...st.H };
  const T = Math.min(1, Math.max(0.01, s.target/100));
  const days = []; let d = today();
  for (let i = 0; i < n; i++, d = addDays(d, 1)) {
    if (s.end && d > s.end) break;
    const slots = slotsOn(s, d).filter((sl) => !(sl.key in s.rec) && !counted(subOf(s, sl.sub), d));
    const cnt = {}, xc = {};
    slots.forEach((sl) => { cnt[sl.sub] = (cnt[sl.sub]||0)+1; if (sl.extra) xc[sl.sub] = (xc[sl.sub]||0)+1; });
    const N = slots.length;
    const row = { date: d, N, cnt, xc, holiday: s.holidays.indexOf(d) >= 0, planned: planned.has(d), had: slotsOn(s, d).length > 0 };
    if (N === 0) { days.push(row); continue; }
    if (s.mode === 'total') {
      const tA = sum(a), tH = sum(h);
      const budget = Math.max(0, Math.floor(tA/T - tH + 1e-9));
      row.budget = budget; row.status = budget >= N ? 'safe' : (budget > 0 ? 'partial' : 'no'); row.ok = budget >= N;
      row.after = (tH+N) > 0 ? (tA/(tH+N))*100 : 0;
      row.per = Object.keys(cnt).map((id) => ({ sub: subOf(s, id), n: cnt[id], pct: h[id] > 0 ? (a[id]/h[id])*100 : 0 })).sort((x,y) => y.pct - x.pct);
    } else {
      const per = Object.keys(cnt).map((id) => {
        const sub = subOf(s, id), t = tOf(sub, s);
        const k = Math.max(0, Math.min(cnt[id], Math.floor(a[id]/t - h[id] + 1e-9)));
        return { sub, n: cnt[id], k, t: +(t*100).toFixed(1), after: (h[id]+cnt[id]) > 0 ? (a[id]/(h[id]+cnt[id]))*100 : 0 };
      });
      row.per = per;
      const all = per.every((p) => p.k >= p.n), some = per.some((p) => p.k > 0);
      row.status = all ? 'safe' : (some ? 'partial' : 'no'); row.ok = all;
    }
    Object.keys(cnt).forEach((id) => { h[id] += cnt[id]; if (!row.planned) a[id] += cnt[id]; });
    days.push(row);
  }
  return days;
}
