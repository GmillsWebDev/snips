<script lang="ts">
  import Badge from '$lib/components/ui/Badge.svelte'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()

  const today = new Date().toLocaleDateString('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
</script>

<div class="dashboard" style={data.brandColour ? `--color-brand: ${data.brandColour}` : ''}>

  <header class="dashboard__header">
    <h1>Today</h1>
    <span class="dashboard__date">{today}</span>
  </header>

  <div class="stats">
    {#each [
      { value: data.stats.total,     label: 'Total',     mod: 'brand'     },
      { value: data.stats.pending,   label: 'Pending',   mod: 'pending'   },
      { value: data.stats.accepted,  label: 'Confirmed', mod: 'accepted'  },
      { value: data.stats.completed, label: 'Completed', mod: 'completed' },
    ] as stat (stat.label)}
      <div class="stats__card">
        <span class="stats__value stats__value--{stat.mod}">{stat.value}</span>
        <span class="stats__label">{stat.label}</span>
      </div>
    {/each}
  </div>

  {#if data.needsAttention.length > 0}
    <section class="attention">
      <h2 class="attention__title">Needs attention ({data.needsAttention.length})</h2>
      <div class="attention__rows">
        {#each data.needsAttention as booking (booking.id)}
          <a href="/admin/bookings/{booking.id}" class="booking-row booking-row--attention">
            <span class="booking-row__time">{booking.time}</span>
            <span class="booking-row__name">{booking.customerName}</span>
            <span class="booking-row__service">{booking.serviceName}</span>
            <Badge status={booking.status} />
          </a>
        {/each}
      </div>
    </section>
  {/if}

  <section class="bookings">
    <h2 class="bookings__title">All bookings</h2>
    {#if data.bookings.length === 0}
      <p class="bookings__empty">No bookings scheduled for today.</p>
    {:else}
      {#each data.bookings as booking (booking.id)}
        <a href="/admin/bookings/{booking.id}" class="booking-row">
          <span class="booking-row__time">{booking.time}</span>
          <span class="booking-row__name">{booking.customerName}</span>
          <span class="booking-row__service">{booking.serviceName}</span>
          <Badge status={booking.status} />
        </a>
      {/each}
    {/if}
  </section>

</div>

<style>
  .dashboard {
    --color-brand: var(--color-primary);
    max-width: 800px;
    margin: 0 auto;
    padding: var(--space-8) var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

  .dashboard__header {
    display: flex;
    align-items: baseline;
    gap: var(--space-4);
  }

  .dashboard__header h1 {
    font-size: var(--font-size-2xl);
    font-weight: 700;
  }

  .dashboard__date {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-4);
  }

  .stats__card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4) var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .stats__value {
    font-size: var(--font-size-2xl);
    font-weight: 700;
    line-height: 1;
  }

  .stats__value--brand     { color: var(--color-brand); }
  .stats__value--pending   { color: var(--color-pending-text); }
  .stats__value--accepted  { color: var(--color-accepted-text); }
  .stats__value--completed { color: var(--color-completed-text); }

  .stats__label {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .attention {
    background: var(--color-pending-bg);
    border: 1px solid var(--color-pending-text);
    border-radius: var(--radius-lg);
    padding: var(--space-4) var(--space-6);
  }

  .attention__title {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-pending-text);
    margin-bottom: var(--space-3);
  }

  .attention__rows,
  .bookings {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .bookings {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4) var(--space-6);
  }

  .bookings__title {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: var(--space-3);
  }

  .bookings__empty {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .booking-row {
    display: grid;
    grid-template-columns: 3.5rem 1fr 1fr auto;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    text-decoration: none;
    color: var(--color-text);
    transition: var(--transition);

    &:hover {
      background: var(--color-surface-hover);
      border-color: var(--color-text-subtle);
    }
  }

  .booking-row--attention {
    border-color: var(--color-pending-text);
    background: transparent;
  }

  .booking-row__time {
    font-size: var(--font-size-sm);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .booking-row__name {
    font-size: var(--font-size-sm);
    font-weight: 500;
  }

  .booking-row__service {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }
</style>
