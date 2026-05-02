<script lang="ts">
  import { enhance } from '$app/forms'
  import Button from '$lib/components/ui/Button.svelte'
  import type { PageData, ActionData } from './$types'

  let { data, form }: { data: PageData; form: ActionData } = $props()

  let rating      = $state(0)
  let hoverRating = $state(0)
  let submitting  = $state(false)

  const displayRating = $derived(hoverRating || rating)
</script>

<svelte:head>
  <title>Leave a review — Snips</title>
</svelte:head>

<div class="page">
  <a href="/booking/{data.booking.id}" class="back-link">← Back to booking</a>

  <div class="review-card">
    <div class="review-card__header">
      <h1>Review your appointment</h1>
      <p class="review-card__subtitle">{data.booking.serviceName}</p>
    </div>

    <form
      method="POST"
      use:enhance={() => {
        submitting = true
        return async ({ update }) => {
          await update()
          submitting = false
        }
      }}
    >
      <div class="field">
        <span class="field__label">Your rating *</span>
        <div
          class="stars"
          role="radiogroup"
          aria-label="Rating"
          onmouseleave={() => (hoverRating = 0)}
        >
          {#each [1, 2, 3, 4, 5] as star}
            <button
              type="button"
              role="radio"
              aria-checked={rating === star}
              aria-label="{star} out of 5"
              class="star"
              class:star--active={star <= displayRating}
              onmouseenter={() => (hoverRating = star)}
              onclick={() => (rating = star)}
            >★</button>
          {/each}
        </div>
        <input type="hidden" name="rating" value={rating} />
        {#if form?.error === 'Please select a rating'}
          <p class="field__error" role="alert">{form.error}</p>
        {/if}
      </div>

      <div class="field">
        <label class="field__label" for="comment">Comments <span class="field__optional">(optional)</span></label>
        <textarea
          id="comment"
          name="comment"
          class="field__textarea"
          rows="4"
          placeholder="Anything you'd like to add?"
        ></textarea>
      </div>

      {#if form?.error && form.error !== 'Please select a rating'}
        <p class="form-error" role="alert">{form.error}</p>
      {/if}

      <div class="review-card__actions">
        <Button type="submit" edges="soft" disabled={submitting} loading={submitting}>
          {submitting ? 'Submitting…' : 'Submit review'}
        </Button>
      </div>
    </form>
  </div>
</div>

<style>
  .page {
    max-width: 520px;
    margin: 0 auto;
    padding: var(--space-8) var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .back-link {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    text-decoration: none;
    transition: var(--transition);

    &:hover { color: var(--color-text); }
  }

  .review-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-6) var(--space-8);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .review-card__header h1 {
    font-size: var(--font-size-xl);
    font-weight: 700;
  }

  .review-card__subtitle {
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
    margin-top: var(--space-1);
  }

  /* ── Fields ───────────────────────────────────────────────── */
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .field__label {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-text);
  }

  .field__optional {
    font-weight: 400;
    color: var(--color-text-muted);
  }

  .field__error {
    font-size: var(--font-size-sm);
    color: var(--color-error);
  }

  .field__textarea {
    width: 100%;
    padding: var(--space-3) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-family: var(--font-sans);
    color: var(--color-text);
    background: var(--color-surface);
    resize: vertical;
    transition: border-color var(--transition);
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    &::placeholder {
      color: var(--color-text-subtle);
    }
  }

  /* ── Stars ────────────────────────────────────────────────── */
  .stars {
    display: flex;
    gap: var(--space-1);
  }

  .star {
    background: none;
    border: none;
    padding: 0;
    font-size: 2rem;
    line-height: 1;
    color: var(--color-border);
    cursor: pointer;
    transition: color 0.1s, transform 0.1s;

    &:hover,
    &:focus-visible {
      outline: none;
      transform: scale(1.15);
    }
  }

  .star--active {
    color: #f59e0b;
  }

  /* ── Form-level error ─────────────────────────────────────── */
  .form-error {
    font-size: var(--font-size-sm);
    color: var(--color-error);
    padding: var(--space-3) var(--space-4);
    background: color-mix(in srgb, var(--color-error) 8%, var(--color-surface));
    border-radius: var(--radius-md);
  }

  .review-card__actions {
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-4);
  }
</style>
