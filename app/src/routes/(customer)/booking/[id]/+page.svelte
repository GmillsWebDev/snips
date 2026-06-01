<script lang="ts">
  import { enhance } from '$app/forms'
  import Badge from '$lib/components/ui/Badge.svelte'
  import Button from '$lib/components/ui/Button.svelte'
  import type { PageData, ActionData } from './$types'

  let { data, form }: { data: PageData; form: ActionData } = $props()

  let cancelling = $state(false)

  function formatPrice(pence: number): string {
    return `£${(pence / 100).toFixed(2)}`
  }

  function formatDuration(mins: number): string {
    if (mins < 60) return `${mins} min`
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m ? `${h} hr ${m} min` : `${h} hr`
  }

  const canCancel = $derived(
    data.booking.status === 'pending' || data.booking.status === 'accepted'
  )
</script>

<svelte:head>
  <title>{data.booking.service.name} — Snips</title>
</svelte:head>

<div class="page">
  <a href="/dashboard" class="back-link">← Back to your bookings</a>

  <div class="booking-detail">
    <div class="booking-detail__header">
      <h1 class="booking-detail__title">{data.booking.service.name}</h1>
      <Badge status={data.booking.status} />
    </div>

    <dl class="detail-list">
      <div class="detail-list__row">
        <dt>Date</dt>
        <dd>{data.booking.date}</dd>
      </div>
      <div class="detail-list__row">
        <dt>Time</dt>
        <dd>{data.booking.time}</dd>
      </div>
      <div class="detail-list__row">
        <dt>Duration</dt>
        <dd>{formatDuration(data.booking.service.durationMinutes)}</dd>
      </div>
      <div class="detail-list__row">
        <dt>Price</dt>
        <dd>{formatPrice(data.booking.service.pricePence)}</dd>
      </div>
      {#if data.discountCode}
        <div class="detail-list__row">
          <dt>Discount code</dt>
          <dd>{data.discountCode.code} ({data.discountCode.discountType === 'percentage' ? `${data.discountCode.discountValue}% off` : `£${(data.discountCode.discountValue / 100).toFixed(2)} off`})</dd>
        </div>
        <div class="detail-list__row">
          <dt>Discount</dt>
          <dd class="detail-list__discount">−{formatPrice(data.discountCode.discountAmountPence)}</dd>
        </div>
        <div class="detail-list__row">
          <dt>Final price</dt>
          <dd class="detail-list__final-price">{formatPrice(data.booking.service.pricePence - data.discountCode.discountAmountPence)}</dd>
        </div>
      {/if}
      <div class="detail-list__row">
        <dt>Barber</dt>
        <dd>{data.booking.barberName}</dd>
      </div>
      {#if data.booking.chairLabel}
        <div class="detail-list__row">
          <dt>Chair</dt>
          <dd>{data.booking.chairLabel}</dd>
        </div>
      {/if}
      {#if data.booking.notes}
        <div class="detail-list__row">
          <dt>Notes</dt>
          <dd>{data.booking.notes}</dd>
        </div>
      {/if}
      {#if data.booking.cancellationReason}
        <div class="detail-list__row">
          <dt>Cancellation reason</dt>
          <dd>{data.booking.cancellationReason}</dd>
        </div>
      {/if}
    </dl>

    {#if canCancel}
      <div class="booking-detail__actions">
        {#if form?.error}
          <p class="cancel-error" role="alert">{form.error}</p>
        {/if}
        <form
          method="POST"
          action="?/cancel"
          use:enhance={() => {
            cancelling = true
            return async ({ update }) => {
              await update()
              cancelling = false
            }
          }}
        >
          <Button variant="secondary" edges="soft" type="submit" disabled={cancelling}>
            {cancelling ? 'Cancelling…' : 'Cancel booking'}
          </Button>
        </form>
      </div>
    {/if}
  </div>
</div>

<style>
  .page {
    max-width: 560px;
    margin: 0 auto;
    padding: var(--space-8) var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .back-link {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    text-decoration: none;
    transition: var(--transition);

    &:hover {
      color: var(--color-text);
    }
  }

  .booking-detail {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-6) var(--space-8);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .booking-detail__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
  }

  .booking-detail__title {
    font-size: var(--font-size-xl);
    font-weight: 700;
  }

  .detail-list {
    display: flex;
    flex-direction: column;
    gap: 0;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .detail-list__row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--space-8);
    padding: var(--space-3) var(--space-4);
    font-size: var(--font-size-sm);
    border-bottom: 1px solid var(--color-border);

    &:last-child {
      border-bottom: none;
    }

    dt {
      color: var(--color-text-muted);
      flex-shrink: 0;
    }

    dd {
      font-weight: 500;
      text-align: right;
    }
  }

  .booking-detail__actions {
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .detail-list__discount {
    color: var(--color-rejected-text);
  }

  .detail-list__final-price {
    color: var(--color-accepted-text);
    font-weight: 600;
  }

  .cancel-error {
    font-size: var(--font-size-sm);
    color: var(--color-error);
    padding: var(--space-3) var(--space-4);
    background: color-mix(in srgb, var(--color-error) 8%, var(--color-surface));
    border-radius: var(--radius-md);
  }
</style>
