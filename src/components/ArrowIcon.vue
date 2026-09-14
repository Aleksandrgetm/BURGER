<script setup>
defineProps({
  direction: { type: String, default: 'northeast', validator: value => ['northeast', 'southeast', 'right', 'up'].includes(value) },
})
const rotations = { northeast: -45, southeast: 45, right: 0, up: -90 }
</script>

<template>
  <svg class="arrow-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <g :transform="`rotate(${rotations[direction]} 12 12)`">
      <path d="M4 12H20M14 6L20 12L14 18" />
    </g>
  </svg>
</template>

<style scoped>
.arrow-icon { display: inline-block; width: 1em; height: 1em; flex: 0 0 auto; vertical-align: middle; overflow: visible; }
</style>
