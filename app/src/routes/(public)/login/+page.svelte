<script lang="ts">
  import { enhance } from '$app/forms'
  import { Input, Button } from '$lib/components/ui'
  import type { ActionData } from './$types'

  let { form }: { form: ActionData } = $props()
  let loading = $state(false)
</script>

<svelte:head>
  <title>Login — Snips</title>
</svelte:head>

<div class="auth-page container">
  <div class="auth-card">
    <div class="auth-card__header">
      <h1>Welcome back</h1>
      <p>Sign in to your account</p>
    </div>

    {#if form?.error}
      <div class="auth-card__error">
        {form.error}
      </div>
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

      <Input
        name="password"
        label="Password"
        type="password"
        required
        placeholder="••••••••"
      />

      <a href="/forgot-password" class="auth-card__forgot">
        Forgot your password?
      </a>

      <Button type="submit" {loading}>
        Sign in
      </Button>
    </form>

    <p class="auth-card__footer">
      Don't have an account? <a href="/register">Create one</a>
    </p>
  </div>
</div>

<style>
  .auth-page {
    display: flex;
    justify-content: center;
    min-height: 100vh;
  }
  .auth-card__forgot {
    display: block;
    font-size: 0.75rem;
   }
</style>