// Listing cards: photo/map toggle (map iframe is only loaded on request) and neighbourhood filter.
for (const root of document.querySelectorAll<HTMLElement>('[data-listings]')) {
  root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!btn) return;

    if (btn.dataset.view) {
      const card = btn.closest('.lcard')!;
      const map = card.querySelector<HTMLElement>('[data-map-src]');
      if (!map) return;
      const showMap = btn.dataset.view === 'map';
      if (showMap && !map.querySelector('iframe')) {
        const f = document.createElement('iframe');
        f.src = map.dataset.mapSrc!;
        f.title = map.dataset.mapTitle ?? '';
        f.loading = 'lazy';
        f.referrerPolicy = 'no-referrer';
        map.append(f);
      }
      map.classList.toggle('is-on', showMap);
      card.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      return;
    }

    if (btn.dataset.filter) {
      const f = btn.dataset.filter;
      root.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      let n = 0;
      root.querySelectorAll<HTMLElement>('[data-listing]').forEach((el) => {
        const on = f === 'all' || el.dataset.wijk === f;
        el.hidden = !on;
        if (on) { n++; el.classList.add('is-in'); }
      });
      const c = root.querySelector('[data-count]');
      if (c) c.textContent = `${n} ${n === 1 ? root.dataset.one : root.dataset.many}`;
    }
  });
}
