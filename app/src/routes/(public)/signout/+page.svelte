<script lang="ts">
  import { enhance } from '$app/forms'
  import { Button } from '$lib/components/ui'
</script>

<form method="POST" use:enhance>
  <Button type="submit">Sign out</Button>
</form>