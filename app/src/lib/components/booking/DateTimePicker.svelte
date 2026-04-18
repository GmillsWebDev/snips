<script lang="ts">
  import { createSupabaseBrowserClient } from '$lib/supabase'

  let {
    barber_id,
    service_id,
    booking_window_days,
    timezone,
    selected_start_at = $bindable(null),
  }: {
    barber_id: string
    service_id: string
    booking_window_days: number
    timezone: string
    selected_start_at?: string | null
  } = $props()

  const supabase = createSupabaseBrowserClient()

  // Date bounds
  const today = new Date()
  const minDate = toDateString(today)
  const maxDate = toDateString(new Date(today.getTime() + booking_window_days * 86_400_000))

  let selected_date = $state('')
  let slots = $state<string[]>([])
  let loading = $state(false)
  let fetchError = $state<string | null>(null)
  let sundayError = $state(false)

  function toDateString(d: Date): string {
    return d.toLocaleDateString('en-CA') // YYYY-MM-DD
  }

  function formatSlot(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
    })
  }

  async function onDateChange(e: Event) {
    const date = (e.target as HTMLInputElement).value
    sundayError = false
    fetchError = null
    slots = []
    selected_start_at = null

    if (!date) {
      selected_date = ''
      return
    }

    // Noon avoids any DST/midnight edge cases when parsing
    if (new Date(`${date}T12:00:00`).getDay() === 0) {
      sundayError = true
      selected_date = ''
      ;(e.target as HTMLInputElement).value = ''
      return
    }

    selected_date = date
    loading = true

    const { data, error } = await supabase.functions.invoke('get-available-slots', {
      body: { barber_id, service_id, date },
    })

    loading = false

    if (error) {
      console.error('[get-available-slots]', error)
      fetchError = 'Could not load available times. Please try again.'
      return
    }

    slots = data?.slots ?? []
  }
</script>

<h2 class="step__title">Choose a date & time</h2>

<div class="date-picker">
  <label class="date-picker__label" for="booking-date">Select a date</label>
  <input
    id="booking-date"
    class="date-picker__input"
    type="date"
    min={minDate}
    max={maxDate}
    onchange={onDateChange}
  />
  {#if sundayError}
    <p class="date-picker__hint date-picker__hint--error">We're closed on Sundays — please pick another day.</p>
  {:else}
    <p class="date-picker__hint">Available Monday – Saturday</p>
  {/if}
</div>

{#if loading}
  <div class="slots-loading" aria-live="polite">
    <span class="slots-loading__spinner" aria-hidden="true"></span>
    <span>Finding available times…</span>
  </div>
{:else if fetchError}
  <p class="slots-error" role="alert">{fetchError}</p>
{:else if selected_date && slots.length === 0}
  <p class="slots-empty">No availability on this date — please try another day.</p>
{:else if slots.length > 0}
  <div class="slots">
    <p class="slots__label">Available times</p>
    <ul class="slots__grid">
      {#each slots as slot (slot)}
        <li>
          <button
            class="slot-btn"
            class:slot-btn--selected={selected_start_at === slot}
            onclick={() => selected_start_at = slot}
            aria-pressed={selected_start_at === slot}
          >
            {formatSlot(slot)}
          </button>
        </li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  .step__title {
    margin-bottom: var(--space-4);
  }

  /* Date picker */
  .date-picker {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-bottom: var(--space-6);
  }

  .date-picker__label {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
  }

  .date-picker__input {
    padding: var(--space-2) var(--space-3);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-base);
    color: var(--color-text);
    background: var(--color-surface);
    max-width: 220px;
    transition: border-color var(--transition);

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
  }

  .date-picker__hint {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .date-picker__hint--error {
    color: var(--color-error);
  }

  /* Loading */
  .slots-loading {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    padding: var(--space-4) 0;
  }

  .slots-loading__spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Empty / error */
  .slots-empty,
  .slots-error {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    padding: var(--space-4) 0;
  }

  .slots-error {
    color: var(--color-error);
  }

  /* Slot grid */
  .slots__label {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: var(--space-3);
  }

  .slots__grid {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .slot-btn {
    padding: var(--space-2) var(--space-3);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
    cursor: pointer;
    transition: border-color var(--transition), background var(--transition);

    &:hover {
      border-color: var(--color-primary);
      background: var(--color-surface-hover);
    }
  }

  .slot-btn--selected {
    border-color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface));
    color: var(--color-primary);
  }
</style>
