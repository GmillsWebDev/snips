<script lang="ts">
  import { page } from '$app/stores'
  import { enhance } from '$app/forms'
  import Button from '$lib/components/ui/Button.svelte'
  import type { CustomerDetails } from '$lib/components/booking/CustomerDetails.svelte'

  type Service = {
    id: string
    name: string
    duration_minutes: number
    price_pence: number
  }

  let {
    shop_name,
    service,
    start_at,
    timezone,
    customer,
    onback,
  }: {
    shop_name: string
    service: Service
    start_at: string
    timezone: string
    customer: CustomerDetails
    onback: () => void
  } = $props()

  let submitting = $state(false)

  let formError = $derived(($page.form as { error?: string } | null)?.error ?? null)

  function formatDateTime(iso: string, tz: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  }

  function formatPrice(pence: number): string {
    return `£${(pence / 100).toFixed(2)}`
  }

  function formatDuration(mins: number): string {
    if (mins < 60) return `${mins} min`
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m ? `${h} hr ${m} min` : `${h} hr`
  }
</script>

<h2 class="step__title">Confirm your booking</h2>

<div class="summary">
  <div class="summary__section">
    <h3 class="summary__heading">Appointment</h3>
    <dl class="summary__list">
      <div class="summary__row">
        <dt>Shop</dt>
        <dd>{shop_name}</dd>
      </div>
      <div class="summary__row">
        <dt>Service</dt>
        <dd>{service.name}</dd>
      </div>
      <div class="summary__row">
        <dt>Duration</dt>
        <dd>{formatDuration(service.duration_minutes)}</dd>
      </div>
      <div class="summary__row">
        <dt>Price</dt>
        <dd>{formatPrice(service.price_pence)}</dd>
      </div>
      <div class="summary__row">
        <dt>Date &amp; time</dt>
        <dd>{formatDateTime(start_at, timezone)}</dd>
      </div>
    </dl>
  </div>

  <div class="summary__section">
    <h3 class="summary__heading">Your details</h3>
    <dl class="summary__list">
      <div class="summary__row">
        <dt>Name</dt>
        <dd>{customer.first_name} {customer.last_name}</dd>
      </div>
      <div class="summary__row">
        <dt>Email</dt>
        <dd>{customer.email}</dd>
      </div>
      <div class="summary__row">
        <dt>Phone</dt>
        <dd>{customer.phone}</dd>
      </div>
    </dl>
  </div>
</div>

{#if formError}
  <p class="summary__error" role="alert">{formError}</p>
{/if}

<form
  method="POST"
  action="?/confirm"
  use:enhance={() => {
    submitting = true
    return async ({ update }) => {
      await update()
      submitting = false
    }
  }}
>
  <input type="hidden" name="service_id" value={service.id} />
  <input type="hidden" name="start_at"   value={start_at} />
  <input type="hidden" name="first_name" value={customer.first_name} />
  <input type="hidden" name="last_name"  value={customer.last_name} />
  <input type="hidden" name="email"      value={customer.email} />
  <input type="hidden" name="phone"      value={customer.phone} />
  <input type="hidden" name="is_guest"   value={String(customer.is_guest)} />
  {#if customer.customer_id}
    <input type="hidden" name="customer_id" value={customer.customer_id} />
  {/if}

  <div class="confirm-actions">
    <Button edges="soft" variant="secondary" type="button" onclick={onback}>Back</Button>
    <Button edges="soft" type="submit" disabled={submitting} loading={submitting}>
      Confirm booking
    </Button>
  </div>
</form>

<style>
  .step__title {
    margin-bottom: var(--space-4);
  }

  .summary {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    margin-bottom: var(--space-4);
  }

  .summary__section {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4) var(--space-6);
  }

  .summary__heading {
    font-size: var(--font-size-sm);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    margin-bottom: var(--space-3);
  }

  .summary__list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .summary__row {
    display: flex;
    justify-content: space-between;
    gap: var(--space-4);
    font-size: var(--font-size-sm);

    dt {
      color: var(--color-text-muted);
      flex-shrink: 0;
    }

    dd {
      font-weight: 500;
      text-align: right;
    }
  }

  .summary__error {
    color: var(--color-error, #dc2626);
    font-size: var(--font-size-sm);
    margin-bottom: var(--space-4);
    padding: var(--space-3);
    background: color-mix(in srgb, var(--color-error, #dc2626) 8%, var(--color-surface));
    border-radius: var(--radius-md);
  }

  .confirm-actions {
    display: flex;
    justify-content: space-between;
    margin-top: var(--space-2);
  }
</style>
