<script lang="ts">
  import { enhance } from '$app/forms'
  import type { PageData } from './$types'
  import type { AvailabilityRule } from './+page.server'

  let { data }: { data: PageData } = $props()

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  // Display Monday first (1–6) then Sunday (0)
  const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

  type DayInfo = {
    dow: number
    name: string
    isWorking: boolean
    shifts: AvailabilityRule[]
  }

  const days: DayInfo[] = $derived(
    DISPLAY_ORDER.map((dow) => {
      const dayRules = data.rules.filter((r) => r.day_of_week === dow)
      return {
        dow,
        name: DAY_NAMES[dow],
        isWorking: dayRules.some((r) => r.is_working),
        shifts: dayRules.filter((r) => r.is_working),
      }
    }),
  )

  let warning = $state<{ dow: number; count: number } | null>(null)
  let submitting = $state<number | null>(null)

  function formatTime(time: string): string {
    const [h, m] = time.split(':')
    const hour = parseInt(h)
    const suffix = hour >= 12 ? 'pm' : 'am'
    const display = hour % 12 || 12
    return m === '00' ? `${display}${suffix}` : `${display}:${m}${suffix}`
  }
</script>

<svelte:head>
  <title>Schedule — Snips Admin</title>
</svelte:head>

<div class="schedule-page">
  <header class="schedule-page__header">
    <h1 class="schedule-page__title">Schedule</h1>
    <p class="schedule-page__subtitle">Working days for {data.barber.name}</p>
  </header>

  <div class="schedule-grid">
    {#each days as day (day.dow)}
      <div class="schedule-day" class:schedule-day--off={!day.isWorking}>
        <div class="schedule-day__row">
          <span class="schedule-day__name">{day.name}</span>

          <span class="schedule-day__info">
            {#if day.isWorking}
              {#each day.shifts as shift, i}
                {#if i > 0}<span class="schedule-day__sep"> · </span>{/if}
                {formatTime(shift.start_time)}–{formatTime(shift.end_time)}
              {/each}
            {:else}
              <span class="schedule-day__off-label">Day off</span>
            {/if}
          </span>

          <form
            method="POST"
            action="?/toggleDay"
            use:enhance={() => {
              submitting = day.dow
              return async ({ result, update }) => {
                submitting = null
                const d = result.type === 'failure'
                  ? (result.data as Record<string, unknown>)
                  : null
                if (d?.warning) {
                  warning = { dow: day.dow, count: d.count as number }
                } else {
                  if (warning?.dow === day.dow) warning = null
                  await update()
                }
              }
            }}
          >
            <input type="hidden" name="dayOfWeek" value={day.dow} />
            <input type="hidden" name="currentlyWorking" value={String(day.isWorking)} />
            <button
              type="submit"
              class="toggle"
              class:toggle--on={day.isWorking}
              disabled={submitting === day.dow}
              aria-label="{day.isWorking ? 'Disable' : 'Enable'} {day.name}"
              aria-pressed={day.isWorking}
            >
              <span class="toggle__thumb"></span>
            </button>
          </form>
        </div>

        {#if warning?.dow === day.dow}
          <div class="schedule-day__warning">
            <p class="schedule-day__warning-text">
              This will affect {warning.count} upcoming booking{warning.count === 1 ? '' : 's'}.
              These appointments will not be cancelled automatically. Tap confirm to proceed.
            </p>
            <div class="schedule-day__warning-actions">
              <form
                method="POST"
                action="?/toggleDayConfirmed"
                use:enhance={() => {
                  submitting = day.dow
                  return async ({ update }) => {
                    submitting = null
                    warning = null
                    await update()
                  }
                }}
              >
                <input type="hidden" name="dayOfWeek" value={day.dow} />
                <button type="submit" class="btn btn--danger" disabled={submitting === day.dow}>
                  Confirm
                </button>
              </form>
              <button
                type="button"
                class="btn btn--ghost"
                onclick={() => { warning = null }}
              >
                Cancel
              </button>
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .schedule-page {
    max-width: 640px;
    margin: var(--space-8) auto;
    padding: 0 var(--space-6);
  }

  .schedule-page__header {
    margin-bottom: var(--space-8);
  }

  .schedule-page__title {
    font-size: var(--font-size-2xl);
    font-weight: 700;
    color: var(--color-text);
    margin: 0 0 var(--space-1);
  }

  .schedule-page__subtitle {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    margin: 0;
  }

  .schedule-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .schedule-day {
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border);
    overflow: hidden;
  }

  .schedule-day__row {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-4) var(--space-5);
  }

  .schedule-day__name {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
    width: 2.5rem;
    flex-shrink: 0;
  }

  .schedule-day--off .schedule-day__name {
    color: var(--color-text-muted);
  }

  .schedule-day__info {
    flex: 1;
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .schedule-day__off-label {
    color: var(--color-text-subtle);
    font-style: italic;
  }

  .toggle {
    position: relative;
    display: inline-flex;
    align-items: center;
    width: 44px;
    height: 24px;
    padding: 2px;
    border: none;
    border-radius: var(--radius-full);
    background: var(--color-border);
    cursor: pointer;
    transition: background var(--transition);
    flex-shrink: 0;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .toggle--on {
    background: var(--color-primary);
  }

  .toggle__thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    box-shadow: var(--shadow-sm);
    transition: transform var(--transition);
  }

  .toggle--on .toggle__thumb {
    transform: translateX(20px);
  }

  .schedule-day__warning {
    padding: var(--space-3) var(--space-5) var(--space-4);
    background: var(--color-pending-bg);
    border-top: 1px solid var(--color-border);
  }

  .schedule-day__warning-text {
    font-size: var(--font-size-sm);
    color: var(--color-pending-text);
    margin: 0 0 var(--space-3);
    line-height: 1.5;
  }

  .schedule-day__warning-actions {
    display: flex;
    gap: var(--space-2);
  }

  .btn {
    display: inline-flex;
    align-items: center;
    padding: var(--space-1) var(--space-4);
    font-size: var(--font-size-sm);
    font-weight: 500;
    border-radius: var(--radius-md);
    border: 1px solid transparent;
    cursor: pointer;
    transition: var(--transition);

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .btn--danger {
    background: var(--color-rejected-text);
    color: white;

    &:hover:not(:disabled) {
      opacity: 0.85;
    }
  }

  .btn--ghost {
    background: transparent;
    color: var(--color-text-muted);
    border-color: var(--color-border);

    &:hover:not(:disabled) {
      background: var(--color-surface-hover);
      color: var(--color-text);
    }
  }
</style>
