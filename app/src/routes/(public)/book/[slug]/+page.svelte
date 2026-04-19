<script lang="ts">
  import type { PageData } from './$types'
  import Button from '$lib/components/ui/Button.svelte'
  import ServicePicker from '$lib/components/booking/ServicePicker.svelte'
  import DatePicker from '$lib/components/booking/DatePicker.svelte'

  type Step = 'service' | 'datetime'

  type BookingState = {
    service_id: string | null
    start_at: string | null
  }

  let { data }: { data: PageData } = $props()
  let { shop, services, barber_id } = data

  let step = $state<Step>('service')
  let booking = $state<BookingState>({ service_id: null, start_at: null })
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
              onclick={() => step = 'datetime'}
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
            <Button edges="soft" disabled={booking.start_at === null}>Next</Button>
          </div>
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
