<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import type { PageData } from './$types'
  import { createSupabaseBrowserClient } from '$lib/supabase'
  import Button from '$lib/components/ui/Button.svelte'
  import ServicePicker from '$lib/components/booking/ServicePicker.svelte'
  import DatePicker from '$lib/components/booking/DatePicker.svelte'
  import CustomerDetails from '$lib/components/booking/CustomerDetails.svelte'
  import type { CustomerDetails as CustomerDetailsType } from '$lib/components/booking/CustomerDetails.svelte'
  import BookingSummary from '$lib/components/booking/BookingSummary.svelte'

  type Step = 'service' | 'datetime' | 'customer' | 'confirmation'

  type BookingState = {
    service_id: string | null
    start_at: string | null
    customer: CustomerDetailsType | null
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

  const DRAFT_KEY = 'snips_booking_draft'

  let { data }: { data: PageData } = $props()
  let { shop, services, barber_id } = data

  const supabase = createSupabaseBrowserClient()

  let step = $state<Step>('service')
  let booking = $state<BookingState>({ service_id: null, start_at: null, customer: null })
  let skipLoading = $state(false)

  // Which offer type is active: none / discount / loyalty
  let activeOfferType = $state<'none' | 'discount' | 'loyalty'>('none')

  // Discount state
  let appliedDiscount = $state<AppliedDiscount | null>(null)
  let showDiscountInput = $state(false)
  let discountCodeInput = $state('')
  let validating = $state(false)
  let discountError = $state('')

  // Loyalty state
  let appliedLoyaltyReward = $state<AppliedLoyaltyReward | null>(null)
  let showLoyaltySection = $state(false)

  const showLoyalty = $derived(
    data.loyaltyEnabled === true &&
    (data.rewardTiers?.length ?? 0) > 0 &&
    data.customerLoyaltyPoints !== null
  )

  // Clear all offer state when service or time changes
  let _prevServiceId = booking.service_id
  let _prevStartAt = booking.start_at

  $effect(() => {
    const sid = booking.service_id
    const sat = booking.start_at
    if (sid !== _prevServiceId || sat !== _prevStartAt) {
      _prevServiceId = sid
      _prevStartAt = sat
      appliedDiscount = null
      appliedLoyaltyReward = null
      activeOfferType = 'none'
      showDiscountInput = false
      showLoyaltySection = false
      discountCodeInput = ''
      discountError = ''
    }
  })

  function openDiscount() {
    activeOfferType = 'discount'
    showDiscountInput = true
    discountError = ''
  }

  function removeDiscount() {
    activeOfferType = 'none'
    appliedDiscount = null
    showDiscountInput = false
    discountCodeInput = ''
    discountError = ''
  }

  function openLoyalty() {
    activeOfferType = 'loyalty'
    showLoyaltySection = true
  }

  function removeLoyalty() {
    activeOfferType = 'none'
    appliedLoyaltyReward = null
    showLoyaltySection = false
  }

  async function applyDiscount() {
    const selectedService = services.find((s) => s.id === booking.service_id)
    if (!selectedService || !discountCodeInput.trim()) return

    validating = true
    discountError = ''

    try {
      const resp = await fetch('/api/validate-discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: discountCodeInput.trim(),
          shopId: shop.id,
          serviceId: selectedService.id,
          pricePence: selectedService.price_pence,
          customerId: booking.customer?.customer_id ?? undefined,
        }),
      })
      const result = await resp.json() as { valid?: boolean; error?: string; discountCodeId?: string; discountAmountPence?: number; discountLabel?: string; finalPricePence?: number }
      if (!resp.ok || !result.valid) {
        discountError = result.error ?? 'Invalid discount code.'
      } else {
        appliedDiscount = {
          discountCodeId: result.discountCodeId!,
          code: discountCodeInput.trim().toUpperCase(),
          discountAmountPence: result.discountAmountPence!,
          discountLabel: result.discountLabel!,
          finalPricePence: result.finalPricePence!,
        }
        showDiscountInput = false
        discountCodeInput = ''
      }
    } catch {
      discountError = 'Failed to validate code. Please try again.'
    } finally {
      validating = false
    }
  }

  async function advanceFromDatetime() {
    if (!data.user) {
      step = 'customer'
      return
    }

    skipLoading = true
    const { data: rec } = await supabase
      .from('customers')
      .select('id, first_name, last_name, email, phone')
      .eq('shop_id', shop.id)
      .eq('user_id', data.user.id)
      .maybeSingle()
    skipLoading = false

    if (rec) {
      booking.customer = {
        first_name: rec.first_name,
        last_name:  rec.last_name,
        email:      rec.email,
        phone:      rec.phone ?? '',
        is_guest:   false,
        customer_id: rec.id,
      }
      step = 'confirmation'
    } else {
      step = 'customer'
    }
  }

  onMount(async () => {
    if (!data.user) return
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const draft = JSON.parse(raw)
      if (draft.shop_slug !== $page.params.slug) return
      sessionStorage.removeItem(DRAFT_KEY)
      if (draft.service_id) booking.service_id = draft.service_id
      if (draft.start_at)   booking.start_at   = draft.start_at
      if (draft.service_id && draft.start_at) await advanceFromDatetime()
    } catch {}
  })

  function handleLoginRedirect() {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
        shop_slug:  $page.params.slug,
        service_id: booking.service_id,
        start_at:   booking.start_at,
      }))
    } catch {}
    goto(`/login?redirectTo=/book/${$page.params.slug}`)
  }
