<script lang="ts">
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()
  let { shop } = data
</script>

<svelte:head>
  <title>Book an appointment — {shop.name}</title>
</svelte:head>

<div class="booking-page">
  <header class="booking-page__header" style="--shop-brand: {data.branding.color_secondary ?? 'var(--color-primary)'}">
    <div class="booking-page__header-inner container">
      {#if shop.logo_url}
        <img src={shop.logo_url} alt="{shop.name} logo" class="booking-page__logo" />
      {:else}
        <span class="booking-page__shop-name">{shop.name}</span>
      {/if}
    </div>
  </header>

  <main class="container">
    <div class="booking-page__card">
      <h1>Book an appointment</h1>
      <p class="booking-page__subtitle">at {shop.name}</p>

      <!-- booking steps go here -->
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
    font-size: var(--font-size-lg);
  }
</style>
