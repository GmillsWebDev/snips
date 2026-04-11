<script>
    import Modal from "$lib/components/ui/Modal.svelte";
</script>

<h1>Welcome</h1>
<p>public page</p>
<Modal title="Hello" open={true} onclose={() => console.log('Modal closed')}>
  <p>This is a modal dialog.</p>
<p> another para</p>
</Modal>
