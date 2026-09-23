import { useEffect, useMemo, useState } from 'react';
import * as M from './lib/model.js';
import { load, save } from './lib/storage.js';

const ic = {
  overview: 'M5 20v-6M12 20V6M19 20v-10',
  mark: 'M12 21a9 9 0 100-18 9 9 0 000 18zM8 12.5l3 3 5-6',
  plan: 'M4 5h16v15H4zM4 10h16M9 3v4M15 3v4',
  setup: 'M4 7h10M18 7h2M4 17h2M10 17h10',
  sems: 'M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h11',
};
function Icon({ d, className }) {
  return (
    <svg viewBox="0 0 24 24" className={className || 'h-5 w-5'} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
const cls = (...a) => a.filter(Boolean).join(' ');
const classes = (n) => `${n} class${n === 1 ? '' : 'es'}`;

function statusRing(pct, target, mode) {
  if (mode === 'total') return 'ring-line';
  if (pct == null) return 'ring-line';
  return pct >= target - 1e-9 ? 'ring-good' : 'ring-bad';
}

function Bar({ pct, target }) {
  const color = target != null && pct != null ? (pct >= target - 1e-9 ? 'bg-good' : 'bg-bad') : 'bg-rose';
  return (
    <div className="relative h-2.5 rounded-full bg-line/60 dark:bg-line-dark/60 my-3">
      <div className={cls('absolute inset-y-0 left-0 rounded-full', color)} style={{ width: `${Math.min(100, pct || 0)}%` }} />
      {target != null && (
        <div className="absolute -top-1 -bottom-1 w-[3px] -ml-[1.5px] rounded bg-gold" style={{ left: `${target}%` }} title={`Minimum ${target}%`} />
      )}
    </div>
  );
}

function Advice({ r, tp }) {
  if (r.pct == null) return <p className="text-ink2 dark:text-ink2-dark">No classes marked yet.</p>;
  if (r.pct >= tp - 1e-9)
    return <p>{r.skip > 0 ? <>You can skip <b className="font-display text-lg">{r.skip}</b> more {r.skip === 1 ? 'class' : 'classes'} right now.</> : 'Right at the limit. Attend the next class.'}</p>;
  if (r.cant) return <p>You can't get back to {tp}% any more.</p>;
  return <p>Attend the next <b className="font-display text-lg">{r.need}</b> {r.need === 1 ? 'class' : 'classes'} in a row to get back to {tp}%.</p>;
}

function ProjLine({ s, r }) {
  const p = r.proj;
  if (!p || (r.pct == null && p.R === 0)) return null;
  if (p.R === 0) return <p className="text-sm text-ink2 dark:text-ink2-dark mt-1">No classes left before {M.fmtShort(s.end)}.</p>;
  if (p.feasible)
    return <p className="text-sm text-ink2 dark:text-ink2-dark mt-1">{p.R} classes left till {M.fmtShort(s.end)}. You can skip up to <b>{p.bunk}</b> of them and still finish above the minimum.</p>;
  return <p className="text-sm text-ink2 dark:text-ink2-dark mt-1">{p.R} classes left till {M.fmtShort(s.end)}. Even if you attend all of them you would finish at {p.best.toFixed(1)}%.</p>;
}

function Empty({ title, body, btnLabel, onBtn }) {
  return (
    <div className="rounded-xl2 border border-dashed border-line dark:border-line-dark bg-surface dark:bg-surface-dark p-6 grid gap-3 justify-items-start">
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      {body && <p className="text-ink2 dark:text-ink2-dark max-w-prose">{body}</p>}
      {btnLabel && <button onClick={onBtn} className="btn-pri">{btnLabel}</button>}
    </div>
  );
}

function Banner({ children }) {
  return <div className="rounded-xl2 border border-dashed border-ink2 dark:border-ink2-dark bg-surface dark:bg-surface-dark px-4 py-3 mb-5 text-sm">{children}</div>;
}

function planText(s, d) {
  const tot = s.mode === 'total';
  if (d.planned && !d.ok) {
    if (tot) return `Skipping all would drop your overall attendance to ${d.after.toFixed(1)}% (minimum ${s.target}%).`;
    return `Skipping all would break the minimum: ${d.per.filter((p) => p.k < p.n).map((p) => `${p.sub.name} would fall to ${p.after.toFixed(1)}% (minimum ${p.t}%)`).join('; ')}.`;
  }
  if (d.status === 'safe') return tot ? `Overall stays above ${s.target}% even if you skip everything.` : 'Every subject stays above its minimum, even if you skip everything.';
  if (d.status === 'partial')
    return tot
      ? `Room to skip ${d.budget} of ${d.N}. Skip from the subjects you are strongest in: ${d.per.map((p) => p.sub.name).join(', ')}.`
      : `Skip ${d.per.filter((p) => p.k > 0).map((p) => `${p.sub.name} ×${p.k}`).join(', ')}. Attend the rest.`;
  return 'No room to skip. Attend everything.';
}

export default function App() {
  const [state, setState] = useState(() => load());
  const [tab, setTab] = useState('overview');
  const [date, setDate] = useState(M.today());
  const [armed, setArmed] = useState(null);
  const [plan, setPlan] = useState({});
  const [backupOpen, setBackupOpen] = useState(false);
  const [impText, setImpText] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => { save(state); }, [state]);
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(''), 2600);
    return () => clearTimeout(t);
  }, [toastMsg]);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(null), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  const toast = (m) => setToastMsg(m);
  const sem = () => state.sems.find((x) => x.id === state.cur) || state.sems[0];

  function updateSem(fn) {
    setState((prev) => {
      const sems = prev.sems.map((s) => (s.id === prev.cur ? (() => { const c = structuredClone(s); fn(c); return c; })() : s));
      return { ...prev, sems };
    });
  }
  function arm(key, fn) {
    if (armed === key) { setArmed(null); fn(); return; }
    setArmed(key);
  }

  if (!state.sems.length) return <Onboard onStart={(n, c) => {
    const sems = []; for (let i = 1; i <= n; i++) sems.push(M.blankSem(`Semester ${i}`, i < c ? 'done' : i === c ? 'current' : 'upcoming'));
    setState({ cur: sems[c-1].id, sems }); setTab('setup'); toast('Semesters created. Add your subjects next.');
  }} />;

  if (!state.sems.some((x) => x.id === state.cur)) setState((p) => ({ ...p, cur: p.sems[0].id }));
  const s = sem();

  const nav = [
    ['overview', 'Overview'], ['mark', 'Attendance'], ['plan', 'Planner'], ['setup', 'Setup'], ['sems', 'Semesters'],
  ];

  return (
    <div className="min-h-screen bg-paper dark:bg-paper-dark text-ink dark:text-ink-dark">
      <div className="md:grid md:grid-cols-[260px_1fr]">
        <aside className="hidden md:flex flex-col gap-6 p-6 sticky top-0 h-screen border-r border-line dark:border-line-dark">
          <Brand />
          <SemSelect state={state} setState={setState} />
          <nav className="flex flex-col gap-1">
            {nav.map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}
                className={cls('flex items-center gap-3 px-3 py-2.5 rounded-lg text-left', tab === id ? 'bg-surface dark:bg-surface-dark shadow-[inset_3px_0_0_theme(colors.rose.DEFAULT)] text-rose' : 'text-ink2 dark:text-ink2-dark hover:text-ink dark:hover:text-ink-dark')}>
                <Icon d={ic[id]} /> <span>{label}</span>
              </button>
            ))}
          </nav>
          <p className="mt-auto text-xs text-ink2 dark:text-ink2-dark">Saved on this device.</p>
        </aside>

        <div>
          <header className="md:hidden sticky top-0 z-10 flex justify-between items-center gap-3 px-4 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] bg-paper dark:bg-paper-dark border-b border-line dark:border-line-dark">
            <Brand small />
            <SemSelect state={state} setState={setState} />
          </header>

          <main className="relative px-4 md:px-14 pt-6 md:pt-9 pb-32 md:pb-16 max-w-3xl mx-auto">
            {tab === 'overview' && <Overview s={s} toast={toast} setTab={setTab} state={state} setState={setState} />}
            {tab === 'mark' && <Mark s={s} date={date} setDate={setDate} updateSem={updateSem} toast={toast} setTab={setTab} state={state} setState={setState} />}
            {tab === 'plan' && <Plan s={s} plan={plan} setPlan={setPlan} setTab={setTab} />}
            {tab === 'setup' && <Setup s={s} updateSem={updateSem} armed={armed} arm={arm} toast={toast} />}
            {tab === 'sems' && <Sems state={state} setState={setState} armed={armed} arm={arm} toast={toast}
              backupOpen={backupOpen} setBackupOpen={setBackupOpen} impText={impText} setImpText={setImpText} />}
          </main>

          <nav className="md:hidden fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 bg-surface dark:bg-surface-dark border-t border-line dark:border-line-dark pb-[env(safe-area-inset-bottom)]">
            {nav.map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}
                className={cls('flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold', tab === id ? 'text-rose' : 'text-ink2 dark:text-ink2-dark')}>
                <Icon d={ic[id]} className="h-5 w-5" /> {label}
              </button>
            ))}
          </nav>
        </div>
      </div>
      {toastMsg && (
        <div role="status" className="fixed left-1/2 -translate-x-1/2 bottom-24 md:bottom-7 z-30 bg-ink dark:bg-ink-dark text-paper dark:text-paper-dark px-4 py-2.5 rounded-xl2 text-sm font-semibold max-w-[90vw] text-center">
          {toastMsg}
        </div>
      )}
    </div>
  );
}

