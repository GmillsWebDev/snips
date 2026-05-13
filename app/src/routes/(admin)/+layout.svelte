
<script lang="ts">
import '../../app.css'
  import Nav from '$lib/components/layout/Nav.svelte'
  let { children } = $props()
</script>

<div class="admin-shell">
  <Nav />
  <div class="admin-main">
    {@render children()}
  </div>
</div>

<style>
  .admin-shell {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
  .admin-main {
    flex: 1;
  }
</style>
