<script lang="ts">
  let {
    label,
    name,
    type = 'text',
    value = $bindable(''),
    placeholder = '',
    error = '',
    required = false,
    disabled = false,
  }: {
    label?: string
    name: string
    type?: string
    value?: string
    placeholder?: string
    error?: string
    required?: boolean
    disabled?: boolean
  } = $props()
</script>

<div class="field">
  {#if label}
    <label class="field__label" for={name}>
      {label}{required ? ' *' : ''}
    </label>
  {/if}

  <input
    id={name}
    {name}
    {type}
    {placeholder}
    {required}
    {disabled}
    bind:value
    class="field__input {error ? 'field__input--error' : ''}"
  />

  {#if error}
    <p class="field__error">{error}</p>
  {/if}
</div>

<style>
  /* Style me! */
  .field { }
  .field__label { }
  .field__input { }
  .field__input--error { }
  .field__error { }
</style>