function Brand({ small }) {
  return <div className={cls('font-display font-extrabold flex items-center gap-2.5', small ? 'text-2xl' : 'text-[28px]')}><span className="inline-block w-[3px] h-[0.85em] bg-rose rounded-sm" />Margin</div>;
}
function SemSelect({ state, setState }) {
  return (
    <select value={state.cur} onChange={(e) => setState((p) => ({ ...p, cur: e.target.value }))}
      className="max-w-[58%] md:max-w-none font-semibold bg-surface dark:bg-surface-dark border border-line dark:border-line-dark rounded-lg px-2.5 py-2">
      {state.sems.map((x) => <option key={x.id} value={x.id}>{x.name}{x.status === 'done' ? ' (completed)' : x.status === 'current' ? ' (current)' : ''}</option>)}
    </select>
  );
}

function Onboard({ onStart }) {
  const [n, setN] = useState(8), [c, setC] = useState(1);
  return (
    <div className="min-h-screen bg-paper dark:bg-paper-dark text-ink dark:text-ink-dark px-4 pt-8 max-w-lg mx-auto">
      <Brand />
      <h1 className="font-display text-4xl font-extrabold mt-6 mb-3">Set up your course</h1>
      <p className="text-ink2 dark:text-ink2-dark mb-6">Margin keeps every semester's subjects and attendance, and tells you how many classes you can skip.</p>
      <div className="bg-surface dark:bg-surface-dark border border-line dark:border-line-dark rounded-xl2 p-4 grid gap-4">
        <label className="text-sm font-semibold text-ink2 dark:text-ink2-dark">How many semesters does your course have?
          <input type="number" min="1" max="20" value={n} onChange={(e) => setN(+e.target.value)} className="input mt-1" />
        </label>
        <label className="text-sm font-semibold text-ink2 dark:text-ink2-dark">Which semester are you in now?
          <input type="number" min="1" max={n} value={c} onChange={(e) => setC(+e.target.value)} className="input mt-1" />
        </label>
        <button onClick={() => onStart(Math.max(1, Math.min(20, n||8)), Math.max(1, Math.min(n||8, c||1)))} className="btn-pri">Start tracking</button>
      </div>
      <p className="text-xs text-ink2 dark:text-ink2-dark mt-3">Semesters before your current one are saved as completed. You can add more later.</p>
    </div>
  );
}

