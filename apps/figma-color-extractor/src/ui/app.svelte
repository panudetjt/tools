<script lang="ts">
  interface ExtractedColor {
    nodeId: string;
    nodeName: string;
    property: string;
    name: string;
    hex: string;
    r: number;
    g: number;
    b: number;
    a: number;
  }

  let colors = $state<ExtractedColor[]>([]);
  let error = $state<string | null>(null);
  let copiedId = $state<string | null>(null);
  let filterProperty = $state<string>("all");

  function postMessage(type: string, data?: Record<string, unknown>) {
    parent.postMessage({ pluginMessage: { type, ...data } }, "*");
  }

  function extract() {
    postMessage("extract-colors");
  }

  function cancel() {
    postMessage("cancel");
  }

  function filteredColors(): ExtractedColor[] {
    if (filterProperty === "all") return colors;
    return colors.filter((c) => c.property === filterProperty);
  }

  function copyHex(hex: string, id: string) {
    navigator.clipboard.writeText(hex);
    copiedId = id;
    setTimeout(() => {
      copiedId = null;
    }, 1500);
  }

  function copyAll() {
    const text = filteredColors()
      .map((c) => c.hex)
      .join("\n");
    navigator.clipboard.writeText(text);
  }

  window.onmessage = (event: MessageEvent) => {
    const msg = event.data.pluginMessage;
    if (msg.type === "colors") {
      colors = msg.colors ?? [];
      error = msg.error ?? null;
    }
  };

  // Auto-extract on load
  $effect(() => {
    postMessage("extract-colors");
  });
</script>

<div class="flex h-full flex-col bg-white">
  <!-- Header -->
  <div class="border-b border-gray-200 px-4 py-3">
    <h2 class="text-sm font-semibold text-gray-900">Color Extractor</h2>
    <p class="mt-0.5 text-xs text-gray-500">
      {colors.length} color{colors.length !== 1 ? "s" : ""} found
    </p>
  </div>

  <!-- Filter + Actions -->
  {#if colors.length > 0}
    <div class="flex items-center gap-2 border-b border-gray-100 px-4 py-2">
      <select
        bind:value={filterProperty}
        class="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
      >
        <option value="all">All</option>
        <option value="fill">Fills</option>
        <option value="stroke">Strokes</option>
        <option value="text-color">Text</option>
      </select>

      <button
        onclick={copyAll}
        class="ml-auto rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
      >
        Copy All
      </button>

      <button
        onclick={extract}
        class="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
      >
        Refresh
      </button>
    </div>
  {/if}

  <!-- Error -->
  {#if error}
    <div class="px-4 py-6 text-center">
      <p class="text-xs text-gray-500">{error}</p>
      <p class="mt-1 text-xs text-gray-400">Select elements in Figma first</p>
    </div>
  {/if}

  <!-- Color List -->
  <div class="flex-1 overflow-y-auto">
    {#if filteredColors().length === 0 && !error}
      <div class="px-4 py-6 text-center">
        <p class="text-xs text-gray-400">No colors to display</p>
      </div>
    {:else}
      {#each filteredColors() as color (color.nodeId + color.property + color.hex)}
        <button
          class="flex w-full items-center gap-3 border-b border-gray-50 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
          onclick={() => copyHex(color.hex, color.nodeId + color.property + color.hex)}
          title="Click to copy"
        >
          <!-- Swatch -->
          <div
            class="h-8 w-8 shrink-0 rounded-md border border-gray-200"
            style="background-color: {color.hex}; opacity: {color.a};"
          ></div>

          <!-- Info -->
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <span class="font-mono text-xs font-medium text-gray-900">{color.hex}</span>
              {#if copiedId === color.nodeId + color.property + color.hex}
                <span class="text-xs text-green-600">Copied!</span>
              {/if}
            </div>
            <p class="truncate text-xs text-gray-500">{color.nodeName}</p>
          </div>

          <!-- Property badge -->
          <span class="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
            {color.property === "text-color" ? "text" : color.property}
          </span>
        </button>
      {/each}
    {/if}
  </div>

  <!-- Footer -->
  <div class="border-t border-gray-200 px-4 py-2">
    <button
      onclick={cancel}
      class="w-full rounded bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300"
    >
      Close
    </button>
  </div>
</div>
