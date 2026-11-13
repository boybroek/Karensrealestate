import nl from '../../i18n/nl.ts';
import type { FormId } from '../forms/schema.ts';
import type { Value } from '../forms/validate.ts';
import { formatPhone } from '../forms/validate.ts';

/**
 * Turns a validated submission into a clear e-mail for the office (always in Dutch,
 * whatever language the visitor used). All user input is HTML-escaped.
 */
const f = nl.form;
type Section = { title: string; fields: [key: string, label: string, opt?: keyof typeof f.options][] };

const LAYOUT: Record<FormId, { subject: string; sections: Section[] }> = {
  zoekopdracht: {
    subject: 'Nieuwe woningzoekopdracht',
    sections: [
      { title: 'Profiel', fields: [['profile', 'Zoekt als', 'profile'], ['institution', f.sInst], ['study', f.sStudy], ['guarantor', 'Garantsteller', 'guarantor'], ['guarantorIncome', f.sGarInc], ['ownIncome', f.sOwnInc], ['employer', f.wEmp], ['jobTitle', f.wJob], ['contract', f.wCon, 'contract'], ['income', f.wInc], ['abroad', 'Verhuist vanuit buitenland', 'abroad']] },
      { title: 'Woonwensen', fields: [['bedrooms', f.wBedT, 'bedrooms'], ['occupants', f.cOcc, 'occupants'], ['interior', f.wIntT, 'interior'], ['propertyType', f.wTypeT, 'wishType'], ['extras', f.wExtraT, 'extras'], ['maxRent', f.cMax], ['startDate', f.cStart], ['neighbourhoods', f.cWijk]] },
      { title: 'Contactgegevens', fields: [['name', f.name], ['email', f.email], ['phone', f.phone], ['note', f.cNote]] },
    ],
  },
  verhuur: {
    subject: 'Nieuwe woningaanmelding (verhuur)',
    sections: [
      { title: 'De woning', fields: [['address', f.vfAddr], ['postcode', f.vfZip], ['area', f.vfArea], ['bedrooms', f.vfBed, 'bedrooms'], ['propertyType', f.vfType, 'letType'], ['furnishing', f.vfDel, 'furnishing'], ['availableFrom', f.vfAvail], ['rent', f.vfRent]] },
      { title: 'Verhuurder', fields: [['name', f.name], ['email', f.email], ['phone', f.phone], ['message', f.msg]] },
    ],
  },
  contact: {
    subject: 'Nieuw contactbericht',
    sections: [{ title: 'Bericht', fields: [['topic', 'Onderwerp', 'topic'], ['name', f.name], ['email', f.email], ['phone', f.phone], ['message', f.msg]] }],
  },
};

const MONEY = new Set(['guarantorIncome', 'ownIncome', 'income', 'maxRent', 'rent']);
const DATES = new Set(['startDate', 'availableFrom']);

export function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function display(key: string, v: Value, opt?: keyof typeof f.options): string {
  if (v === null || v === undefined || v === '') return '';
  const label = (x: string) => (opt ? (f.options[opt] as Record<string, string>)[x] ?? x : x);
  if (Array.isArray(v)) return v.map(label).join(', ');
  if (MONEY.has(key) && typeof v === 'number') return `€ ${v.toLocaleString('nl-NL')} per maand`;
  if (key === 'area' && typeof v === 'number') return `${v} m²`;
  if (key === 'phone' && typeof v === 'string') return formatPhone(v);
  if (DATES.has(key) && typeof v === 'string') return new Date(`${v}T12:00:00Z`).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
  return label(String(v));
}

export interface Email { subject: string; text: string; html: string; replyTo?: string }

export function buildEmail(form: FormId, values: Record<string, Value>, meta: { id: string; receivedAt: Date; suspicious?: boolean }): Email {
  const layout = LAYOUT[form];
  const name = typeof values.name === 'string' ? values.name : '';
  const lang = values.lang === 'en' ? 'Engels' : 'Nederlands';
  const subject = `${meta.suspicious ? '[Mogelijk spam] ' : ''}[Website] ${layout.subject} – ${name}`.replace(/[\r\n]+/g, ' ').slice(0, 180);
  const when = meta.receivedAt.toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam', dateStyle: 'long', timeStyle: 'short' });

  const textParts: string[] = [`${layout.subject} via de website`, `Ontvangen: ${when} · Taal bezoeker: ${lang} · Referentie: ${meta.id}`, ''];
  let rows = '';
  for (const s of layout.sections) {
    const filled = s.fields.map(([k, label, opt]) => [label, display(k, values[k] ?? null, opt), k] as const).filter(([, v]) => v);
    if (!filled.length) continue;
    textParts.push(s.title.toUpperCase(), ...filled.map(([l, v]) => `${l}: ${v}`), '');
    rows += `<tr><td colspan="2" style="padding:22px 0 8px;font:600 12px/1.4 Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#3d6d96">${esc(s.title)}</td></tr>`;
    for (const [l, v, k] of filled) {
      let cell = esc(v).replace(/\n/g, '<br>');
      if (k === 'email') cell = `<a href="mailto:${esc(v)}" style="color:#043a63">${esc(v)}</a>`;
      if (k === 'phone') cell = `<a href="tel:${esc(String(values.phone))}" style="color:#043a63">${esc(v)}</a>`;
      rows += `<tr><td style="padding:8px 16px 8px 0;border-top:1px solid #e6ebf0;font:600 14px/1.5 Arial,sans-serif;color:#043a63;vertical-align:top;width:38%">${esc(l)}</td><td style="padding:8px 0;border-top:1px solid #e6ebf0;font:14px/1.5 Arial,sans-serif;color:#13212e;vertical-align:top">${cell}</td></tr>`;
    }
  }
  textParts.push('Beantwoorden? Gebruik "Antwoorden": het antwoord gaat direct naar de inzender.');

  const html = `<!doctype html><html lang="nl"><body style="margin:0;background:#f8f7f4;padding:24px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#fff;border-radius:4px">
<tr><td style="background:#043a63;padding:24px 28px;font:400 24px/1.3 Georgia,serif;color:#fff">${esc(layout.subject)}</td></tr>
<tr><td style="padding:8px 28px 28px">
<p style="font:13px/1.5 Arial,sans-serif;color:#50606e;margin:16px 0 0">Ontvangen ${esc(when)} · Taal bezoeker: ${esc(lang)} · Ref. ${esc(meta.id)}</p>
${meta.suspicious ? '<p style="font:600 13px/1.5 Arial,sans-serif;color:#b42318">Let op: dit bericht bevat kenmerken van spam (bijv. veel links).</p>' : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
<p style="font:13px/1.5 Arial,sans-serif;color:#50606e;margin:24px 0 0">Klik op "Antwoorden" om de inzender direct te mailen.</p>
</td></tr></table></body></html>`;

  return { subject, text: textParts.join('\n'), html, replyTo: typeof values.email === 'string' ? values.email : undefined };
}
