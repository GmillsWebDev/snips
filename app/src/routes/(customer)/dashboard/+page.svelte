<script lang="ts">
  import Badge from '$lib/components/ui/Badge.svelte'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()

  function formatPrice(pence: number): string {
    return `£${(pence / 100).toFixed(2)}`
  }

  const bookSlug = $derived(
    data.bookings.find(b => b.shopSlug)?.shopSlug ?? 'snips-test'
  )
</script>

<svelte:head>
  <title>Your Bookings — Snips</title>
</svelte:head>

<div class="dashboard">
  <header class="dashboard__header">
    <h1>Your Bookings</h1>
  </header>

  {#if data.bookings.length === 0}
    <div class="empty">
      <p class="empty__message">You have no upcoming bookings.</p>
      <a href="/book/{bookSlug}" class="empty__cta">Book an appointment</a>
    </div>
  {:else}
    <ul class="bookings">
      {#each data.bookings as booking (booking.id)}
        <li class="booking-card">
          <div class="booking-card__top">
            <span class="booking-card__service">{booking.service.name}</span>
            <Badge status={booking.status} />
          </div>

          <div class="booking-card__meta">
            <span class="booking-card__datetime">{booking.date} &middot; {booking.time}</span>
            <span class="booking-card__detail">
              {booking.service.durationMinutes} min
              &middot;
              {formatPrice(booking.service.pricePence)}
            </span>
            <span class="booking-card__barber">with {booking.barberName}</span>
          </div>

          <div class="booking-card__footer">
            <a href="/bookings/{booking.id}" class="booking-card__link">View details &rarr;</a>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .dashboard {
    max-width: 680px;
    margin: 0 auto;
    padding: var(--space-8) var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .dashboard__header h1 {
    font-size: var(--font-size-2xl);
    font-weight: 700;
  }

  .empty {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-12) var(--space-8);
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
  }

  .empty__message {
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }

  .empty__cta {
    display: inline-block;
    padding: var(--space-2) var(--space-6);
    background: var(--color-primary);
    color: var(--color-on-primary);
    border-radius: var(--radius-md);
    text-decoration: none;
    font-size: var(--font-size-sm);
    font-weight: 500;
    transition: var(--transition);

    &:hover {
      background: var(--color-primary-hover);
    }
  }

  .bookings {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .booking-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4) var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .booking-card__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
  }

  .booking-card__service {
    font-size: var(--font-size-md);
    font-weight: 600;
    color: var(--color-text);
  }

  .booking-card__meta {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .booking-card__datetime {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-text);
  }

  .booking-card__detail {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .booking-card__barber {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .booking-card__footer {
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-3);
  }

  .booking-card__link {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-primary);
    text-decoration: none;
    transition: var(--transition);

    &:hover {
      color: var(--color-primary-hover);
    }
  }
</style>
