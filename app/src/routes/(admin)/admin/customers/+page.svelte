<script lang="ts">
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()

  let query = $state('')

  const filtered = $derived.by(() => {
    const q = query.trim().toLowerCase()
    if (!q) return data.customers
    return data.customers.filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    )
  })

  function formatDate(iso: string | null): string {
    if (!iso) return '—'
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Europe/London',
    }).format(new Date(iso))
  }
</script>

<svelte:head>
  <title>Customers — Snips Admin</title>
</svelte:head>

<div class="customers-page">

  <header class="customers-page__header">
    <h1>Customers</h1>
    <span class="customers-page__count">{data.customers.length} total</span>
  </header>

  <div class="controls">
    <input
      type="search"
      class="search-input"
      placeholder="Search by name or email…"
      bind:value={query}
    />
  </div>

  {#if data.customers.length === 0}
    <div class="empty-state">
      <p class="empty-state__message">No customers yet.</p>
      <p class="empty-state__hint">Customers will appear here once the first booking is made.</p>
    </div>
  {:else if filtered.length === 0}
    <div class="empty-state">
      <p class="empty-state__message">No customers match "{query}".</p>
    </div>
  {:else}
    <div class="table-wrap">
      <table class="customers-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th class="customers-table__num-col">Bookings</th>
            <th>Last visit</th>
            {#if data.loyaltyEnabled}
              <th class="customers-table__num-col">Points</th>
            {/if}
            <th>Type</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each filtered as customer (customer.id)}
            <tr>
              <td class="customers-table__name">
                <a href="/admin/customers/{customer.id}">
                  {customer.firstName} {customer.lastName}
                </a>
              </td>
              <td class="customers-table__muted">{customer.email || '—'}</td>
              <td class="customers-table__muted">{customer.phone || '—'}</td>
              <td class="customers-table__num">{customer.totalBookings}</td>
              <td class="customers-table__muted customers-table__nowrap">
                {formatDate(customer.lastBookingAt)}
              </td>
              {#if data.loyaltyEnabled}
                <td class="customers-table__num">{customer.loyaltyPoints}</td>
              {/if}
              <td>
                <span class="type-badge type-badge--{customer.isGuest ? 'guest' : 'member'}">
                  {customer.isGuest ? 'Guest' : 'Member'}
                </span>
              </td>
              <td class="customers-table__action">
                <a href="/admin/customers/{customer.id}" class="view-btn">View</a>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

</div>

<style>
  .customers-page {
    max-width: 1100px;
    margin: 0 auto;
    padding: var(--space-8) var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .customers-page__header {
    display: flex;
    align-items: baseline;
    gap: var(--space-4);
  }

  .customers-page__header h1 {
    font-size: var(--font-size-2xl);
    font-weight: 700;
  }

  .customers-page__count {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  /* ── Search ────────────────────────────────────── */

  .controls {
    display: flex;
    align-items: center;
  }

  .search-input {
    width: 100%;
    max-width: 320px;
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-size-sm);
    font-family: var(--font-sans);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text);
    transition: var(--transition);

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    &::placeholder {
      color: var(--color-text-subtle);
    }
  }

  /* ── Empty state ───────────────────────────────── */

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

  /* ── Table ─────────────────────────────────────── */

  .table-wrap {
    overflow-x: auto;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
  }

  .customers-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--font-size-sm);
  }

  .customers-table thead {
    border-bottom: 1px solid var(--color-border);
  }

  .customers-table th {
    padding: var(--space-3) var(--space-4);
    text-align: left;
    font-weight: 600;
    font-size: var(--font-size-xs);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  .customers-table td {
    padding: var(--space-3) var(--space-4);
    color: var(--color-text);
    border-bottom: 1px solid var(--color-border);
    vertical-align: middle;
  }

  .customers-table tbody tr:last-child td {
    border-bottom: none;
  }

  .customers-table tbody tr {
    transition: var(--transition);

    &:hover {
      background: var(--color-surface-hover);
    }
  }

  /* ── Column styles ─────────────────────────────── */

  .customers-table__name a {
    font-weight: 500;
    color: var(--color-text);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  .customers-table__muted {
    color: var(--color-text-muted);
  }

  .customers-table__nowrap {
    white-space: nowrap;
  }

  .customers-table__num-col {
    text-align: right;
  }

  .customers-table__num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .customers-table__action {
    width: 1px;
    white-space: nowrap;
    padding-left: 0;
  }

  /* ── Type badge ────────────────────────────────── */

  .type-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px var(--space-2);
    border-radius: var(--radius-full);
    font-size: var(--font-size-xs);
    font-weight: 500;
    white-space: nowrap;
  }

  .type-badge--member {
    background: var(--color-accepted-bg);
    color: var(--color-accepted-text);
  }

  .type-badge--guest {
    background: var(--color-surface-hover);
    color: var(--color-text-muted);
    border: 1px solid var(--color-border);
  }

  /* ── View button ───────────────────────────────── */

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
