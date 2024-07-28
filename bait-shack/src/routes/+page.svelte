<script lang="ts">
</script>

<div class="container card min-h-screen mx-auto justify-center my-8 p-8">
  <div class="card-header mb-4 text-center">
    <span class="h1">Products</span>
  </div>
  <!-- Responsive Container (recommended) -->
  <div class="table-container">
    <!-- Native Table Element -->
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
        <!-- {#each tableArr as row, i}
          <tr>
            <td>{row.position}</td>
            <td>{row.name}</td>
            <td>{row.symbol}</td>
            <td>{row.weight}</td>
          </tr>
        {/each} -->
      </tbody>
    </table>
  </div>
</div>
