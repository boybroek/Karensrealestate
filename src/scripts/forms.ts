import { FORMS, type FormId, type ErrorCode, type FieldRule } from '../lib/forms/schema.ts';
import { validateField, isActive, type Raw } from '../lib/forms/validate.ts';

interface Messages {
  errors: Record<ErrorCode, string>;
  sending: string; errorTitle: string; sendError: string; rateError: string; stepOf: string;
}

/* ---------- Spam token: fetched once, on first interaction with any form ---------- */
let tokenPromise: Promise<string> | null = null;
let tokenAt = 0;
const MIN_TOKEN_AGE = 3500; // server rejects tokens younger than 3 s (bot trap)
function getToken(force = false): Promise<string> {
  if (!tokenPromise || force) {
    tokenAt = Date.now();
    tokenPromise = fetch('/api/forms/token/', { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { token: string }) => j.token)
      .catch((e) => { tokenPromise = null; throw e; });
  }
  return tokenPromise;
}

/* ---------- Wish dropdowns ---------- */
function initWish(root: HTMLElement) {
  const btn = root.querySelector<HTMLButtonElement>('.wish__btn')!;
  const summary = root.querySelector<HTMLElement>('.wish__summary')!;
  const inputs = Array.from(root.querySelectorAll<HTMLInputElement>('input'));
  const multi = inputs[0]?.type === 'checkbox';
  const set = (open: boolean) => {
    root.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
  };
  const update = () => {
    const chosen = inputs.filter((i) => i.checked).map((i) => i.dataset.label);
    const empty = chosen.length === 0;
    summary.classList.toggle('is-empty', empty);
    summary.textContent = empty ? root.dataset.placeholder! : chosen.join(', ') + (root.dataset.suffix ? ` ${root.dataset.suffix}` : '');
  };
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') !== 'true';
    document.querySelectorAll<HTMLElement>('[data-wish].is-open').forEach((w) => w !== root && w.querySelector<HTMLButtonElement>('.wish__btn')!.click());
    set(open);
    if (open) (inputs.find((i) => i.checked) ?? inputs[0])?.focus();
  });
  root.addEventListener('change', () => { update(); if (!multi) { set(false); btn.focus(); } });
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('is-open')) { e.stopPropagation(); set(false); btn.focus(); }
  });
  // Close when clicking outside or tabbing away.
  document.addEventListener('pointerdown', (e) => { if (!root.contains(e.target as Node)) set(false); });
  // Close when keyboard focus moves to another control (clicking a label may move focus to <main>, so ignore that).
  document.addEventListener('focusin', (e) => {
    const el = e.target as HTMLElement;
    if (!root.contains(el) && el.matches('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])')) set(false);
  });
  update();
}

