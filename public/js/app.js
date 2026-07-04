/* HRMS global UI: dark mode · toasts · sidebar · loading states · micro-animations */

(function () {
  'use strict';

  const THEME_KEY = 'hrms-theme';

  /* ── Theme (dark mode) ───────────────────────────────── */
  function getStoredTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }

  function setStoredTheme(v) {
    try { localStorage.setItem(THEME_KEY, v); } catch (e) { /* ignore */ }
  }

  function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      const icon = btn.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
      btn.setAttribute('aria-label',
        theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    }
  }

  function initTheme() {
    const stored = getStoredTheme();
    applyTheme(stored === 'dark' ? 'dark' : 'light');

    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', function () {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const next = isDark ? 'light' : 'dark';
        applyTheme(next);
        setStoredTheme(next);
      });
    }
  }

  /* ── Topbar: scroll-aware elevation ─────────────────── */
  function initTopbarElevation() {
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;

    const mainContent = document.querySelector('.main-content');
    const scrollTarget = mainContent || window;

    function onScroll() {
      const scrollY = mainContent ? mainContent.scrollTop : window.scrollY;
      if (scrollY > 10) {
        topbar.style.boxShadow = '0 4px 20px rgba(45,42,38,0.12)';
      } else {
        topbar.style.boxShadow = '';
      }
    }

    scrollTarget.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ── Number counter animation ───────────────────────── */
  function animateCounter(el) {
    const rawText = el.textContent.trim();

    // Detect numeric: strip currency symbols and commas
    const cleaned = rawText.replace(/[₹,\s]/g, '');
    const num = parseFloat(cleaned);
    if (isNaN(num) || rawText === '—') return;

    const isRupee = rawText.includes('₹');
    const duration = 900;
    const start = performance.now();
    const startVal = 0;

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + eased * num);

      if (isRupee) {
        el.textContent = '₹' + current.toLocaleString('en-IN');
      } else {
        el.textContent = current;
      }

      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = rawText; // restore original for accuracy
    }

    requestAnimationFrame(tick);
  }

  function initCounters() {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    document.querySelectorAll('.stat-value').forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ── Toasts ─────────────────────────────────────────── */
  function ensureToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function showToast(message, type) {
    type = type || 'info';
    const container = ensureToastContainer();

    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.setAttribute('role', 'status');

    const iconName = type === 'success' ? 'check_circle'
                   : type === 'error'   ? 'error'
                   : 'info';

    const iconEl = document.createElement('span');
    iconEl.className = 'material-symbols-outlined';
    iconEl.textContent = iconName;

    const textEl = document.createElement('span');
    if (/^<[a-z][\s\S]*>/i.test(message)) {
      textEl.innerHTML = message;
    } else {
      textEl.textContent = message;
    }

    toast.appendChild(iconEl);
    toast.appendChild(textEl);
    container.appendChild(toast);

    // Auto-dismiss
    setTimeout(function () {
      toast.classList.add('is-leaving');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 4500);
  }

  window.showToast = showToast;

  /* ── Sidebar (mobile) ───────────────────────────────── */
  function initSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const hamburger = document.getElementById('hamburger');
    if (!sidebar || !hamburger) return;

    let backdrop = document.querySelector('.sidebar-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'sidebar-backdrop';
      document.body.appendChild(backdrop);
    }

    function close() {
      sidebar.classList.remove('is-open');
      backdrop.classList.remove('is-visible');
      document.body.style.overflow = '';
    }

    function open() {
      sidebar.classList.add('is-open');
      backdrop.classList.add('is-visible');
      document.body.style.overflow = 'hidden';
    }

    hamburger.addEventListener('click', function () {
      if (sidebar.classList.contains('is-open')) close();
      else open();
    });

    backdrop.addEventListener('click', close);

    sidebar.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        if (window.innerWidth <= 768) close();
      });
    });
  }

  /* ── Loading states on form submit ──────────────────── */
  function initLoadingStates() {
    document.addEventListener('submit', function (e) {
      const form = e.target;
      if (!form || form.tagName !== 'FORM') return;
      const submitter = e.submitter;
      if (!submitter) return;
      if (submitter.classList && submitter.classList.contains('btn')) {
        submitter.classList.add('is-loading');
        if (!submitter.querySelector('.spinner')) {
          const spinner = document.createElement('span');
          spinner.className = 'spinner';
          submitter.insertBefore(spinner, submitter.firstChild);
        }
      }
    });
  }

  /* ── Action-chip form submit handling ────────────────── */
  function initChipForms() {
    // Chips inside forms get loading state too
    document.querySelectorAll('form .action-chip').forEach(function (chip) {
      chip.closest('form').addEventListener('submit', function () {
        chip.style.opacity = '0.65';
        chip.style.pointerEvents = 'none';
      });
    });
  }

  /* ── Init on DOM ready ───────────────────────────────── */
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    initTheme();
    initTopbarElevation();
    initSidebar();
    initLoadingStates();
    initCounters();
    initChipForms();
  });
})();
