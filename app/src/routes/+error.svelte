<script lang="ts">
  import { page } from '$app/stores'
  import Button from '$lib/components/ui/Button.svelte'

  const messages: Record<number, { heading: string; body: string }> = {
    404: {
      heading: 'Page not found',
      body: "We couldn't find what you were looking for. The link may be wrong or the page may have moved.",
    },
    403: {
      heading: 'Access denied',
      body: "You don't have permission to view this page. If you think you should have access, contact support for assistance.",
    },
    500: {
      heading: 'Something went wrong',
      body: 'An unexpected error occurred on our end. Please try again in a moment. If this persists, contact support.',
    },
  }

  let status = $derived($page.status)
  let message = $derived(messages[status] ?? {
    heading: 'An error occurred',
    body: $page.error?.message ?? 'Please try again or return to the home page.',
  })
</script>

<div class="error-page">
  <div class="error-page__card">
    <p class="error-page__code">{status}</p>
    <h1 class="error-page__heading">{message.heading}</h1>
    <p class="error-page__body">{message.body}</p>
    <Button edges="soft" size="md" onclick={() => history.back()}>Go back</Button>
    <a class="error-page__home" href="/">Return to home</a>
    <div class="error-page__timestamp">
      <span>Error timestamp:</span>
      <span>{new Date().toLocaleString()}</span>
    </div>
  </div>
</div>

<style>
  .error-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg);
    padding: var(--space-6);
  }

  .error-page__card {
    text-align: center;
    max-width: 480px;
    width: 100%;
  }

  .error-page__code {
    font-size: 6rem;
    font-weight: 700;
    line-height: 1;
    color: var(--color-primary);
    letter-spacing: -0.04em;
    margin-bottom: var(--space-4);
  }

  .error-page__heading {
    margin-bottom: var(--space-3);
  }

  .error-page__body {
    color: var(--color-text-muted);
    margin-bottom: var(--space-6);
  }

  .error-page__home {
    display: block;
    margin-top: var(--space-2);
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .error-page__timestamp {
    margin-top: var(--space-4);
    font-size: var(--font-size-xs);
    color: var(--color-text-subtle);
    text-align: center;
  }
</style>
