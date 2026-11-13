// Reviews carousel (design: auto-advance every 6 s, pause on hover/focus, prev/next + dots).
for (const root of document.querySelectorAll<HTMLElement>('[data-reviews]')) {
  const track = root.querySelector<HTMLElement>('[data-track]')!;
  const slides = Array.from(track.children) as HTMLElement[];
  const dots = root.querySelector<HTMLElement>('[data-dots]')!;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let index = 0;
  let paused = false;

  const per = () => Number(getComputedStyle(track).getPropertyValue('--per')) || 1;
  const maxStart = () => Math.max(0, slides.length - per());

  function render() {
    const p = per(), max = maxStart();
    index = Math.min(index, max);
    const gap = parseFloat(getComputedStyle(track).columnGap) || 20;
    const w = slides[0].getBoundingClientRect().width;
    track.style.transform = `translateX(${-index * (w + gap)}px)`;
    slides.forEach((s, i) => {
      const vis = i >= index && i < index + p;
      s.classList.toggle('is-visible', vis);
      s.classList.toggle('is-first', i === index);
      s.setAttribute('aria-hidden', String(!vis));
    });
    if (dots.children.length !== max + 1) {
      dots.replaceChildren(...Array.from({ length: max + 1 }, (_, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', `${dots.dataset.label} ${i + 1}`);
        b.addEventListener('click', () => go(i));
        return b;
      }));
    }
    Array.from(dots.children).forEach((b, i) => b.setAttribute('aria-current', String(i === index)));
  }
  function go(i: number) {
    const max = maxStart();
    index = i > max ? 0 : i < 0 ? max : i;
    render();
  }

  root.querySelector('[data-prev]')!.addEventListener('click', () => go(index - 1));
  root.querySelector('[data-next]')!.addEventListener('click', () => go(index + 1));
  root.addEventListener('mouseenter', () => (paused = true));
  root.addEventListener('mouseleave', () => (paused = false));
  root.addEventListener('focusin', () => (paused = true));
  root.addEventListener('focusout', () => (paused = false));
  addEventListener('resize', render, { passive: true });
  if (!reduce) setInterval(() => { if (!paused && document.visibilityState === 'visible') go(index + 1); }, 6000);
  render();
}
