<script lang="ts">
  import { enhance } from '$app/forms'
  import Button from '$lib/components/ui/Button.svelte'
  import type { PageData, ActionData } from './$types'

  let { data, form }: { data: PageData; form: ActionData } = $props()

  let adjustSubmitting = $state(false)
  let customerLoyaltyPoints = $state(data.customer.loyaltyPoints)
  let confirmingTierId = $state<string | null>(null)
  let redeemSubmitting = $state(false)
  let redeemResult = $state<{ tierName: string; newBalance: number } | null>(null)

  $effect(() => {
    customerLoyaltyPoints = data.customer.loyaltyPoints
  })

  function eventLabel(reason: string, serviceName: string | null, note: string | null = null): string {
    if (reason === 'booking_completed') return `Earned — ${serviceName ?? 'booking'}`
    if (reason === 'redeemed') return `Redeemed — ${note ?? 'reward'}`
    return 'Manual adjustment'
  }
</script>

<svelte:head>
  <title>{data.customer.firstName} {data.customer.lastName} — Snips Admin</title>
</svelte:head>

<div class="detail-page">

  <nav class="detail-page__nav">
    <a href="/admin/customers" class="back-link">← Customers</a>
  </nav>

  <header class="detail-page__header">
    <h1>{data.customer.firstName} {data.customer.lastName}</h1>
    <p class="detail-page__meta">Customer since {data.customer.createdAt}</p>
  </header>

  <section class="card">
    <h2 class="card__title">Contact</h2>
    <dl class="detail-list">
      {#if data.customer.email}
        <dt>Email</dt>
        <dd><a href="mailto:{data.customer.email}">{data.customer.email}</a></dd>
      {/if}
      {#if data.customer.phone}
        <dt>Phone</dt>
        <dd><a href="tel:{data.customer.phone}">{data.customer.phone}</a></dd>
      {/if}
    </dl>
  </section>

  {#if data.loyaltyEnabled}
    <section class="card loyalty-panel">
      <div class="loyalty-panel__header">
        <h2 class="card__title">Loyalty Points</h2>
        <div class="loyalty-balance">
          <span class="loyalty-balance__number">{customerLoyaltyPoints}</span>
          <span class="loyalty-balance__label">points</span>
        </div>
      </div>

      <!-- Manual adjustment -->
      <div class="adjust-section">
        <h3 class="adjust-section__title">Manual Adjustment</h3>
        <form
          method="POST"
          action="?/adjustPoints"
          use:enhance={() => {
            adjustSubmitting = true
            return async ({ update }) => {
              adjustSubmitting = false
              await update()
            }
          }}
        >
          <div class="adjust-fields">
            <div class="field-group">
              <label class="field-label" for="adjustment">Adjust points</label>
              <input
                id="adjustment"
                name="adjustment"
                type="number"
                class="field-input"
                placeholder="e.g. 10 or -5"
                step="1"
                disabled={adjustSubmitting}
              />
            </div>
            <div class="field-group">
              <label class="field-label" for="note">Note (optional)</label>
              <input
                id="note"
                name="note"
                type="text"
                class="field-input"
                placeholder="Reason for adjustment"
                disabled={adjustSubmitting}
              />
            </div>
          </div>

          {#if form?.adjustSuccess}
            <p class="adjust-success">Points updated successfully.</p>
          {/if}
          {#if form?.message}
            <p class="adjust-error">{form.message}</p>
          {/if}

          <div class="adjust-section__footer">
            <Button type="submit" size="sm" edges="soft" disabled={adjustSubmitting} loading={adjustSubmitting}>
              {adjustSubmitting ? 'Applying…' : 'Apply adjustment'}
            </Button>
          </div>
        </form>
      </div>

      <!-- Redeem points -->
      {#if data.rewardTiers.length > 0}
        <div class="redeem-section">
          <h3 class="redeem-section__title">Redeem Points</h3>

          {#if redeemResult}
            <p class="redeem-success">
              Redeemed — {redeemResult.tierName}. New balance: {redeemResult.newBalance} points.
            </p>
          {/if}

          {#if form?.redeemError}
            <p class="adjust-error">{form.redeemError}</p>
          {/if}

          <ul class="redeem-tiers">
            {#each data.rewardTiers as tier (tier.id)}
              {@const canRedeem = customerLoyaltyPoints >= tier.points_required}
              <li class="redeem-tier-item">
                <button
                  type="button"
                  class="redeem-tier-btn"
                  class:redeem-tier-btn--insufficient={!canRedeem}
                  disabled={!canRedeem || redeemSubmitting}
                  onclick={() => { confirmingTierId = confirmingTierId === tier.id ? null : tier.id }}
                >
                  <span class="redeem-tier-btn__info">
                    <span class="redeem-tier-btn__name">{tier.name}</span>
                    <span class="redeem-tier-btn__pts">{tier.points_required} pts</span>
                    <span class="redeem-tier-btn__desc">{tier.reward_description}</span>
                  </span>
                  {#if !canRedeem}
                    <span class="redeem-tier-btn__insufficient">Insufficient points</span>
                  {/if}
                </button>

                {#if confirmingTierId === tier.id && canRedeem}
                  <div class="confirm-redeem">
                    <p class="confirm-redeem__text">
                      Redeem {tier.points_required} pts for <strong>{tier.name}</strong>?
                      Customer will have <strong>{customerLoyaltyPoints - tier.points_required}</strong> pts after redemption.
                    </p>
                    <div class="confirm-redeem__actions">
                      <form
                        method="POST"
                        action="?/redeemPoints"
                        use:enhance={() => {
                          redeemSubmitting = true
                          return async ({ result, update }) => {
                            redeemSubmitting = false
                            confirmingTierId = null
                            if (result.type === 'success') {
                              const d = result.data as Record<string, unknown>
                              if (d?.redeemSuccess) {
                                customerLoyaltyPoints = d.newBalance as number
                                redeemResult = { tierName: d.tierName as string, newBalance: d.newBalance as number }
                                setTimeout(() => { redeemResult = null }, 5000)
                              }
                            }
                            await update()
                          }
                        }}
                      >
                        <input type="hidden" name="tierId" value={tier.id} />
                        <Button type="submit" size="sm" edges="soft" disabled={redeemSubmitting} loading={redeemSubmitting}>
                          {redeemSubmitting ? 'Processing…' : 'Confirm'}
                        </Button>
                      </form>
                      <button
                        type="button"
                        class="confirm-redeem__cancel"
                        onclick={() => { confirmingTierId = null }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                {/if}
              </li>
            {/each}
          </ul>
        </div>
      {/if}

      <!-- Points history -->
      <div class="points-log">
        <h3 class="points-log__title">Points History</h3>
        {#if data.loyaltyLog.length === 0}
          <p class="points-log__empty">No points history yet.</p>
        {:else}
          <table class="log-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Event</th>
                <th class="log-table__col--right">Points</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {#each data.loyaltyLog as entry (entry.id)}
                <tr>
                  <td class="log-table__date">{entry.createdAt}</td>
                  <td>{eventLabel(entry.reason, entry.serviceName, entry.note)}</td>
                  <td
                    class="log-table__points log-table__col--right"
                    class:log-table__points--positive={entry.change > 0}
                    class:log-table__points--negative={entry.change < 0 && entry.reason !== 'redeemed'}
                    class:log-table__points--redeemed={entry.change < 0 && entry.reason === 'redeemed'}
                  >
                    {entry.change > 0 ? `+${entry.change}` : `${entry.change}`}
                  </td>
                  <td class="log-table__note">{entry.note ?? '—'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      </div>
    </section>
  {/if}

</div>

<style>
  .detail-page {
    max-width: 760px;
    margin: 0 auto;
    padding: var(--space-8) var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  /* ── Nav ──────────────────────────────────────── */

  .back-link {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    text-decoration: none;
    transition: var(--transition);

    &:hover {
      color: var(--color-text);
    }
  }

  /* ── Header ───────────────────────────────────── */

  .detail-page__header h1 {
    font-size: var(--font-size-2xl);
    font-weight: 700;
  }

  .detail-page__meta {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    margin-top: var(--space-1);
  }

  /* ── Card ─────────────────────────────────────── */

  .card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4) var(--space-6);
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

  /* ── Detail list ──────────────────────────────── */

  .detail-list {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-1) var(--space-4);
    align-items: baseline;
    font-size: var(--font-size-sm);
  }

  .detail-list dt {
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  .detail-list dd {
    color: var(--color-text);
    font-weight: 500;

    a {
      color: var(--color-text);
      text-decoration: underline;

      &:hover {
        text-decoration: none;
      }
    }
  }

  /* ── Loyalty panel ────────────────────────────── */

  .loyalty-panel__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
  }

  .loyalty-balance {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
  }

  .loyalty-balance__number {
    font-size: var(--font-size-3xl);
    font-weight: 700;
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
  }

  .loyalty-balance__label {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  /* ── Manual adjustment ────────────────────────── */

  .adjust-section {
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .adjust-section__title {
    font-size: var(--font-size-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
  }

  .adjust-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
  }

  @media (max-width: 520px) {
    .adjust-fields {
      grid-template-columns: 1fr;
    }
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .field-label {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-muted);
  }

  .field-input {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-family: var(--font-sans);
    color: var(--color-text);
    background: var(--color-bg);
    transition: var(--transition);
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .adjust-section__footer {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .adjust-success {
    font-size: var(--font-size-sm);
    color: var(--color-accepted-text);
  }

  .adjust-error {
    font-size: var(--font-size-sm);
    color: var(--color-rejected-text);
    background: var(--color-rejected-bg);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-3);
  }

  /* ── Points history ───────────────────────────── */

  .points-log {
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .points-log__title {
    font-size: var(--font-size-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
  }

  .points-log__empty {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .log-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--font-size-sm);
  }

  .log-table thead th {
    font-size: var(--font-size-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-muted);
    text-align: left;
    padding: var(--space-1) var(--space-2) var(--space-2);
    border-bottom: 1px solid var(--color-border);
  }

  .log-table tbody tr {
    border-bottom: 1px solid var(--color-border);

    &:last-child {
      border-bottom: none;
    }
  }

  .log-table tbody td {
    padding: var(--space-2);
    color: var(--color-text);
    vertical-align: middle;
  }

  .log-table__col--right {
    text-align: right;
  }

  .log-table__date {
    color: var(--color-text-muted);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .log-table__points {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .log-table__points--positive {
    color: var(--color-accepted-text);
  }

  .log-table__points--negative {
    color: var(--color-rejected-text);
  }

  .log-table__points--redeemed {
    color: #d97706;
  }

  .log-table__note {
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
  }

  /* ── Redeem section ───────────────────────────────── */

  .redeem-section {
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .redeem-section__title {
    font-size: var(--font-size-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
  }

  .redeem-success {
    font-size: var(--font-size-sm);
    color: var(--color-accepted-text);
    background: var(--color-accepted-bg);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-3);
  }

  .redeem-tiers {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .redeem-tier-item {
    display: flex;
    flex-direction: column;
  }

  .redeem-tier-btn {
    width: 100%;
    text-align: left;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: none;
    cursor: pointer;
    transition: var(--transition);
    display: flex;
    align-items: center;
    gap: var(--space-3);
    font-family: var(--font-sans);

    &:hover:not(:disabled) {
      border-color: var(--color-primary);
      background: var(--color-bg);
    }

    &:disabled {
      cursor: not-allowed;
    }

    &--insufficient {
      opacity: 0.55;
    }
  }

  .redeem-tier-btn__info {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex: 1;
    flex-wrap: wrap;
  }

  .redeem-tier-btn__name {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
  }

  .redeem-tier-btn__pts {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  .redeem-tier-btn__desc {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .redeem-tier-btn__insufficient {
    font-size: var(--font-size-xs);
    color: var(--color-rejected-text);
    margin-left: auto;
    white-space: nowrap;
  }

  .confirm-redeem {
    padding: var(--space-3) var(--space-3);
    background: var(--color-bg);
    border: 1px solid var(--color-primary);
    border-top: none;
    border-radius: 0 0 var(--radius-md) var(--radius-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .confirm-redeem__text {
    font-size: var(--font-size-sm);
    color: var(--color-text);
    line-height: 1.5;
  }

  .confirm-redeem__actions {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .confirm-redeem__cancel {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    text-decoration: underline;
    font-family: var(--font-sans);

    &:hover {
      color: var(--color-text);
    }
  }
</style>
