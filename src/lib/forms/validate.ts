import { FORMS, type ErrorCode, type FieldRule, type FormId, type FormSchema } from './schema.ts';

export type Value = string | string[] | number | boolean | null;
export type Raw = Record<string, unknown>;

export interface FieldResult { ok: boolean; value: Value; error?: ErrorCode }

// Control characters except tab/newline; also bidi overrides that can disguise text.
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮⁦-⁩]/g;

export function cleanText(v: unknown, multiline = false): string {
  if (typeof v !== 'string') return '';
  let s = v.replace(CTRL, '').replace(/\r\n?/g, '\n');
  if (!multiline) s = s.replace(/\s+/g, ' ');
  else s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

const EMAIL = /^[^\s@<>()[\]",;:\\]+@[^\s@<>()[\]",;:\\]+\.[^\s@<>()[\]",;:\\]{2,}$/;

export function normalizeEmail(v: string): string | null {
  const s = v.trim();
  if (s.length > 254 || !EMAIL.test(s)) return null;
  const [local, domain] = [s.slice(0, s.lastIndexOf('@')), s.slice(s.lastIndexOf('@') + 1)];
  if (local.length > 64 || domain.includes('..') || local.startsWith('.') || local.endsWith('.')) return null;
  return `${local}@${domain.toLowerCase()}`;
}

/**
 * Normalises a phone number to E.164. Dutch national numbers (0…, 10 digits)
 * are converted to +31; other numbers need a country code (+ or 00).
 */
export function normalizePhone(v: string): string | null {
  const s = v.trim();
  if (!/^\+?[0-9 ()\-./]{6,25}$/.test(s)) return null;
  let d = s.replace(/[^\d+]/g, '');
  if (d.startsWith('00')) d = '+' + d.slice(2);
  if (d.startsWith('+')) {
    const digits = d.slice(1);
    if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
    if (digits.startsWith('31')) {
      const nat = digits.slice(2).replace(/^0/, '');
      return /^[1-9]\d{8}$/.test(nat) ? '+31' + nat : null;
    }
    return '+' + digits;
  }
  if (/^0[1-9]\d{8}$/.test(d)) return '+31' + d.slice(1);
  return null;
}

/** Human-readable version of an E.164 number (Dutch mobile/landline grouping). */
export function formatPhone(e164: string): string {
  if (e164.startsWith('+316')) return `+31 6 ${e164.slice(4, 6)} ${e164.slice(6, 8)} ${e164.slice(8, 10)} ${e164.slice(10)}`;
  if (e164.startsWith('+31')) return `+31 ${e164.slice(3, 5)} ${e164.slice(5, 8)} ${e164.slice(8)}`;
  return e164;
}

export function normalizePostcode(v: string): string | null {
  const m = /^([1-9][0-9]{3})\s?([a-zA-Z]{2})$/.exec(v.trim());
  if (!m || /^(SA|SD|SS)$/i.test(m[2])) return null;
  return `${m[1]} ${m[2].toUpperCase()}`;
}

/** Parses Dutch/English money input such as "€ 1.950", "1950,00", "1,950" into whole euros. */
export function parseAmount(v: string): number | null {
  let s = v.replace(/[€\s]|eur(o)?/gi, '').replace(/[,.]-$/, '');
  if (!s) return null;
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(s)) s = s.replace(/,/g, '');
  else if (/^\d+([.,]\d{1,2})?$/.test(s)) s = s.replace(',', '.');
  else return null;
  const n = Math.round(Number(s));
  return Number.isFinite(n) ? n : null;
}

export function checkDate(v: string, now = new Date()): ErrorCode | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return 'date';
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(t);
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return 'date';
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const day = 86_400_000;
  if (t < today - day) return 'date_past';
  if (t > today + 3 * 366 * day) return 'date_far';
  return null;
}

const isEmpty = (v: unknown) =>
  v === undefined || v === null || v === false || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);

