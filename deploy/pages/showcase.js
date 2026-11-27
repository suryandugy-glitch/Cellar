for (const showcase of document.querySelectorAll('.showcase')) {
  const rail = showcase.querySelector('.showcase-rail');
  const controls = showcase.querySelector('.showcase-controls');
  const toggle = controls.querySelector('[data-play]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let playing = !motion.matches;
  let visible = false;
  let hovering = false;
  let timer;

  function advance(direction) {
    const end = rail.scrollWidth - rail.clientWidth;
    const stops = [...new Set(Array.from(rail.children, card =>
      Math.min(card.offsetLeft - rail.firstElementChild.offsetLeft, end)))];
    const current = rail.scrollLeft;
    const target = direction > 0
      ? stops.find(x => x > current + 3) ?? 0
      : stops.findLast(x => x < current - 3) ?? end;
    rail.scrollTo({left: target, behavior: motion.matches ? 'instant' : 'smooth'});
  }

  function schedule() {
    clearInterval(timer);
    toggle.textContent = playing ? 'Pause' : 'Play';
    toggle.setAttribute('aria-label', playing ? 'Pause automatic scrolling' : 'Play automatic scrolling');
    if (playing && visible && !hovering && !document.hidden) {
      timer = setInterval(() => advance(1), 5500);
    }
  }

  function pause() {
    playing = false;
    schedule();
  }

  for (const button of controls.querySelectorAll('[data-step]')) {
    button.addEventListener('click', () => {
      pause();
      advance(Number(button.dataset.step));
    });
  }
  toggle.addEventListener('click', () => {
    playing = !playing;
    schedule();
  });
  rail.addEventListener('focusin', pause);
  rail.addEventListener('pointerdown', pause);
  rail.addEventListener('wheel', pause, {passive:true});
  showcase.addEventListener('mouseenter', () => { hovering = true; schedule(); });
  showcase.addEventListener('mouseleave', () => { hovering = false; schedule(); });
  document.addEventListener('visibilitychange', schedule);
  motion.addEventListener('change', pause);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    schedule();
  }).observe(rail);
  controls.hidden = false;
  schedule();
}
