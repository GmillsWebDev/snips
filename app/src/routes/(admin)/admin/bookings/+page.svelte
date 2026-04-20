<script lang="ts">
  import { goto } from '$app/navigation'
  import Badge from '$lib/components/ui/Badge.svelte'
  import type { PageData } from './$types'
  import type { BookingStatus } from './+page.server'

  let { data }: { data: PageData } = $props()

  let openContacts = $state<Record<string, boolean>>({})

  function toggleContact(id: string) {
    openContacts[id] = !openContacts[id]
  }

  function formatPrice(pence: number): string {
    return `£${(pence / 100).toFixed(2)}`
  }

  const STATUS_OPTIONS: { value: BookingStatus; label: string }[] = [
    { value: 'pending',   label: 'Pending'   },
    { value: 'accepted',  label: 'Confirmed' },
    { value: 'rejected',  label: 'Rejected'  },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'no_show',   label: 'No Show'   },
  ]

  let now = $state(Date.now())

  $effect(() => {
    const timer = setInterval(() => { now = Date.now() }, 30_000)
    return () => clearInterval(timer)
  })

  const closestBookingId = $derived.by(() => {
    const active = data.bookings.filter(b => new Date(b.endAt).getTime() > now)
    if (active.length === 0) return null
    return active.reduce((closest, booking) => {
      const closestDiff = Math.abs(new Date(closest.startAt).getTime() - now)
      const thisDiff    = Math.abs(new Date(booking.startAt).getTime() - now)
      return thisDiff < closestDiff ? booking : closest
    }).id
  })

  const hasFilters = $derived(
    data.filters.status !== null ||
    data.filters.date   !== null ||
    data.filters.barber !== null
  )

  function setFilter(key: 'status' | 'date' | 'barber', value: string | null) {
    const params = new URLSearchParams()
    if (data.filters.status) params.set('status', data.filters.status)
    if (data.filters.date)   params.set('date',   data.filters.date)
    if (data.filters.barber) params.set('barber', data.filters.barber)

    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }

    const qs = params.toString()
    goto(qs ? `?${qs}` : '?', { keepFocus: true, noScroll: true })
  }
</script>

