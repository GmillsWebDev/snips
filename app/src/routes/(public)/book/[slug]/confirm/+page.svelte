<script lang="ts">
  import { page } from '$app/stores'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()
  let { shop, booking } = data

  const service  = booking.services as { name: string; duration_minutes: number; price_pence: number }
  const customer = booking.customers as { first_name: string; last_name: string; email: string; phone: string }

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

<svelte:head>
  <title>Booking confirmed — {shop.name}</title>
</svelte:head>

<div class="confirm-page">
  <div class="confirm-page__card container">
    <div class="confirm-page__icon" aria-hidden="true">✓</div>
    <h1 class="confirm-page__title">You're booked in!</h1>
    <p class="confirm-page__subtitle">
      A confirmation has been sent to <strong>{customer.email}</strong>.
    </p>

    <div class="summary">
      <div class="summary__section">
        <h2 class="summary__heading">Appointment</h2>
        <dl class="summary__list">
          <div class="summary__row">
            <dt>Shop</dt>
            <dd>{shop.name}</dd>
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
            <dd>{formatDateTime(booking.start_at, shop.timezone)}</dd>
          </div>
        </dl>
      </div>

      <div class="summary__section">
        <h2 class="summary__heading">Your details</h2>
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

    <a href="/book/{$page.params.slug}" class="confirm-page__new-booking">
      Make another booking
    </a>
  </div>
</div>

<style>
  .confirm-page {
    min-height: 100vh;
    background: var(--color-bg);
    display: flex;
    align-items: flex-start;
    padding-top: var(--space-10);
  }

  .confirm-page__card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-md);
    padding: var(--space-8);
    max-width: 560px;
    margin: auto;
    text-align: center;
  }

  .confirm-page__icon {
    width: 3rem;
    height: 3rem;
    border-radius: var(--radius-full);
    background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface));
    color: var(--color-primary);
    font-size: var(--font-size-xl);
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto var(--space-4);
  }

  .confirm-page__title {
    font-size: var(--font-size-2xl);
    margin-bottom: var(--space-2);
  }

  .confirm-page__subtitle {
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    margin-bottom: var(--space-6);
  }

  .summary {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    margin-bottom: var(--space-6);
    text-align: left;
  }

  .summary__section {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4) var(--space-5);
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

  .confirm-page__new-booking {
    font-size: var(--font-size-sm);
    color: var(--color-primary);
    text-decoration: underline;
    text-underline-offset: 2px;

    &:hover { color: var(--color-primary-hover); }
  }
</style>
