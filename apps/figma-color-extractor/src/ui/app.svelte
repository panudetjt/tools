<script lang="ts">
  let count = $state(5);

  function postMessage(type: string, data?: Record<string, unknown>) {
    parent.postMessage({ pluginMessage: { type, ...data } }, "*");
  }

  function create() {
    postMessage("create-shapes", { count });
  }

  function cancel() {
    postMessage("cancel");
  }
</script>

<div class="flex flex-col gap-3 p-4">
  <h2 class="text-lg font-semibold">Rectangle Creator</h2>

  <label class="flex items-center gap-2">
    <span>Count:</span>
    <input
      type="number"
      bind:value={count}
      class="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
    />
  </label>

  <div class="flex gap-2">
    <button
      onclick={create}
      class="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
    >
      Create
    </button>
    <button
      onclick={cancel}
      class="rounded bg-gray-200 px-3 py-1.5 text-sm font-medium hover:bg-gray-300"
    >
      Cancel
    </button>
  </div>
</div>
