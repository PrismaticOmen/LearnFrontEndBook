<script lang="ts">
  import PocketBase from "pocketbase";

  const pb = new PocketBase("http://127.0.0.1:8090");
  async function retrieveData() {
    let result = await pb.collection("products").getList();

    console.log(result.items);

    return result;
  }

  let promise = retrieveData();
</script>

{#await promise}
  <p>Loading...</p>
{:then products}
  <div class="product-grid">
    {#each products.items as product (product.id)}
      <div class="product-card">
        <img
          style="width: 100%; max-width: 300px; margin-bottom: 20px; display: flex-wrap: wrap;"
          src="http://127.0.0.1:8090/api/files/products/{product.id}/{product.image}"
          alt={product.name}
        />
        <h2>{product.name}</h2>
        <p>{product.description}</p>
        <p class="price">${product.price}</p>
        <p class="stock">{product.stock} in stock</p>
      </div>
    {/each}
  </div>
{:catch error}
  <p style="color: red">Oops something wrong happened</p>
{/await}

<style>
  .product-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 20px;
  }

  .product-card {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 16px;
    background-color: #f9f9f9;
  }

  .product-card h2 {
    margin-top: 0;
    color: #333;
  }

  .stock {
    margin-top: auto;
  }

  .price {
    font-weight: bold;
    color: #007bff;
  }
</style>
