export function initMobileNav() {
  const btn = document.getElementById('mobile-menu-btn');
  const panel = document.getElementById('mobile-nav-panel');
  if (!btn || !panel) return;

  function close() {
    panel.classList.remove('open');
    btn.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('mobile-menu-open');
  }

  function toggle() {
    const opening = !panel.classList.contains('open');
    panel.classList.toggle('open', opening);
    btn.classList.toggle('open', opening);
    btn.setAttribute('aria-expanded', String(opening));
    document.body.classList.toggle('mobile-menu-open', opening);
  }

  btn.addEventListener('click', e => {
    e.stopPropagation();
    toggle();
  });

  document.addEventListener('click', e => {
    if (!panel.classList.contains('open')) return;
    if (panel.contains(e.target) || btn.contains(e.target)) return;
    close();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && panel.classList.contains('open')) close();
  });

  window.addEventListener('hashchange', close);
}
