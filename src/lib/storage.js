import { fixSem } from './model.js';

const KEY = 'margin.attendance.v1';

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const o = JSON.parse(raw);
      if (o && Array.isArray(o.sems)) { o.sems.forEach(fixSem); return o; }
    }
  } catch (e) { /* ignore */ }
  return { cur: null, sems: [] };
}

export function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore, e.g. storage full */ }
}
