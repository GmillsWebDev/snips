<script lang="ts">
  import { enhance } from '$app/forms'
  import { goto } from '$app/navigation'
  import Button from '$lib/components/ui/Button.svelte'
  import type { PageData, ActionData } from './$types'

  let { data, form }: { data: PageData; form: ActionData } = $props()

  let submitting = $state(false)
  let descValue = $state(form?.values?.description ?? '')
  let charsLeft = $derived(125 - descValue.length)
</script>

<svelte:head>
  <title>Add service — Snips Admin</title>
</svelte:head>

<div class="form-page">
  <header class="form-page__header">
    <h1>Add service</h1>
    <a href="/admin/services" class="back-link">← Back to services</a>
  </header>

  <form
    method="post"
    action="?/create"
    class="form-card"
    use:enhance={() => {
      submitting = true
      return async ({ update }) => { await update(); submitting = false }
    }}
  >
    {#if form?.error}
      <div class="form-error">{form.error}</div>
    {/if}

    <div class="field">
      <label for="name" class="field__label">Name *</label>
      <input
        id="name"
        name="name"
        type="text"
        class="field__input"
        class:field__input--error={form?.errors?.name}
        value={form?.values?.name ?? ''}
        required
      />
      {#if form?.errors?.name}
        <p class="field__error">{form.errors.name}</p>
      {/if}
    </div>

    <div class="field">
      <label for="description" class="field__label">Description</label>
      <textarea
        id="description"
        name="description"
        class="field__input field__textarea"
        class:field__input--error={form?.errors?.description}
        maxlength="125"
        rows="3"
        bind:value={descValue}
      ></textarea>
      <div class="field__footer">
        {#if form?.errors?.description}
          <p class="field__error">{form.errors.description}</p>
        {:else}
          <span></span>
        {/if}
        <p class="field__char-count" class:field__char-count--low={charsLeft <= 20} class:field__char-count--empty={charsLeft === 0}>
          {charsLeft}
        </p>
      </div>
    </div>

    <div class="field">
      <label for="duration_minutes" class="field__label">Duration *</label>
      <input
        id="duration_minutes"
        name="duration_minutes"
        type="number"
        class="field__input field__input--short"
        class:field__input--error={form?.errors?.duration}
        value={form?.values?.duration ?? '30'}
        min="5"
        step="5"
        required
      />
      <p class="field__hint">Minutes — minimum 5</p>
      {#if form?.errors?.duration}
        <p class="field__error">{form.errors.duration}</p>
      {/if}
    </div>

    <div class="field">
      <label for="price" class="field__label">Price (£)</label>
      <input
        id="price"
        name="price"
        type="number"
        class="field__input field__input--short"
        class:field__input--error={form?.errors?.price}
        value={form?.values?.price ?? '0.00'}
        min="0"
        step="0.01"
      />
      {#if form?.errors?.price}
        <p class="field__error">{form.errors.price}</p>
      {/if}
    </div>

    <div class="field">
      <label for="display_order" class="field__label">Display order</label>
      <input
        id="display_order"
        name="display_order"
        type="number"
        class="field__input field__input--short"
        class:field__input--error={form?.errors?.displayOrder}
        value={form?.values?.displayOrder ?? data.defaultOrder}
        min="1"
        step="1"
      />
      <p class="field__hint">Position in the services list</p>
      {#if form?.errors?.displayOrder}
        <p class="field__error">{form.errors.displayOrder}</p>
      {/if}
    </div>

    <div class="field field--row">
      <input
        id="is_active"
        name="is_active"
        type="checkbox"
        class="field__checkbox"
        checked={form ? (form?.values?.isActive ?? true) : true}
      />
      <label for="is_active" class="field__label">Active</label>
    </div>

    <div class="form-actions">
      <Button variant="secondary" edges="soft" onclick={() => goto('/admin/services')}>Cancel</Button>
      <Button type="submit" variant="primary" edges="soft" disabled={submitting} loading={submitting}>
        {submitting ? 'Saving…' : 'Add service'}
      </Button>
    </div>
  </form>
</div>

<style>
  .form-page {
    max-width: 560px;
    margin: 0 auto;
    padding: var(--space-8) var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .form-page__header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-4);
    flex-wrap: wrap;
  }

  .form-page__header h1 {
    font-size: var(--font-size-2xl);
    font-weight: 700;
  }

  .back-link {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    text-decoration: none;
    transition: var(--transition);

    &:hover { color: var(--color-text); }
  }

  /* ── Form card ───────────────────────────────────── */

  .form-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  .form-error {
    padding: var(--space-3) var(--space-4);
    background: var(--color-rejected-bg);
    color: var(--color-rejected-text);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
  }

  /* ── Fields ──────────────────────────────────────── */

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .field--row {
    flex-direction: row;
    align-items: center;
    gap: var(--space-2);
  }

  .field__label {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-text);
  }

  .field__input {
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

    &--short {
      max-width: 12rem;
      width: auto;
    }

    &--error {
      border-color: var(--color-rejected-text);
    }
  }

  .field__checkbox {
    width: 1rem;
    height: 1rem;
    accent-color: var(--color-primary);
    flex-shrink: 0;
    cursor: pointer;
  }

  .field__textarea {
    resize: vertical;
    min-height: 5rem;
    font-family: var(--font-sans);
    line-height: 1.5;
  }

  .field__footer {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .field__char-count {
    font-size: var(--font-size-xs);
    color: var(--color-text-subtle);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    flex-shrink: 0;
    transition: var(--transition);

    &--low { color: var(--color-pending-text); }
    &--empty { color: var(--color-rejected-text); font-weight: 600; }
  }

  .field__hint {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .field__error {
    font-size: var(--font-size-xs);
    color: var(--color-rejected-text);
  }

  /* ── Form actions ────────────────────────────────── */

  .form-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-3);
    padding-top: var(--space-4);
    border-top: 1px solid var(--color-border);
  }

  .form-actions :global(.btn) {
    margin: 0;
  }
</style>