function Overview({ s, toast, setTab, state, setState }) {
  if (!s.subjects.length)
    return (<>
      <h1 className="pageTitle">Overview</h1>
      <SemBanner s={s} state={state} setState={setState} setTab={setTab} />
      <Empty title="No subjects yet" body="Add the subjects you take this semester, then set your weekly timetable. Margin will tell you what you can skip." btnLabel="Add subjects" onBtn={() => setTab('setup')} />
    </>);
  const sm = M.summary(s);
  const anyTT = s.extras.length || Object.keys(s.tt).some((w) => Object.keys(s.tt[w]).some((id) => s.tt[w][id] > 0));
  const total = sm.total, tot = s.mode === 'total', tp = s.target;

  return (
    <>
      <SemBanner s={s} state={state} setState={setState} setTab={setTab} />
      {s.status === 'done' ? (
        <section className="mb-6">
          <div className="text-ink2 dark:text-ink2-dark font-semibold mb-1">{s.name} is complete</div>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold leading-none">{total.pct == null ? 'No attendance was recorded' : <>Finished at <mark className="bg-transparent bg-gradient-to-t from-good-bg/60 to-transparent">{total.pct.toFixed(1)}%</mark></>}</h1>
        </section>
      ) : !anyTT ? (
        <section className="mb-6">
          <h1 className="font-display text-4xl md:text-5xl font-extrabold leading-tight mb-3">Add your <span className="bg-gradient-to-t from-gold/30 to-transparent">timetable</span> to see which days you can skip</h1>
          <button onClick={() => setTab('setup')} className="btn-pri">Set timetable</button>
        </section>
      ) : (
        <HeroDay s={s} setTab={setTab} />
      )}

      <section className={cls('rounded-xl2 border bg-surface dark:bg-surface-dark p-4 mb-3', tot ? 'border-line dark:border-line-dark' : 'border-line dark:border-line-dark')}>
        <div className="flex justify-between items-center"><h3 className="font-display font-bold text-lg">Overall</h3>{tot && <span className="text-xs font-semibold text-ink2 dark:text-ink2-dark">Minimum {tp}%</span>}</div>
        <PctBlock r={total} />
        <Bar pct={total.pct} target={tot ? tp : null} />
        {tot ? <><Advice r={total} tp={tp} /><ProjLine s={s} r={total} /></> : <p className="text-ink2 dark:text-ink2-dark text-sm">All subjects together. Each subject is checked against its own minimum below.</p>}
      </section>

      <h2 className="sectionTitle">Subjects</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {sm.subs.map((r) => <SubjCard key={r.s.id} s={s} r={r} />)}
      </div>
      {!(s.end || s.status === 'done') && <p className="text-sm text-ink2 dark:text-ink2-dark mt-4">Add the semester end date in Setup to see how many classes you can skip before the semester ends.</p>}
    </>
  );
}

function SemBanner({ s, state, setState, setTab }) {
  if (s.status !== 'done') return null;
  const cur = state.sems.find((x) => x.status === 'current');
  return <Banner>This semester is completed. Its attendance is saved here and you can still edit it.{cur && <button onClick={() => { setState((p) => ({ ...p, cur: cur.id })); setTab('overview'); }} className="link ml-2">Go to {cur.name}</button>}</Banner>;
}

