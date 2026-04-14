<script lang="ts">
  import { enhance } from '$app/forms'
  import { Input, Button } from '$lib/components/ui'
  import type { ActionData } from './$types'

  let { form }: { form: ActionData } = $props()
  let loading = $state(false)
</script>

<svelte:head>
  <title>Reset Password — Snips</title>
</svelte:head>

<div class="auth-page container">
  <div class="auth-card">
    {#if form?.success}
      <div class="auth-card__header">
        <h1>Check your email</h1>
        <p>We've sent a password reset link to your inbox.</p>
      </div>
      <a href="/login">Back to login</a>
    {:else}
      <div class="auth-card__header">
        <h1>Forgot password?</h1>
        <p>Enter your email and we'll send you a reset link.</p>
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
          name="email"
          label="Email"
          type="email"
          required
          placeholder="you@example.com"
        />

        <Button type="submit" {loading}>
          Send reset link
        </Button>
      </form>

      <a href="/login" class="auth-card__footer">Back to login</a>
    {/if}
  </div>
</div>

<style>
  .auth-page {
    display: flex;
    justify-content: center;
   }
</style>