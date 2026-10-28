document.documentElement.classList.add('js');
  const yr = document.getElementById('yr'); if (yr) yr.textContent = new Date().getFullYear();

  // Mobile menu
  const nav = document.querySelector('.nav');
  const toggle = document.querySelector('.menu-toggle');
  if (toggle) toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  nav.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open'); toggle.setAttribute('aria-expanded', false);
  }));

  // Scroll reveal, with a fallback so content never stays hidden
  const items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(el => io.observe(el));
    setTimeout(() => items.forEach(el => el.classList.add('in')), 3000);
  } else {
    items.forEach(el => el.classList.add('in'));
  }
  // Hero carousel: crossfade, 6s autoplay, pauses on hover/focus and when tab hidden, no autoplay for reduced motion
  (() => {
    const root = document.querySelector('.carousel');
    if (!root) return;
    const slides = [...root.querySelectorAll('.slide')];
    const dots = [...root.querySelectorAll('.carousel-nav button')];
    const DUR = 6000, reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.style.setProperty('--dur', DUR + 'ms');
    let i = 0, timer = null, paused = false;
    const go = (n) => {
      slides[i].classList.remove('active'); dots[i].classList.remove('active');
      i = (n + slides.length) % slides.length;
      slides[i].classList.add('active');
      const d = dots[i]; d.classList.remove('active'); void d.offsetWidth; d.classList.add('active');
      slides.forEach((s, k) => s.setAttribute('aria-hidden', k !== i));
      schedule();
    };
    const schedule = () => { clearTimeout(timer); if (!reduced && !paused) timer = setTimeout(() => go(i + 1), DUR); };
    const pause = (v) => { paused = v; root.classList.toggle('paused', v); if (v) clearTimeout(timer); else go(i); };
    dots.forEach((d, k) => d.addEventListener('click', () => go(k)));
    root.addEventListener('mouseenter', () => pause(true));
    root.addEventListener('mouseleave', () => pause(false));
    root.addEventListener('focusin', () => pause(true));
    root.addEventListener('focusout', () => pause(false));
    document.addEventListener('visibilitychange', () => pause(document.hidden));
    slides.forEach((s, k) => s.setAttribute('aria-hidden', k !== 0));
    schedule();
  })();
  // Team carousel arrows + counter (native scroll-snap does the sliding; swipe works on touch)
  (() => {
    const track = document.querySelector('.team-track');
    if (!track) return;
    const cards = [...track.children];
    const [prev, next] = document.querySelectorAll('.team-controls .arrow');
    const count = document.querySelector('.team-count b');
    const step = () => cards[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 24);
    const update = () => {
      const i = Math.round(track.scrollLeft / step());
      const visible = Math.max(1, Math.round(track.clientWidth / step()));
      count.textContent = String(Math.min(i + visible, cards.length)).padStart(2, '0');
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    };
    [prev, next].forEach(b => b.addEventListener('click', () => track.scrollBy({ left: step() * +b.dataset.dir, behavior: 'smooth' })));
    track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    addEventListener('resize', update);
    update();
  })();
  // Video hero: autoplay unless reduced motion, pause button, and mockup switcher
  (() => {
    const hero = document.querySelector('.hero');
    const video = hero && hero.querySelector('.hero-video video');
    if (!video) return;
    const btn = hero.querySelector('.video-toggle');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let userPaused = reduced;
    const sync = () => {
      const paused = video.paused;
      btn.classList.toggle('paused', paused);
      btn.setAttribute('aria-label', paused ? 'Play background video' : 'Pause background video');
    };
    const tryPlay = () => { if (!userPaused && hero.classList.contains('is-video')) video.play().catch(() => {}).finally(sync); else sync(); };
    btn.addEventListener('click', () => { if (video.paused) { userPaused = false; video.play().finally(sync); } else { userPaused = true; video.pause(); sync(); } });
    video.addEventListener('play', sync); video.addEventListener('pause', sync);
    const setHero = (mode) => {
      hero.classList.toggle('is-video', mode === 'video');
      document.querySelectorAll('.mock-switch button').forEach(b => b.setAttribute('aria-pressed', b.dataset.hero === mode));
      if (mode === 'video') tryPlay(); else video.pause();
      history.replaceState(null, '', '#' + mode + '-hero');
    };
    document.querySelectorAll('.mock-switch button').forEach(b => b.addEventListener('click', () => setHero(b.dataset.hero)));
    setHero(location.hash === '#carousel-hero' ? 'carousel' : 'video');
  })();

// Blog: category filter + load more
(() => {
  const grid = document.querySelector('.post-grid');
  if (!grid) return;
  const posts = [...grid.children];
  const chips = [...document.querySelectorAll('.chip')];
  const more = document.querySelector('.load-more');
  const PAGE = 9; let shown = PAGE, cat = 'all';
  const render = () => {
    const match = posts.filter(p => cat === 'all' || p.dataset.cat === cat);
    posts.forEach(p => p.hidden = true);
    match.slice(0, shown).forEach(p => { p.hidden = false; p.classList.add('in'); });
    if (more) more.hidden = match.length <= shown;
    const empty = document.querySelector('.post-empty'); if (empty) empty.hidden = match.length > 0;
  };
  chips.forEach(c => c.addEventListener('click', () => {
    cat = c.dataset.cat; shown = PAGE;
    chips.forEach(x => x.setAttribute('aria-pressed', x === c));
    render();
  }));
  if (more) more.addEventListener('click', () => { shown += PAGE; render(); });
  render();
})();

// Team bios in a native <dialog>
(() => {
  const dlg = document.querySelector('.bio-dialog');
  if (!dlg) return;
  document.querySelectorAll('[data-bio]').forEach(btn => btn.addEventListener('click', (e) => {
    e.preventDefault();
    const src = document.getElementById(btn.dataset.bio);
    dlg.querySelector('.bio-body').innerHTML = src.innerHTML;
    dlg.showModal();
  }));
  dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('.bio-close')) dlg.close(); });
})();
