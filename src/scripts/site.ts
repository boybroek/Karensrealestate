// Site-wide behaviour. Loaded as a deferred module; the site works without it.
document.documentElement.classList.add('js');

/* ---------- Mobile menu ---------- */
const toggle = document.querySelector<HTMLButtonElement>('.menu-toggle');
const menu = document.getElementById('mobile-menu');
if (toggle && menu) {
  const set = (open: boolean) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', (open ? toggle.dataset.labelClose : toggle.dataset.labelOpen) ?? '');
    document.documentElement.classList.toggle('menu-open', open);
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add('is-open'));
      menu.querySelector<HTMLElement>('a')?.focus();
    } else {
      menu.classList.remove('is-open');
      setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 300);
    }
  };
  toggle.addEventListener('click', () => set(toggle.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { set(false); toggle.focus(); }
  });
  menu.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('a')) set(false); });
  matchMedia('(min-width: 961px)').addEventListener('change', (e) => { if (e.matches) set(false); });
}

/* ---------- Reveal on scroll (design: data-reveal="delay in ms") ---------- */
const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const show = (el: HTMLElement) => el.classList.add('is-in');
if (reduce || !('IntersectionObserver' in window)) {
  els.forEach(show);
} else {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target as HTMLElement;
      const delay = Number(el.dataset.reveal) || 0;
      if (delay) el.style.transitionDelay = `${delay}ms`;
      show(el);
      io.unobserve(el);
    }
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  for (const el of els) {
    // Content already on screen at load is shown immediately (no LCP delay).
    if (el.getBoundingClientRect().top < innerHeight) show(el);
    else io.observe(el);
  }
  // Safety net: never leave content hidden (e.g. when printing or in odd embeds).
  addEventListener('beforeprint', () => els.forEach(show));
}
