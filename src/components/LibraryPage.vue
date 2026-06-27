<template>
  <div>
    <div :class="['drop-area', dragOver ? 'border-primary' : '']" @drop.prevent="onDrop" @dragover.prevent="onDragOver" @dragleave.prevent="onDragLeave">
      <div>
        <p class="mb-1">Drop a TXT or PDF file here to add to your library</p>
        <div class="mb-2">
          <button class="btn btn-sm btn-primary" @click="openFilePicker">Pick files</button>
          <input type="file" ref="fileInput" style="display:none" @change="onFilesPicked" multiple />
        </div>
        <small class="small-muted">Files are parsed in-browser and stored in localStorage for future use.</small>
      </div>
    </div>

    <div class="mt-3">
      <h6>Library</h6>
      <ul class="list-group library-list">
        <li v-for="item in library" :key="item.id" class="list-group-item d-flex justify-content-between align-items-start">
          <div class="ms-2 me-auto">
            <div class="fw-bold" style="cursor:pointer" @click="selectItem(item.id)">{{ item.name }}</div>
            <small class="text-muted">{{ formatSize(item.size) }} • {{ new Date(item.createdAt).toLocaleString() }}</small>
          </div>
          <div>
            <button class="btn btn-sm btn-outline-secondary me-1" @click="selectItem(item.id)">Load</button>
            <button class="btn btn-sm btn-outline-danger" @click="removeItem(item.id)">Remove</button>
          </div>
        </li>
        <li v-if="library.length === 0" class="list-group-item">No files yet — add one above.</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  library: Array,
  dragOver: Boolean,
  formatSize: Function,
  selectItem: Function,
  removeItem: Function,
  handleFilesList: Function,
  onDrop: Function,
  onDragOver: Function,
  onDragLeave: Function,
})

const fileInput = ref(null)

function openFilePicker() {
  fileInput.value?.click()
}

function onFilesPicked(event) {
  const files = event.target.files
  if (files?.length) {
    props.handleFilesList(files)
  }
  event.target.value = null
}
</script>
