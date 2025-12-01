<template>
  <div class="video-preview">
    <div class="video-preview__header">
      <h3 class="video-preview__title">预览</h3>
      <div class="video-preview__info">
        <span class="info-item">{{ formatTime(playbackStore.currentTime) }}</span>
        <span class="info-separator">/</span>
        <span class="info-item">{{ formatTime(playbackStore.duration) }}</span>
      </div>
    </div>

    <div class="video-preview__content">
      <!-- 模拟视频预览区域 -->
      <div class="preview-screen">
        <div class="preview-screen__placeholder">
          <div class="placeholder-icon">🎬</div>
          <div class="placeholder-text">视频预览区域</div>
          <div class="placeholder-time">{{ formatTime(playbackStore.currentTime) }}</div>
        </div>

        <!-- 播放指示器 -->
        <div v-if="playbackStore.isPlaying" class="preview-screen__playing">
          <div class="playing-indicator">▶</div>
        </div>
      </div>

      <!-- 播放控制 -->
      <div class="preview-controls">
        <div class="controls-group">
          <button
            class="control-btn control-btn--primary"
            :title="playbackStore.isPlaying ? '暂停' : '播放'"
            @click="togglePlayback"
          >
            {{ playbackStore.isPlaying ? '⏸' : '▶' }}
          </button>
          <button class="control-btn" title="停止" @click="handleStop">
            ⏹
          </button>
          <button class="control-btn" title="回到开始" @click="handleRewind">
            ⏮
          </button>
        </div>

        <div class="controls-divider"></div>

        <div class="controls-group">
          <button class="control-btn" title="上一帧" @click="handlePreviousFrame">
            ⏪
          </button>
          <button class="control-btn" title="下一帧" @click="handleNextFrame">
            ⏩
          </button>
        </div>

        <div class="controls-divider"></div>

        <div class="controls-group">
          <span class="control-label">速度</span>
          <select v-model.number="playbackSpeed" class="control-select" @change="handleSpeedChange">
            <option :value="0.25">0.25x</option>
            <option :value="0.5">0.5x</option>
            <option :value="1">1x</option>
            <option :value="1.5">1.5x</option>
            <option :value="2">2x</option>
          </select>
        </div>
      </div>

      <!-- 播放进度条 -->
      <div class="preview-progress">
        <input
          type="range"
          min="0"
          :max="playbackStore.duration"
          :value="playbackStore.currentTime"
          step="0.01"
          class="progress-slider"
          @input="handleSeek"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { usePlaybackStore } from '../../stores/playback'

const playbackStore = usePlaybackStore()
const playbackSpeed = ref(1)

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

function togglePlayback() {
  if (playbackStore.isPlaying) {
    playbackStore.pause()
  } else {
    playbackStore.play()
  }
}

function handleStop() {
  playbackStore.pause()
  playbackStore.seekTo(0)
}

function handleRewind() {
  playbackStore.seekTo(0)
}

function handlePreviousFrame() {
  const frameTime = 1 / 30 // 假设 30fps
  const newTime = Math.max(0, playbackStore.currentTime - frameTime)
  playbackStore.seekTo(newTime)
}

function handleNextFrame() {
  const frameTime = 1 / 30 // 假设 30fps
  const newTime = Math.min(playbackStore.duration, playbackStore.currentTime + frameTime)
  playbackStore.seekTo(newTime)
}

function handleSeek(event: Event) {
  const target = event.target as HTMLInputElement
  playbackStore.seekTo(parseFloat(target.value))
}

function handleSpeedChange() {
  playbackStore.setPlaybackRate(playbackSpeed.value)
}
</script>

<style scoped>
.video-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-medium);
  border-bottom: 1px solid var(--color-border);
  overflow: hidden;
}

.video-preview__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.video-preview__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.video-preview__info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.info-separator {
  color: var(--color-text-tertiary);
}

.video-preview__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 12px;
  overflow: hidden;
}

/* 预览屏幕 */
.preview-screen {
  flex: 1;
  position: relative;
  background: var(--color-bg-dark);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-screen__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  opacity: 0.4;
}

.placeholder-icon {
  font-size: 64px;
}

.placeholder-text {
  font-size: 14px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.placeholder-time {
  font-size: 24px;
  color: var(--color-primary);
  font-family: 'Courier New', monospace;
  font-weight: 700;
}

.preview-screen__playing {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.playing-indicator {
  font-size: 48px;
  color: var(--color-primary);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}

/* 播放控制 */
.preview-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--color-bg-lighter);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.controls-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.controls-divider {
  width: 1px;
  height: 24px;
  background: var(--color-border);
}

.control-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.control-btn:hover {
  background: var(--color-bg-light);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.control-btn--primary {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
  font-size: 16px;
}

.control-btn--primary:hover {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
  color: white;
  transform: scale(1.05);
}

.control-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.control-select {
  padding: 4px 8px;
  background: var(--color-bg-medium);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.control-select:hover {
  border-color: var(--color-primary);
}

.control-select:focus {
  outline: none;
  border-color: var(--color-primary);
}

/* 进度条 */
.preview-progress {
  flex-shrink: 0;
  padding: 0 4px;
}

.progress-slider {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--color-border);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.progress-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: var(--color-primary);
  border-radius: 50%;
  cursor: pointer;
  transition: all var(--transition-fast);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.progress-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
}

.progress-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: var(--color-primary);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all var(--transition-fast);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.progress-slider::-moz-range-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
}
</style>

