<template>
    <div class="player-page h-100 d-flex flex-column">
        <div :style="{ background: config.bgColor, color: config.textColor, fontFamily: config.fontFamily }"
            class="player-stage">
            <div class="player-content overflow-auto" :class="{'d-flex flex-column justify-content-center': config.highlightOnly}" ref="textContainer">
                <div class="player-text" :class="{'text-center': config.highlightOnly}" :style="{ lineHeight: config.lineHeight, fontSize: config.fontSize + 'px' }">
                    <div v-if="words.length === 0" class="text-muted">No file loaded. Add a file and click Load to
                        begin.</div>
                    <template v-else>
                        <span v-if="!config.highlightOnly" class="text-muted">{{ playedcontentRef }}</span>
                        <span id="highlight" class="fw-bold text-black" >{{ highlightRef }}</span>
                        <span v-if="!config.highlightOnly" class="text-muted">{{ remainingContentRef }}</span>
                    </template>
                </div>
            </div>
        </div>

        <div class="player-controls mt-3">
            <div class="d-flex align-items-center justify-content-center gap-2">
                <button class="btn btn-outline-secondary" @click="prev" aria-label="Previous">⏮</button>
                <button class="btn btn-primary" @click="isPlaying ? pause() : play()"
                    :aria-label="isPlaying ? 'Pause' : 'Play'">
                    <span v-if="isPlaying">⏸</span>
                    <span v-else>▶</span>
                </button>
                <button class="btn btn-outline-secondary" @click="next" aria-label="Next">⏭</button>
            </div>
            <div class="small-muted text-center mt-2">WPM: {{ config.wpm }} • Highlight: {{ config.highlightCount }}
                words</div>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  textContent: String,
  words: Array,
  config: Object,
})

const remainingContentRef = ref(props.textContent || '')
const highlightRef = ref('')
const playedcontentRef = ref('')
const isPlaying = ref(false)
const timer = ref(null)

function resetContent() {
  remainingContentRef.value = props.textContent || ''
  highlightRef.value = ''
  playedcontentRef.value = ''
}

function isAlpha(char) {
  return /[A-Za-z0-9]/.test(char)
}

function takeFirstWords(content, count) {
  let seenAlpha = false
  let words = 0
  let i = 0

  while (i < content.length && words < count) {
    const char = content[i]
    if (isAlpha(char)) {
      seenAlpha = true
    } else if (seenAlpha) {
      words += 1
      seenAlpha = false
    }
    i += 1
  }

  if (words < count && seenAlpha) {
    words += 1
    i = content.length
  }

  return {
    segment: content.slice(0, i),
    rest: content.slice(i),
  }
}

function scrollHighlightIntoView() {
  const highlightEl = document.getElementById('highlight')
  if (!highlightEl) return

  highlightEl.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' })
}

function advanceHighlight() {
  if (highlightRef.value) {
    playedcontentRef.value += highlightRef.value
    highlightRef.value = ''
  }

  if (!remainingContentRef.value) {
    pause()
    return
  }

  const { segment, rest } = takeFirstWords(remainingContentRef.value, props.config.highlightCount)
  highlightRef.value = segment
  remainingContentRef.value = rest
  nextTick(scrollHighlightIntoView)
}

function getInterval() {
  return Math.max(20, Math.round((60000 * Math.max(1, props.config.highlightCount)) / Math.max(1, props.config.wpm)))
}

function restartTimer() {
  if (!isPlaying.value) return
  if (timer.value) {
    clearInterval(timer.value)
  }
  timer.value = setInterval(advanceHighlight, getInterval())
}

function play() {
  if (isPlaying.value || (!highlightRef.value && !remainingContentRef.value)) return

  if (!highlightRef.value && remainingContentRef.value) {
    advanceHighlight()
  }

  isPlaying.value = true
  timer.value = setInterval(advanceHighlight, getInterval())
}

function pause() {
  isPlaying.value = false
  if (timer.value) {
    clearInterval(timer.value)
    timer.value = null
  }
}

function prev() {
  pause()
  resetContent()
}

function next() {
  advanceHighlight()
}

watch(
  () => props.textContent,
  () => {
    resetContent()
    pause()
  },
  { immediate: true },
)

watch(
  () => [props.config.wpm, props.config.highlightCount],
  () => {
    restartTimer()
  },
)

onUnmounted(() => {
  pause()
})
</script>
