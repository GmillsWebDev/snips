<script lang="ts">
  import { enhance } from '$app/forms'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import Button from '$lib/components/ui/Button.svelte'
  import Toast from '$lib/components/ui/Toast.svelte'
  import ComingSoon from '$lib/components/ui/ComingSoon.svelte'
  import ColourRow from '$lib/components/admin/ColourRow.svelte'
  import { getContrastRatio, getContrastRating } from '$lib/utils/contrast'
  import type { PageData, ActionData } from './$types'

  let { data, form }: { data: PageData; form: ActionData } = $props()

  let submitting = $state(false)
  let brandingSubmitting = $state(false)
  let showToast = $state(false)

  let pickerPrimary      = $state(data.branding.color_primary)
  let hexPrimary         = $state(data.branding.color_primary.slice(1))
  let pickerSecondary    = $state(data.branding.color_secondary)
  let hexSecondary       = $state(data.branding.color_secondary.slice(1))
  let pickerOnPrimary    = $state(data.branding.color_on_primary)
  let hexOnPrimary       = $state(data.branding.color_on_primary.slice(1))
  let pickerOnSecondary  = $state(data.branding.color_on_secondary)
  let hexOnSecondary     = $state(data.branding.color_on_secondary.slice(1))

  let showContrastWarning = $state(false)
  let bypassWarning = $state(false)
  let brandingFormEl: HTMLFormElement | null = null

  let loyaltyEnabled = $state(data.preferences.loyalty_enabled)
  let loyaltySubmitting = $state(false)
  let perBookingValue = $state(data.preferences.loyalty_points_per_booking ?? 0)
  let perPenceValue = $state(data.preferences.loyalty_points_per_pence ?? 0)
  let showStackWarning = $derived(loyaltyEnabled && perBookingValue > 0 && perPenceValue > 0)
  let addTierSubmitting = $state(false)
  let tierSubmitting = $state<Record<string, boolean>>({})

  let ratioPrimary   = $derived(getContrastRatio(pickerPrimary, pickerOnPrimary))
  let ratioSecondary = $derived(getContrastRatio(pickerSecondary, pickerOnSecondary))
  let contrastPrimary   = $derived(getContrastRating(ratioPrimary))
  let contrastSecondary = $derived(getContrastRating(ratioSecondary))

  $effect(() => {
    if ($page.url.searchParams.get('saved') !== '1') return
    showToast = true
    goto('/admin/settings', { replaceState: true })
  })

  $effect(() => {
    if (!showToast) return
    const t = setTimeout(() => { showToast = false }, 5000)
    return () => clearTimeout(t)
  })

  $effect(() => {
    pickerPrimary     = data.branding.color_primary
    hexPrimary        = data.branding.color_primary.slice(1)
    pickerSecondary   = data.branding.color_secondary
    hexSecondary      = data.branding.color_secondary.slice(1)
    pickerOnPrimary   = data.branding.color_on_primary
    hexOnPrimary      = data.branding.color_on_primary.slice(1)
    pickerOnSecondary = data.branding.color_on_secondary
    hexOnSecondary    = data.branding.color_on_secondary.slice(1)
  })

  $effect(() => {
    loyaltyEnabled = data.preferences.loyalty_enabled
    perBookingValue = data.preferences.loyalty_points_per_booking ?? 0
    perPenceValue = data.preferences.loyalty_points_per_pence ?? 0
  })
</script>

<svelte:head>
  <title>Shop Settings — Snips Admin</title>
</svelte:head>

