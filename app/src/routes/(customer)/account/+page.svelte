<script lang="ts">
  import { enhance } from '$app/forms'
  import Input from '$lib/components/ui/Input.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import type { PageData, ActionData } from './$types'

  let { data, form }: { data: PageData; form: ActionData } = $props()

  let firstName = $state(data.customer.firstName)
  let lastName  = $state(data.customer.lastName)
  let phone     = $state(data.customer.phone)

  let emailConfirmations    = $state(data.customer.notificationPrefs.emailConfirmations)
  let emailReminders        = $state(data.customer.notificationPrefs.emailReminders)
  let whatsappConfirmations = $state(data.customer.notificationPrefs.whatsappConfirmations)
  let whatsappReminders     = $state(data.customer.notificationPrefs.whatsappReminders)
  let smsConfirmations      = $state(data.customer.notificationPrefs.smsConfirmations)
  let smsReminders          = $state(data.customer.notificationPrefs.smsReminders)

  let profileSubmitting = $state(false)
  let notifSubmitting   = $state(false)

  $effect(() => {
    firstName = data.customer.firstName
    lastName  = data.customer.lastName
    phone     = data.customer.phone
    emailConfirmations    = data.customer.notificationPrefs.emailConfirmations
    emailReminders        = data.customer.notificationPrefs.emailReminders
    whatsappConfirmations = data.customer.notificationPrefs.whatsappConfirmations
    whatsappReminders     = data.customer.notificationPrefs.whatsappReminders
    smsConfirmations      = data.customer.notificationPrefs.smsConfirmations
    smsReminders          = data.customer.notificationPrefs.smsReminders
  })
</script>

<svelte:head>
  <title>Account settings — Snips</title>
</svelte:head>

