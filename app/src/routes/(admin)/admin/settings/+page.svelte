<script lang="ts">
  import { enhance } from '$app/forms'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import Button from '$lib/components/ui/Button.svelte'
  import Toast from '$lib/components/ui/Toast.svelte'
  import ComingSoon from '$lib/components/ui/ComingSoon.svelte'
  import type { PageData, ActionData } from './$types'

  let { data, form }: { data: PageData; form: ActionData } = $props()

  let submitting = $state(false)
  let showToast = $state(false)

  $effect(() => {
    if ($page.url.searchParams.get('saved') !== '1') return
    showToast = true
    goto('/admin/settings', { replaceState: true })
  })

  $effect(() => {
    if (!showToast) return
    const t = setTimeout(() => { showToast = false }, 5000)
    return () => clearTimeout(t)
  })
</script>

<svelte:head>
  <title>Shop Settings — Snips Admin</title>
</svelte:head>

<div class="settings-page">
  <header class="settings-page__header">
    <h1>Shop Settings</h1>
  </header>

  <!-- ── Section A: Booking Preferences ─────────────── -->
  <section class="settings-section">
    <h2 class="settings-section__title">Booking Preferences</h2>

    <form
      method="POST"
      action="?/updatePreferences"
      use:enhance={() => {
        submitting = true
        return async ({ update }) => {
          submitting = false
          await update()
        }
      }}
    >
      <!-- Auto-accept (coming soon) -->
      <div class="setting-row">
        <div class="setting-row__info">
          <span class="setting-row__label">Auto-accept bookings <ComingSoon /></span>
          <span class="setting-row__desc">Automatically accept all incoming bookings without manual review</span>
        </div>
        <button type="button" class="toggle" disabled aria-pressed="false" aria-label="Auto-accept bookings">
          <span class="toggle__thumb"></span>
        </button>
      </div>

      <hr class="divider" />

      <!-- Booking window -->
      <div class="setting-row">
        <div class="setting-row__info">
          <span class="setting-row__label">Booking window</span>
          <span class="setting-row__desc">How many days ahead customers can book</span>
          {#if form?.errors?.booking_window_days}
            <p class="field-error">{form.errors.booking_window_days}</p>
          {/if}
        </div>
        <div class="setting-row__number">
          <input
            id="booking_window_days"
            name="booking_window_days"
            type="number"
            class="number-input"
            class:number-input--error={form?.errors?.booking_window_days}
            value={form?.values?.booking_window_days ?? data.preferences.booking_window_days}
            min="1"
            max="365"
            step="1"
          />
          <span class="setting-row__unit">days</span>
        </div>
      </div>

      <hr class="divider" />

      <!-- Buffer time -->
      <div class="setting-row">
        <div class="setting-row__info">
          <span class="setting-row__label">Buffer time</span>
          <span class="setting-row__desc">Gap added between appointments (minutes)</span>
          {#if form?.errors?.buffer_minutes}
            <p class="field-error">{form.errors.buffer_minutes}</p>
          {/if}
        </div>
        <div class="setting-row__number">
          <input
            id="buffer_minutes"
            name="buffer_minutes"
            type="number"
            class="number-input"
            class:number-input--error={form?.errors?.buffer_minutes}
            value={form?.values?.buffer_minutes ?? data.preferences.buffer_minutes}
            min="0"
            max="120"
            step="1"
          />
          <span class="setting-row__unit">min</span>
        </div>
      </div>

      <hr class="divider" />

      <!-- Require deposit (coming soon) -->
      <div class="setting-row">
        <div class="setting-row__info">
          <span class="setting-row__label">Require deposit <ComingSoon /></span>
          <span class="setting-row__desc">Require customers to pay a deposit when booking</span>
        </div>
        <button type="button" class="toggle" disabled aria-pressed="false" aria-label="Require deposit">
          <span class="toggle__thumb"></span>
        </button>
      </div>

      <hr class="divider" />

      <!-- Enable shop page (coming soon) -->
      <div class="setting-row">
        <div class="setting-row__info">
          <span class="setting-row__label">Enable shop page <ComingSoon /></span>
          <span class="setting-row__desc">Show a branded shop page as part of the booking flow</span>
        </div>
        <button type="button" class="toggle" disabled aria-pressed="false" aria-label="Enable shop page">
          <span class="toggle__thumb"></span>
        </button>
      </div>

      {#if form?.errors?.form}
        <p class="form-error">{form.errors.form}</p>
      {/if}

      <div class="settings-section__footer">
        <Button type="submit" edges="soft" disabled={submitting} loading={submitting}>
          {submitting ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  </section>

  <!-- ── Section B: Display Settings ─────────────────── -->
  <section class="settings-section">
    <h2 class="settings-section__title">Display Settings</h2>

    <!-- Info panel toggle (coming soon) -->
    <div class="setting-row">
      <div class="setting-row__info">
        <span class="setting-row__label">Customer info panel <ComingSoon /></span>
        <span class="setting-row__desc">Show a temporary message to customers during the booking flow (e.g. holiday hours, promotions)</span>
      </div>
      <button type="button" class="toggle" disabled aria-pressed="false" aria-label="Customer info panel">
        <span class="toggle__thumb"></span>
      </button>
    </div>

    <hr class="divider" />

    <!-- Info panel message (coming soon) -->
    <div class="setting-row setting-row--stacked">
      <span class="setting-row__label">Info panel message <ComingSoon /></span>
      <textarea
        class="panel-textarea"
        placeholder="Enter a message to display to customers"
        disabled
        rows="3"
      ></textarea>
    </div>

    <hr class="divider" />

    <!-- Info panel expiry (coming soon) -->
    <div class="setting-row">
      <div class="setting-row__info">
        <span class="setting-row__label">Hide panel after <ComingSoon /></span>
      </div>
      <input type="date" class="date-input" disabled />
    </div>
  </section>
</div>

<div class="toast-container">
  <Toast show={showToast} message="Settings saved." type="success" />
</div>

<style>
  .settings-page {
    max-width: 640px;
    margin: var(--space-8) auto;
    padding: 0 var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .settings-page__header h1 {
    font-size: var(--font-size-2xl);
    font-weight: 700;
    color: var(--color-text);
  }

  /* ── Section card ──────────────────────────────── */

  .settings-section {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    display: flex;
    flex-direction: column;
  }

  .settings-section__title {
    font-size: var(--font-size-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    margin-bottom: var(--space-4);
  }

  .divider {
    border: none;
    border-top: 1px solid var(--color-border);
    margin: 0;
  }

  .settings-section__footer {
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-4);
    margin-top: var(--space-2);
  }

  /* ── Setting rows ──────────────────────────────── */

  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-6);
    padding: var(--space-4) 0;
  }

  .setting-row--stacked {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
  }

  .setting-row__info {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    flex: 1;
    min-width: 0;
  }

  .setting-row__label {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
  }

  .setting-row__desc {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    line-height: 1.4;
  }

  .setting-row__number {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .setting-row__unit {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  /* ── Number input ──────────────────────────────── */

  .number-input {
    width: 5rem;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-family: var(--font-sans);
    color: var(--color-text);
    background: var(--color-bg);
    transition: var(--transition);
    text-align: right;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    &--error {
      border-color: var(--color-rejected-text);
    }
  }

  /* ── Toggle switch ─────────────────────────────── */

  .toggle {
    position: relative;
    display: inline-flex;
    align-items: center;
    width: 44px;
    height: 24px;
    padding: 2px;
    border: none;
    border-radius: var(--radius-full);
    background: var(--color-border);
    cursor: pointer;
    transition: background var(--transition);
    flex-shrink: 0;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .toggle--on {
    background: var(--color-primary);
  }

  .toggle__thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    box-shadow: var(--shadow-sm);
    transition: transform var(--transition);
  }

  .toggle--on .toggle__thumb {
    transform: translateX(20px);
  }

  /* ── Disabled fields ───────────────────────────── */

  .panel-textarea {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-family: var(--font-sans);
    color: var(--color-text-muted);
    background: var(--color-bg);
    resize: vertical;
    min-height: 5rem;
    box-sizing: border-box;
    opacity: 0.6;
    cursor: not-allowed;
  }

  .date-input {
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-family: var(--font-sans);
    color: var(--color-text-muted);
    background: var(--color-bg);
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* ── Errors ────────────────────────────────────── */

  .field-error {
    font-size: var(--font-size-xs);
    color: var(--color-rejected-text);
  }

  .form-error {
    margin-top: var(--space-4);
    padding: var(--space-3) var(--space-4);
    background: var(--color-rejected-bg);
    color: var(--color-rejected-text);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
  }

  /* ── Toast ─────────────────────────────────────── */

  .toast-container {
    position: fixed;
    bottom: var(--space-6);
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
    pointer-events: none;
  }
</style>
