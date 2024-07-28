<script lang="ts">
  export let data;
  import "../app.postcss";
  import {
    computePosition,
    autoUpdate,
    offset,
    shift,
    flip,
    arrow,
  } from "@floating-ui/dom";
  import { storePopup } from "@skeletonlabs/skeleton";
  storePopup.set({ computePosition, autoUpdate, offset, shift, flip, arrow });
  import { AppBar } from "@skeletonlabs/skeleton";
  import IconAccountCircle from "~icons/mdi/account-circle";
  import Warning from "~icons/mdi/alert-circle-outline";
  import LogOut from "~icons/mdi/logout";
  import { popup } from "@skeletonlabs/skeleton";
  import type { PopupSettings } from "@skeletonlabs/skeleton";
  const popupFeatured: PopupSettings = {
    // Represents the type of event that opens/closed the popup
    event: "click",
    // Matches the data-popup value on your popup element
    target: "account-dropdown",
    // Defines which side of your trigger the popup will appear
    placement: "bottom",
  };
  import { initializeStores, Toast } from "@skeletonlabs/skeleton";
  initializeStores();
</script>

{#if data.user}
  <AppBar
    gridColumns="grid-cols-3"
    slotDefault="place-self-center"
    slotTrail="place-content-end"
  >
    <svelte:fragment slot="lead"><a href="/" class="h2"> 🐟</a></svelte:fragment
    >
    <svelte:fragment slot="trail">
      <button class="btn bg-transparent" use:popup={popupFeatured}>
        <IconAccountCircle class="h3" />
      </button>
    </svelte:fragment>

    <div class="card p-4 w-72 shadow-xl" data-popup="account-dropdown">
      <form method="POST" action="/signout">
        <button
          type="submit"
          class="btn variant-outline-primary w-full flex gap-2"
        >
          <span>
            <LogOut class="h4" />
          </span>
          Sign Out</button
        >
      </form>
    </div>
  </AppBar>
{/if}

<div>
  {#if data.health && data.health.status === "down"}
    <aside class="alert variant-filled-error w-[90%] mx-auto mt-5">
      <!-- Icon -->
      <div><Warning class="h3" /></div>
      <!-- Message -->
      <div class="alert-message">
        <h3 class="h3">Backend is down</h3>
        <p>Did you forget to start the backend?</p>
      </div>
    </aside>
  {/if}
</div>

<main class="container min-h-screen mx-auto flex justify-center items-center">
  <slot />
</main>

<Toast />
