<script lang="ts">
  type Variant = 'primary' | 'secondary' | 'disabled'
  type Size = 'sm' | 'md' | 'lg'
  type Edges = 'sharp' | 'soft' | 'round'

  let {
    variant = 'primary',
    size = 'md',
    edges = 'sharp', 
    disabled = false,
    loading = false,
    type = 'button',
    onclick,
    children
  }: {
    variant?: Variant
    size?: Size
    edges?: Edges
    disabled?: boolean
    loading?: boolean
    type?: 'button' | 'submit' | 'reset'
    onclick?: () => void
    children: any
  } = $props()
</script>

<button
  {type}
  {disabled}
  {onclick}
  class="btn btn--{variant} btn--{size} btn--edges-{edges}"
  aria-busy={loading}
>
  {#if loading}
    <span class="btn__spinner" aria-hidden="true"></span>
  {/if}
  {@render children()}
</button>

<style>
  /* Style me! */
  .btn {
    padding: var(--space-1) var(--space-4);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin: var(--space-4) 0;
  }
  /* Edges variants */
  .btn--edges-sharp {
    border-radius: 0;
  }
  .btn--edges-soft {
    border-radius: var(--radius-md);
  }
  .btn--edges-round {
    border-radius: var(--radius-full);
  }
  .btn--primary {
        background-color: var(--color-primary);
        color: var(--color-on-primary);
        border: 1px solid var(--color-primary);
   }
  .btn--secondary {
        background-color: var(--color-secondary);
        color: var(--color-on-secondary);
        border: 1px solid var(--color-secondary);
   }
  .btn--disabled {
        background-color: var(--color-grey);
        color: var(--color-dark-grey);
        border: 1px solid var(--color-grey);
        cursor: not-allowed;
   }
  .btn--sm {
        padding: var(--space-1) var(--space-2);
        font-size: var(--font-size-sm);
   }
  .btn--md {
        padding: var(--space-1) var(--space-4);
        font-size: var(--font-size-md);
   }
  .btn--lg {
        padding: var(--space-2) var(--space-6);
        font-size: var(--font-size-lg);
   }
  .btn__spinner {
    width: 1em;
    height: 1em;
    border: 2px solid rgba(255,255,255,0.3);
    border-top: 2px solid var(--color-on-primary, #fff);
    border-radius: 50%;
    display: inline-block;
    animation: btn-spinner-spin 0.7s linear infinite;
    margin-right: 0.5em;
    vertical-align: middle;
  }

  @keyframes btn-spinner-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>