<script lang="ts">
  import PencilIcon from "~icons/mdi/pencil";
  import GarbageIcon from "~icons/mdi/garbage";
  export let data;
  export let form;

  import BackArrowIcon from "~icons/mdi/arrow-left";

  let products = data.products ? data.products.items : [];

  import { getToastStore, type ToastSettings } from "@skeletonlabs/skeleton";

  const toastStore = getToastStore();

  if (form && form.success) {
    const t: ToastSettings = {
      message: `You have successfully deleted a product`,
      background: "variant-filled-success",
      timeout: 3000,
    };

    toastStore.trigger(t);
  } else if (form && form.error) {
    console.log(form.error);
    const t: ToastSettings = {
      message: "There was an error deleting a product",
      background: "variant-filled-error",
      timeout: 3000,
    };
    toastStore.trigger(t);
  }
</script>

<div class="container card min-h-screen mx-auto justify-center my-8 p-8">
  <a href="/" class="btn variant-outline-primary">
    <BackArrowIcon class="h5" />
  </a>
  <div class="card-header mb-4 text-center">
    <span class="h1">Products</span>
  </div>
  <div class="table-container">
    <div class="w-full flex justify-end">
      <a class="btn variant-filled-primary mb-4" href="products/add">
        Add a new product
      </a>
    </div>
    <table class="table table-hover">
      <thead>
        <tr>
          <th>Name</th>
          <th>Description</th>
          <th>Unit Price</th>
          <th>Stock</th>
          <th class="sr-only">Action</th>
        </tr>
      </thead>
      <tbody>
        {#each products as product, i}
          <tr class="table-row">
            <td>{product.name}</td>
            <td>{product.description}</td>
            <td>${product.price}</td>
            <td>{product.stock}</td>
            <td class="flex">
              <a
                class="btn !btn-transparent"
                href="/products/edit/{product.id}"
              >
                <PencilIcon class="h5" />
              </a>
              <form method="POST" action="?/delete">
                <input type="hidden" name="id" value={product.id} />
                <button type="submit" class="btn !bg-transparent">
                  <GarbageIcon class="h5" />
                </button>
              </form>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
