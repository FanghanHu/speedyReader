// src/app.js
import { createApp, ref, reactive, computed, onMounted, watch } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.prod.js'

const LIB_KEY = 'speedyReaderLibrary_v1'
const CFG_KEY = 'speedyReaderConfig_v1'

function formatSize(n){ if(!n) return '';
  if(n<1024) return n+' B'; if(n<1024*1024) return (n/1024).toFixed(1)+' KB'; return (n/1024/1024).toFixed(2)+' MB'
}

createApp({
  setup(){
    const library = ref([])
    const selectedId = ref(null)
    const textContent = ref('')
    const words = ref([])
    const index = ref(0)
    const timer = ref(null)
    const isPlaying = ref(false)

    const defaultConfig = {
      fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
      textColor: '#6c757d',
      bgColor: '#f8f9fa',
      lineHeight: 1.6,
      highlightCount: 3,
      wpm: 300
    }
    const config = reactive(loadConfig())

    function loadConfig(){
      const raw = localStorage.getItem(CFG_KEY)
      return raw ? Object.assign({}, defaultConfig, JSON.parse(raw)) : Object.assign({}, defaultConfig)
    }
    watch(config, (v)=> localStorage.setItem(CFG_KEY, JSON.stringify(v)), {deep:true})

    function loadLibrary(){
      const raw = localStorage.getItem(LIB_KEY)
      library.value = raw ? JSON.parse(raw) : []
    }
    function saveLibrary(){
      localStorage.setItem(LIB_KEY, JSON.stringify(library.value))
    }

    function handleFilesList(files){
      for(const f of files){
        processFile(f)
      }
    }

    async function processFile(file){
      const name = file.name
      const size = file.size
      const type = file.type || (name.endsWith('.pdf')? 'application/pdf':'text/plain')
      try{
        let text = ''
        if(type === 'application/pdf' || name.toLowerCase().endsWith('.pdf')){
          const arr = await file.arrayBuffer()
          text = await extractTextFromPDF(arr)
        } else {
          text = await file.text()
        }
        addItem({id:Date.now().toString(), name, size, type, text, createdAt: new Date().toISOString()})
      }catch(err){
        console.error('file process error', err)
        alert('Failed to read file: '+name)
      }
    }

    function addItem(item){
      library.value.unshift(item)
      saveLibrary()
      selectItem(item.id)
    }

    function removeItem(id){
      const i = library.value.findIndex(x=>x.id===id)
      if(i>=0){
        library.value.splice(i,1)
        saveLibrary()
        if(selectedId.value===id){
          clearPlayer()
        }
      }
    }

    function selectItem(id){
      const item = library.value.find(x=>x.id===id)
      if(!item) return
      selectedId.value = id
      textContent.value = item.text || ''
      words.value = textContent.value.split(/\s+/).filter(Boolean)
      index.value = 0
      pause()
    }

    function clearPlayer(){
      selectedId.value = null
      textContent.value = ''
      words.value = []
      index.value = 0
      pause()
    }

    function advance(){
      const step = Math.max(1, config.highlightCount)
      index.value += step
      if(index.value >= words.value.length){
        pause(); index.value = words.value.length
      }
    }

    function play(){
      if(isPlaying.value) return
      if(words.value.length===0) return
      isPlaying.value = true
      const step = Math.max(1, config.highlightCount)
      const interval = Math.max(20, Math.round(60000 * step / Math.max(1, config.wpm)))
      timer.value = setInterval(advance, interval)
    }
    function pause(){
      isPlaying.value = false
      if(timer.value){ clearInterval(timer.value); timer.value = null }
    }

    function prev(){
      const step = Math.max(1, config.highlightCount)
      index.value = Math.max(0, index.value - step)
    }
    function next(){ advance() }

    const displayWindow = computed(()=>{
      const total = words.value.length
      const hc = Math.max(1, config.highlightCount)
      const windowSize = Math.max(hc, hc + 6)
      const centerOffset = Math.floor(windowSize/2)
      // center highlighted words around the center
      let start = Math.max(0, index.value - centerOffset)
      let end = Math.min(total, start + windowSize)
      if(end - start < windowSize){ start = Math.max(0, end - windowSize) }
      const slice = words.value.slice(start,end)
      // determine local highlight positions
      const localIndexStart = index.value - start
      const localIndexEnd = localIndexStart + hc
      return {slice, start, localIndexStart, localIndexEnd}
    })

    async function extractTextFromPDF(arrayBuffer){
      try{
        const pdf = await window['pdfjsLib'].getDocument({data:arrayBuffer}).promise
        let out = []
        for(let p=1;p<=pdf.numPages;p++){
          const page = await pdf.getPage(p)
          const txt = await page.getTextContent()
          const strings = txt.items.map(i=>i.str)
          out.push(strings.join(' '))
        }
        return out.join('\n\n')
      }catch(e){ console.error(e); return '' }
    }

    // drag/drop handlers
    const dragOver = ref(false)
    function onDrop(e){ e.preventDefault(); dragOver.value=false; const dt = e.dataTransfer; if(dt && dt.files){ handleFilesList(dt.files) } }
    function onDragOver(e){ e.preventDefault(); dragOver.value=true }
    function onDragLeave(e){ dragOver.value=false }

    // file input
    const fileInput = ref(null)
    function pickFiles(){ fileInput.value.click() }
    function onFilesPicked(e){ const f = e.target.files; if(f && f.length) handleFilesList(f); e.target.value = null }

    // config modal
    let cfgModal = null
    const cfgEl = ref(null)
    onMounted(()=>{
      loadLibrary()
      // init bootstrap modal
      if(cfgEl.value){ cfgModal = new bootstrap.Modal(cfgEl.value) }
    })
    function openConfig(){ if(cfgModal) cfgModal.show() }
    function closeConfig(){ if(cfgModal) cfgModal.hide() }

    // expose
    return {
      library, selectedId, formatSize,
      selectItem, removeItem,
      dragOver, onDrop, onDragOver, onDragLeave,
      pickFiles, fileInput, onFilesPicked,
      textContent, words, index, displayWindow,
      play, pause, prev, next, isPlaying, clearPlayer,
      config, openConfig, cfgEl, formatSize
    }
  },
  template: `
  <div class="container container-app">
    <div class="row">
      <div class="col-12 mb-3 d-flex justify-content-between align-items-center">
        <h3 class="m-0">SpeedyReader</h3>
        <div>
          <button class="btn btn-outline-secondary me-2" @click="openConfig">Settings</button>
        </div>
      </div>
    </div>

    <div class="row g-3">
      <div class="col-md-4">
        <div :class="['drop-area', dragOver? 'border-primary':'']" @drop.prevent="onDrop" @dragover.prevent="onDragOver" @dragleave.prevent="onDragLeave">
          <div>
            <p class="mb-1">Drop a TXT or PDF file here to add to your library</p>
            <div class="mb-2">
              <button class="btn btn-sm btn-primary" @click="pickFiles">Pick files</button>
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
                <div class="fw-bold" style="cursor:pointer" @click="selectItem(item.id)">{{item.name}}</div>
                <small class="text-muted">{{formatSize(item.size)}} • {{new Date(item.createdAt).toLocaleString()}}</small>
              </div>
              <div>
                <button class="btn btn-sm btn-outline-secondary me-1" @click="selectItem(item.id)">Load</button>
                <button class="btn btn-sm btn-outline-danger" @click="removeItem(item.id)">Remove</button>
              </div>
            </li>
            <li v-if="library.length===0" class="list-group-item">No files yet — add one above.</li>
          </ul>
        </div>
      </div>

      <div class="col-md-8">
        <div :style="{background:config.bgColor, color:config.textColor, fontFamily:config.fontFamily}">
          <div class="player-row mb-2" :style="{lineHeight:config.lineHeight}">
            <div v-if="words.length===0" class="text-muted">No file loaded. Add a file and click Load to begin.</div>
            <template v-else>
              <template v-for="(w, idx) in displayWindow.slice" :key="idx">
                <span :class="['word', (idx>=displayWindow.localIndexStart && idx<displayWindow.localIndexEnd) ? 'highlight':'' ]" style="margin:0 6px">{{w}}</span>
              </template>
            </template>
          </div>

          <div class="d-flex align-items-center controls mb-3">
            <button class="btn btn-primary" @click="isPlaying?pause():play">{{isPlaying? 'Pause':'Play'}}</button>
            <button class="btn btn-outline-secondary" @click="prev">Prev</button>
            <button class="btn btn-outline-secondary" @click="next">Next</button>
            <div class="ms-auto small-muted">WPM: {{config.wpm}} • Highlight: {{config.highlightCount}} words</div>
          </div>

          <div class="card p-3 small text-muted" style="max-height:240px; overflow:auto;">
            <pre style="white-space:pre-wrap; margin:0">{{textContent}}</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- Config Modal -->
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
                <label class="form-label">Line height</label>
                <input type="range" min="1" max="3" step="0.1" v-model.number="config.lineHeight" class="form-range" />
              </div>
              <div class="col">
                <label class="form-label">Highlight words</label>
                <input type="number" min="1" max="5" v-model.number="config.highlightCount" class="form-control" />
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
  `
}).mount('#app')
