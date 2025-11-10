import { Granularity } from "types/type";

export const truncBucket = (d: Date, gran: 'day'|'hour') => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  if (gran === 'hour') {
    const hh = String(d.getHours()).padStart(2,'0');
    return `${yyyy}-${mm}-${dd} ${hh}:00:00`;
  }
  return `${yyyy}-${mm}-${dd}`;
};

export const parseDateLoose = (s?: string) => {
  if (!s) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00`);
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
};

// Aceita success=true|false ou success=ok|fail (legado)
export function normalizeSuccess(
  raw: unknown
): boolean | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw === "boolean") return raw;
  const v = String(raw).toLowerCase();
  if (v === "ok" || v === "true") return true;
  if (v === "fail" || v === "false") return false;
  return undefined;
}

// Normaliza hora/dia/semana/mes
export function normalizeGranularity(g: string | undefined): Granularity {
  if (g === 'hour' || g === 'day' || g === 'week' || g === 'month') return g
  return 'day'
}

export function dateOnlyToUTC(d?: string | null): Date | null {
  if (!d) return null;
  const [y, m, day] = d.split('-').map(Number);
  if (!y || !m || !day) return null;
  return new Date(Date.UTC(y, m - 1, day));
}