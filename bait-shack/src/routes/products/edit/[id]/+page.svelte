<script lang="ts">
  export let form;
  export let data;

  import { getToastStore, type ToastSettings } from "@skeletonlabs/skeleton";
  import BackArrowIcon from "~icons/mdi/arrow-left";
  const toastStore = getToastStore();

  let product = data.product;
  let selectedFile: File;
  let previewUrl: string | null = null;
  function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      selectedFile = input.files[0];
      previewUrl = URL.createObjectURL(selectedFile);
    }
  }

  if (form && form.success) {
    const t: ToastSettings = {
      message: "You have updated this product",
      background: "variant-filled-success",
      timeout: 3000,
    };
    toastStore.trigger(t);
  } else if (form && form.error) {
    console.log(form.error);
    const t: ToastSettings = {
      message: "There was an error updating this product",
      background: "variant-filled-error",
      timeout: 3000,
    };
    toastStore.trigger(t);
  }
</script>

<div class="container card min-h-screen mx-auto justify-center my-8 p-8">
  <a href="/products" class="btn variant-outline-primary">
    <BackArrowIcon class="h5" />
  </a>
  <div class="card-header mb-4 text-center">
    <span class="h1">Update Product</span>
  </div>
  <form class="flex flex-col gap-4" method="POST" enctype="multipart/form-data">
    <input type="hidden" name="id" value={product.id} />
    <label class="label">
      <span>Name<span class="text-sm text-mute text-red-600">*</span></span>
      <input
        class="input p-2"
        type="text"
        name="name"
        value={product.name}
        placeholder="Product name"
        required
      />
    </label>
    <label class="label">
      <span>Description</span>
      <textarea
        class="textarea p-2"
        name="description"
        value={product.description}
        placeholder="Product description"
      ></textarea>
    </label>
    <label class="label">
      <span>Price<span class="text-sm text-mute text-red-600">*</span></span>
      <input
        class="input p-2"
        type="number"
        name="price"
        step=".01"
        value={product.price}
        placeholder="Product price"
        required
      />
    </label>
    <label class="label">
      <span>Stock<span class="text-sm text-mute text-red-600">*</span></span>
      <input
        class="input p-2"
        type="number"
        name="stock"
        value={product.stock}
        placeholder="Product stock"
        required
      />
    </label>

    <span>Image</span>
    <label
      class="label flex flex-col justify-center w-full btn variant-ghost-primary cursor-pointer"
    >
      <input
        class="input p-2 hidden"
        type="file"
        name="image"
        accept="image/png, image/jpeg, image/gif"
        placeholder="Product image"
        on:change={handleFileChange}
      />
      {#if previewUrl}
        <img
          class="max-w-[300px] w-full"
          src={previewUrl}
          alt="Selected image preview"
        />
      {:else if product.image}
        <img
          class="max-w-[300px] w-full"
          src="http://127.0.0.1:8090/api/files/products/{product.id}/{product.image}"
          alt={product.name}
        />
      {:else}
        <span>No image selected. Click to upload an image.</span>
      {/if}
    </label>
    <button class="btn variant-filled-primary mt-4">Update Product</button>
  </form>
</div>
