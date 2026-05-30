<script lang="ts">
  import Badge from '$lib/components/ui/Badge.svelte'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()

  type Tab = 'upcoming' | 'past'
  let activeTab = $state<Tab>('upcoming')

  const PAGE_SIZE = 3
  let visibleCount = $state(PAGE_SIZE)
  let visiblePastCount = $state(PAGE_SIZE)

  const visibleUpcoming = $derived(data.upcomingBookings.slice(0, visibleCount))
  const hasMore = $derived(visibleCount < data.upcomingBookings.length)

  const visiblePast = $derived(data.pastBookings.slice(0, visiblePastCount))
  const hasPastMore = $derived(visiblePastCount < data.pastBookings.length)

  function switchTab(tab: Tab) {
    activeTab = tab
    visibleCount = PAGE_SIZE
    visiblePastCount = PAGE_SIZE
  }

  function showMore() {
    visibleCount += PAGE_SIZE
  }

  function showMorePast() {
    visiblePastCount += PAGE_SIZE
  }

  function formatPrice(pence: number): string {
    return `£${(pence / 100).toFixed(2)}`
  }

  const bookSlug = $derived(
    data.upcomingBookings.find(b => b.shopSlug)?.shopSlug ?? 'snips-test'
  )

  function eventLabel(reason: string): string {
    if (reason === 'booking_completed') return 'Booking completed'
    return 'Adjustment'
  }
</script>

<svelte:head>
  <title>Your Bookings — Snips</title>
</svelte:head>

