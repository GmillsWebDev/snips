<script lang="ts">
  import type { Snippet } from 'svelte'
  import { page } from '$app/stores'
  import { enhance } from '$app/forms'
  import Button from '$lib/components/ui/Button.svelte'
  import type { CustomerDetails } from '$lib/components/booking/CustomerDetails.svelte'

  type Service = {
    id: string
    name: string
    duration_minutes: number
    price_pence: number
  }

  type AppliedDiscount = {
    discountCodeId: string
    code: string
    discountAmountPence: number
    discountLabel: string
    finalPricePence: number
  }

  type AppliedLoyaltyReward = {
    tierId: string
    tierName: string
    pointsRequired: number
    rewardDescription: string
    rewardValuePence: number | null
  }

  let {
    shop_name,
    service,
    start_at,
    timezone,
    customer,
    appliedDiscount = null,
    appliedLoyaltyReward = null,
    offers = null,
    onback,
  }: {
    shop_name: string
    service: Service
    start_at: string
    timezone: string
    customer: CustomerDetails
    appliedDiscount?: AppliedDiscount | null
    appliedLoyaltyReward?: AppliedLoyaltyReward | null
    offers?: Snippet | null
    onback: () => void
  } = $props()

  let submitting = $state(false)

  let formError = $derived(($page.form as { error?: string } | null)?.error ?? null)

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

<h2 class="step__title">Confirm your booking</h2>

<div class="summary">
  <div class="summary__section">
    <h3 class="summary__heading">Appointment</h3>
    <dl class="summary__list">
      <div class="summary__row">
        <dt>Shop</dt>
        <dd>{shop_name}</dd>
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
        <dd>
          {#if appliedDiscount}
            <span class="summary__original-price">{formatPrice(service.price_pence)}</span>
            {formatPrice(appliedDiscount.finalPricePence)}
          {:else if appliedLoyaltyReward?.rewardValuePence}
            <span class="summary__original-price">{formatPrice(service.price_pence)}</span>
            {formatPrice(Math.max(0, service.price_pence - appliedLoyaltyReward.rewardValuePence))}
          {:else}
            {formatPrice(service.price_pence)}
          {/if}
        </dd>
      </div>
      {#if appliedDiscount}
        <div class="summary__row">
          <dt>Discount</dt>
          <dd class="summary__discount">−{formatPrice(appliedDiscount.discountAmountPence)} ({appliedDiscount.discountLabel})</dd>
        </div>
      {/if}
      {#if appliedLoyaltyReward}
        <div class="summary__row">
          <dt>Loyalty reward</dt>
          <dd class="summary__loyalty">
            {appliedLoyaltyReward.tierName}
            {#if appliedLoyaltyReward.rewardValuePence}
              <span class="summary__loyalty-saving">−{formatPrice(appliedLoyaltyReward.rewardValuePence)}</span>
            {/if}
          </dd>
        </div>
      {/if}
      <div class="summary__row">
        <dt>Date &amp; time</dt>
        <dd>{formatDateTime(start_at, timezone)}</dd>
      </div>
    </dl>
  </div>

  <div class="summary__section">
    <h3 class="summary__heading">Your details</h3>
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

{#if formError}
  <p class="summary__error" role="alert">{formError}</p>
{/if}

<form
  method="POST"
  action="?/confirm"
  use:enhance={() => {
    submitting = true
    return async ({ update }) => {
      await update()
      submitting = false
    }
  }}
>
  <input type="hidden" name="service_id" value={service.id} />
  <input type="hidden" name="start_at"   value={start_at} />
  <input type="hidden" name="first_name" value={customer.first_name} />
  <input type="hidden" name="last_name"  value={customer.last_name} />
  <input type="hidden" name="email"      value={customer.email} />
  <input type="hidden" name="phone"      value={customer.phone} />
  <input type="hidden" name="is_guest"   value={String(customer.is_guest)} />
  {#if customer.customer_id}
    <input type="hidden" name="customer_id" value={customer.customer_id} />
  {/if}
  {#if appliedDiscount}
    <input type="hidden" name="discount_code_id" value={appliedDiscount.discountCodeId} />
    <input type="hidden" name="discount_amount_pence" value={appliedDiscount.discountAmountPence} />
  {/if}
  {#if appliedLoyaltyReward}
    <input type="hidden" name="loyalty_tier_id" value={appliedLoyaltyReward.tierId} />
    <input type="hidden" name="loyalty_points_required" value={appliedLoyaltyReward.pointsRequired} />
  {/if}

  {#if offers}
    {@render offers()}
  {/if}

  <div class="confirm-actions">
    <Button edges="soft" variant="secondary" type="button" onclick={onback}>Back</Button>
    <Button edges="soft" type="submit" disabled={submitting} loading={submitting}>
      Confirm booking
    </Button>
  </div>
</form>

<style>
  .step__title {
    margin-bottom: var(--space-4);
  }

  .summary {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    margin-bottom: var(--space-4);
  }

  .summary__section {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4) var(--space-6);
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

  .summary__error {
    color: var(--color-error, #dc2626);
    font-size: var(--font-size-sm);
    margin-bottom: var(--space-4);
    padding: var(--space-3);
    background: color-mix(in srgb, var(--color-error, #dc2626) 8%, var(--color-surface));
    border-radius: var(--radius-md);
  }

  .confirm-actions {
    display: flex;
    justify-content: space-between;
    margin-top: var(--space-2);
  }

  .summary__original-price {
    text-decoration: line-through;
    color: var(--color-text-muted);
    font-weight: 400;
    margin-right: var(--space-2);
  }

  .summary__discount {
    color: var(--color-accepted-text);
  }

  .summary__loyalty {
    color: #d97706;
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
    justify-content: flex-end;
  }

  .summary__loyalty-saving {
    font-weight: 600;
  }
</style>