/* ---------- Form controller ---------- */
function initForm(form: HTMLFormElement) {
  const id = form.dataset.form as FormId;
  const schema = FORMS[id] as Record<string, FieldRule>;
  const msg: Messages = JSON.parse(form.dataset.messages!);
  const wrap = form.closest<HTMLElement>('[data-form-wrap]')!;
  const alertBox = form.querySelector<HTMLElement>('[data-alert]')!;
  const steps = Array.from(form.querySelectorAll<HTMLElement>('[data-step]'));
  const stepper = form.querySelector<HTMLElement>('[data-stepper]');
  const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const touched = new Set<string>();
  let current = 0;
  let busy = false;

  form.querySelectorAll<HTMLElement>('[data-wish]').forEach(initWish);
  const concept = form.dataset.concept === '1'; // concept presentation: never send anything
  if (!concept) form.addEventListener('focusin', () => { getToken().catch(() => {}); }, { once: true });

  const data = (): Raw => {
    const fd = new FormData(form);
    const out: Raw = {};
    for (const [k, rule] of Object.entries(schema)) out[k] = rule.type === 'multi' ? fd.getAll(k).map(String) : (fd.get(k) ?? '');
    out.website = fd.get('website') ?? '';
    return out;
  };

  const fieldEl = (name: string) => form.querySelector<HTMLElement>(`[data-field="${name}"]`);
  function showError(name: string, code: ErrorCode | null) {
    const el = fieldEl(name);
    if (!el) return;
    const err = el.querySelector<HTMLElement>('.field__error');
    el.classList.toggle('has-error', !!code);
    el.querySelectorAll('input:not([type=radio]):not([type=checkbox]), textarea, select').forEach((i) => code ? i.setAttribute('aria-invalid', 'true') : i.removeAttribute('aria-invalid'));
    if (el.matches('fieldset') || el.querySelector('fieldset')) {
      const fs = el.matches('fieldset') ? el : el.querySelector('fieldset')!;
      code ? fs.setAttribute('aria-invalid', 'true') : fs.removeAttribute('aria-invalid');
    }
    if (err) { err.hidden = !code; err.textContent = code ? msg.errors[code] : ''; }
  }

  function check(names: string[]): string[] {
    const d = data();
    const bad: string[] = [];
    for (const n of names) {
      const rule = schema[n];
      if (!rule || !isActive(rule, d)) { showError(n, null); continue; }
      const r = validateField(rule, d[n]);
      showError(n, r.ok ? null : r.error!);
      if (!r.ok) bad.push(n);
    }
    return bad;
  }

  const namesIn = (el: Element) => Array.from(new Set(Array.from(el.querySelectorAll<HTMLElement>('[data-field]')).map((f) => f.dataset.field!)));

  function focusField(name: string) {
    const el = fieldEl(name);
    const target = el?.querySelector<HTMLElement>('input:not([type=hidden]), textarea, select, .wish__btn');
    if (target) { target.focus({ preventScroll: true }); el!.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }

  function alert(text: string | null) {
    alertBox.hidden = !text;
    alertBox.textContent = text ?? '';
  }

  // Live validation: after a field has been left once, re-check on every change.
  form.addEventListener('focusout', (e) => {
    const f = (e.target as HTMLElement).closest<HTMLElement>('[data-field]');
    if (!f || f.contains(e.relatedTarget as Node | null)) return;
    const n = f.dataset.field!;
    const v = data()[n];
    if (v !== '' && !(Array.isArray(v) && !v.length)) touched.add(n);
    if (touched.has(n)) check([n]);
  });
  form.addEventListener('input', (e) => {
    const f = (e.target as HTMLElement).closest<HTMLElement>('[data-field]');
    if (f && (touched.has(f.dataset.field!) || f.classList.contains('has-error'))) check([f.dataset.field!]);
  });
  form.addEventListener('change', (e) => {
    const f = (e.target as HTMLElement).closest<HTMLElement>('[data-field]');
    if (f && f.classList.contains('has-error')) check([f.dataset.field!]);
  });

  /* Profile panels (student / werkende) */
  const panels = Array.from(form.querySelectorAll<HTMLElement>('[data-when-profile]'));
  const syncProfile = () => {
    const p = (form.querySelector<HTMLInputElement>('input[name="profile"]:checked')?.value) ?? '';
    for (const panel of panels) {
      const on = panel.dataset.whenProfile === p;
      panel.toggleAttribute('data-off', !on);
      panel.toggleAttribute('inert', !on);
      panel.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select, textarea').forEach((i) => (i.disabled = !on));
    }
    const label = form.querySelector<HTMLElement>('[data-submit-label]');
    if (label) label.textContent = label.dataset[p === 'student' ? 'student' : 'working']!;
  };
  if (panels.length) { form.addEventListener('change', (e) => { if ((e.target as HTMLInputElement).name === 'profile') syncProfile(); }); }

  /* Prefill from URL, e.g. ?situatie=expat or ?onderwerp=manage */
  const qs = new URLSearchParams(location.search);
  if (id === 'zoekopdracht' && qs.get('situatie') === 'expat') {
    form.querySelector<HTMLInputElement>('input[name="profile"][value="working"]')!.checked = true;
    const abroad = form.querySelector<HTMLSelectElement>('select[name="abroad"]');
    if (abroad) abroad.value = 'yes';
  }
  // From an area page: ?wijk=Statenkwartier fills in the preferred neighbourhood(s).
  const wijk = qs.get('wijk');
  if (id === 'zoekopdracht' && wijk) {
    const field = form.querySelector<HTMLInputElement>('input[name="neighbourhoods"]');
    if (field && !field.value) field.value = wijk.slice(0, 100);
  }
  if (id === 'contact') {
    const topic = qs.get('onderwerp');
    const sel = form.querySelector<HTMLSelectElement>('select[name="topic"]');
    if (sel && topic && Array.from(sel.options).some((o) => o.value === topic)) sel.value = topic;
  }
  if (panels.length) syncProfile();

  /* Steps */
  function goTo(i: number, focus = true) {
    current = Math.max(0, Math.min(steps.length - 1, i));
    steps.forEach((s, j) => (s.hidden = j !== current));
    if (stepper) {
      stepper.setAttribute('aria-label', msg.stepOf.replace('{n}', String(current + 1)).replace('{total}', String(steps.length)));
      Array.from(stepper.children).forEach((li, j) => {
        li.classList.toggle('is-current', j === current);
        li.classList.toggle('is-done', j < current);
        j === current ? li.setAttribute('aria-current', 'step') : li.removeAttribute('aria-current');
      });
    }
    if (focus) {
      const h = steps[current].querySelector<HTMLElement>('[data-step-title]');
      h?.setAttribute('tabindex', '-1');
      h?.focus({ preventScroll: true });
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  if (steps.length > 1) {
    goTo(0, false);
    form.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('button');
      if (!b) return;
      if (b.hasAttribute('data-next')) {
        const bad = check(namesIn(steps[current]));
        if (bad.length) { alert(msg.errorTitle); focusField(bad[0]); return; }
        alert(null);
        goTo(current + 1);
      } else if (b.hasAttribute('data-back')) {
        alert(null);
        goTo(current - 1);
      }
    });
  }

  /* Submit */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    const bad = check(Object.keys(schema).filter((n) => fieldEl(n)));
    if (bad.length) {
      const stepIdx = steps.findIndex((s) => s.querySelector(`[data-field="${bad[0]}"]`));
      if (stepIdx >= 0 && stepIdx !== current) goTo(stepIdx, false);
      alert(msg.errorTitle);
      focusField(bad[0]);
      return;
    }
    alert(null);
    if (concept) {
      form.hidden = true;
      const success = wrap.querySelector<HTMLElement>('[data-success]')!;
      success.hidden = false;
      success.focus({ preventScroll: true });
      success.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    busy = true;
    const original = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.setAttribute('aria-busy', 'true');
    submitBtn.innerHTML = `<span class="spinner" aria-hidden="true"></span>${msg.sending}`;

    const send = async (retry: boolean): Promise<Response> => {
      const token = await getToken(retry);
      const wait = MIN_TOKEN_AGE - (Date.now() - tokenAt);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      return fetch(`/api/forms/${id}/`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'fetch' },
        body: JSON.stringify({ ...data(), _token: token }),
      });
    };

    try {
      let res = await send(false);
      if (res.status === 409) res = await send(true); // expired or reused token → fetch a fresh one once
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok) {
        form.hidden = true;
        const success = wrap.querySelector<HTMLElement>('[data-success]')!;
        success.hidden = false;
        success.focus({ preventScroll: true });
        success.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (res.status === 422 && body.errors) {
        const names = Object.keys(body.errors);
        names.forEach((n) => showError(n, body.errors[n]));
        const stepIdx = steps.findIndex((s) => s.querySelector(`[data-field="${names[0]}"]`));
        if (stepIdx >= 0 && stepIdx !== current) goTo(stepIdx, false);
        alert(msg.errorTitle);
        focusField(names[0]);
      } else {
        alert(res.status === 429 ? msg.rateError : msg.sendError);
        alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch {
      alert(msg.sendError);
      alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } finally {
      busy = false;
      submitBtn.disabled = false;
      submitBtn.removeAttribute('aria-busy');
      submitBtn.innerHTML = original;
    }
  });
}

document.querySelectorAll<HTMLFormElement>('form[data-form]').forEach(initForm);