</script>

{#snippet offerSection()}
  <div class="offers-section">

    <!-- ── Discount offer ──────────────────────────────── -->
    {#if activeOfferType === 'loyalty'}
      <p class="offers-blocked">
        <button type="button" class="offers-blocked__link" onclick={removeLoyalty}>Remove loyalty reward</button>
        to use a discount code instead.
      </p>
    {:else if appliedDiscount}
      <div class="offer-applied offer-applied--discount">
        <span class="offer-applied__text">
          <strong>{appliedDiscount.code}</strong> applied — {appliedDiscount.discountLabel}.
          You save £{(appliedDiscount.discountAmountPence / 100).toFixed(2)}.
        </span>
        <button type="button" class="offer-applied__remove" onclick={removeDiscount}>Remove</button>
      </div>
    {:else if showDiscountInput}
      <div class="discount-input">
        <div class="discount-input__row">
          <input
            type="text"
            class="discount-input__code"
            value={discountCodeInput}
            placeholder="Enter code"
            disabled={validating}
            oninput={(e) => {
              const el = e.currentTarget
              const pos = el.selectionStart
              el.value = el.value.toUpperCase()
              discountCodeInput = el.value
              el.setSelectionRange(pos, pos)
            }}
            onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyDiscount() } }}
          />
          <button
            type="button"
            class="discount-input__apply"
            disabled={validating || !discountCodeInput.trim()}
            onclick={applyDiscount}
          >{validating ? 'Checking…' : 'Apply'}</button>
        </div>
        {#if discountError}
          <p class="discount-error">{discountError}</p>
        {/if}
      </div>
    {:else}
      <button type="button" class="offer-toggle" onclick={openDiscount}>Have a discount code?</button>
    {/if}

    <!-- ── Loyalty offer ───────────────────────────────── -->
    {#if showLoyalty}
      {#if activeOfferType === 'discount'}
        <p class="offers-blocked">
          <button type="button" class="offers-blocked__link" onclick={removeDiscount}>Remove discount code</button>
          to redeem loyalty points instead.
        </p>
      {:else if appliedLoyaltyReward}
        <div class="offer-applied offer-applied--loyalty">
          <span class="offer-applied__text">
            Loyalty reward: <strong>{appliedLoyaltyReward.tierName}</strong> — {appliedLoyaltyReward.pointsRequired} pts deducted on confirmation.
          </span>
          <button type="button" class="offer-applied__remove" onclick={removeLoyalty}>Remove</button>
        </div>
      {:else if showLoyaltySection}
        <div class="loyalty-section">
          <p class="loyalty-balance">
            You have <strong>{data.customerLoyaltyPoints}</strong> points
          </p>
          <div class="loyalty-tiers">
            {#each (data.rewardTiers ?? []) as tier (tier.id)}
              {@const canAfford = (data.customerLoyaltyPoints ?? 0) >= tier.points_required}
              <button
                type="button"
                class="loyalty-tier"
                class:loyalty-tier--unaffordable={!canAfford}
                disabled={!canAfford}
                onclick={() => {
                  appliedLoyaltyReward = {
                    tierId: tier.id,
                    tierName: tier.name,
                    pointsRequired: tier.points_required,
                    rewardDescription: tier.reward_description,
                    rewardValuePence: tier.reward_value_pence ?? null,
                  }
                  showLoyaltySection = false
                }}
              >
                <span class="loyalty-tier__info">
                  <span class="loyalty-tier__name">{tier.name}</span>
                  <span class="loyalty-tier__desc">{tier.reward_description}</span>
                </span>
                <span class="loyalty-tier__cost">
                  {#if canAfford}
                    {tier.points_required} pts
                  {:else}
                    Need {tier.points_required - (data.customerLoyaltyPoints ?? 0)} more pts
                  {/if}
                </span>
              </button>
            {/each}
          </div>
        </div>
      {:else}
        <button type="button" class="offer-toggle" onclick={openLoyalty}>Redeem loyalty points?</button>
      {/if}
    {/if}

  </div>
{/snippet}

<svelte:head>
  <title>Book an appointment — {shop.name}</title>
</svelte:head>

<div class="booking-page">
  <header class="booking-page__header" style="--shop-brand: {data.branding?.color_primary ?? 'var(--color-primary)'}">
    <div class="booking-page__header-inner container">
      {#if data.branding?.logo_url}
        <img src={data.branding?.logo_url} alt="{shop.name} logo" class="booking-page__logo" />
      {:else}
        <span class="booking-page__shop-name">{shop.name}</span>
      {/if}
    </div>
  </header>

  <main class="container">
    <div class="booking-page__card">
      <h1>Book an appointment</h1>
      <!-- DEBUG — remove after -->
  <pre style="font-size:11px;background:#111;color:#0f0;padding:8px;margin-bottom:8px">
  loyaltyEnabled: {data.loyaltyEnabled}
  rewardTiers: {data.rewardTiers?.length ?? 'undefined'}
  customerLoyaltyPoints: {data.customerLoyaltyPoints}
  showLoyalty: {showLoyalty}
  </pre>
      <p class="booking-page__subtitle">at {shop.name}</p>

      {#if step === 'service'}
        <div class="step">
          <ServicePicker {services} bind:selected_service_id={booking.service_id} />

          <div class="step__actions">
            <Button
              edges="soft"
              disabled={booking.service_id === null}
              onclick={() => (step = 'datetime')}
            >Next</Button>
          </div>
        </div>
      {/if}

      {#if step === 'datetime'}
        <div class="step">
          {#if barber_id && booking.service_id}
            <DatePicker
              {barber_id}
              service_id={booking.service_id}
              booking_window_days={shop.booking_window_days}
              timezone={shop.timezone}
              bind:selected_start_at={booking.start_at}
            />
          {:else}
            <p class="step__unavailable">Online booking is not available for this shop right now.</p>
          {/if}

          <div class="step__actions step__actions--split">
            <Button edges="soft" variant="secondary" onclick={() => { step = 'service'; booking.start_at = null }}>Back</Button>
            <Button
              edges="soft"
              disabled={booking.start_at === null || skipLoading}
              loading={skipLoading}
              onclick={advanceFromDatetime}
            >Next</Button>
          </div>
        </div>
      {/if}

      {#if step === 'customer'}
        <div class="step">
          <CustomerDetails
            bind:customer={booking.customer}
            onloginredirect={handleLoginRedirect}
            prefill={data.user ? {
              first_name: data.user.user_metadata?.first_name ?? '',
              last_name:  data.user.user_metadata?.last_name  ?? '',
              email:      data.user.email ?? '',
            } : null}
          />

          {@render offerSection()}

          <div class="step__actions step__actions--split">
            <Button
              edges="soft"
              variant="secondary"
              onclick={() => { step = 'datetime'; booking.customer = null }}
            >Back</Button>
            <Button
              edges="soft"
              disabled={booking.customer === null}
              onclick={() => (step = 'confirmation')}
            >Next</Button>
          </div>
        </div>
      {/if}

      {#if step === 'confirmation'}
        <div class="step">
          {#if booking.customer && booking.service_id && booking.start_at}
            {@const selectedService = services.find(s => s.id === booking.service_id)}
            {#if selectedService}
              <BookingSummary
                shop_name={shop.name}
                service={selectedService}
                start_at={booking.start_at}
                timezone={shop.timezone}
                customer={booking.customer}
                {appliedDiscount}
                {appliedLoyaltyReward}
                offers={offerSection}
                onback={() => {
                  step = booking.customer?.is_guest ? 'customer' : 'datetime'
                }}
              />
            {/if}
          {/if}
        </div>
      {/if}
    </div>
  </main>
</div>

<style>
  .booking-page {
    min-height: 100vh;
    background: var(--color-bg);
  }

  .booking-page__header {
    background: var(--shop-brand);
    padding: var(--space-6) 0;
  }

  .booking-page__header-inner {
    margin-top: 0;
    margin-bottom: 0;
  }

  .booking-page__logo {
    height: 2.5rem;
    width: auto;
    object-fit: contain;
  }

  .booking-page__shop-name {
    font-size: var(--font-size-xl);
    font-weight: 700;
    color: var(--color-white);
  }

  .booking-page__card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-md);
    padding: var(--space-8);
    max-width: 640px;
    margin: 0 auto;
  }

  .booking-page__subtitle {
    color: var(--color-text-muted);
    margin-top: var(--space-2);
    margin-bottom: var(--space-6);
    font-size: var(--font-size-lg);
  }

  .step__actions {
    margin-top: var(--space-6);
    display: flex;
    justify-content: flex-end;
  }

  .step__actions--split {
    justify-content: space-between;
  }

  .step__unavailable {
    color: var(--color-text-muted);
    margin-bottom: var(--space-4);
  }

  /* ── Offers section ───────────────────────────────── */

  .offers-section {
    margin-top: var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .offer-toggle {
    background: none;
    border: none;
    padding: 0;
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;
    transition: var(--transition);
    text-align: left;

    &:hover { color: var(--color-text); }
  }

  /* Applied offer row (green for discount, amber for loyalty) */

  .offer-applied {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
  }

  .offer-applied--discount {
    background: var(--color-accepted-bg);

    .offer-applied__text { color: var(--color-accepted-text); }
  }

  .offer-applied--loyalty {
    background: #fef3c7;

    .offer-applied__text { color: #92400e; }
  }

  .offer-applied__remove {
    background: none;
    border: none;
    padding: 0;
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;
    white-space: nowrap;
    flex-shrink: 0;

    &:hover { color: var(--color-text); }
  }

  /* Blocked offer note */

  .offers-blocked {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .offers-blocked__link {
    background: none;
    border: none;
    padding: 0;
    font-size: inherit;
    color: var(--color-text-muted);
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;

    &:hover { color: var(--color-text); }
  }

  /* ── Discount code input ──────────────────────────── */

  .discount-input__row {
    display: flex;
    gap: var(--space-2);
  }

  .discount-input__code {
    flex: 1;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-family: monospace;
    letter-spacing: 0.05em;
    color: var(--color-text);
    background: var(--color-bg);
    transition: var(--transition);

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    &:disabled { opacity: 0.6; }
  }

  .discount-input__apply {
    padding: var(--space-2) var(--space-4);
    background: var(--color-primary);
    color: var(--color-on-primary, #fff);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: var(--transition);

    &:hover:not(:disabled) { background: var(--color-primary-hover); }
    &:disabled { opacity: 0.6; cursor: default; }
  }

  .discount-error {
    font-size: var(--font-size-xs);
    color: var(--color-rejected-text);
    margin-top: var(--space-2);
  }

  /* ── Loyalty section ──────────────────────────────── */

  .loyalty-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .loyalty-balance {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .loyalty-tiers {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .loyalty-tier {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    text-align: left;
    cursor: pointer;
    transition: var(--transition);

    &:hover:not(:disabled) {
      border-color: #d97706;
      background: #fef3c7;
    }
  }

  .loyalty-tier--unaffordable {
    opacity: 0.5;
    cursor: default;
  }

  .loyalty-tier__info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .loyalty-tier__name {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
  }

  .loyalty-tier__desc {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .loyalty-tier__cost {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: #d97706;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .loyalty-tier--unaffordable .loyalty-tier__cost {
    color: var(--color-text-muted);
    font-weight: 400;
  }
</style>
