<script>
	import Nav from '$lib/components/landing/Nav.svelte';
</script>

<Nav />

<div class="bodyContainer">
    <div class="container">
	<h1>Welcome to Snips!</h1>
	<p>Your one-stop solution for seamless appointment scheduling.</p>
</div>
</div>

<style>
    .bodyContainer {
        width: 100%;
        height: 100%;
        min-height: 100vh;
        background-color: var(--color-brand-background);
        color: var(--color-brand-text)
    }

    .container:first-child{
        margin-top: 0;
        padding-top: var(--space-8);
    }
</style>