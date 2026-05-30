<script lang="ts">
  import { enhance } from '$app/forms'
  import Badge from '$lib/components/ui/Badge.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import type { PageData, ActionData } from './$types'

  import chevron from '$lib/assets/icons/chevronDown.svg'

  let { data, form }: { data: PageData; form: ActionData } = $props()

  let submitting = $state<'accept' | 'reject' | 'complete' | 'noshow' | null>(null)

  let notesOpen = $state(false)
  let notesText = $state(data.booking.internalNotes ?? '')
  let notesSubmitting = $state(false)
  let notesSaved = $state(false)

  let loyaltyPoints = $state(data.customerLoyaltyPoints)
  let confirmingTierId = $state<string | null>(null)
  let redeemSubmitting = $state(false)
  let redeemResult = $state<{ tierName: string; newBalance: number } | null>(null)

  $effect(() => {
    notesText = data.booking.internalNotes ?? ''
  })

  $effect(() => {
    loyaltyPoints = data.customerLoyaltyPoints
  })

  function formatPrice(pence: number): string {
    return `£${(pence / 100).toFixed(2)}`
  }
</script>

<div class="detail-page">

  <nav class="detail-page__nav">
    <a href={data.backHref} class="back-link">← All bookings</a>
  </nav>

  <header class="detail-page__header">
    <div class="detail-page__title-row">
      <h1>{data.booking.service.name}</h1>
      <Badge status={data.booking.status} />
    </div>
    <p class="detail-page__date">{data.booking.date}</p>
  </header>
  <!-- ── Actions ─────────────────────────────────────── -->
  {#if data.booking.status === 'pending'}
    <section class="actions-panel">
      <h2 class="actions-panel__title">Actions</h2>

      {#if form?.error}
        <p class="actions-panel__error">{form.error}</p>
      {/if}

      <div class="actions-panel__buttons">
        <form
          method="post"
          action="?/accept"
          use:enhance={() => {
            submitting = 'accept'
            return async ({ update }) => {
              submitting = null
              await update()
            }
          }}
        >
          <Button
            type="submit"
            variant="accept"
            size="md"
            edges="soft"
            disabled={submitting !== null}
            loading={submitting === 'accept'}
          >
            {submitting === 'accept' ? 'Accepting…' : 'Accept booking'}
          </Button>
        </form>

        <form
          method="post"
          action="?/reject"
          use:enhance={() => {
            submitting = 'reject'
            return async ({ update }) => {
              submitting = null
              await update()
            }
          }}
        >
          <Button
            type="submit"
            variant="reject"
            size="md"
            edges="soft"
            disabled={submitting !== null}
            loading={submitting === 'reject'}
          >
            {submitting === 'reject' ? 'Rejecting…' : 'Reject booking'}
          </Button>
        </form>
      </div>
    </section>

  {:else if data.booking.status === 'accepted'}
    <section class="actions-panel">
      <h2 class="actions-panel__title">Actions</h2>

      {#if form?.error}
        <p class="actions-panel__error">{form.error}</p>
      {/if}

      <div class="actions-panel__buttons">
        <form
          method="post"
          action="?/complete"
          use:enhance={() => {
            submitting = 'complete'
            return async ({ update }) => {
              submitting = null
              await update()
            }
          }}
        >
          <Button
            type="submit"
            variant="accept"
            size="md"
            edges="soft"
            disabled={submitting !== null}
            loading={submitting === 'complete'}
          >
            {submitting === 'complete' ? 'Saving…' : 'Mark as completed'}
          </Button>
        </form>

        <form
          method="post"
          action="?/noshow"
          use:enhance={() => {
            submitting = 'noshow'
            return async ({ update }) => {
              submitting = null
              await update()
            }
          }}
        >
          <Button
            type="submit"
            variant="reject"
            size="md"
            edges="soft"
            disabled={submitting !== null}
            loading={submitting === 'noshow'}
          >
            {submitting === 'noshow' ? 'Saving…' : 'Mark as no-show'}
          </Button>
        </form>
      </div>
    </section>

  {:else if data.booking.status === 'rejected' || data.booking.status === 'completed' || data.booking.status === 'no_show'}
    <section class="actions-panel actions-panel--resolved">
      <Badge status={data.booking.status} />
      <span class="actions-panel__resolved-note">
        Status updated {data.booking.updatedAt}
      </span>
    </section>
  {/if}

  <div class="detail-grid">

    <!-- ── Customer ───────────────────────────────────── -->
    <section class="card">
      <h2 class="card__title">Customer</h2>
      <dl class="detail-list">
        <dt>Name</dt>
        <dd>
          <a href="/admin/customers/{data.booking.customerId}" class="customer-link">
            {data.booking.customer.name}
          </a>
        </dd>
        {#if data.booking.customer.email}
          <dt>Email</dt>
          <dd><a href="mailto:{data.booking.customer.email}">{data.booking.customer.email}</a></dd>
        {/if}
        {#if data.booking.customer.phone}
          <dt>Phone</dt>
          <dd><a href="tel:{data.booking.customer.phone}">{data.booking.customer.phone}</a></dd>
        {/if}
      </dl>
    </section>

    <!-- ── Appointment ────────────────────────────────── -->
    <section class="card">
      <h2 class="card__title">Appointment</h2>
      <dl class="detail-list">
        <dt>Date</dt>
        <dd>{data.booking.date}</dd>
        <dt>Time</dt>
        <dd>{data.booking.startTime} – {data.booking.endTime}</dd>
        <dt>Barber</dt>
        <dd>{data.booking.barberName}</dd>
        <dt>Chair</dt>
        <dd>{data.booking.chairLabel}</dd>
      </dl>
    </section>

    <!-- ── Service ────────────────────────────────────── -->
    <section class="card">
      <h2 class="card__title">Service</h2>
      <dl class="detail-list">
        <dt>Service</dt>
        <dd>{data.booking.service.name}</dd>
        <dt>Duration</dt>
        <dd>{data.booking.service.durationMinutes} min</dd>
        <dt>Price</dt>
        <dd>{formatPrice(data.booking.service.pricePence)}</dd>
        {#if data.booking.depositPaidPence > 0}
          <dt>Deposit paid</dt>
          <dd>{formatPrice(data.booking.depositPaidPence)}</dd>
        {/if}
      </dl>
    </section>

    <!-- ── Meta ───────────────────────────────────────── -->
    <section class="card">
      <h2 class="card__title">Booking info</h2>
      <dl class="detail-list">
        <dt>Booked at</dt>
        <dd>{data.booking.createdAt}</dd>
        <dt>Booking ID</dt>
        <dd class="detail-list__id">{data.booking.id}</dd>
      </dl>
    </section>

    <!-- ── Notes (conditional) ───────────────────────── -->
    {#if data.booking.notes || data.booking.cancellationReason}
      <section class="card card--full">
        <h2 class="card__title">Notes</h2>
        <dl class="detail-list">
          {#if data.booking.notes}
            <dt>Customer notes</dt>
            <dd>{data.booking.notes}</dd>
          {/if}
          {#if data.booking.cancellationReason}
            <dt>Cancellation reason</dt>
            <dd>{data.booking.cancellationReason}</dd>
          {/if}
        </dl>
      </section>
    {/if}

    <!-- ── Review (completed bookings only) ──────────── -->
    {#if data.booking.status === 'completed'}
      <section class="card card--full">
        <h2 class="card__title">Review</h2>

        {#if data.review}
          <div class="review">
            <div class="review__stars" aria-label="Rating: {data.review.rating} out of 5">
              {#each [1, 2, 3, 4, 5] as star}
                <span class="review__star" class:review__star--filled={star <= data.review.rating}>★</span>
              {/each}
            </div>

            {#if data.review.comment}
              <p class="review__comment">{data.review.comment}</p>
            {:else}
              <p class="review__no-comment">No comment left</p>
            {/if}

            <p class="review__date">Submitted {data.review.createdAt}</p>
          </div>
        {:else}
          <p class="review__empty">No review left for this booking.</p>
        {/if}
      </section>
    {/if}

  </div>

  <div class="side-panels">
    <!-- ── Other bookings (conditional) ─────────────── -->
    {#if data.relatedBookings.upcoming || data.relatedBookings.previous.length > 0}
      <section class="card">
        <h2 class="card__title">Other bookings for {data.booking.customer.name}</h2>

        <div class="related">
          {#if data.relatedBookings.upcoming}
            <div class="related__group">
              <span class="related__label">Next booking</span>
              <a href="/admin/bookings/{data.relatedBookings.upcoming.id}" class="related-row">
                <span class="related-row__when">
                  {data.relatedBookings.upcoming.date} · {data.relatedBookings.upcoming.time}
                </span>
                <span class="related-row__service">{data.relatedBookings.upcoming.serviceName}</span>
                <Badge status={data.relatedBookings.upcoming.status} />
              </a>
            </div>
          {/if}

          {#if data.relatedBookings.previous.length > 0}
            <div class="related__group">
              <span class="related__label">Previous visits</span>
              {#each data.relatedBookings.previous as b (b.id)}
                <a href="/admin/bookings/{b.id}" class="related-row">
                  <span class="related-row__when">{b.date} · {b.time}</span>
                  <span class="related-row__service">{b.serviceName}</span>
                  <Badge status={b.status} />
                </a>
              {/each}
            </div>
          {/if}
        </div>
      </section>
    {/if}

    <!-- ── Notification history ───────────────────────── -->
    <section class="notes-panel" class:side-panels__solo={!(data.relatedBookings.upcoming || data.relatedBookings.previous.length > 0)}>
      <div class="notes-panel__toggle" style="cursor: default;">
        <span class="notes-panel__toggle-label">
          Notification history
          <span class="notes-panel__subtitle">— emails sent for this booking</span>
        </span>
      </div>

      {#if data.notifications.length === 0}
        <p class="review__empty">No notifications sent yet.</p>
      {:else}
        <div class="notif-list">
          {#each data.notifications as n (n.id)}
            <div class="notif-row">
              <span class="notif-row__type">{n.type.replace(/_/g, ' ')}</span>
              <span class="notif-row__channel">{n.channel}</span>
              <span class="notif-row__when">{n.sentAt}</span>
              <span
                class="notif-row__status"
                class:notif-row__status--sent={n.status === 'sent'}
              >{n.status}</span>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  </div>

  <!-- ── Loyalty Redemption ─────────────────────────── -->
  {#if data.loyaltyEnabled && data.rewardTiers.length > 0}
    <section class="card redemption-panel">
      <h2 class="card__title">Loyalty Redemption</h2>

      <div class="redemption-balance">
        <span class="redemption-balance__pts">{loyaltyPoints}</span>
        <span class="redemption-balance__label">points available</span>
      </div>

      {#if redeemResult}
        <p class="redemption-success">
          Redeemed — {redeemResult.tierName}. New balance: {redeemResult.newBalance} points.
        </p>
      {/if}

      {#if form?.redeemError}
        <p class="redemption-error">{form.redeemError}</p>
      {/if}

      <ul class="redemption-tiers">
        {#each data.rewardTiers as tier (tier.id)}
          {@const canRedeem = loyaltyPoints >= tier.points_required}
          <li class="redemption-tier-item">
            <button
              type="button"
              class="redemption-tier-btn"
              class:redemption-tier-btn--insufficient={!canRedeem}
              disabled={!canRedeem || redeemSubmitting}
              onclick={() => { confirmingTierId = confirmingTierId === tier.id ? null : tier.id }}
            >
              <span class="redemption-tier-btn__info">
                <span class="redemption-tier-btn__name">{tier.name}</span>
                <span class="redemption-tier-btn__pts">{tier.points_required} pts</span>
                <span class="redemption-tier-btn__desc">{tier.reward_description}</span>
              </span>
              {#if !canRedeem}
                <span class="redemption-tier-btn__insufficient">Insufficient points</span>
              {/if}
            </button>

            {#if confirmingTierId === tier.id && canRedeem}
              <div class="confirm-redeem">
                <p class="confirm-redeem__text">
                  Redeem {tier.points_required} pts for <strong>{tier.name}</strong>?
                  Customer will have <strong>{loyaltyPoints - tier.points_required}</strong> pts after redemption.
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
                            loyaltyPoints = d.newBalance as number
                            redeemResult = { tierName: d.tierName as string, newBalance: d.newBalance as number }
                            setTimeout(() => { redeemResult = null }, 5000)
                          }
                        }
                        await update()
                      }
                    }}
                  >
                    <input type="hidden" name="tierId" value={tier.id} />
                    <input type="hidden" name="customerId" value={data.booking.customerId} />
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
    </section>
  {/if}

  <!-- ── Internal notes ──────────────────────────────── -->
  <section class="notes-panel">
    <button
      type="button"
      class="notes-panel__toggle"
      onclick={() => { notesOpen = !notesOpen }}
      aria-expanded={notesOpen}
    >
      <span class="notes-panel__toggle-label">
        Internal notes
        <span class="notes-panel__subtitle">— not visible to customer</span>
      </span>
      <span class="notes-panel__chevron" class:notes-panel__chevron--open={notesOpen}>
        <img src={chevron} alt="Toggle notes">
      </span>
    </button>

    {#if notesSaved && !notesOpen}
      <span class="notes-panel__saved notes-panel__saved--inline">Saved</span>
    {/if}

    {#if notesOpen}
      <form
        method="post"
        action="?/saveNotes"
        use:enhance={() => {
          notesSubmitting = true
          return async ({ result, update }) => {
            notesSubmitting = false
            if (result.type === 'success') {
              notesSaved = true
              notesOpen = false
              setTimeout(() => { notesSaved = false }, 2000)
            }
            await update()
          }
        }}
      >
        <textarea
          name="notes"
          class="notes-panel__textarea"
          bind:value={notesText}
          placeholder="Add internal notes visible only to staff…"
          disabled={notesSubmitting}
          rows="4"
        ></textarea>

        <div class="notes-panel__footer">
          {#if form?.notesError}
            <p class="notes-panel__error">{form.notesError}</p>
          {:else}
            <span></span>
          {/if}

          <Button
            type="submit"
            variant="primary"
            size="md"
            edges="soft"
            disabled={notesSubmitting}
            loading={notesSubmitting}
          >
            Save notes
          </Button>
        </div>
      </form>
    {/if}
  </section>

</div>

<style>
  .detail-page {
    max-width: 900px;
    margin: 0 auto;
    padding: var(--space-8) var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  /* ── Nav ──────────────────────────────────────────── */

  .back-link {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    text-decoration: none;
    transition: var(--transition);

    &:hover {
      color: var(--color-text);
    }
  }

  /* ── Header ───────────────────────────────────────── */

  .detail-page__header {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .detail-page__title-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex-wrap: wrap;
  }

  .detail-page__title-row h1 {
    font-size: var(--font-size-2xl);
    font-weight: 700;
  }

  .detail-page__date {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  /* ── Grid ─────────────────────────────────────────── */

  .detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
  }

  @media (max-width: 600px) {
    .detail-grid {
      grid-template-columns: 1fr;
    }
  }

  /* ── Side panels ──────────────────────────────────── */

  .side-panels {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
  }

  @media (max-width: 600px) {
    .side-panels {
      grid-template-columns: 1fr;
    }
  }

  .side-panels__solo {
    grid-column: 1 / -1;
  }

  /* ── Card ─────────────────────────────────────────── */

  .card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4) var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .card--full {
    grid-column: 1 / -1;
  }

  .card__title {
    font-size: var(--font-size-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
  }

  /* ── Detail list ──────────────────────────────────── */

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
    word-break: break-word;

    a {
      color: var(--color-text);
      text-decoration: underline;

      &:hover {
        text-decoration: none;
      }
    }
  }

  .customer-link {
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  /* ── Related bookings ─────────────────────────────── */

  .related {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .related__group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .related__label {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-subtle);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .related-row {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    text-decoration: none;
    color: var(--color-text);
    transition: var(--transition);

    &:hover {
      background: var(--color-surface-hover);
      border-color: var(--color-text-subtle);
    }
  }

  .related-row__when {
    font-size: var(--font-size-sm);
    font-weight: 500;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .related-row__service {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  /* ── Actions panel ───────────────────────────────── */

  .actions-panel {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4) var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .actions-panel__title {
    font-size: var(--font-size-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
  }

  .actions-panel__error {
    font-size: var(--font-size-sm);
    color: var(--color-rejected-text);
    background: var(--color-rejected-bg);
    border: 1px solid var(--color-rejected-text);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-3);
  }

  .actions-panel__buttons {
    display: flex;
    gap: var(--space-3);
    flex-wrap: wrap;
  }

  .btn {
    padding: var(--space-2) var(--space-5);
    font-size: var(--font-size-sm);
    font-weight: 600;
    border-radius: var(--radius-md);
    border: 1px solid transparent;
    cursor: pointer;
    transition: var(--transition);

    &:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
  }

  .btn--accept {
    background: var(--color-accepted-bg);
    color: var(--color-accepted-text);
    border-color: var(--color-accepted-text);

    &:hover:not(:disabled) {
      filter: brightness(0.92);
    }
  }

  .btn--reject {
    background: var(--color-rejected-bg);
    color: var(--color-rejected-text);
    border-color: var(--color-rejected-text);

    &:hover:not(:disabled) {
      filter: brightness(0.92);
    }
  }

  .actions-panel--resolved {
    flex-direction: row;
    align-items: center;
    gap: var(--space-3);
  }

  .actions-panel__resolved-note {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  /* ── Notes panel ─────────────────────────────────── */

  .notes-panel {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4) var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .notes-panel__toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    text-align: left;
  }

  .notes-panel__toggle-label {
    font-size: var(--font-size-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
  }

  .notes-panel__subtitle {
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
  }

  .notes-panel__chevron {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    transition: transform 0.2s ease;
    line-height: 1;
    img{
      width: 1.2rem;
    }
  }

  .notes-panel__chevron--open {
    transform: rotate(180deg);
  }

  .notes-panel__saved--inline {
    font-size: var(--font-size-sm);
    color: var(--color-accepted-text);
    animation: fade-out 2s ease forwards;
  }

  .notes-panel__textarea {
    width: 100%;
    resize: vertical;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-3);
    font-size: var(--font-size-sm);
    font-family: var(--font-sans);
    color: var(--color-text);
    line-height: 1.5;
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

  .notes-panel__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    flex-wrap: wrap;
  }

  .notes-panel__error {
    font-size: var(--font-size-sm);
    color: var(--color-rejected-text);
    background: var(--color-rejected-bg);
    border: 1px solid var(--color-rejected-text);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-3);
  }

  @keyframes fade-out {
    0%   { opacity: 1; }
    60%  { opacity: 1; }
    100% { opacity: 0; }
  }

  /* ── Review ──────────────────────────────────────── */

  .review {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .review__stars {
    display: flex;
    gap: var(--space-1);
  }

  .review__star {
    font-size: 1.5rem;
    line-height: 1;
    color: var(--color-border);
  }

  .review__star--filled {
    color: #f59e0b;
  }

  .review__comment {
    font-size: var(--font-size-sm);
    color: var(--color-text);
    line-height: 1.6;
  }

  .review__no-comment {
    font-size: var(--font-size-sm);
    color: var(--color-text-subtle);
    font-style: italic;
  }

  .review__date {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .review__empty {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  /* ── Notification history ────────────────────────── */

  .notif-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .notif-row {
    display: grid;
    grid-template-columns: 1fr auto auto auto;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
  }

  .notif-row__type {
    color: var(--color-text);
    font-weight: 500;
    text-transform: capitalize;
  }

  .notif-row__channel {
    color: var(--color-text-muted);
    text-transform: uppercase;
    font-size: var(--font-size-xs);
    letter-spacing: 0.05em;
  }

  .notif-row__when {
    color: var(--color-text-muted);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .notif-row__status {
    font-size: var(--font-size-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
  }

  .notif-row__status--sent {
    color: var(--color-accepted-text);
  }

  /* ── Loyalty Redemption panel ────────────────────── */

  .redemption-panel {
    gap: var(--space-4);
  }

  .redemption-balance {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
  }

  .redemption-balance__pts {
    font-size: var(--font-size-2xl);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .redemption-balance__label {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .redemption-success {
    font-size: var(--font-size-sm);
    color: var(--color-accepted-text);
    background: var(--color-accepted-bg);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-3);
  }

  .redemption-error {
    font-size: var(--font-size-sm);
    color: var(--color-rejected-text);
    background: var(--color-rejected-bg);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-3);
  }

  .redemption-tiers {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .redemption-tier-item {
    display: flex;
    flex-direction: column;
  }

  .redemption-tier-btn {
    width: 100%;
    text-align: left;
    padding: var(--space-3) var(--space-4);
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
      background: var(--color-surface-hover);
    }

    &:disabled {
      cursor: not-allowed;
    }

    &--insufficient {
      opacity: 0.55;
    }
  }

  .redemption-tier-btn__info {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex: 1;
    flex-wrap: wrap;
  }

  .redemption-tier-btn__name {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
  }

  .redemption-tier-btn__pts {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  .redemption-tier-btn__desc {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .redemption-tier-btn__insufficient {
    font-size: var(--font-size-xs);
    color: var(--color-rejected-text);
    margin-left: auto;
    white-space: nowrap;
  }

  .confirm-redeem {
    padding: var(--space-3) var(--space-4);
    background: var(--color-surface-hover);
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

  /* ── ─────────────────────────────────────────────── */

  .detail-list__id {
    font-size: var(--font-size-xs);
    font-weight: 400;
    color: var(--color-text-muted);
    font-family: monospace;
    word-break: break-all;
  }

</style>
