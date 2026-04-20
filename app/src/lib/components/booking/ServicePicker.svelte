<script lang="ts">
  type Service = {
    id: string
    name: string
    description: string | null
    duration_minutes: number
    price_pence: number
  }

  let {
    services,
    selected_service_id = $bindable(null),
  }: {
    services: Service[]
    selected_service_id?: string | null
  } = $props()

  function formatPrice(pence: number): string {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100)
  }
</script>

<h2 class="step__title">Choose a service</h2>

{#if services.length === 0}
  <p class="step__empty">No services are currently available. Please check back later.</p>
{:else}
  <ul class="service-list">
    {#each services as service (service.id)}
      <li>
        <button
          class="service-card"
          class:service-card--selected={selected_service_id === service.id}
          onclick={() => selected_service_id = service.id}
          aria-pressed={selected_service_id === service.id}
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

<style>
  .step__title {
    margin-bottom: var(--space-4);
  }

  .step__empty {
    color: var(--color-text-muted);
    margin-bottom: var(--space-6);
  }

  .service-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

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
