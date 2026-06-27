<template>
  <div class="container container-app h-100 d-flex flex-column">
    <div class="row mb-3">
      <div class="col-12 d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
        <div>
          <h3 class="m-0">SpeedyReader</h3>
          <p class="small text-muted mb-0">Manage your library and speed-read loaded text. </p>
        </div>
        <div class="btn-group" role="group" aria-label="Page navigation">
          <button type="button" class="btn btn-outline-primary" :class="{ active: currentPage === 'library' }" @click="currentPage = 'library'">Library</button>
          <button type="button" class="btn btn-outline-primary" :class="{ active: currentPage === 'player' }" @click="currentPage = 'player'">Player</button>
        </div>
        <button class="btn btn-outline-secondary" @click="openConfig">Settings</button>
      </div>
    </div>

    <div class="row flex-grow-1" style="min-height:0;">
      <div class="col-12 h-100">
        <LibraryPage
          v-if="currentPage === 'library'"
          :library="library"
          :dragOver="dragOver"
          :formatSize="formatSize"
          :selectItem="selectItem"
          :removeItem="removeItem"
          :handleFilesList="handleFilesList"
          :onDrop="onDrop"
          :onDragOver="onDragOver"
          :onDragLeave="onDragLeave"
        />

        <PlayerPage
          v-else
          :textContent="textContent"
          :words="words"
          :config="config"
        />
      </div>
    </div>

    <div class="modal fade" tabindex="-1" ref="cfgEl" id="configModal">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Settings</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="mb-2">
              <label class="form-label">Font family</label>
              <input class="form-control" v-model="config.fontFamily" />
            </div>
            <div class="row">
              <div class="col">
                <label class="form-label">Text color</label>
                <input type="color" class="form-control form-control-color" v-model="config.textColor" />
              </div>
              <div class="col">
                <label class="form-label">Background</label>
                <input type="color" class="form-control form-control-color" v-model="config.bgColor" />
              </div>
            </div>
            <div class="row mt-2">
              <div class="col">
                <label class="form-label">Font size</label>
                <input type="number" min="12" max="72" step="1" v-model.number="config.fontSize" class="form-control" />
              </div>
              <div class="col">
                <label class="form-label">Line height</label>
                <input type="range" min="1" max="3" step="0.1" v-model.number="config.lineHeight" class="form-range" />
              </div>
            </div>
            <div class="row mt-2">
              <div class="col">
                <label class="form-label">Highlight words</label>
                <input type="number" min="1" max="10" v-model.number="config.highlightCount" class="form-control" />
              </div>
            </div>
            <div class="mt-2">
              <label class="form-label">Play speed (words per minute)</label>
              <input type="number" min="50" max="2000" v-model.number="config.wpm" class="form-control" />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Save</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import LibraryPage from './components/LibraryPage.vue'
import PlayerPage from './components/PlayerPage.vue'

const LIB_KEY = 'speedyReaderLibrary_v1'
const CFG_KEY = 'speedyReaderConfig_v1'

const defaultConfig = {
  fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
  fontSize: 28,
  textColor: '#6c757d',
  bgColor: '#f8f9fa',
  lineHeight: 1.6,
  highlightCount: 3,
  wpm: 300,
}

const currentPage = ref('library')
const library = ref([])
const selectedId = ref(null)
const textContent = ref('')
const words = ref([])
const config = reactive(loadConfig())
const dragOver = ref(false)
const fileInput = ref(null)
const cfgEl = ref(null)
let cfgModal = null

function formatSize(n) {
  if (!n) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

function loadConfig() {
  const raw = localStorage.getItem(CFG_KEY)
  return raw ? Object.assign({}, defaultConfig, JSON.parse(raw)) : Object.assign({}, defaultConfig)
}

watch(config, (value) => {
  localStorage.setItem(CFG_KEY, JSON.stringify(value))
}, { deep: true })

function loadLibrary() {
  const raw = localStorage.getItem(LIB_KEY)
  library.value = raw ? JSON.parse(raw) : []
}

function saveLibrary() {
  localStorage.setItem(LIB_KEY, JSON.stringify(library.value))
}

function handleFilesList(files) {
  for (const file of files) {
    processFile(file)
  }
}

async function processFile(file) {
  const name = file.name
  const size = file.size
  const type = file.type || (name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'text/plain')

  try {
    let text = ''
    if (type === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) {
      const arr = await file.arrayBuffer()
      text = await extractTextFromPDF(arr)
    } else {
      text = await file.text()
    }

    addItem({
      id: Date.now().toString(),
      name,
      size,
      type,
      text,
      createdAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('file process error', err)
    alert(`Failed to read file: ${name}`)
  }
}

function addItem(item) {
  library.value.unshift(item)
  saveLibrary()
  selectItem(item.id)
}

function removeItem(id) {
  const idx = library.value.findIndex((item) => item.id === id)
  if (idx >= 0) {
    library.value.splice(idx, 1)
    saveLibrary()
    if (selectedId.value === id) {
      clearPlayer()
    }
  }
}

function selectItem(id) {
  const item = library.value.find((entry) => entry.id === id)
  if (!item) return

  selectedId.value = id
  textContent.value = item.text || ''
  words.value = textContent.value.split(/\s+/).filter(Boolean)
  currentPage.value = 'player'
}

async function extractTextFromPDF(arrayBuffer) {
  try {
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const pages = []

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const textContent = await page.getTextContent()
      const strings = textContent.items.map((item) => item.str)
      pages.push(strings.join(' '))
    }

    return pages.join('\n\n')
  } catch (err) {
    console.error(err)
    return ''
  }
}

function onDrop(event) {
  dragOver.value = false
  const dt = event.dataTransfer
  if (dt?.files) {
    handleFilesList(dt.files)
  }
}

function onDragOver() {
  dragOver.value = true
}

function onDragLeave() {
  dragOver.value = false
}

function pickFiles() {
  fileInput.value?.click()
}

function onFilesPicked(event) {
  const files = event.target.files
  if (files?.length) {
    handleFilesList(files)
  }
  event.target.value = null
}

function openConfig() {
  cfgModal?.show()
}

function closeConfig() {
  cfgModal?.hide()
}

onMounted(() => {
  loadLibrary()
  if (cfgEl.value) {
    cfgModal = new bootstrap.Modal(cfgEl.value)
  }
})
</script>
