<script lang="ts">
  import { enhance } from '$app/forms'
  import { Input, Button } from '$lib/components/ui'
  import type { ActionData } from './$types'

  let { form }: { form: ActionData } = $props()
  let loading = $state(false)
</script>

<svelte:head>
  <title>Set New Password — Snips</title>
</svelte:head>

<div class="auth-page container">
  <div class="auth-card">
    <div class="auth-card__header">
      <h1>Set new password</h1>
      <p>Choose a strong password for your account.</p>
    </div>

    {#if form?.error}
      <div class="auth-card__error">{form.error}</div>
    {/if}

    <form
      method="POST"
      use:enhance={() => {
        loading = true
        return async ({ update }) => {
          loading = false
          await update()
        }
      }}
      class="auth-card__form"
    >
      <Input
        name="password"
        label="New password"
        type="password"
        required
        placeholder="Min. 10 characters"
      />

      <Input
        name="confirm"
        label="Confirm new password"
        type="password"
        required
        placeholder="••••••••"
      />

      <Button type="submit" {loading}>
        Update password
      </Button>
    </form>
  </div>
</div>

<style>
  .auth-page {
    display: flex;
    justify-content: center;
   }
</style>