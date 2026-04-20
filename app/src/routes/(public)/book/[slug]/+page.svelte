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

  const DRAFT_KEY = 'snips_booking_draft'

  let { data }: { data: PageData } = $props()
  let { shop, services, barber_id } = data

  const supabase = createSupabaseBrowserClient()

  let step = $state<Step>('service')
  let booking = $state<BookingState>({ service_id: null, start_at: null, customer: null })
  let skipLoading = $state(false)

  // When a logged-in user leaves the datetime step, fetch their customer record
  // and jump straight to confirmation, bypassing the customer details step entirely.
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
    }

    step = 'confirmation'
  }

  // If the user returns from /login with a saved draft, restore their progress
  // and skip the customer step (they're now logged in).
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

<svelte:head>
  <title>Book an appointment — {shop.name}</title>
</svelte:head>

<div class="booking-page">
  <header class="booking-page__header" style="--shop-brand: {data.branding.color_primary ?? 'var(--color-primary)'}">
    <div class="booking-page__header-inner container">
      {#if data.branding.logo_url}
        <img src={data.branding.logo_url} alt="{shop.name} logo" class="booking-page__logo" />
      {:else}
        <span class="booking-page__shop-name">{shop.name}</span>
      {/if}
    </div>
  </header>

  <main class="container">
    <div class="booking-page__card">
      <h1>Book an appointment</h1>
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
          />

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
</style>
