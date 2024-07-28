<script>
  export let form;
</script>

<div class="card p-4 max-w-[600px]">
  <div class="card-header mb-4 text-center">
    <div class="h1">🐟</div>
    <h1 class="h1">Sign In</h1>
  </div>
  <form class="flex flex-col gap-4 w-full" method="POST" action="/signin">
    {#if form?.error}
      <aside class="alert variant-filled-error text-center">
        <p class="text-lg">{form.error.message}</p>
      </aside>
    {/if}
    <label class="label">
      <span>Email<span class="text-sm text-mute text-red-600">*</span></span>
      <input
        class="input p-2"
        type="email"
        name="email"
        placeholder="youremail@example.com"
        required
      />
    </label>
    <label class="label">
      <span>Password<span class="text-sm text-mute text-red-600">*</span></span>
      <input
        class="input p-2"
        type="password"
        name="password"
        placeholder="••••••••"
        required
      />
    </label>
    <button class="btn variant-filled-primary mt-4">Sign in</button>
  </form>
</div>
