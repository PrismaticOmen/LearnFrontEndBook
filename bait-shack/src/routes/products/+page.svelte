<script lang="ts">
  export let form;

  import { getToastStore, type ToastSettings } from "@skeletonlabs/skeleton";
  import { goto } from "$app/navigation";
  import BackArrowIcon from "~icons/mdi/arrow-left";
  const toastStore = getToastStore();

  if (form && form.success) {
    const t: ToastSettings = {
      message: "You have successfully added a new product",
      action: {
        label: "View product",
        response: () => {
          goto(`/`);
        },
      },
      background: "variant-filled-success",
      timeout: 3000,
    };
    toastStore.trigger(t);
  } else if (form && form.error) {
    console.log(form.error);
    const t: ToastSettings = {
      message: "There was an error adding a new product",
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
    <span class="h1">Add a new product</span>
  </div>
  <form
    class="flex flex-col gap-4"
    method="POST"
    action="?/add"
    enctype="multipart/form-data"
  >
    <label class="label">
      <span>Name<span class="text-sm text-mute text-red-600">*</span></span>
      <input
        class="input p-2"
        type="text"
        name="name"
        placeholder="Product name"
        required
      />
    </label>
    <label class="label">
      <span>Description</span>
      <textarea
        class="textarea p-2"
        name="description"
        placeholder="Product description"
      ></textarea>
    </label>
    <label class="label">
      <span>Price<span class="text-sm text-mute text-red-600">*</span></span>
      <input
        class="input p-2"
        type="number"
        name="price"
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
        placeholder="Product stock"
        required
      />
    </label>
    <label class="label">
      <span>Image</span>
      <input
        class="input p-2"
        type="file"
        name="image"
        accept="image/png, image/jpeg, image/gif"
        placeholder="Product image"
      />
    </label>
    <button class="btn variant-filled-primary mt-4">Add Product</button>
  </form>
</div>