<div class="settings-page">
  <header class="settings-page__header">
    <h1>Shop Settings</h1>
  </header>

  <!-- ── Section A: Booking Preferences ─────────────── -->
  <section class="settings-section">
    <h2 class="settings-section__title">Booking Preferences</h2>

    <form
      method="POST"
      action="?/updatePreferences"
      use:enhance={() => {
        submitting = true
        return async ({ update }) => {
          submitting = false
          await update()
        }
      }}
    >
      <!-- Auto-accept (coming soon) -->
      <div class="setting-row">
        <div class="setting-row__info">
          <span class="setting-row__label">Auto-accept bookings <ComingSoon /></span>
          <span class="setting-row__desc">Automatically accept all incoming bookings without manual review</span>
        </div>
        <button type="button" class="toggle" disabled aria-pressed="false" aria-label="Auto-accept bookings">
          <span class="toggle__thumb"></span>
        </button>
      </div>

      <hr class="divider" />

      <!-- Booking window -->
      <div class="setting-row">
        <div class="setting-row__info">
          <span class="setting-row__label">Booking window</span>
          <span class="setting-row__desc">How many days ahead customers can book</span>
          {#if form?.errors?.booking_window_days}
            <p class="field-error">{form.errors.booking_window_days}</p>
          {/if}
        </div>
        <div class="setting-row__number">
          <input
            id="booking_window_days"
            name="booking_window_days"
            type="number"
            class="number-input"
            class:number-input--error={form?.errors?.booking_window_days}
            value={form?.values?.booking_window_days ?? data.preferences.booking_window_days}
            min="1"
            max="365"
            step="1"
          />
          <span class="setting-row__unit">days</span>
        </div>
      </div>

      <hr class="divider" />

      <!-- Buffer time -->
      <div class="setting-row">
        <div class="setting-row__info">
          <span class="setting-row__label">Buffer time</span>
          <span class="setting-row__desc">Gap added between appointments (minutes)</span>
          {#if form?.errors?.buffer_minutes}
            <p class="field-error">{form.errors.buffer_minutes}</p>
          {/if}
        </div>
        <div class="setting-row__number">
          <input
            id="buffer_minutes"
            name="buffer_minutes"
            type="number"
            class="number-input"
            class:number-input--error={form?.errors?.buffer_minutes}
            value={form?.values?.buffer_minutes ?? data.preferences.buffer_minutes}
            min="0"
            max="120"
            step="1"
          />
          <span class="setting-row__unit">min</span>
        </div>
      </div>

      <hr class="divider" />

      <!-- Require deposit (coming soon) -->
      <div class="setting-row">
        <div class="setting-row__info">
          <span class="setting-row__label">Require deposit <ComingSoon /></span>
          <span class="setting-row__desc">Require customers to pay a deposit when booking</span>
        </div>
        <button type="button" class="toggle" disabled aria-pressed="false" aria-label="Require deposit">
          <span class="toggle__thumb"></span>
        </button>
      </div>

      <hr class="divider" />

      <!-- Enable shop page (coming soon) -->
      <div class="setting-row">
        <div class="setting-row__info">
          <span class="setting-row__label">Enable shop page <ComingSoon /></span>
          <span class="setting-row__desc">Show a branded shop page as part of the booking flow</span>
        </div>
        <button type="button" class="toggle" disabled aria-pressed="false" aria-label="Enable shop page">
          <span class="toggle__thumb"></span>
        </button>
      </div>

      {#if form?.errors?.form}
        <p class="form-error">{form.errors.form}</p>
      {/if}

      <div class="settings-section__footer">
        <Button type="submit" edges="soft" disabled={submitting} loading={submitting}>
          {submitting ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  </section>

  <!-- ── Loyalty Points ───────────────────────────────── -->
  <section class="settings-section">
    <h2 class="settings-section__title">Loyalty Points</h2>
    <p class="settings-section__subdesc">Reward customers with points when bookings are completed.</p>

    <form
      method="POST"
      action="?/updateLoyalty"
      use:enhance={() => {
        loyaltySubmitting = true
        return async ({ update }) => {
          loyaltySubmitting = false
          await update()
        }
      }}
    >
      {#if loyaltyEnabled}
        <input type="hidden" name="loyaltyEnabled" value="on" />
      {/if}

      <div class="setting-row">
        <div class="setting-row__info">
          <span class="setting-row__label">Enable loyalty scheme</span>
          {#if !loyaltyEnabled}
            <span class="setting-row__desc">
              Loyalty points are disabled. Enable the scheme to configure earning rules
              and show points to customers.
            </span>
          {/if}
        </div>
        <button
          type="button"
          class="toggle"
          class:toggle--on={loyaltyEnabled}
          onclick={() => { loyaltyEnabled = !loyaltyEnabled }}
          aria-pressed={loyaltyEnabled}
          aria-label="Enable loyalty scheme"
        >
          <span class="toggle__thumb"></span>
        </button>
      </div>

      <hr class="divider" />

      <div class="setting-row" class:setting-row--muted={!loyaltyEnabled}>
        <div class="setting-row__info">
          <span class="setting-row__label">Points per completed booking</span>
          <span class="setting-row__desc">
            A flat number of points awarded for every completed booking. Leave blank to disable.
          </span>
          {#if form?.loyaltyErrors?.pointsPerBooking}
            <p class="field-error">{form.loyaltyErrors.pointsPerBooking}</p>
          {/if}
        </div>
        <input
          name="pointsPerBooking"
          type="number"
          class="number-input number-input--wide"
          placeholder="e.g. 5"
          min="0"
          step="1"
          value={form?.loyaltyValues?.pointsPerBooking ?? (data.preferences.loyalty_points_per_booking ?? '')}
          oninput={(e) => { perBookingValue = (e.currentTarget as HTMLInputElement).valueAsNumber || 0 }}
          disabled={!loyaltyEnabled}
        />
      </div>

      <hr class="divider" />

      <div class="setting-row" class:setting-row--muted={!loyaltyEnabled}>
        <div class="setting-row__info">
          <span class="setting-row__label">Points per £___ spent</span>
          <span class="setting-row__desc">
            Award 1 point for every X pence spent. Enter 100 for 1 point per £1,
            or 500 for 1 point per £5. Leave blank to disable.
          </span>
          {#if form?.loyaltyErrors?.pointsPerPence}
            <p class="field-error">{form.loyaltyErrors.pointsPerPence}</p>
          {/if}
        </div>
        <input
          name="pointsPerPence"
          type="number"
          class="number-input number-input--wide"
          placeholder="e.g. 100"
          min="0"
          step="1"
          value={form?.loyaltyValues?.pointsPerPence ?? (data.preferences.loyalty_points_per_pence ?? '')}
          oninput={(e) => { perPenceValue = (e.currentTarget as HTMLInputElement).valueAsNumber || 0 }}
          disabled={!loyaltyEnabled}
        />
      </div>

      {#if showStackWarning}
        <div class="loyalty-stack-warning">
          Both earning methods are active — customers will earn flat points per booking
          <strong>and</strong> spend-based points on the same visit.
        </div>
      {/if}

      {#if form?.loyaltyErrors?.form}
        <p class="form-error">{form.loyaltyErrors.form}</p>
      {/if}

      <div class="settings-section__footer">
        <Button type="submit" edges="soft" disabled={loyaltySubmitting} loading={loyaltySubmitting}>
          {loyaltySubmitting ? 'Saving…' : 'Save loyalty settings'}
        </Button>
      </div>
    </form>

    {#if loyaltyEnabled}
      <div class="tiers-section">
        <hr class="divider" />
        <h3 class="tiers-section__title">Reward Tiers</h3>
        <p class="tiers-section__desc">Define what customers can redeem their points for.</p>

        {#if data.tiers.length === 0}
          <p class="tiers-empty">No reward tiers yet. Add one below.</p>
        {:else}
          <ul class="tier-list">
            {#each data.tiers as tier (tier.id)}
              <li class="tier-row">
                <div class="tier-row__body">
                  <div class="tier-row__header">
                    <span class="tier-row__name">{tier.name}</span>
                    <span class="tier-row__pts">{tier.points_required} pts</span>
                  </div>
                  <span class="tier-row__desc">{tier.reward_description}</span>
                  <span class="tier-row__value">
                    {tier.reward_value_pence != null ? `£${(tier.reward_value_pence / 100).toFixed(2)}` : '—'}
                  </span>
                </div>
                <div class="tier-row__actions">
                  <span class="tier-badge" class:tier-badge--active={tier.is_active}>
                    {tier.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <form method="POST" action="?/toggleTier" use:enhance={() => {
                    tierSubmitting[tier.id] = true
                    return async ({ update }) => {
                      tierSubmitting[tier.id] = false
                      await update()
                    }
                  }}>
                    <input type="hidden" name="tierId" value={tier.id} />
                    <button type="submit" class="tier-action-btn" disabled={tierSubmitting[tier.id]}>
                      {tier.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </form>
                  <form method="POST" action="?/deleteTier" use:enhance={() => {
                    tierSubmitting[`del_${tier.id}`] = true
                    return async ({ update }) => {
                      tierSubmitting[`del_${tier.id}`] = false
                      await update()
                    }
                  }}>
                    <input type="hidden" name="tierId" value={tier.id} />
                    <button type="submit" class="tier-action-btn tier-action-btn--danger" disabled={tierSubmitting[`del_${tier.id}`]}>
                      Delete
                    </button>
                  </form>
                </div>
                {#if form?.deleteError && form?.deletedTierId === tier.id}
                  <p class="tier-row__error">{form.deleteError}</p>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}

        <div class="add-tier">
          <h4 class="add-tier__title">Add a Tier</h4>
          <form method="POST" action="?/addTier" use:enhance={() => {
            addTierSubmitting = true
            return async ({ update }) => {
              addTierSubmitting = false
              await update()
            }
          }}>
            <div class="add-tier-fields">
              <div class="field-group">
                <label class="field-label" for="tierName">Name</label>
                <input
                  id="tierName"
                  name="tierName"
                  type="text"
                  class="field-input"
                  class:field-input--error={form?.tierErrors?.name}
                  placeholder="e.g. £5 Off"
                  value={form?.tierValues?.name ?? ''}
                  maxlength="50"
                  disabled={addTierSubmitting}
                />
                {#if form?.tierErrors?.name}
                  <p class="field-error">{form.tierErrors.name}</p>
                {/if}
              </div>
              <div class="field-group">
                <label class="field-label" for="tierPointsRequired">Points required</label>
                <input
                  id="tierPointsRequired"
                  name="tierPointsRequired"
                  type="number"
                  class="field-input"
                  class:field-input--error={form?.tierErrors?.pointsRequired}
                  placeholder="e.g. 200"
                  value={form?.tierValues?.pointsRequired ?? ''}
                  min="1"
                  step="1"
                  disabled={addTierSubmitting}
                />
                {#if form?.tierErrors?.pointsRequired}
                  <p class="field-error">{form.tierErrors.pointsRequired}</p>
                {/if}
              </div>
              <div class="field-group field-group--full">
                <label class="field-label" for="tierRewardDescription">Reward description</label>
                <input
                  id="tierRewardDescription"
                  name="tierRewardDescription"
                  type="text"
                  class="field-input"
                  class:field-input--error={form?.tierErrors?.rewardDescription}
                  placeholder="e.g. £5 off your next service"
                  value={form?.tierValues?.rewardDescription ?? ''}
                  maxlength="200"
                  disabled={addTierSubmitting}
                />
                {#if form?.tierErrors?.rewardDescription}
                  <p class="field-error">{form.tierErrors.rewardDescription}</p>
                {/if}
              </div>
              <div class="field-group">
                <label class="field-label" for="tierRewardValuePence">£ value (optional)</label>
                <input
                  id="tierRewardValuePence"
                  name="tierRewardValuePence"
                  type="number"
                  class="field-input"
                  class:field-input--error={form?.tierErrors?.rewardValuePence}
                  placeholder="e.g. 500 for £5.00"
                  value={form?.tierValues?.rewardValuePence ?? ''}
                  min="1"
                  step="1"
                  disabled={addTierSubmitting}
                />
                {#if form?.tierErrors?.rewardValuePence}
                  <p class="field-error">{form.tierErrors.rewardValuePence}</p>
                {/if}
              </div>
            </div>

            {#if form?.tierErrors?.form}
              <p class="form-error">{form.tierErrors.form}</p>
            {/if}

            <div class="add-tier__footer">
              <Button type="submit" size="sm" edges="soft" disabled={addTierSubmitting} loading={addTierSubmitting}>
                {addTierSubmitting ? 'Adding…' : 'Add tier'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    {/if}
  </section>

  <!-- ── Section B: Display Settings ─────────────────── -->
  <section class="settings-section">
    <h2 class="settings-section__title">Display Settings</h2>

    <!-- Info panel toggle (coming soon) -->
    <div class="setting-row">
      <div class="setting-row__info">
        <span class="setting-row__label">Customer info panel <ComingSoon /></span>
        <span class="setting-row__desc">Show a temporary message to customers during the booking flow (e.g. holiday hours, promotions)</span>
      </div>
      <button type="button" class="toggle" disabled aria-pressed="false" aria-label="Customer info panel">
        <span class="toggle__thumb"></span>
      </button>
    </div>

    <hr class="divider" />

    <!-- Info panel message (coming soon) -->
    <div class="setting-row setting-row--stacked">
      <span class="setting-row__label">Info panel message <ComingSoon /></span>
      <textarea
        class="panel-textarea"
        placeholder="Enter a message to display to customers"
        disabled
        rows="3"
      ></textarea>
    </div>

    <hr class="divider" />

    <!-- Info panel expiry (coming soon) -->
    <div class="setting-row">
      <div class="setting-row__info">
        <span class="setting-row__label">Hide panel after <ComingSoon /></span>
      </div>
      <input type="date" class="date-input" disabled />
    </div>
  </section>

  <!-- ── Section C: Branding ──────────────────────────── -->
  <section class="settings-section">
    <h2 class="settings-section__title">Branding</h2>

    <form
      method="POST"
      action="?/updateBranding"
      bind:this={brandingFormEl}
      use:enhance={({ cancel }) => {
        if (!bypassWarning && (!contrastPrimary.pass || !contrastSecondary.pass)) {
          cancel()
          showContrastWarning = true
          return
        }
        brandingSubmitting = true
        bypassWarning = false
        return async ({ update }) => {
          brandingSubmitting = false
          showContrastWarning = false
          await update()
        }
      }}
    >
      <input type="hidden" name="color_primary"     value={'#' + hexPrimary} />
      <input type="hidden" name="color_secondary"   value={'#' + hexSecondary} />
      <input type="hidden" name="color_on_primary"  value={'#' + hexOnPrimary} />
      <input type="hidden" name="color_on_secondary" value={'#' + hexOnSecondary} />

      <ColourRow
        label="Primary colour"
        description="Main brand colour used across the site for buttons, booking screen and navigation bar"
        error={form?.brandingErrors?.color_primary}
        bind:pickerValue={pickerPrimary}
        bind:hexValue={hexPrimary}
      />

      <hr class="divider" />

      <ColourRow
        label="Text over primary colour"
        description="Text and icon colour displayed on top of your primary colour"
        error={form?.brandingErrors?.color_on_primary}
        bind:pickerValue={pickerOnPrimary}
        bind:hexValue={hexOnPrimary}
      />

      <hr class="divider" />

      <ColourRow
        label="Secondary colour"
        description="Supporting brand colour used for accents, highlights and secondary buttons"
        error={form?.brandingErrors?.color_secondary}
        bind:pickerValue={pickerSecondary}
        bind:hexValue={hexSecondary}
      />

      <hr class="divider" />

      <ColourRow
        label="Text over secondary colour"
        description="Text and icon colour displayed on top of your secondary colour"
        error={form?.brandingErrors?.color_on_secondary}
        bind:pickerValue={pickerOnSecondary}
        bind:hexValue={hexOnSecondary}
      />

      <!-- Live preview -->
      <div class="branding-preview">
        <span class="branding-preview__label">Preview &amp; Accessibility Check</span>
        <div class="branding-preview__buttons">
          <div class="branding-preview__pair">
            <div style="pointer-events: none; --color-primary: {pickerPrimary}; --color-on-primary: {pickerOnPrimary}">
              <Button type="button" variant="primary" edges="soft">Book now</Button>
            </div>
            <div class="contrast-info">
              <span class="contrast-info__ratio">{ratioPrimary.toFixed(2)}:1</span>
              <span class="contrast-badge contrast-badge--{contrastPrimary.level}">{contrastPrimary.label}</span>
              <span class="contrast-info__detail">{contrastPrimary.detail}</span>
            </div>
          </div>
          <div class="branding-preview__pair">
            <div style="pointer-events: none; --color-secondary: {pickerSecondary}; --color-on-secondary: {pickerOnSecondary}">
              <Button type="button" variant="secondary" edges="soft">View services</Button>
            </div>
            <div class="contrast-info">
              <span class="contrast-info__ratio">{ratioSecondary.toFixed(2)}:1</span>
              <span class="contrast-badge contrast-badge--{contrastSecondary.level}">{contrastSecondary.label}</span>
              <span class="contrast-info__detail">{contrastSecondary.detail}</span>
            </div>
          </div>
        </div>
      </div>

      {#if form?.brandingErrors?.form}
        <p class="form-error">{form.brandingErrors.form}</p>
      {/if}

      {#if showContrastWarning}
        <div class="contrast-warning">
          <p class="contrast-warning__text">
            One or more colour pairs don't meet WCAG AA contrast (4.5:1) for normal text.
            Affected users may have difficulty reading button labels.
          </p>
          <div class="contrast-warning__actions">
            <Button
              type="button"
              edges="soft"
              onclick={() => { bypassWarning = true; brandingFormEl?.requestSubmit() }}
            >
              Save anyway
            </Button>
            <button
              type="button"
              class="contrast-warning__dismiss"
              onclick={() => { showContrastWarning = false }}
            >
              Go back and adjust
            </button>
          </div>
        </div>
      {/if}

      <div class="settings-section__footer">
        <Button type="submit" edges="soft" disabled={brandingSubmitting} loading={brandingSubmitting}>
          {brandingSubmitting ? 'Saving…' : 'Save branding'}
        </Button>
      </div>
    </form>
  </section>
</div>

<div class="toast-container">
  <Toast show={showToast} message="Settings saved." type="success" />
</div>

<style>
  .settings-page {
    max-width: 640px;
    margin: var(--space-8) auto;
    padding: 0 var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .settings-page__header h1 {
    font-size: var(--font-size-2xl);
    font-weight: 700;
    color: var(--color-text);
  }

  /* ── Section card ──────────────────────────────── */

  .settings-section {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    display: flex;
    flex-direction: column;
  }

  .settings-section__title {
    font-size: var(--font-size-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    margin-bottom: var(--space-4);
  }

  .divider {
    border: none;
    border-top: 1px solid var(--color-border);
    margin: 0;
  }

  .settings-section__footer {
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-4);
    margin-top: var(--space-2);
  }

  /* ── Setting rows ──────────────────────────────── */

  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-6);
    padding: var(--space-4) 0;
  }

  .setting-row--stacked {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
  }

  .setting-row__info {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    flex: 1;
    min-width: 0;
  }

  .setting-row__label {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
  }

  .setting-row__desc {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    line-height: 1.4;
  }

  .setting-row__number {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .setting-row__unit {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  /* ── Section subdesc ──────────────────────────── */

  .settings-section__subdesc {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    margin-bottom: var(--space-2);
    line-height: 1.4;
  }

  /* ── Muted row (disabled loyalty inputs) ───────── */

  .setting-row--muted {
    opacity: 0.5;
    pointer-events: none;
  }

  /* ── Number input ──────────────────────────────── */

  .number-input {
    width: 5rem;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-family: var(--font-sans);
    color: var(--color-text);
    background: var(--color-bg);
    transition: var(--transition);
    text-align: right;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    &--error {
      border-color: var(--color-rejected-text);
    }

    &--wide {
      width: 8rem;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  /* ── Toggle switch ─────────────────────────────── */

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

  /* ── Disabled fields ───────────────────────────── */

  .panel-textarea {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-family: var(--font-sans);
    color: var(--color-text-muted);
    background: var(--color-bg);
    resize: vertical;
    min-height: 5rem;
    box-sizing: border-box;
    opacity: 0.6;
    cursor: not-allowed;
  }

  .date-input {
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-family: var(--font-sans);
    color: var(--color-text-muted);
    background: var(--color-bg);
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* ── Loyalty stack warning ─────────────────────── */

  .loyalty-stack-warning {
    margin-top: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--color-pending-bg);
    color: var(--color-pending-text);
    border-radius: var(--radius-md);
    font-size: var(--font-size-xs);
    line-height: 1.5;
  }

  /* ── Errors ────────────────────────────────────── */

  .field-error {
    font-size: var(--font-size-xs);
    color: var(--color-rejected-text);
  }

  .form-error {
    margin-top: var(--space-4);
    padding: var(--space-3) var(--space-4);
    background: var(--color-rejected-bg);
    color: var(--color-rejected-text);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
  }

  /* ── Branding preview ───────────────────────────── */

  .branding-preview {
    margin-top: var(--space-6);
    padding: var(--space-4);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .branding-preview__label {
    font-size: var(--font-size-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
  }

  .branding-preview__buttons {
    display: flex;
    gap: var(--space-3);
    flex-wrap: wrap;
  }

  /* ── Toast ─────────────────────────────────────── */

  .toast-container {
    position: fixed;
    bottom: var(--space-6);
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
    pointer-events: none;
  }

  /* ── Contrast info (below each preview button) ─ */

  .branding-preview__buttons {
    align-items: flex-start;
  }

  .branding-preview__pair {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .contrast-info {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .contrast-info__ratio {
    font-size: var(--font-size-xs);
    font-family: monospace;
    color: var(--color-text);
    font-weight: 600;
  }

  .contrast-info__detail {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    display: block;
    width: 100%;
  }

  .contrast-badge {
    font-size: var(--font-size-xs);
    font-weight: 600;
    padding: 1px var(--space-2);
    border-radius: var(--radius-full);

    &--aa {
      background: var(--color-accepted-bg);
      color: var(--color-accepted-text);
    }

    &--aa-large {
      background: var(--color-pending-bg);
      color: var(--color-pending-text);
    }

    &--fail {
      background: var(--color-rejected-bg);
      color: var(--color-rejected-text);
    }
  }

  /* ── Contrast warning ───────────────────────── */

  .contrast-warning {
    margin-top: var(--space-4);
    padding: var(--space-4);
    background: var(--color-pending-bg);
    border: 1px solid var(--color-pending-text);
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .contrast-warning__text {
    font-size: var(--font-size-sm);
    color: var(--color-pending-text);
    line-height: 1.5;
  }

  .contrast-warning__actions {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex-wrap: wrap;
  }

  .contrast-warning__dismiss {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    text-decoration: underline;

    &:hover {
      color: var(--color-text);
    }
  }

  /* ── Reward tiers subsection ────────────────────── */

  .tiers-section {
    display: flex;
    flex-direction: column;
  }

  .tiers-section__title {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
    margin: var(--space-4) 0 var(--space-1);
  }

  .tiers-section__desc {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    margin-bottom: var(--space-3);
  }

  .tiers-empty {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    margin-bottom: var(--space-4);
  }

  .tier-list {
    list-style: none;
    padding: 0;
    margin: 0 0 var(--space-2);
    border-top: 1px solid var(--color-border);
  }

  .tier-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-3) 0;
    border-bottom: 1px solid var(--color-border);
    flex-wrap: wrap;
  }

  .tier-row__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    flex: 1;
    min-width: 0;
  }

  .tier-row__header {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .tier-row__name {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text);
  }

  .tier-row__pts {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  .tier-row__desc {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .tier-row__value {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .tier-row__actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  .tier-row__error {
    width: 100%;
    font-size: var(--font-size-xs);
    color: var(--color-rejected-text);
  }

  .tier-badge {
    font-size: var(--font-size-xs);
    font-weight: 600;
    padding: 1px var(--space-2);
    border-radius: var(--radius-full);
    background: var(--color-surface-hover);
    color: var(--color-text-muted);
    border: 1px solid var(--color-border);
    white-space: nowrap;

    &--active {
      background: var(--color-accepted-bg);
      color: var(--color-accepted-text);
      border-color: transparent;
    }
  }

  .tier-action-btn {
    font-size: var(--font-size-xs);
    font-family: var(--font-sans);
    font-weight: 500;
    padding: var(--space-1) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: none;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: var(--transition);
    white-space: nowrap;

    &:hover {
      color: var(--color-text);
      border-color: var(--color-text-subtle);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &--danger {
      color: var(--color-rejected-text);
      border-color: currentColor;

      &:hover {
        background: var(--color-rejected-bg);
      }
    }
  }

  /* ── Add tier form ──────────────────────────────── */

  .add-tier {
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-4);
    margin-top: var(--space-2);
  }

  .add-tier__title {
    font-size: var(--font-size-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    margin-bottom: var(--space-3);
  }

  .add-tier-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }

  @media (max-width: 480px) {
    .add-tier-fields {
      grid-template-columns: 1fr;
    }

    .field-group--full {
      grid-column: 1;
    }
  }

  .add-tier__footer {
    display: flex;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .field-group--full {
    grid-column: 1 / -1;
  }

  .field-label {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--color-text-muted);
  }

  .field-input {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-family: var(--font-sans);
    color: var(--color-text);
    background: var(--color-bg);
    transition: var(--transition);
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    &--error {
      border-color: var(--color-rejected-text);
    }
  }
</style>