<div class="bookings-page">

  <header class="bookings-page__header">
    <h1>Bookings</h1>
    <span class="bookings-page__count">{data.bookings.length} total</span>
  </header>

  <div class="filters">
    <div class="filters__pills">
      <button
        class="filter-pill"
        class:filter-pill--active={!data.filters.status}
        onclick={() => setFilter('status', null)}
      >All</button>
      {#each STATUS_OPTIONS as opt (opt.value)}
        <button
          class="filter-pill filter-pill--{opt.value.replace('_', '-')}"
          class:filter-pill--active={data.filters.status === opt.value}
          onclick={() => setFilter('status', opt.value)}
        >{opt.label}</button>
      {/each}
    </div>

    <div class="filters__controls">
      <input
        type="date"
        class="filter-date"
        class:filter-date--active={data.filters.date !== null}
        value={data.filters.date ?? ''}
        onchange={(e) => setFilter('date', (e.currentTarget as HTMLInputElement).value || null)}
      />

      {#if data.planType === 'multi'}
        <select
          class="filter-select"
          class:filter-select--active={data.filters.barber !== null}
          value={data.filters.barber ?? ''}
          onchange={(e) => setFilter('barber', (e.currentTarget as HTMLSelectElement).value || null)}
        >
          <option value="">All barbers</option>
          {#each data.barbers as barber (barber.id)}
            <option value={barber.id}>{barber.name}</option>
          {/each}
        </select>
      {/if}
    </div>
  </div>

  {#if data.bookings.length === 0}
    <div class="empty-state">
      {#if hasFilters}
        <p class="empty-state__message">No bookings match these filters.</p>
        <p class="empty-state__hint">Try adjusting or clearing the filters above.</p>
      {:else}
        <p class="empty-state__message">No bookings yet.</p>
        <p class="empty-state__hint">Bookings will appear here once customers start making appointments.</p>
      {/if}
    </div>
  {:else}
    <div class="table-wrap">
      <table class="bookings-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Service</th>
            <th>Barber</th>
            <th>Date</th>
            <th>Time</th>
            <th>Status</th>
            <th class="bookings-table__price-col">Price</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each data.bookings as booking (booking.id)}
            <tr class:bookings-table__row--current={booking.id === closestBookingId}>
              <td>
                <div class="customer">
                  <span class="customer__name">{booking.customerName}</span>
                  <button
                    class="customer__toggle"
                    class:customer__toggle--open={openContacts[booking.id]}
                    onclick={() => toggleContact(booking.id)}
                    aria-label={openContacts[booking.id] ? 'Hide contact details' : 'Show contact details'}
                    aria-expanded={openContacts[booking.id] ?? false}
                  >
                    {openContacts[booking.id] ? '×' : '+'}
                  </button>
                </div>
                {#if openContacts[booking.id]}
                  <div class="customer__details">
                    {#if booking.customerEmail}
                      <span class="customer__detail">{booking.customerEmail}</span>
                    {/if}
                    {#if booking.customerPhone}
                      <span class="customer__detail">{booking.customerPhone}</span>
                    {/if}
                  </div>
                {/if}
              </td>
              <td>{booking.serviceName}</td>
              <td>{booking.barberName}</td>
              <td class="bookings-table__date">{booking.date}</td>
              <td class="bookings-table__time">{booking.time}</td>
              <td><Badge status={booking.status} /></td>
              <td class="bookings-table__price">{formatPrice(booking.pricePence)}</td>
              <td class="bookings-table__action">
                <a href="/admin/bookings/{booking.id}" class="view-btn">View</a>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

</div>

<style>
  .bookings-page {
    max-width: 1100px;
    margin: 0 auto;
    padding: var(--space-8) var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .bookings-page__header {
    display: flex;
    align-items: baseline;
    gap: var(--space-4);
  }

  .bookings-page__header h1 {
    font-size: var(--font-size-2xl);
    font-weight: 700;
  }

  .bookings-page__count {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  /* ── Filters ───────────────────────────────────────── */

  .filters {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .filters__pills {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .filters__controls {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    align-items: center;
  }

  /* Status pills */

  .filter-pill {
    padding: var(--space-1) var(--space-3);
    font-size: var(--font-size-sm);
    font-weight: 500;
    border-radius: var(--radius-full);
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text-muted);
    cursor: pointer;
    transition: var(--transition);
    white-space: nowrap;

    &:hover {
      border-color: var(--color-text-subtle);
      color: var(--color-text);
    }
  }

  /* "All" active */
  .filter-pill--active {
    background: var(--color-text);
    color: var(--color-surface);
    border-color: var(--color-text);
  }

  /* Status-specific active states — override the generic active above */
  .filter-pill--pending.filter-pill--active {
    background: var(--color-pending-bg);
    color: var(--color-pending-text);
    border-color: var(--color-pending-text);
  }
  .filter-pill--accepted.filter-pill--active {
    background: var(--color-accepted-bg);
    color: var(--color-accepted-text);
    border-color: var(--color-accepted-text);
  }
  .filter-pill--rejected.filter-pill--active {
    background: var(--color-rejected-bg);
    color: var(--color-rejected-text);
    border-color: var(--color-rejected-text);
  }
  .filter-pill--completed.filter-pill--active {
    background: var(--color-completed-bg);
    color: var(--color-completed-text);
    border-color: var(--color-completed-text);
  }
  .filter-pill--cancelled.filter-pill--active {
    background: var(--color-cancelled-bg);
    color: var(--color-cancelled-text);
    border-color: var(--color-cancelled-text);
  }
  .filter-pill--no-show.filter-pill--active {
    background: var(--color-noshow-bg);
    color: var(--color-noshow-text);
    border-color: var(--color-noshow-text);
  }

  /* Date input & barber select */

  .filter-date,
  .filter-select {
    padding: var(--space-1) var(--space-3);
    font-size: var(--font-size-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text-muted);
    transition: var(--transition);
    cursor: pointer;

    &:hover, &:focus {
      border-color: var(--color-text-subtle);
      color: var(--color-text);
      outline: none;
    }
  }

  .filter-date--active,
  .filter-select--active {
    border-color: var(--color-text-subtle);
    color: var(--color-text);
  }

  /* ── Empty state ───────────────────────────────────── */

  .empty-state {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-12) var(--space-8);
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .empty-state__message {
    font-size: var(--font-size-lg);
    font-weight: 500;
    color: var(--color-text);
  }

  .empty-state__hint {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  /* ── Table ─────────────────────────────────────────── */

  .table-wrap {
    overflow-x: auto;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
  }

  .bookings-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--font-size-sm);
  }

  .bookings-table thead {
    border-bottom: 1px solid var(--color-border);
  }

  .bookings-table th {
    padding: var(--space-3) var(--space-4);
    text-align: left;
    font-weight: 600;
    font-size: var(--font-size-xs);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  .bookings-table td {
    padding: var(--space-3) var(--space-4);
    color: var(--color-text);
    border-bottom: 1px solid var(--color-border);
    vertical-align: middle;
  }

  .bookings-table tbody tr:last-child td {
    border-bottom: none;
  }

  .bookings-table tbody tr {
    transition: var(--transition);

    &:hover {
      background: var(--color-surface-hover);
    }
  }

  .bookings-table__row--current {
    background: var(--color-accepted-bg);

    &:hover {
      background: var(--color-accepted-bg);
    }
  }

  /* ── Customer cell ─────────────────────────────────── */

  .customer {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .customer__name {
    font-weight: 500;
  }

  .customer__toggle {
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;
    border-radius: var(--radius-full);
    border: 1px solid var(--color-border);
    background: var(--color-surface-hover);
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: var(--transition);

    &:hover {
      border-color: var(--color-text-subtle);
      color: var(--color-text);
    }
  }

  .customer__toggle--open {
    background: var(--color-border);
    color: var(--color-text);
  }

  .customer__details {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: var(--space-1);
  }

  .customer__detail {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  /* ── Column styles ─────────────────────────────────── */

  .bookings-table__date {
    white-space: nowrap;
    color: var(--color-text-muted);
  }

  .bookings-table__time {
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    font-weight: 500;
  }

  .bookings-table__price-col {
    text-align: right;
  }

  .bookings-table__price {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-weight: 500;
  }

  .bookings-table__action {
    width: 1px;
    white-space: nowrap;
    padding-left: 0;
  }

  .view-btn {
    font-size: var(--font-size-xs);
    font-weight: 500;
    color: var(--color-text-muted);
    text-decoration: none;
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    transition: var(--transition);
    white-space: nowrap;

    &:hover {
      color: var(--color-text);
      border-color: var(--color-text-subtle);
      background: var(--color-surface-hover);
    }
  }
</style>