<div class="account">
  <a href="/dashboard" class="back-link">← Back to your bookings</a>

  <header class="account__header">
    <h1>Account settings</h1>
  </header>

  <!-- ── Profile section ──────────────────────────────── -->
  <section class="card">
    <h2 class="card__title">Profile</h2>

    <form
      method="POST"
      action="?/updateProfile"
      use:enhance={() => {
        profileSubmitting = true
        return async ({ update }) => {
          profileSubmitting = false
          await update()
        }
      }}
    >
      <div class="form-row">
        <Input
          label="First name"
          name="first_name"
          bind:value={firstName}
          required
          error={form?.profileError && !firstName ? 'Required' : ''}
        />
        <Input
          label="Last name"
          name="last_name"
          bind:value={lastName}
          required
          error={form?.profileError && !lastName ? 'Required' : ''}
        />
      </div>

      <Input
        label="Phone"
        name="phone"
        type="tel"
        bind:value={phone}
        placeholder="e.g. 07700 900123"
      />

      <div class="field">
        <span class="field__label">Email address</span>
        <span class="field__static">{data.email}</span>
        <span class="field__hint">Email address cannot be changed here.</span>
      </div>

      {#if form?.profileError}
        <p class="form-error" role="alert">{form.profileError}</p>
      {/if}

      {#if form?.profileSuccess}
        <p class="form-success" role="status">Changes saved.</p>
      {/if}

      <div class="card__actions">
        <Button
          type="submit"
          edges="soft"
          disabled={profileSubmitting}
          loading={profileSubmitting}
        >
          {profileSubmitting ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  </section>

  <!-- ── Notification preferences section ─────────────── -->
  <section class="card">
    <h2 class="card__title">Notification preferences</h2>

    <form
      method="POST"
      action="?/updateNotifications"
      use:enhance={() => {
        notifSubmitting = true
        return async ({ update }) => {
          notifSubmitting = false
          await update()
        }
      }}
    >
      <div class="notif-channels">

        <div class="notif-channel">
          <span class="notif-channel__name">Email</span>
          <div class="checkboxes">
            <label class="checkbox-row">
              <input
                type="checkbox"
                name="email_confirmations"
                class="checkbox-row__input"
                bind:checked={emailConfirmations}
              />
              <span class="checkbox-row__body">
                <span class="checkbox-row__label">Booking confirmations</span>
                <span class="checkbox-row__hint">When a booking is accepted or rejected.</span>
              </span>
            </label>

            <label class="checkbox-row">
              <input
                type="checkbox"
                name="email_reminders"
                class="checkbox-row__input"
                bind:checked={emailReminders}
              />
              <span class="checkbox-row__body">
                <span class="checkbox-row__label">Appointment reminders</span>
                <span class="checkbox-row__hint">A reminder before your appointment.</span>
              </span>
            </label>
          </div>
        </div>

        <div class="notif-channel notif-channel--coming-soon">
          <span class="notif-channel__name">
            WhatsApp
            <span class="notif-channel__badge">Coming soon</span>
          </span>
          <div class="checkboxes">
            <label class="checkbox-row">
              <input
                type="checkbox"
                name="whatsapp_confirmations"
                class="checkbox-row__input"
                bind:checked={whatsappConfirmations}
                disabled
              />
              <span class="checkbox-row__body">
                <span class="checkbox-row__label">Booking confirmations</span>
              </span>
            </label>

            <label class="checkbox-row">
              <input
                type="checkbox"
                name="whatsapp_reminders"
                class="checkbox-row__input"
                bind:checked={whatsappReminders}
                disabled
              />
              <span class="checkbox-row__body">
                <span class="checkbox-row__label">Appointment reminders</span>
              </span>
            </label>
          </div>
        </div>

        <div class="notif-channel notif-channel--coming-soon">
          <span class="notif-channel__name">
            SMS
            <span class="notif-channel__badge">Coming soon</span>
          </span>
          <div class="checkboxes">
            <label class="checkbox-row">
              <input
                type="checkbox"
                name="sms_confirmations"
                class="checkbox-row__input"
                bind:checked={smsConfirmations}
                disabled
              />
              <span class="checkbox-row__body">
                <span class="checkbox-row__label">Booking confirmations</span>
              </span>
            </label>

            <label class="checkbox-row">
              <input
                type="checkbox"
                name="sms_reminders"
                class="checkbox-row__input"
                bind:checked={smsReminders}
                disabled
              />
              <span class="checkbox-row__body">
                <span class="checkbox-row__label">Appointment reminders</span>
              </span>
            </label>
          </div>
        </div>

      </div>

      {#if form?.notifError}
        <p class="form-error" role="alert">{form.notifError}</p>
      {/if}

      {#if form?.notifSuccess}
        <p class="form-success" role="status">Preferences saved.</p>
      {/if}

      <div class="card__actions">
        <Button
          type="submit"
          edges="soft"
          disabled={notifSubmitting}
          loading={notifSubmitting}
        >
          {notifSubmitting ? 'Saving…' : 'Save preferences'}
        </Button>
      </div>
    </form>
  </section>
</div>

<style>
  .account {
    max-width: 560px;
    margin: 0 auto;
    padding: var(--space-8) var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .back-link {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    text-decoration: none;
    transition: var(--transition);

    &:hover { color: var(--color-text); }
  }

  .account__header h1 {
    font-size: var(--font-size-2xl);
    font-weight: 700;
  }

  /* ── Card ─────────────────────────────────────────── */

  .card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-6) var(--space-8);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .card__title {
    font-size: var(--font-size-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
  }

  .card__actions {
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-4);
  }

  /* ── Form layout ──────────────────────────────────── */

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
  }

  @media (max-width: 480px) {
    .form-row { grid-template-columns: 1fr; }
  }

  /* ── Static email field ───────────────────────────── */

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    margin: var(--space-2) 0;
  }

  .field__label {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-text);
  }

  .field__static {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }

  .field__hint {
    font-size: var(--font-size-xs);
    color: var(--color-text-subtle);
  }

  /* ── Notification channels ────────────────────────── */

  .notif-channels {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .notif-channel {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .notif-channel--coming-soon {
    opacity: 0.5;
  }

  .notif-channel__name {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
  }

  .notif-channel__badge {
    font-size: var(--font-size-xs);
    font-weight: 500;
    color: var(--color-text-muted);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-full);
    padding: 1px var(--space-2);
  }

  /* ── Checkboxes ───────────────────────────────────── */

  .checkboxes {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding-left: var(--space-2);
  }

  .checkbox-row {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    cursor: pointer;
  }

  .checkbox-row__input {
    margin-top: 2px;
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
    accent-color: var(--color-primary);
    cursor: pointer;

    &:disabled { cursor: not-allowed; }
  }

  .checkbox-row__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .checkbox-row__label {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-text);
  }

  .checkbox-row__hint {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  /* ── Feedback messages ────────────────────────────── */

  .form-error {
    font-size: var(--font-size-sm);
    color: var(--color-error);
    padding: var(--space-3) var(--space-4);
    background: color-mix(in srgb, var(--color-error) 8%, var(--color-surface));
    border-radius: var(--radius-md);
  }

  .form-success {
    font-size: var(--font-size-sm);
    color: var(--color-accepted-text);
    padding: var(--space-3) var(--space-4);
    background: var(--color-accepted-bg);
    border-radius: var(--radius-md);
  }
</style>
