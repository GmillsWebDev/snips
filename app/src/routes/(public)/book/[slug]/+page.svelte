<script lang="ts">
  import type { PageData } from './$types'
  import Button from '$lib/components/ui/Button.svelte'

  type BookingState = {
    service_id: string | null
  }

  let { data }: { data: PageData } = $props()
  let { shop, services } = data

  let booking = $state<BookingState>({ service_id: null })

  function formatPrice(pence: number): string {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100)
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

      <div class="step">
        <h2 class="step__title">Choose a service</h2>

        {#if services.length === 0}
          <p class="step__empty">No services are currently available. Please check back later.</p>
        {:else}
          <ul class="service-list">
            {#each services as service (service.id)}
              <li>
                <button
                  class="service-card"
                  class:service-card--selected={booking.service_id === service.id}
                  onclick={() => booking.service_id = service.id}
                  aria-pressed={booking.service_id === service.id}
                >
                  <div class="service-card__main">
                    <span class="service-card__name">{service.name}</span>
                    {#if service.description}
                      <span class="service-card__description">{service.description}</span>
                    {/if}
                  </div>
                  <div class="service-card__meta">
                    <span class="service-card__duration">{service.duration_minutes} min</span>
                    <span class="service-card__price">{formatPrice(service.price_pence)}</span>
                  </div>
                </button>
              </li>
            {/each}
          </ul>
        {/if}

        <div class="step__actions">
          <Button edges="soft" disabled={booking.service_id === null}>Next</Button>
        </div>
      </div>
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

  /* Step */
  .step__title {
    margin-bottom: var(--space-4);
  }

  .step__empty {
    color: var(--color-text-muted);
    margin-bottom: var(--space-6);
  }

  .step__actions {
    margin-top: var(--space-6);
    display: flex;
    justify-content: flex-end;
  }

  /* Service list */
  .service-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  /* Service card */
  .service-card {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-4);
    background: var(--color-surface);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-lg);
    text-align: left;
    cursor: pointer;
    transition: border-color var(--transition), background var(--transition);

    &:hover {
      border-color: var(--color-primary);
      background: var(--color-surface-hover);
    }
  }

  .service-card--selected {
    border-color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 6%, var(--color-surface));
  }

  .service-card__main {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    min-width: 0;
  }

  .service-card__name {
    font-weight: 600;
    font-size: var(--font-size-base);
    color: var(--color-text);
  }

  .service-card__description {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .service-card__meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-1);
    flex-shrink: 0;
  }

  .service-card__price {
    font-weight: 700;
    font-size: var(--font-size-lg);
    color: var(--color-text);
  }

  .service-card__duration {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    white-space: nowrap;
  }
</style>