<div class="dashboard">
  <header class="dashboard__header">
    <h1>Your Bookings</h1>
    <a href="/account" class="dashboard__account-link">Account settings</a>
  </header>

  <div class="tab-group" role="tablist">
    <button
      role="tab"
      aria-selected={activeTab === 'upcoming'}
      class="tab-btn"
      class:tab-btn--active={activeTab === 'upcoming'}
      onclick={() => switchTab('upcoming')}
    >
      Upcoming
      {#if data.upcomingBookings.length > 0}
        <span class="tab-btn__count">{data.upcomingBookings.length}</span>
      {/if}
    </button>
    <button
      role="tab"
      aria-selected={activeTab === 'past'}
      class="tab-btn"
      class:tab-btn--active={activeTab === 'past'}
      onclick={() => switchTab('past')}
    >
      Past
    </button>
  </div>

  {#if activeTab === 'upcoming'}
    {#if data.upcomingBookings.length === 0}
      <div class="empty">
        <p class="empty__message">You have no upcoming bookings.</p>
        <a href="/book/{bookSlug}" class="empty__cta">Book an appointment</a>
      </div>
    {:else}
      <ul class="bookings">
        {#each visibleUpcoming as booking (booking.id)}
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
              <a href="/booking/{booking.id}" class="booking-card__link">View details &rarr;</a>
            </div>
          </li>
        {/each}
      </ul>

      {#if hasMore}
        <button class="show-more" onclick={showMore}>
          Show more ({data.upcomingBookings.length - visibleCount} remaining)
        </button>
      {/if}
    {/if}
  {/if}

  {#if activeTab === 'past'}
    {#if data.pastBookings.length === 0}
      <div class="empty">
        <p class="empty__message">No past bookings yet.</p>
      </div>
    {:else}
      <ul class="bookings">
        {#each visiblePast as booking (booking.id)}
          <li class="booking-card booking-card--compact">
            <div class="booking-card__top">
              <span class="booking-card__service">{booking.service.name}</span>
              <Badge status={booking.status} />
            </div>

            <span class="booking-card__datetime">{booking.date} &middot; {booking.time}</span>

            <div class="booking-card__footer">
              <a href="/booking/{booking.id}" class="booking-card__link">View details &rarr;</a>
              {#if booking.status === 'completed' && !booking.hasReview}
                <a href="/booking/{booking.id}/review" class="booking-card__review-link">
                  Leave a review
                </a>
              {/if}
            </div>
          </li>
        {/each}
      </ul>

      {#if hasPastMore}
        <button class="show-more" onclick={showMorePast}>
          Show more ({data.pastBookings.length - visiblePastCount} remaining)
        </button>
      {/if}
    {/if}
  {/if}

  {#if data.loyaltyEnabled}
    <div class="points-card">
      <div class="points-card__header">
        <h2 class="points-card__title">Your points</h2>
        <div class="points-balance">
          <span class="points-balance__number">{data.loyaltyPoints}</span>
          <span class="points-balance__label">points</span>
        </div>
      </div>

      {#if data.loyaltyPoints === 0 && data.loyaltyLog.length === 0}
        <p class="points-card__empty">Complete a booking to start earning points.</p>
      {:else if data.loyaltyLog.length > 0}
        <ul class="points-log" role="list">
          {#each data.loyaltyLog as entry (entry.id)}
            <li class="points-log__row">
              <span class="points-log__date">{entry.createdAt}</span>
              <span class="points-log__event">{eventLabel(entry.reason)}</span>
              <span
                class="points-log__change"
                class:points-log__change--positive={entry.change > 0}
                class:points-log__change--negative={entry.change < 0}
              >
                {entry.change > 0 ? `+${entry.change}` : `${entry.change}`} pts
              </span>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
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

  .dashboard__header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-4);
    flex-wrap: wrap;
  }

  .dashboard__header h1 {
    font-size: var(--font-size-2xl);
    font-weight: 700;
  }

  .dashboard__account-link {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    text-decoration: none;
    transition: var(--transition);
    white-space: nowrap;

    &:hover { color: var(--color-text); }
  }

  /* ── Tabs ─────────────────────────────────────────────────── */
  .tab-group {
    display: flex;
    gap: var(--space-2);
    border-bottom: 2px solid var(--color-border);
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: var(--transition);

    &:hover {
      color: var(--color-text);
    }
  }

  .tab-btn--active {
    color: var(--color-primary);
    border-bottom-color: var(--color-primary);
  }

  .tab-btn__count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.25rem;
    height: 1.25rem;
    padding: 0 var(--space-1);
    background: var(--color-primary);
    color: var(--color-on-primary);
    border-radius: var(--radius-full);
    font-size: var(--font-size-xs);
    font-weight: 600;
  }

  /* ── Empty state ──────────────────────────────────────────── */
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

  /* ── Booking cards ────────────────────────────────────────── */
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

  .booking-card--compact {
    gap: var(--space-2);
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
    color: var(--color-text-muted);
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
    display: flex;
    align-items: center;
    gap: var(--space-4);
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

  .booking-card__review-link {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    text-decoration: none;
    margin-left: auto;
    transition: var(--transition);

    &:hover {
      color: var(--color-text);
    }
  }

  /* ── Show more ────────────────────────────────────────────── */
  .show-more {
    width: 100%;
    padding: var(--space-3);
    background: none;
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-lg);
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: var(--transition);

    &:hover {
      border-color: var(--color-text-subtle);
      color: var(--color-text);
    }
  }

  /* ── Points card ───────────────────────────────────────────── */
  .points-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4) var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .points-card__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
  }

  .points-card__title {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .points-balance {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
  }

  .points-balance__number {
    font-size: var(--font-size-2xl);
    font-weight: 700;
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
  }

  .points-balance__label {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .points-card__empty {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  /* ── Mini points log ───────────────────────────────────────── */
  .points-log {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-3);
  }

  .points-log__row {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) 0;
    border-bottom: 1px solid var(--color-border);
    font-size: var(--font-size-sm);

    &:last-child {
      border-bottom: none;
    }
  }

  .points-log__date {
    color: var(--color-text-muted);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    font-size: var(--font-size-xs);
  }

  .points-log__event {
    color: var(--color-text);
  }

  .points-log__change {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .points-log__change--positive {
    color: var(--color-accepted-text);
  }

  .points-log__change--negative {
    color: var(--color-rejected-text);
  }
</style>