function HeroDay({ s, setTab }) {
  const d = useMemo(() => M.planDays(s, 14, new Set()).find((x) => x.status !== 'none'), [s]);
  if (!d) return <section className="mb-6"><h1 className="font-display text-4xl font-extrabold">No classes coming up in the next two weeks</h1><p className="text-ink2 dark:text-ink2-dark mt-2">Check the semester end date and your timetable in Setup.</p></section>;
  let big;
  if (d.status === 'safe') big = <>You can skip <mark className="bg-good-bg dark:bg-good-bgdark rounded px-1">{d.N === 1 ? 'the one class' : `all ${d.N} classes`}</mark></>;
  else if (d.status === 'partial') { const K = s.mode === 'total' ? d.budget : d.per.reduce((a, p) => a + p.k, 0); big = <>You can skip <mark className="bg-edge-bg dark:bg-edge-bgdark rounded px-1">{K} of {d.N} classes</mark></>; }
  else big = <mark className="bg-bad-bg dark:bg-bad-bgdark rounded px-1">Attend everything</mark>;
  return (
    <section className="mb-6">
      <div className="text-ink2 dark:text-ink2-dark font-semibold mb-1">{M.dayLabel(d.date)}</div>
      <h1 className="font-display text-4xl md:text-6xl font-extrabold leading-none mb-3">{big}</h1>
      <p className="text-ink2 dark:text-ink2-dark max-w-prose mb-3">{planText(s, d)}</p>
      <button onClick={() => setTab('plan')} className="btn">Open the planner</button>
    </section>
  );
}

function PctBlock({ r }) {
  return (
    <div className="flex items-baseline gap-1 mt-1.5">
      <span className="font-display text-4xl font-extrabold">{r.pct == null ? '–' : r.pct.toFixed(1)}</span>
      <span className="text-xl font-extrabold">{r.pct == null ? '' : '%'}</span>
      <span className="ml-2 text-sm text-ink2 dark:text-ink2-dark">{r.A} of {r.H} classes attended</span>
    </div>
  );
}

function SubjCard({ s, r }) {
  const tot = s.mode === 'total', tp = +(r.t * 100).toFixed(1);
  return (
    <article className="rounded-xl2 border border-line dark:border-line-dark bg-surface dark:bg-surface-dark p-4">
      <div className="flex justify-between items-center"><h3 className="font-display font-bold text-lg">{r.s.name}</h3>{!tot && <span className="text-xs font-semibold text-ink2 dark:text-ink2-dark">Minimum {tp}%</span>}</div>
      <PctBlock r={r} />
      <Bar pct={r.pct} target={tot ? s.target : tp} />
      {tot ? <p className="text-sm text-ink2 dark:text-ink2-dark">Counts towards the overall percentage.</p> : <><Advice r={r} tp={tp} /><ProjLine s={s} r={r} /></>}
    </article>
  );
}

