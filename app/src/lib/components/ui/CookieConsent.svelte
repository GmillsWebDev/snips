<script>
  import { onMount } from 'svelte';
  import cookieIcon from '$lib/assets/images/icons/cookieIcon.svg';

  // consent object saved in localStorage
  let consent = {
    analytics: false,
    diagnostics: false,
    timestamp: 0
  };

  // whether to display the banner
  let show = false;

  const STORAGE_KEY = 'cookieConsent';
  const EXPIRY_MS = 6 * 30 * 24 * 60 * 60 * 1000; // roughly six months

  function loadConsent() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (Date.now() - data.timestamp > EXPIRY_MS) {
          // expired
          localStorage.removeItem(STORAGE_KEY);
          show = true;
        } else {
          consent = data;
          // inject any scripts that were previously granted
          if (consent.analytics) injectAnalytics();
          if (consent.diagnostics) injectDiagnostics();
        }
      } else {
        show = true;
      }
    } catch (e) {
      console.error('failed to load consent', e);
      show = true;
    }
  }

  function saveConsent() {
    consent.timestamp = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    show = false;
    if (consent.analytics) injectAnalytics();
    if (consent.diagnostics) injectDiagnostics();
  }

  function acceptAll() {
    consent.analytics = true;
    consent.diagnostics = true;
    saveConsent();
  }

  function rejectAll() {
    consent.analytics = false;
    consent.diagnostics = false;
    saveConsent();
  }

  // helpers to add the scripts dynamically
  function injectAnalytics() {
    if (window.gtagLoaded) return;
    const script1 = document.createElement('script');
    script1.async = true;
    script1.src = 'https://www.googletagmanager.com/gtag/js?id=G-QR8FCS580F';
    document.head.appendChild(script1);

    const script2 = document.createElement('script');
    script2.innerHTML = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-QR8FCS580F');
    `;
    document.head.appendChild(script2);
    window.gtagLoaded = true;
  }

  function injectDiagnostics() {
    if (window.csqLoaded) return;
    (function (c, s, q, u, a, r, e) {
      c.hj = c.hj || function () {
        (c.hj.q = c.hj.q || []).push(arguments);
      };
      c._hjSettings = { hjid: a };
      r = s.getElementsByTagName('head')[0];
      e = s.createElement('script');
      e.async = true;
      e.src = q + c._hjSettings.hjid + u;
      r.appendChild(e);
    })(window, document, 'https://static.hj.contentsquare.net/c/csq-', '.js', 6657746);
    window.csqLoaded = true;
  }

  onMount(loadConsent);

  // expose a small button so users can change their minds later
  function openSettings() {
    // copy saved consent into local state so toggles reflect current settings
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) consent = JSON.parse(raw);
    } catch {}
    show = true;
  }
</script>

{#if show}
  <div class="cookieBanner" role="dialog" aria-live="polite">
    <p>
      We use cookies for <strong>site analytics</strong> and <strong>diagnostics</strong> 
      to allow us to provide a better user experience. You can choose 
      which services may run on this site. for more information please see our 
      <a href="/cookiePolicy" target="_blank" rel="noopener">cookie policy</a>.
    </p>

    <div class="options">
      <label>
        <input type="checkbox" bind:checked={consent.analytics} /> Site
        analytics
      </label>
      <label>
        <input type="checkbox" bind:checked={consent.diagnostics} />
        Diagnostics
      </label>
    </div>

    <div class="actions">
      <button on:click={acceptAll}>Accept all</button>
      <button on:click={rejectAll}>Reject all</button>
      <button on:click={saveConsent}>Save preferences</button>
    </div>
  </div>
{/if}

{#if !show}
  <button class="cookieSettings" on:click={openSettings} aria-label="Open cookie settings">
    <img src={cookieIcon} alt="Cookie settings" width="20" height="20" />
  </button>
{/if}

<style>
  .cookieBanner {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #222;
    color: #fff;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 1000;
    font-size: 0.9rem;
  }

  .cookieBanner p {
    max-width: 800px;
    text-align: center;
    margin: 0;
  }

  .cookieBanner .options {
    margin: 0.5rem 0;
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .cookieBanner .actions {
    margin-top: 0.5rem;
  }

  .cookieBanner button {
    margin: 0 0.25rem;
    background: #fff;
    color: #222;
    border: none;
    padding: 0.5rem 1rem;
    cursor: pointer;
    border-radius: 4px;
  }

  .cookieBanner button:hover {
    opacity: 0.9;
  }

  .cookieSettings {
    position: fixed;
    bottom: 1rem;
    left: 1rem;
    background: var(--colour-secondary);
    color: var(--colour-white);
    border: none;
    padding: 0.5rem 0.75rem;
    border-radius: 100%;
    height: 3rem;
    width: 3rem;
    cursor: pointer;
    font-size: 0.8rem;
    z-index: 1001;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    transition: background 0.3s, transform 0.3s;
  }

  .cookieSettings:hover {
    opacity: 0.9;
    background: var(--colour-accent);
    transform: scale(1.1);
  }
</style>