export function validateField(rule: FieldRule, raw: unknown): FieldResult {
  if (rule.type === 'consent') {
    const on = raw === true || raw === 'on' || raw === 'true' || raw === 'yes';
    return on || !rule.required ? { ok: true, value: on } : { ok: false, value: false, error: 'consent' };
  }
  if (rule.type === 'multi') {
    const list = (Array.isArray(raw) ? raw : isEmpty(raw) ? [] : [raw]).map(String);
    if (list.length > (rule.options?.length ?? 0)) return { ok: false, value: [], error: 'choice' };
    if (list.some((x) => !rule.options?.includes(x))) return { ok: false, value: [], error: 'choice' };
    if (rule.required && !list.length) return { ok: false, value: [], error: 'required' };
    return { ok: true, value: Array.from(new Set(list)) };
  }
  if (Array.isArray(raw)) return { ok: false, value: null, error: 'choice' };
  if (isEmpty(raw)) return rule.required ? { ok: false, value: null, error: 'required' } : { ok: true, value: null };

  const multiline = rule.type === 'textarea';
  const s = cleanText(raw, multiline);
  if (!s) return rule.required ? { ok: false, value: null, error: 'required' } : { ok: true, value: null };
  const max = rule.max ?? (multiline ? 2000 : 200);
  if (s.length > max) return { ok: false, value: null, error: 'too_long' };
  if (rule.min && s.length < rule.min) return { ok: false, value: null, error: 'too_short' };

  switch (rule.type) {
    case 'text':
    case 'textarea':
      return { ok: true, value: s };
    case 'email': {
      const e = normalizeEmail(s);
      return e ? { ok: true, value: e } : { ok: false, value: null, error: 'email' };
    }
    case 'tel': {
      const p = normalizePhone(s);
      return p ? { ok: true, value: p } : { ok: false, value: null, error: 'phone' };
    }
    case 'postcode': {
      const p = normalizePostcode(s);
      return p ? { ok: true, value: p } : { ok: false, value: null, error: 'postcode' };
    }
    case 'date': {
      const err = checkDate(s);
      return err ? { ok: false, value: null, error: err } : { ok: true, value: s };
    }
    case 'amount':
    case 'int': {
      const n = rule.type === 'int' ? (/^\d{1,7}$/.test(s.replace(/\s|m²|m2/gi, '')) ? Number(s.replace(/\s|m²|m2/gi, '')) : null) : parseAmount(s);
      if (n === null) return { ok: false, value: null, error: rule.type === 'int' ? 'number' : 'amount' };
      const [lo, hi] = rule.range ?? [0, Number.MAX_SAFE_INTEGER];
      return n < lo || n > hi ? { ok: false, value: null, error: rule.type === 'int' ? 'number' : 'amount' } : { ok: true, value: n };
    }
    case 'choice':
      return rule.options?.includes(s) ? { ok: true, value: s } : { ok: false, value: null, error: 'choice' };
  }
}

export function isActive(rule: FieldRule, data: Raw): boolean {
  return !rule.when || data[rule.when.field] === rule.when.is;
}

export interface FormResult {
  ok: boolean;
  values: Record<string, Value>;
  errors: Record<string, ErrorCode>;
}

/** Validates a full submission. Unknown fields are ignored; inactive conditional fields are dropped. */
export function validateForm(id: FormId, data: Raw): FormResult {
  const schema: FormSchema = FORMS[id];
  const values: Record<string, Value> = {};
  const errors: Record<string, ErrorCode> = {};
  for (const [key, rule] of Object.entries(schema)) {
    if (!isActive(rule, data)) continue;
    const r = validateField(rule, data[key]);
    if (r.ok) { if (r.value !== null && !(Array.isArray(r.value) && !r.value.length)) values[key] = r.value; }
    else errors[key] = r.error!;
  }
  return { ok: Object.keys(errors).length === 0, values, errors };
}
