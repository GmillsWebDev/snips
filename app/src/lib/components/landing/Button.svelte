<script lang="ts">
    let {
        content = "Button",
        urlPath = "#",
        variant = "btnPrimary",
    }: {
        content?: string
        urlPath?: string
        variant?: "btnPrimary" | "btnSecondary" | "disabled"
    } = $props()
</script>

<a class="button {variant}" href={urlPath}>{content}</a>

<style>
  .button {
    display: inline-block;
    padding: var(--space-2) var(--space-4);
    border-radius: var(--space-1);
    text-decoration: none;
    font-weight: 500;
    transition: background-color 0.3s ease;

    &.btnPrimary {
      background-color: var(--color-brand-primary);
      color: var(--color-brand-text);

      &:hover {
        background-color: var(--color-brand-primary-hover);
      }
    }
    &.btnSecondary {
      background-color: var(--color-brand-secondary);
      color: var(--color-brand-text);

      &:hover {
        background-color: var(--color-brand-secondary-hover);
      }
    }
  }

  @media screen and (max-width: 768px) {
    .button {
      width: 100%;
      text-align: center;
    }
  }
</style>