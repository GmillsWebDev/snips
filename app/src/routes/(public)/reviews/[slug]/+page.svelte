<script lang="ts">
  import type { PageData } from './$types'

  type StarType = 'full' | 'half' | 'empty'

  let { data }: { data: PageData } = $props()

  const brandColour = $derived(data.branding?.color_primary ?? 'var(--color-primary)')
  const brandOnColour = $derived(data.branding?.color_on_primary ?? '#ffffff')

  function starsFor(rating: number): StarType[] {
    const rounded = Math.round(rating * 2) / 2
    return Array.from({ length: 5 }, (_, i) => {
      const pos = i + 1
      if (pos <= rounded) return 'full'
      if (pos - 0.5 === rounded) return 'half'
      return 'empty'
    })
  }

  function formatDate(iso: string): string {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      .format(new Date(iso))
  }
</script>

<svelte:head>
  <title>Reviews — {data.shop.name}</title>
</svelte:head>

<div class="reviews-page" style="--shop-brand: {brandColour}; --shop-on-brand: {brandOnColour}">
  <header class="reviews-page__header">
    <div class="container reviews-page__header-inner">
      <span class="reviews-page__shop-name">{data.shop.name}</span>
    </div>
  </header>

  <main class="container">
    <div class="reviews-page__card">
      <h1>Customer Reviews</h1>

      {#if data.totalReviews > 0}
        <div class="summary">
          <div class="summary__score">
            <span class="summary__average">{data.averageRating}</span>
            <div class="summary__stars">
              {#each starsFor(data.averageRating) as star}
                {#if star === 'full'}
                  <span class="star star--full">★</span>
                {:else if star === 'half'}
                  <span class="star star--half">
                    <span class="star__bg">☆</span>
                    <span class="star__fg">★</span>
                  </span>
                {:else}
                  <span class="star star--empty">☆</span>
                {/if}
              {/each}
            </div>
            <p class="summary__count">
              Based on {data.totalReviews}
              {data.totalReviews === 1 ? 'review' : 'reviews'}
            </p>
          </div>

          <div class="summary__breakdown">
            {#each [5, 4, 3, 2, 1] as star}
              {@const count = data.ratingBreakdown[star] ?? 0}
              {@const pct = (count / data.totalReviews) * 100}
              <div class="breakdown__row">
                <span class="breakdown__label">{star}★</span>
                <div class="breakdown__bar-track">
                  <div class="breakdown__bar-fill" style="width: {pct}%"></div>
                </div>
                <span class="breakdown__count">{count}</span>
              </div>
            {/each}
          </div>
        </div>

        <div class="reviews-list">
          {#each data.reviews as review (review.id)}
            <article class="review-card">
              <div class="review-card__stars">
                {#each starsFor(review.rating) as star}
                  <span class="star {star === 'full' ? 'star--full' : 'star--empty'}">
                    {star === 'full' ? '★' : '☆'}
                  </span>
                {/each}
              </div>
              {#if review.comment}
                <p class="review-card__comment">{review.comment}</p>
              {/if}
              <div class="review-card__meta">
                <span class="review-card__author">{review.customer_first_name}</span>
                {#if review.service_name}
                  <span class="review-card__sep" aria-hidden="true">·</span>
                  <span class="review-card__service">{review.service_name}</span>
                {/if}
                <span class="review-card__sep" aria-hidden="true">·</span>
                <time class="review-card__date" datetime={review.created_at}>
                  {formatDate(review.created_at)}
                </time>
              </div>
            </article>
          {/each}
        </div>
      {:else}
        <p class="reviews-page__empty">
          No reviews yet — be the first to leave one after your visit.
        </p>
      {/if}

      <div class="reviews-page__cta">
        <a href="/book/{data.shop.slug}" class="cta-btn">Book now</a>
      </div>
    </div>
  </main>
</div>

<style>
  .reviews-page {
    min-height: 100vh;
    background: var(--color-bg);
  }

  .reviews-page__header {
    background: var(--shop-brand);
    padding: var(--space-6) 0;
  }

  .reviews-page__header-inner {
    margin-top: 0;
    margin-bottom: 0;
  }

  .reviews-page__shop-name {
    font-size: var(--font-size-xl);
    font-weight: 700;
    color: var(--shop-on-brand);
  }

  .reviews-page__card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-md);
    padding: var(--space-8);
    max-width: 640px;
    margin: 0 auto;
  }

  .reviews-page__card h1 {
    margin-bottom: var(--space-6);
  }

  /* Summary bar */
  .summary {
    display: flex;
    gap: var(--space-8);
    align-items: center;
    margin-bottom: var(--space-8);
    padding-bottom: var(--space-8);
    border-bottom: 1px solid var(--color-border);
  }

  .summary__score {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    min-width: 7rem;
  }

  .summary__average {
    font-size: var(--font-size-3xl);
    font-weight: 700;
    color: var(--color-text);
    line-height: 1;
  }

  .summary__stars {
    display: flex;
    gap: 2px;
    font-size: 1.4rem;
  }

  .summary__count {
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
    text-align: center;
  }

  /* Breakdown */
  .summary__breakdown {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .breakdown__row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .breakdown__label {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    width: 2rem;
    text-align: right;
    flex-shrink: 0;
  }

  .breakdown__bar-track {
    flex: 1;
    height: 8px;
    background: var(--color-border);
    border-radius: var(--radius-full);
    overflow: hidden;
  }

  .breakdown__bar-fill {
    height: 100%;
    background: var(--shop-brand);
    border-radius: var(--radius-full);
    min-width: 0;
  }

  .breakdown__count {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    width: 1.5rem;
    text-align: right;
    flex-shrink: 0;
  }

  /* Stars */
  .star {
    line-height: 1;
  }

  .star--full {
    color: var(--color-warning);
  }

  .star--empty {
    color: var(--color-text-subtle);
  }

  .star--half {
    position: relative;
    display: inline-block;
  }

  .star__bg {
    display: block;
    color: var(--color-text-subtle);
  }

  .star__fg {
    position: absolute;
    top: 0;
    left: 0;
    width: 50%;
    overflow: hidden;
    color: var(--color-warning);
    display: block;
    white-space: nowrap;
  }

  /* Review cards */
  .reviews-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    margin-bottom: var(--space-8);
  }

  .review-card {
    padding: var(--space-6);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }

  .review-card__stars {
    display: flex;
    gap: 2px;
    font-size: 1.1rem;
    margin-bottom: var(--space-3);
  }

  .review-card__comment {
    color: var(--color-text);
    font-size: var(--font-size-base);
    margin-bottom: var(--space-3);
    line-height: 1.6;
  }

  .review-card__meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-wrap: wrap;
    font-size: var(--font-size-sm);
  }

  .review-card__author {
    font-weight: 600;
    color: var(--color-text);
  }

  .review-card__service,
  .review-card__date {
    color: var(--color-text-muted);
  }

  .review-card__sep {
    color: var(--color-text-subtle);
  }

  /* Empty state */
  .reviews-page__empty {
    color: var(--color-text-muted);
    text-align: center;
    padding: var(--space-8) 0;
  }

  /* CTA */
  .reviews-page__cta {
    display: flex;
    justify-content: center;
    padding-top: var(--space-8);
    border-top: 1px solid var(--color-border);
    margin-top: var(--space-8);
  }

  .cta-btn {
    display: inline-block;
    background: var(--shop-brand);
    color: var(--shop-on-brand);
    padding: var(--space-3) var(--space-8);
    border-radius: var(--radius-md);
    font-size: var(--font-size-base);
    font-weight: 600;
    text-decoration: none;
    transition: var(--transition);
  }

  .cta-btn:hover {
    opacity: 0.88;
    text-decoration: none;
  }

  @media (max-width: 480px) {
    .summary {
      flex-direction: column;
      align-items: stretch;
    }

    .summary__score {
      flex-direction: row;
      min-width: unset;
      flex-wrap: wrap;
      gap: var(--space-3);
    }

    .summary__count {
      text-align: left;
      width: 100%;
    }
  }
</style>
