<script lang="ts">
  import Badge from '$lib/components/ui/Badge.svelte'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()

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

  <div class="detail-grid">

    <!-- ── Customer ───────────────────────────────────── -->
    <section class="card">
      <h2 class="card__title">Customer</h2>
      <dl class="detail-list">
        <dt>Name</dt>
        <dd>{data.booking.customer.name}</dd>
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

    <!-- ── Other bookings (conditional) ─────────────── -->
    {#if data.relatedBookings.upcoming || data.relatedBookings.previous.length > 0}
      <section class="card card--full">
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

  </div>

  <!--
  ═══════════════════════════════════════════════════════
  ACTIONS — to be implemented in later steps

  Step 4.4 — Accept / Reject (pending bookings only)
  ─────────────────────────────────────────────────────
  Show two buttons when booking.status === 'pending':
    • Accept  → POST action ?/accept  → sets status to 'accepted', fires booking_accepted email
    • Reject  → POST action ?/reject  → sets status to 'rejected', fires booking_rejected email

  Step 4.5 — Complete / No-show (accepted bookings only)
  ─────────────────────────────────────────────────────
  Show two buttons when booking.status === 'accepted':
    • Mark completed → POST action ?/complete  → sets status to 'completed', fires review_invite email
    • Mark no-show   → POST action ?/noshow    → sets status to 'no_show', internal log only

  Step 4.6 — Internal notes
  ─────────────────────────────────────────────────────
  Textarea + save button → POST action ?/saveNotes
  Saves to bookings.internal_notes (owner/barber visible only, never shown to customer)
  ═══════════════════════════════════════════════════════
  -->

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

  /* ── ─────────────────────────────────────────────── */

  .detail-list__id {
    font-size: var(--font-size-xs);
    font-weight: 400;
    color: var(--color-text-muted);
    font-family: monospace;
    word-break: break-all;
  }
</style>
