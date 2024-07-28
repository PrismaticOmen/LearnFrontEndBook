<script lang="ts">
  import Backicon from "~icons/mdi/arrow-left";
  import { CodeBlock } from "@skeletonlabs/skeleton";
</script>

<div class="container card min-h-screen mx-auto justify-center my-8 p-8">
  <a href="/" class="btn variant-outline-primary">
    <Backicon class="h5" />
  </a>
  <div class="card-header mb-4 text-center">
    <span class="h1">Widgets</span>
    <div class="mt-4 flex-col gap-2 flex">
      Copy the code to embed the store widget, this should go into an html file
      👇
      <CodeBlock
        language="html"
        code={`
      <iframe src="http://localhost:5173/iframe" width="600" height="400" frameborder="0"></iframe>
      `}
      ></CodeBlock>
    </div>
  </div>
</div>
