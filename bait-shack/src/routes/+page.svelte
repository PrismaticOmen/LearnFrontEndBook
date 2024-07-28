<script lang="ts">
  import StoreIcon from "~icons/mdi/store";
  import BoxIcon from "~icons/mdi/box-variant";
</script>

<div class="container card min-h-screen mx-auto justify-center my-8 p-8">
  <div class="card-header mb-4 text-center">
    <span class="h1">Welcome to the Bait Shack</span>
  </div>

  <div class="flex flex-wrap gap-4 justify-center mt-8">
    <a
      href="/products"
      class="card max-w-[300px] card-hover flex flex-col gap-2 items-center p-4"
    >
      <StoreIcon class="h1" />
      <span class="h2">Products</span>
    </a>
    <a
      href="/orders"
      class="card max-w-[300px] card-hover flex flex-col gap-2 items-center p-4"
    >
      <BoxIcon class="h1" />
      <span class="h2">Orders</span>
    </a>
  </div>
</div>
