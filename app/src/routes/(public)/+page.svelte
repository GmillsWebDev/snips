<script>
    import Input from "$lib/components/ui/Input.svelte";
    import Button from "$lib/components/ui/Button.svelte";
</script>

<h1>Welcome</h1>
<p>public page</p>
<Input label="Email" name="email" type="email" placeholder="placeholder" required />        
<Button variant="primary" size="md">
    Submit
</Button>