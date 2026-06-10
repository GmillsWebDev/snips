<script lang="ts">
  import { enhance } from '$app/forms'
  import Toast from '$lib/components/ui/Toast.svelte'
  import type { PageData } from './$types'
  import type { DiscountCode } from './+page.server'

  let { data }: { data: PageData } = $props()

  let showForm = $state(false)
  let discountType = $state<'percentage' | 'fixed'>('percentage')
  let creating = $state(false)
  let createError = $state('')
  let createField = $state('')
  let toggling = $state<string | null>(null)
  let deleting = $state<string | null>(null)
  let showToast = $state(false)
  let toastMessage = $state('')

  $effect(() => {
    if (!showToast) return
    const t = setTimeout(() => { showToast = false }, 5000)
    return () => clearTimeout(t)
  })

  function formatDiscount(code: DiscountCode): string {
    if (code.discount_type === 'percentage') return `${code.discount_value}% off`
    return `£${(code.discount_value / 100).toFixed(2)} off`
  }

  function formatExpiry(code: DiscountCode): string {
    if (!code.valid_until) return 'No expiry'
    return `Expires ${new Date(code.valid_until).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
  }

  function formatServices(code: DiscountCode): string {
    if (code.restricted_service_names.length === 0) return 'All services'
    return code.restricted_service_names.join(', ')
  }

  function handleCodeInput(e: Event) {
    const input = e.currentTarget as HTMLInputElement
    const pos = input.selectionStart
    input.value = input.value.toUpperCase()
    input.setSelectionRange(pos, pos)
  }
</script>

<svelte:head>
  <title>Discount Codes — Snips Admin</title>
</svelte:head>

<div class="dc-page">
  <header class="dc-page__header">
    <h1>Discount Codes</h1>
    <button
      type="button"
      class="create-btn"
      onclick={() => { showForm = !showForm; createError = '' }}
    >{showForm ? 'Cancel' : 'Create code'}</button>
  </header>

  <!-- ── Codes list ─────────────────────────────────── -->

  {#if data.codes.length === 0}
    <div class="empty-state">
      <p class="empty-state__message">No discount codes yet.</p>
    </div>
  {:else}
    <div class="table-wrap">
      <table class="dc-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Discount</th>
            <th>Usage</th>
            <th>Expiry</th>
            <th>Services</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each data.codes as code (code.id)}
            <tr>
              <td class="dc-table__code-cell">
                <span class="dc-table__code">{code.code}</span>
                {#if code.description}
                  <span class="dc-table__desc">{code.description}</span>
                {/if}
              </td>
              <td class="dc-table__meta">{formatDiscount(code)}</td>
              <td class="dc-table__meta">
                {code.times_used} used{#if code.max_uses} / {code.max_uses}{/if}
              </td>
              <td class="dc-table__meta">{formatExpiry(code)}</td>
              <td class="dc-table__meta dc-table__services">{formatServices(code)}</td>
              <td>
                <span class="status-badge status-badge--{code.is_active ? 'active' : 'inactive'}">
                  {code.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td class="dc-table__actions">
                <form
                  method="post"
                  action="?/toggleCode"
                  use:enhance={() => {
                    toggling = code.id
                    return async ({ result, update }) => {
                      if (result.type === 'failure') {
                        const d = result.data as Record<string, unknown>
                        toastMessage = String(d.toggleError ?? 'Failed to update code')
                        showToast = true
                      }
                      await update()
                      toggling = null
                    }
                  }}
                >
                  <input type="hidden" name="codeId" value={code.id} />
                  <button
                    type="submit"
                    class="action-btn"
                    disabled={toggling === code.id}
                  >{code.is_active ? 'Deactivate' : 'Activate'}</button>
                </form>
                <form
                  method="post"
                  action="?/deleteCode"
                  use:enhance={() => {
                    deleting = code.id
                    return async ({ result, update }) => {
                      if (result.type === 'failure') {
                        const d = result.data as Record<string, unknown>
                        toastMessage = String(d.deleteError ?? 'Failed to delete code')
                        showToast = true
                      }
                      await update()
                      deleting = null
                    }
                  }}
                >
                  <input type="hidden" name="codeId" value={code.id} />
                  <button
                    type="submit"
                    class="action-btn action-btn--danger"
                    disabled={code.times_used > 0 || deleting === code.id}
                    title={code.times_used > 0 ? 'This code has been used and cannot be deleted. Deactivate it instead.' : undefined}
                  >Delete</button>
                </form>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <!-- ── Create form ────────────────────────────────── -->

  {#if showForm}
    <section class="create-form-wrap">
      <h2 class="create-form__heading">New discount code</h2>

      {#if createError}
        <p class="form-error">{createError}</p>
      {/if}

      <form
        method="post"
        action="?/createCode"
        class="create-form"
        use:enhance={() => {
          creating = true
          createError = ''
          createField = ''
          return async ({ result, update }) => {
            if (result.type === 'failure') {
              const d = result.data as Record<string, unknown>
              createError = String(d.createError ?? 'Failed to create code')
              createField = String(d.field ?? '')
              creating = false
              return
            }
            await update()
            creating = false
            showForm = false
          }
        }}
      >
        <!-- Code + Description -->
        <div class="form-row form-row--half">
          <div class="form-field" class:form-field--error={createField === 'code'}>
            <label for="dc-code">Code <span class="form-field__required">*</span></label>
            <input
              id="dc-code"
              name="code"
              type="text"
              class="form-input form-input--mono"
              placeholder="SUMMER20"
              maxlength="30"
              required
              disabled={creating}
              oninput={handleCodeInput}
            />
            <span class="form-field__hint">Letters, numbers and hyphens only</span>
          </div>
          <div class="form-field">
            <label for="dc-description">Description <span class="form-field__optional">(optional)</span></label>
            <input
              id="dc-description"
              name="description"
              type="text"
              class="form-input"
              placeholder="Summer promotion"
              disabled={creating}
            />
          </div>
        </div>

        <!-- Discount type + value -->
        <div class="form-row form-row--half">
          <div class="form-field" class:form-field--error={createField === 'discountType'}>
            <fieldset class="type-toggle">
              <legend>Discount type <span class="form-field__required">*</span></legend>
              <div class="type-toggle__options">
                <label class="type-toggle__option" class:type-toggle__option--active={discountType === 'percentage'}>
                  <input
                    type="radio"
                    name="discountType"
                    value="percentage"
                    checked={discountType === 'percentage'}
                    onchange={() => discountType = 'percentage'}
                    disabled={creating}
                  />
                  Percentage
                </label>
                <label class="type-toggle__option" class:type-toggle__option--active={discountType === 'fixed'}>
                  <input
                    type="radio"
                    name="discountType"
                    value="fixed"
                    checked={discountType === 'fixed'}
                    onchange={() => discountType = 'fixed'}
                    disabled={creating}
                  />
                  Fixed amount
                </label>
              </div>
            </fieldset>
          </div>
          <div class="form-field" class:form-field--error={createField === 'discountValue'}>
            <label for="dc-value">
              {discountType === 'percentage' ? 'Percentage off' : 'Amount off'}
              <span class="form-field__required">*</span>
            </label>
            <div class="input-affix">
              {#if discountType === 'fixed'}
                <span class="input-affix__prefix">£</span>
              {/if}
              <input
                id="dc-value"
                name="discountValue"
                type="number"
                class="form-input"
                class:form-input--has-prefix={discountType === 'fixed'}
                class:form-input--has-suffix={discountType === 'percentage'}
                min="1"
                max={discountType === 'percentage' ? 100 : 100}
                step={discountType === 'percentage' ? 1 : 0.01}
                required
                disabled={creating}
                placeholder={discountType === 'percentage' ? '20' : '5.00'}
              />
              {#if discountType === 'percentage'}
                <span class="input-affix__suffix">%</span>
              {/if}
            </div>
          </div>
        </div>

        <!-- Min spend + limits -->
        <div class="form-row form-row--thirds">
          <div class="form-field">
            <label for="dc-minspend">Min spend <span class="form-field__optional">(optional)</span></label>
            <div class="input-affix">
              <span class="input-affix__prefix">£</span>
              <input
                id="dc-minspend"
                name="minSpendPence"
                type="number"
                class="form-input form-input--has-prefix"
                min="0.01"
                step="0.01"
                disabled={creating}
                placeholder="0.00"
              />
            </div>
            <span class="form-field__hint">Leave blank for no minimum</span>
          </div>
          <div class="form-field">
            <label for="dc-maxuses">Max uses <span class="form-field__optional">(optional)</span></label>
            <input
              id="dc-maxuses"
              name="maxUses"
              type="number"
              class="form-input"
              min="1"
              step="1"
              disabled={creating}
              placeholder="—"
            />
            <span class="form-field__hint">Leave blank for unlimited</span>
          </div>
          <div class="form-field">
            <label for="dc-maxpercustomer">Per customer <span class="form-field__optional">(optional)</span></label>
            <input
              id="dc-maxpercustomer"
              name="maxUsesPerCustomer"
              type="number"
              class="form-input"
              min="1"
              step="1"
              disabled={creating}
              placeholder="—"
            />
            <span class="form-field__hint">Leave blank for unlimited</span>
          </div>
        </div>

        <!-- Valid from / until -->
        <div class="form-row form-row--half">
          <div class="form-field">
            <label for="dc-from">Valid from <span class="form-field__optional">(optional)</span></label>
            <input
              id="dc-from"
              name="validFrom"
              type="date"
              class="form-input"
              disabled={creating}
            />
          </div>
          <div class="form-field" class:form-field--error={createField === 'validUntil'}>
            <label for="dc-until">Valid until <span class="form-field__optional">(optional)</span></label>
            <input
              id="dc-until"
              name="validUntil"
              type="date"
              class="form-input"
              disabled={creating}
            />
          </div>
        </div>

        <!-- Service restrictions -->
        {#if data.services.length > 0}
          <div class="form-field">
            <fieldset class="service-restrict">
              <legend>Service restriction <span class="form-field__optional">(optional)</span></legend>
              <span class="form-field__hint">Leave all unchecked to apply to any service</span>
              <div class="service-restrict__list">
                {#each data.services as svc (svc.id)}
                  <label class="service-restrict__option">
                    <input
                      type="checkbox"
                      name="serviceIds"
                      value={svc.id}
                      disabled={creating}
                    />
                    {svc.name}
                  </label>
                {/each}
              </div>
            </fieldset>
          </div>
        {/if}

        <div class="create-form__footer">
          <button type="submit" class="submit-btn" disabled={creating}>
            {creating ? 'Creating…' : 'Create code'}
          </button>
        </div>
      </form>
    </section>
  {/if}

  <div class="toast-container">
    <Toast show={showToast} message={toastMessage} type="error" />
  </div>
</div>

<style>
  .dc-page {
    max-width: 960px;
    margin: 0 auto;
    padding: var(--space-8) var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .dc-page__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
  }

  .dc-page__header h1 {
    font-size: var(--font-size-2xl);
    font-weight: 700;
  }

  /* ── Buttons ─────────────────────────────────────── */

  .create-btn {
    padding: var(--space-2) var(--space-4);
    background: var(--color-primary);
    color: var(--color-on-primary, #fff);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
    transition: var(--transition);

    &:hover {
      background: var(--color-primary-hover);
    }
  }

  .action-btn {
    display: inline-flex;
    align-items: center;
    font-size: var(--font-size-xs);
    font-weight: 500;
    color: var(--color-text-muted);
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: none;
    cursor: pointer;
    transition: var(--transition);
    margin-left: var(--space-1);

    &:hover:not(:disabled) {
      color: var(--color-text);
      border-color: var(--color-text-subtle);
      background: var(--color-surface-hover);
    }

    &:disabled {
      opacity: 0.4;
      cursor: default;
    }
  }

  .action-btn--danger:hover:not(:disabled) {
    color: var(--color-rejected-text);
    border-color: var(--color-rejected-text);
    background: var(--color-rejected-bg);
  }

  .submit-btn {
    padding: var(--space-2) var(--space-6);
    background: var(--color-primary);
    color: var(--color-on-primary, #fff);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
    transition: var(--transition);

    &:hover:not(:disabled) {
      background: var(--color-primary-hover);
    }

    &:disabled {
      opacity: 0.6;
      cursor: default;
    }
  }

  /* ── Empty state ─────────────────────────────────── */

  .empty-state {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-12) var(--space-8);
    text-align: center;
  }

  .empty-state__message {
    font-size: var(--font-size-lg);
    font-weight: 500;
  }

  /* ── Table ───────────────────────────────────────── */

  .table-wrap {
    overflow-x: auto;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
  }

  .dc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--font-size-sm);
  }

  .dc-table thead {
    border-bottom: 1px solid var(--color-border);
  }

  .dc-table th {
    padding: var(--space-3) var(--space-4);
    text-align: left;
    font-weight: 600;
    font-size: var(--font-size-xs);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  .dc-table td {
    padding: var(--space-3) var(--space-4);
    color: var(--color-text);
    border-bottom: 1px solid var(--color-border);
    vertical-align: middle;
  }

  .dc-table tbody tr:last-child td { border-bottom: none; }

  .dc-table tbody tr {
    transition: var(--transition);

    &:hover { background: var(--color-surface-hover); }
  }

  .dc-table__code-cell {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .dc-table__code {
    font-family: monospace;
    font-weight: 700;
    font-size: var(--font-size-sm);
    letter-spacing: 0.05em;
  }

  .dc-table__desc {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .dc-table__meta {
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  .dc-table__services {
    max-width: 200px;
    white-space: normal;
  }

  .dc-table__actions {
    white-space: nowrap;
    width: 1px;
    padding-left: 0;

    form { display: inline; }
  }

  /* ── Status badge ────────────────────────────────── */

  .status-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px var(--space-2);
    border-radius: var(--radius-full);
    font-size: var(--font-size-xs);
    font-weight: 500;
    white-space: nowrap;
  }

  .status-badge--active {
    background: var(--color-accepted-bg);
    color: var(--color-accepted-text);
  }

  .status-badge--inactive {
    background: var(--color-cancelled-bg);
    color: var(--color-cancelled-text);
  }

  /* ── Create form ─────────────────────────────────── */

  .create-form-wrap {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  .create-form__heading {
    font-size: var(--font-size-lg);
    font-weight: 600;
    margin: 0;
  }

  .create-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .create-form__footer {
    display: flex;
    justify-content: flex-end;
    padding-top: var(--space-2);
  }

  /* ── Form layout ─────────────────────────────────── */

  .form-row {
    display: grid;
    gap: var(--space-4);
  }

  .form-row--half { grid-template-columns: 1fr 1fr; }
  .form-row--thirds { grid-template-columns: 1fr 1fr 1fr; }

  @media (max-width: 640px) {
    .form-row--half,
    .form-row--thirds { grid-template-columns: 1fr; }
  }

  /* ── Form field ──────────────────────────────────── */

  .form-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .form-field label,
  .form-field legend {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-text);
  }

  .form-field--error label,
  .form-field--error legend {
    color: var(--color-rejected-text);
  }

  .form-field__required {
    color: var(--color-rejected-text);
  }

  .form-field__optional {
    font-weight: 400;
    color: var(--color-text-muted);
  }

  .form-field__hint {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .form-error {
    font-size: var(--font-size-sm);
    color: var(--color-rejected-text);
    background: var(--color-rejected-bg);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-3);
  }

  /* ── Form inputs ─────────────────────────────────── */

  .form-input {
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    color: var(--color-text);
    background: var(--color-bg);
    transition: var(--transition);
    width: 100%;
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    &:disabled {
      opacity: 0.6;
    }
  }

  .form-input--mono { font-family: monospace; letter-spacing: 0.05em; }

  /* ── Affix (prefix / suffix) ─────────────────────── */

  .input-affix {
    position: relative;
    display: flex;
    align-items: center;
  }

  .input-affix__prefix,
  .input-affix__suffix {
    position: absolute;
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    pointer-events: none;
    user-select: none;
  }

  .input-affix__prefix { left: var(--space-3); }
  .input-affix__suffix { right: var(--space-3); }

  .form-input--has-prefix { padding-left: calc(var(--space-3) + 1ch + var(--space-1)); }
  .form-input--has-suffix { padding-right: calc(var(--space-3) + 1ch + var(--space-1)); }

  /* ── Type toggle ─────────────────────────────────── */

  .type-toggle {
    border: none;
    padding: 0;
    margin: 0;
  }

  .type-toggle__options {
    display: flex;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    overflow: hidden;
    margin-top: var(--space-1);
  }

  .type-toggle__option {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-size-sm);
    font-weight: 400;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: var(--transition);

    input[type='radio'] { display: none; }

    &:not(:last-child) { border-right: 1px solid var(--color-border); }

    &:hover { background: var(--color-surface-hover); }
  }

  .type-toggle__option--active {
    background: var(--color-primary);
    color: var(--color-on-primary, #fff);
    font-weight: 500;

    &:hover { background: var(--color-primary-hover); }
  }

  /* ── Service restriction ─────────────────────────── */

  .service-restrict {
    border: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .service-restrict__list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-top: var(--space-1);
  }

  .service-restrict__option {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-full);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: var(--transition);

    &:hover { background: var(--color-surface-hover); }

    input[type='checkbox']:checked + & { border-color: var(--color-primary); }
  }

  /* ── Toast ───────────────────────────────────────── */

  .toast-container {
    position: fixed;
    bottom: var(--space-6);
    left: 50%;
    transform: translateX(-50%);
    z-index: 200;
    width: max-content;
    max-width: calc(100vw - var(--space-8));
    pointer-events: none;
  }
</style>
