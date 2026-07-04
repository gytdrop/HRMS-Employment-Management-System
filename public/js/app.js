/* HRMS global UI: dark mode, toasts, sidebar, loading states */

(function () {
  'use strict';

  const THEME_KEY = 'hrms-theme';

  /* ── Theme (dark mode) ───────────────────────────── */
  function getStoredTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }

  function setStoredTheme(value) {
    try { localStorage.setItem(THEME_KEY, value); } catch (e) { /* ignore */ }
  }

  function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
    // Update toggle button icon if present
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      const icon = btn.querySelector('.material-symbols-outlined');
      if (icon) {
        icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
      }
      btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    }
  }

  function initTheme() {
    // Apply stored theme on first load (before paint would be ideal; defer is acceptable)
    const stored = getStoredTheme();
    if (stored === 'dark') {
      applyTheme('dark');
    } else {
      applyTheme('light');
    }

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

  /* ── Toasts ─────────────────────────────────────── */
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

    // Allow inline HTML (some messages are formatted with <code> etc)
    const iconEl = document.createElement('span');
    iconEl.className = 'material-symbols-outlined';
    iconEl.textContent = iconName;

    const textEl = document.createElement('span');
    if (/<[a-z][\s\S]*>/i.test(message)) {
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

  // Expose globally for inline use in views
  window.showToast = showToast;

  /* ── Sidebar (mobile) ───────────────────────────── */
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

    // Close on link click (mobile UX)
    sidebar.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        if (window.innerWidth <= 768) close();
      });
    });
  }

  /* ── Loading states on form submit ──────────────── */
  function initLoadingStates() {
    document.addEventListener('submit', function (e) {
      const form = e.target;
      if (!form || form.tagName !== 'FORM') return;
      const submitter = e.submitter;
      if (!submitter) return;
      // Add spinner to the button if it has class .btn
      if (submitter.classList && submitter.classList.contains('btn')) {
        submitter.classList.add('is-loading');
        // Add a spinner child if not present
        if (!submitter.querySelector('.spinner')) {
          const spinner = document.createElement('span');
          spinner.className = 'spinner';
          submitter.insertBefore(spinner, submitter.firstChild);
        }
      }
    });
  }

  /* ── Init on DOM ready ──────────────────────────── */
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    initTheme();
    initSidebar();
    initLoadingStates();
  });
})();