function Mark({ s, date, setDate, updateSem, toast, setTab, state, setState }) {
  const d = date, slots = M.slotsOn(s, d), hol = s.holidays.indexOf(d) >= 0;
  const by = {}; slots.forEach((sl) => { (by[sl.sub] = by[sl.sub] || []).push(sl); });
  const L = { P: 'Present', A: 'Absent', C: 'Cancelled' };

  function mark(key, st) { updateSem((c) => { if (c.rec[key] === st) delete c.rec[key]; else c.rec[key] = st; }); }
  function allMark(st) { updateSem((c) => { M.slotsOn(c, d).forEach((sl) => { c.rec[sl.key] = st; }); }); }
  function toggleHoliday() {
    updateSem((c) => {
      const i = c.holidays.indexOf(d);
      if (i >= 0) c.holidays.splice(i, 1);
      else { c.holidays.push(d); Object.keys(c.rec).forEach((k) => { const p = k.split('|'); if (p[0] === d && p[2].charAt(0) !== 'x') delete c.rec[k]; }); }
    });
  }
  function delExtra(id) {
    updateSem((c) => { const ex = c.extras.find((e) => e.id === id); if (ex) { delete c.rec[`${ex.date}|${ex.sub}|x${ex.id}`]; c.extras = c.extras.filter((e) => e.id !== id); } });
  }
  const [xsub, setXsub] = useState(s.subjects[0]?.id || '');
  const [xn, setXn] = useState(1);
  function addExtra() {
    if (!xsub) { toast('Add a subject first.'); return; }
    const n = Math.max(1, Math.min(6, xn || 1));
    updateSem((c) => { for (let i = 0; i < n; i++) c.extras.push({ id: M.uid(), date: d, sub: xsub }); });
    toast(n === 1 ? 'Extra class added.' : `${n} extra classes added.`);
  }

  return (
    <>
      <h1 className="pageTitle">Attendance</h1>
      <SemBanner s={s} state={state} setState={setState} setTab={setTab} />
      <div className="flex gap-2 mb-2">
        <button className="btn" onClick={() => setDate(M.addDays(d, -1))} aria-label="Previous day">‹</button>
        <input type="date" value={d} onChange={(e) => setDate(e.target.value || M.today())} className="input flex-1" />
        <button className="btn" onClick={() => setDate(M.addDays(d, 1))} aria-label="Next day">›</button>
        <button className="btn" onClick={() => setDate(M.today())}>Today</button>
      </div>
      <p className="text-sm text-ink2 dark:text-ink2-dark mb-3"><b className="text-ink dark:text-ink-dark">{M.fmtDay(d)}</b>{hol && <span className="pill pill-none ml-2">Holiday</span>}</p>

      {!s.subjects.length ? <Empty title="No subjects yet" body="Add subjects in Setup first." btnLabel="Add subjects" onBtn={() => setTab('setup')} /> : (
        <>
          {(slots.length || hol) && (
            <div className="flex flex-wrap gap-2 mb-3">
              {slots.length > 0 && <>
                <button className="btn" onClick={() => allMark('P')}>All present</button>
                <button className="btn" onClick={() => allMark('A')}>All absent</button>
              </>}
              <button className="btn" onClick={toggleHoliday}>{hol ? 'Remove holiday' : 'Mark day as holiday'}</button>
            </div>
          )}
          {!slots.length && !hol && <Empty title="No classes on this day" body={`Nothing is scheduled for ${M.fmtDay(d)}. If a class was held anyway, add it as an extra class below.`} />}

          {s.subjects.filter((x) => by[x.id]).map((x) => {
            const already = M.counted(x, d);
            let ri = 0;
            return (
              <section key={x.id} className="rounded-xl2 border border-line dark:border-line-dark bg-surface dark:bg-surface-dark p-4 mt-3">
                <h3 className="font-display font-bold text-lg">{x.name}</h3>
                {already && <p className="text-xs text-ink2 dark:text-ink2-dark mt-1">Already included in the starting numbers, so marks on this date are not added again.</p>}
                {by[x.id].map((sl) => {
                  const st = s.rec[sl.key]; const label = sl.extra ? 'Extra class' : `Class ${++ri}`;
                  return (
                    <div key={sl.key} className="py-2.5 border-t border-line dark:border-line-dark first:border-t-0 first:pt-1">
                      <div className="text-sm text-ink2 dark:text-ink2-dark mb-1.5 flex items-center gap-2">{label}{sl.extra && <button className="link text-xs" onClick={() => delExtra(sl.xid)}>Remove</button>}</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {['P', 'A', 'C'].map((c) => (
                          <button key={c} onClick={() => mark(sl.key, c)} aria-pressed={st === c}
                            className={cls('min-h-11 rounded-lg border font-semibold text-sm',
                              st === c && c === 'P' && 'bg-good-bg dark:bg-good-bgdark border-good text-good',
                              st === c && c === 'A' && 'bg-bad-bg dark:bg-bad-bgdark border-bad text-bad',
                              st === c && c === 'C' && 'bg-line dark:bg-line-dark border-ink2 text-ink2',
                              st !== c && 'border-line dark:border-line-dark bg-surface dark:bg-surface-dark')}>
                            {L[c]}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </section>
            );
          })}

          <h2 className="sectionTitle">Extra class</h2>
          <section className="rounded-xl2 border border-line dark:border-line-dark bg-surface dark:bg-surface-dark p-4">
            <p className="text-sm text-ink2 dark:text-ink2-dark mb-3">Added on {M.fmtDay(d)}. It counts towards attendance once you mark it, and shows up in the planner if the date is ahead.</p>
            <div className="grid grid-cols-[1fr_70px] gap-2">
              <select value={xsub} onChange={(e) => setXsub(e.target.value)} className="input col-span-2 sm:col-span-1">
                {s.subjects.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
              <input type="number" min="1" max="6" value={xn} onChange={(e) => setXn(+e.target.value)} className="input" aria-label="How many classes" />
              <button className="btn-pri col-span-2" onClick={addExtra}>Add extra class</button>
            </div>
          </section>
        </>
      )}
    </>
  );
}

function Plan({ s, plan, setPlan, setTab }) {
  if (!s.subjects.length) return (<><h1 className="pageTitle">Bunk planner</h1><Empty title="No subjects yet" body="Add subjects and a timetable in Setup to plan your days off." btnLabel="Add subjects" onBtn={() => setTab('setup')} /></>);
  const planned = new Set(plan[s.id] || []);
  const days = M.planDays(s, 14, planned);
  const n = days.filter((d) => d.planned && d.status !== 'none').length;
  function togglePlan(date) {
    setPlan((p) => { const arr = new Set(p[s.id] || []); arr.has(date) ? arr.delete(date) : arr.add(date); return { ...p, [s.id]: [...arr] }; });
  }
  return (
    <>
      <h1 className="pageTitle">Bunk planner</h1>
      <p className="text-ink2 dark:text-ink2-dark mb-3">The next 14 days. It assumes you attend every class you have not planned to skip. Tap Bunk on a day and the days after it update.</p>
      {n > 0 ? (
        <div className="flex items-center gap-2 mb-4">
          <span className="pill pill-safe">{n} day{n === 1 ? '' : 's'} planned</span>
          <button className="btn" onClick={() => setPlan((p) => ({ ...p, [s.id]: [] }))}>Clear plan</button>
        </div>
      ) : <div className="h-4" />}
      {!days.length ? <Empty title="Nothing to plan" body="The semester end date has passed or is today. Change it in Setup if that is wrong." /> : days.map((d) => {
        const dObj = M.parseYMD(d.date), wd = M.DN[dObj.getDay()], dm = `${dObj.getDate()} ${M.MN[dObj.getMonth()]}`;
        if (d.status === 'none') return (
          <div key={d.date} className="grid grid-cols-[62px_1fr_auto] gap-3 items-center px-3.5 py-2 mb-2.5 rounded-xl2 border border-dashed border-line dark:border-line-dark">
            <div><div className="font-display font-extrabold text-2xl">{wd}</div><div className="text-xs text-ink2 dark:text-ink2-dark">{dm}</div></div>
            <div className="text-sm text-ink2 dark:text-ink2-dark">{d.holiday ? 'Holiday' : d.had ? 'Already recorded' : 'No classes'}</div>
            <span />
          </div>
        );
        const chips = Object.keys(d.cnt).map((id) => { const x = M.subOf(s, id); return <span key={id} className="chip">{x.name} ×{d.cnt[id]}{d.xc[id] ? ` (${d.xc[id]} extra)` : ''}</span>; });
        const pillLabel = { safe: 'Safe to skip', partial: 'Partly', no: 'Attend' }[d.status];
        const bad = d.planned && !d.ok;
        const borderColor = { safe: 'border-l-good', partial: 'border-l-edge', no: 'border-l-bad' }[d.status];
        return (
          <div key={d.date} className={cls('grid grid-cols-[62px_1fr_auto] gap-3 items-center px-3.5 py-3 mb-2.5 rounded-xl2 border border-l-4 bg-surface dark:bg-surface-dark border-line dark:border-line-dark', borderColor, d.planned && 'ring-2 ring-rose')}>
            <div><div className="font-display font-extrabold text-2xl">{wd}</div><div className="text-xs text-ink2 dark:text-ink2-dark">{dm}</div></div>
            <div>
              <div><span className={cls('pill', `pill-${d.status}`)}>{pillLabel}</span> <span className="text-xs text-ink2 dark:text-ink2-dark">{classes(d.N)}</span></div>
              <div className="mt-1.5">{chips}</div>
              <div className={cls('text-sm mt-1', bad ? 'text-bad font-semibold' : 'text-ink2 dark:text-ink2-dark')}>{planText(s, d)}</div>
            </div>
            <button onClick={() => togglePlan(d.date)} aria-pressed={d.planned}
              className={cls('min-h-10 min-w-[78px] rounded-lg border-[1.5px] border-rose font-bold', d.planned ? 'bg-rose text-paper dark:text-paper-dark' : 'text-rose bg-transparent')}>
              {d.planned ? 'Planned' : 'Bunk'}
            </button>
          </div>
        );
      })}
    </>
  );
}

function Setup({ s, updateSem, armed, arm, toast }) {
  const tot = s.mode === 'total';
  const [newSub, setNewSub] = useState('');
  const [holDate, setHolDate] = useState('');

  function addSub() {
    const nm = newSub.trim();
    if (!nm) { toast('Type a subject name first.'); return; }
    updateSem((c) => { c.subjects.push({ id: M.uid(), name: nm, target: null, baseA: 0, baseH: 0, baseDate: '' }); });
    setNewSub('');
  }
  function delSub(id) {
    arm(`delSub${id}`, () => {
      updateSem((c) => {
        c.subjects = c.subjects.filter((x) => x.id !== id);
        Object.keys(c.rec).forEach((k) => { if (k.split('|')[1] === id) delete c.rec[k]; });
        c.extras = c.extras.filter((e) => e.sub !== id);
        Object.keys(c.tt).forEach((w) => { delete c.tt[w][id]; });
      });
      toast('Subject deleted.');
    });
  }
  function addHol() {
    if (!holDate) { toast('Pick a date first.'); return; }
    updateSem((c) => {
      if (c.holidays.indexOf(holDate) < 0) {
        c.holidays.push(holDate);
        Object.keys(c.rec).forEach((k) => { const p = k.split('|'); if (p[0] === holDate && p[2].charAt(0) !== 'x') delete c.rec[k]; });
      }
    });
  }

  return (
    <>
      <h1 className="pageTitle">Setup</h1>

      <h2 className="sectionTitle mt-0">Semester</h2>
      <section className="rounded-xl2 border border-line dark:border-line-dark bg-surface dark:bg-surface-dark p-4">
        <label className="label">Name<input className="input mt-1" value={s.name} onChange={(e) => { const v = e.target.value; updateSem((c) => { c.name = v.trim() || c.name; }); }} /></label>
        <div className="grid grid-cols-2 gap-3 mt-3.5">
          <label className="label">Starts<input type="date" className="input mt-1" value={s.start} onChange={(e) => updateSem((c) => { c.start = e.target.value; })} /></label>
          <label className="label">Ends<input type="date" className="input mt-1" value={s.end} onChange={(e) => updateSem((c) => { c.end = e.target.value; })} /></label>
        </div>
        <fieldset className="mt-4">
          <legend className="text-sm font-bold">How does your college count attendance?</legend>
          <label className="opt"><input type="radio" checked={!tot} onChange={() => updateSem((c) => { c.mode = 'each'; })} /><span><b>Each subject separately</b><small className="block text-ink2 dark:text-ink2-dark">Every subject needs its own minimum. Give a subject its own % below, or leave it blank to use the default.</small></span></label>
          <label className="opt"><input type="radio" checked={tot} onChange={() => updateSem((c) => { c.mode = 'total'; })} /><span><b>One combined percentage</b><small className="block text-ink2 dark:text-ink2-dark">All classes of all subjects are pooled and checked against a single minimum.</small></span></label>
        </fieldset>
        <label className="label mt-3.5 block">{tot ? 'Minimum overall attendance (%)' : 'Default minimum attendance (%)'}
          <input type="number" min="1" max="100" className="input mt-1" value={s.target} onChange={(e) => { const v = Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)); updateSem((c) => { c.target = v; }); }} />
        </label>
      </section>

      <h2 className="sectionTitle">Subjects</h2>
      <p className="text-ink2 dark:text-ink2-dark text-sm mb-3">Add as many as you need. If you are starting mid-semester, fill in how many classes were held and attended so far. Classes you mark on the day you enter these numbers are treated as already included.</p>
      <div className="flex gap-2 mb-3">
        <input value={newSub} onChange={(e) => setNewSub(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSub()} placeholder="Subject name, e.g. Data Structures" className="input flex-1" />
        <button className="btn-pri whitespace-nowrap" onClick={addSub}>Add subject</button>
      </div>
      {!s.subjects.length && <Empty title="No subjects yet" body="Type a subject name above and press Add subject." />}
      {s.subjects.map((x) => (
        <article key={x.id} className="rounded-xl2 border border-line dark:border-line-dark bg-surface dark:bg-surface-dark p-4 mb-2.5">
          <div className="flex gap-2">
            <input value={x.name} onChange={(e) => { const v = e.target.value; updateSem((c) => { const t = M.subOf(c, x.id); if (t) t.name = v.trim() || t.name; }); }} className="input font-bold" />
            <button className="btn text-bad" onClick={() => delSub(x.id)}>{armed === `delSub${x.id}` ? 'Tap again to delete' : 'Delete'}</button>
          </div>
          <div className="grid gap-3 mt-3 sm:grid-cols-3">
            {!tot && <label className="label">Own minimum %<input type="number" min="1" max="100" placeholder={`${s.target} (default)`} value={x.target == null ? '' : x.target}
              onChange={(e) => { const v = e.target.value === '' ? null : Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)); updateSem((c) => { const t = M.subOf(c, x.id); if (t) t.target = v; }); }} className="input mt-1" /></label>}
            <label className="label">Attended so far<input type="number" min="0" value={x.baseA || 0}
              onChange={(e) => { const v = Math.max(0, parseInt(e.target.value, 10) || 0); updateSem((c) => { const t = M.subOf(c, x.id); if (t) { t.baseA = v; M.stampBase(t); } }); }} className="input mt-1" /></label>
            <label className="label">Held so far<input type="number" min="0" value={x.baseH || 0}
              onChange={(e) => { const v = Math.max(0, parseInt(e.target.value, 10) || 0); updateSem((c) => { const t = M.subOf(c, x.id); if (t) { t.baseH = v; M.stampBase(t); } }); }} className="input mt-1" /></label>
          </div>
        </article>
      ))}

      {s.subjects.length > 0 && (
        <>
          <h2 className="sectionTitle">Weekly timetable</h2>
          <p className="text-ink2 dark:text-ink2-dark text-sm mb-3">How many classes of each subject happen on each weekday. The planner uses this.</p>
          <div className="overflow-x-auto rounded-xl2 border border-line dark:border-line-dark bg-surface dark:bg-surface-dark">
            <table className="border-collapse w-full min-w-[540px]">
              <thead><tr>
                <th className="text-left sticky left-0 bg-surface dark:bg-surface-dark min-w-[120px] pl-3 py-1.5 border-b border-line dark:border-line-dark text-sm">Subject</th>
                {M.WD.map((w) => <th key={w} className="py-1.5 border-b border-line dark:border-line-dark text-sm">{M.DN[w]}</th>)}
              </tr></thead>
              <tbody>
                {s.subjects.map((x) => (
                  <tr key={x.id}>
                    <td className="text-left sticky left-0 bg-surface dark:bg-surface-dark min-w-[120px] pl-3 py-1.5 border-b border-line dark:border-line-dark last:border-b-0 text-sm">{x.name}</td>
                    {M.WD.map((w) => (
                      <td key={w} className="text-center py-1.5 border-b border-line dark:border-line-dark last:border-b-0">
                        <input type="number" min="0" max="9" value={(s.tt[w] && s.tt[w][x.id]) || 0} aria-label={`${x.name} on ${M.DN[w]}`}
                          onChange={(e) => { const v = Math.max(0, Math.min(9, parseInt(e.target.value, 10) || 0)); updateSem((c) => { c.tt[w] = c.tt[w] || {}; c.tt[w][x.id] = v; }); }}
                          className="input w-12 text-center px-1" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 className="sectionTitle">Holidays and off days</h2>
      <p className="text-ink2 dark:text-ink2-dark text-sm mb-3">Regular classes on these dates are skipped from the count. You can also mark a day as a holiday in Attendance.</p>
      <div className="flex gap-2 mb-3">
        <input type="date" value={holDate} onChange={(e) => setHolDate(e.target.value)} className="input" />
        <button className="btn" onClick={addHol}>Add holiday</button>
      </div>
      {s.holidays.length ? [...s.holidays].sort().map((h) => (
        <span key={h} className="chip">{M.fmtDay(h)}<button aria-label={`Remove ${M.fmtDay(h)}`} onClick={() => updateSem((c) => { c.holidays = c.holidays.filter((x) => x !== h); })} className="ml-1.5 font-bold text-ink2">×</button></span>
      )) : <p className="text-xs text-ink2 dark:text-ink2-dark">No holidays added.</p>}
    </>
  );
}

function Sems({ state, setState, armed, arm, toast, backupOpen, setBackupOpen, impText, setImpText }) {
  return (
    <>
      <h1 className="pageTitle">Semesters</h1>
      <p className="text-ink2 dark:text-ink2-dark text-sm mb-4">Every semester keeps its own subjects, timetable and attendance. Finished semesters stay saved.</p>
      {state.sems.map((x) => {
        const sm = M.summary(x), p = sm.total.pct, view = x.id === state.cur;
        const tag = x.status === 'current' ? <span className="pill pill-safe">Current</span> : x.status === 'done' ? <span className="pill pill-none">Completed</span> : <span className="pill pill-partial">Upcoming</span>;
        return (
          <article key={x.id} className={cls('rounded-xl2 border bg-surface dark:bg-surface-dark p-4 mb-3', view ? 'border-rose' : 'border-line dark:border-line-dark')}>
            <div className="flex justify-between items-center"><h3 className="font-display font-bold text-lg">{x.name}</h3>{tag}</div>
            <p className="text-ink2 dark:text-ink2-dark text-sm mt-1">{x.subjects.length} subject{x.subjects.length === 1 ? '' : 's'}{p != null ? `, overall ${p.toFixed(1)}%` : ''}{view ? '. You are viewing this one.' : ''}</p>
            {!!sm.subs.length && <div className="mt-2">{sm.subs.map((r) => <span key={r.s.id} className="chip">{r.s.name} {r.pct == null ? '–' : r.pct.toFixed(0) + '%'}</span>)}</div>}
            <div className="flex flex-wrap gap-2 mt-3">
              {!view && <button className="btn" onClick={() => setState((p) => ({ ...p, cur: x.id }))}>Open</button>}
              {x.status === 'current'
                ? <button className="btn" onClick={() => {
                    setState((p) => {
                      const sems = p.sems.map((y) => y.id === x.id ? { ...y, status: 'done' } : y);
                      const idx = sems.findIndex((y) => y.id === x.id);
                      const nx = sems.slice(idx + 1).find((y) => y.status === 'upcoming');
                      if (nx) { const sems2 = sems.map((y) => y.id === nx.id ? { ...y, status: 'current' } : y); toast(`${x.name} saved as completed. ${nx.name} is open.`); return { cur: nx.id, sems: sems2 }; }
                      toast(`${x.name} saved as completed.`); return { ...p, sems };
                    });
                  }}>Finish semester</button>
                : <button className="btn" onClick={() => setState((p) => ({ ...p, cur: x.id, sems: p.sems.map((y) => ({ ...y, status: y.id === x.id ? 'current' : (y.status === 'current' ? 'upcoming' : y.status) })) }))}>{x.status === 'done' ? 'Reopen as current' : 'Make current'}</button>}
              <button className="btn text-bad" onClick={() => arm(`delSem${x.id}`, () => {
                setState((p) => { const sems = p.sems.filter((y) => y.id !== x.id); const cur = p.cur === x.id ? (sems.find((y) => y.status === 'current') || sems[0])?.id ?? null : p.cur; return { cur, sems }; });
                toast('Semester deleted.');
              })}>{armed === `delSem${x.id}` ? 'Tap again to delete' : 'Delete'}</button>
            </div>
          </article>
        );
      })}
      <div className="mb-6">
        <button className="btn-pri" onClick={() => setState((p) => { const ns = M.blankSem(`Semester ${p.sems.length + 1}`, 'upcoming'); toast(`${ns.name} added.`); return { ...p, sems: [...p.sems, ns] }; })}>Add another semester</button>
      </div>

      <h2 className="sectionTitle">Back up and move devices</h2>
      <p className="text-ink2 dark:text-ink2-dark text-sm mb-3">Your data is saved in this browser on this device. To use it on another device, copy the backup code here and paste it into Margin there.</p>
      <button className="btn" onClick={() => setBackupOpen((v) => !v)}>{backupOpen ? 'Hide backup code' : 'Show backup code'}</button>
      {backupOpen && (
        <div className="mt-2.5">
          <textarea readOnly value={JSON.stringify(state)} aria-label="Backup code" className="input font-mono text-xs min-h-[120px]" />
          <button className="btn mt-2" onClick={async () => {
            const txt = JSON.stringify(state);
            try { await navigator.clipboard.writeText(txt); toast('Backup code copied.'); } catch (e) { toast('Select the text and copy it manually.'); }
          }}>Copy backup code</button>
        </div>
      )}

      <div className="mt-5">
        <label className="label block">Restore from a backup code
          <textarea value={impText} onChange={(e) => setImpText(e.target.value)} placeholder="Paste a backup code here" className="input mt-1 min-h-[120px]" />
        </label>
        <button className="btn mt-2" onClick={() => arm('import', () => {
          let o = null; try { o = JSON.parse(impText); } catch (e) {}
          if (!o || !Array.isArray(o.sems)) { toast('That does not look like a Margin backup code.'); return; }
          o.sems.forEach(M.fixSem);
          setState({ cur: o.sems.some((x) => x.id === o.cur) ? o.cur : (o.sems[0]?.id ?? null), sems: o.sems });
          setImpText(''); toast('Backup restored.');
        })}>{armed === 'import' ? 'Tap again to replace all data' : 'Restore backup'}</button>
      </div>
    </>
  );
}
