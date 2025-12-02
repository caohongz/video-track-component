<template>
  <div class="debug-panel">
    <div class="debug-panel__header">
      <h3 class="debug-panel__title">🔧 调试面板</h3>
      <div class="debug-panel__tabs">
        <button v-for="tab in tabs" :key="tab.id" :class="['tab', { 'tab--active': activeTab === tab.id }]"
          @click="activeTab = tab.id">
          {{ tab.label }}
        </button>
      </div>
    </div>

    <div class="debug-panel__content">
      <!-- 轨道数据 -->
      <div v-if="activeTab === 'tracks'" class="debug-section">
        <div class="section-header">
          <span class="section-title">📊 轨道概览</span>
          <button class="copy-btn" @click="copyTracksData" title="复制轨道数据">
            📋 复制
          </button>
        </div>
        <div class="debug-info">
          <div class="debug-info__item">
            <span class="label">轨道总数：</span>
            <span class="value">{{ tracksStore.tracks.length }}</span>
          </div>
          <div class="debug-info__item">
            <span class="label">总时长：</span>
            <span class="value">{{ playbackStore.duration.toFixed(2) }}s</span>
          </div>
          <div class="debug-info__item">
            <span class="label">当前时间：</span>
            <span class="value highlight">{{ playbackStore.currentTime.toFixed(2) }}s</span>
          </div>
          <div class="debug-info__item">
            <span class="label">播放状态：</span>
            <span class="value" :class="{ 'highlight': playbackStore.isPlaying }">
              {{ playbackStore.isPlaying ? '▶ 播放中' : '⏸ 暂停' }}
            </span>
          </div>
        </div>

        <div class="debug-tracks">
          <div v-for="track in sortedTracks" :key="track.id" class="track-item">
            <div class="track-item__header">
              <span class="track-item__icon">{{ getTrackIcon(track.type) }}</span>
              <span class="track-item__name">{{ track.name }}</span>
              <span class="track-item__type">{{ track.type }}</span>
              <span class="track-item__clips">{{ track.clips.length }} clips</span>
            </div>
            <div class="track-item__clips">
              <div v-for="clip in track.clips" :key="clip.id"
                :class="['clip-item', { 'clip-item--selected': clip.selected }]">
                <div class="clip-item__info">
                  <span class="clip-item__type">{{ getClipIcon(clip.type) }} {{ clip.type }}</span>
                  <span class="clip-item__name">{{ clip.name || clip.id.substring(0, 8) }}</span>
                </div>
                <div class="clip-item__time">
                  {{ clip.startTime.toFixed(2) }}s → {{ clip.endTime.toFixed(2) }}s
                  <span class="clip-item__duration">({{ (clip.endTime - clip.startTime).toFixed(2) }}s)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 播放器 AVCanvas -->
      <div v-if="activeTab === 'player'" class="debug-section">
        <div class="section-header">
          <span class="section-title">🎬 AVCanvas 状态</span>
          <button class="copy-btn" @click="copyPlayerData" title="复制播放器数据">
            📋 复制
          </button>
        </div>
        <div class="debug-info">
          <div class="debug-info__item">
            <span class="label">初始化状态：</span>
            <span class="value" :class="{ 'highlight': avCanvasDebugData.initialized }">
              {{ avCanvasDebugData.initialized ? '✓ 已初始化' : '✗ 未初始化' }}
            </span>
          </div>
          <div class="debug-info__item">
            <span class="label">画布尺寸：</span>
            <span class="value">{{ avCanvasDebugData.canvasWidth }} × {{ avCanvasDebugData.canvasHeight }}</span>
          </div>
          <div class="debug-info__item">
            <span class="label">播放状态：</span>
            <span class="value" :class="{ 'highlight': avCanvasDebugData.isPlaying }">
              {{ avCanvasDebugData.isPlaying ? '▶ 播放中' : '⏸ 暂停' }}
            </span>
          </div>
          <div class="debug-info__item">
            <span class="label">当前时间：</span>
            <span class="value highlight">{{ formatMicroseconds(avCanvasDebugData.currentTime) }}</span>
          </div>
          <div class="debug-info__item">
            <span class="label">总时长：</span>
            <span class="value">{{ formatMicroseconds(avCanvasDebugData.duration) }}</span>
          </div>
          <div class="debug-info__item">
            <span class="label">播放进度：</span>
            <span class="value highlight">{{ getPlaybackProgress() }}%</span>
          </div>
          <div class="debug-info__item">
            <span class="label">播放速度：</span>
            <span class="value">{{ avCanvasDebugData.playbackSpeed }}x</span>
          </div>
          <div class="debug-info__item">
            <span class="label">Sprite 数量：</span>
            <span class="value highlight">{{ avCanvasDebugData.spriteCount }}</span>
          </div>
          <div class="debug-info__item">
            <span class="label">可见 Sprite：</span>
            <span class="value">{{ getVisibleSpritesCount() }}</span>
          </div>
          <div class="debug-info__item">
            <span class="label">当前帧 Sprites：</span>
            <span class="value highlight">{{ getCurrentFrameSprites() }}</span>
          </div>
        </div>

        <!-- Sprites 列表 -->
        <div class="sprites-section">
          <div class="sprites-section__title">🎭 Sprites 列表</div>
          <div v-if="avCanvasDebugData.sprites.length > 0" class="sprites-list">
            <div v-for="sprite in avCanvasDebugData.sprites" :key="sprite.clipId" class="sprite-item">
              <div class="sprite-item__header">
                <span class="sprite-item__icon">{{ getClipIcon(sprite.type) }}</span>
                <span class="sprite-item__id">{{ sprite.clipId.substring(0, 16) }}...</span>
                <span class="sprite-item__type">{{ sprite.type }}</span>
              </div>
              <div class="sprite-item__details">
                <div class="sprite-detail">
                  <span class="sprite-detail__label">时间偏移：</span>
                  <span class="sprite-detail__value">{{ formatMicroseconds(sprite.offset) }}</span>
                </div>
                <div class="sprite-detail">
                  <span class="sprite-detail__label">持续时间：</span>
                  <span class="sprite-detail__value">{{ formatMicroseconds(sprite.duration) }}</span>
                </div>
                <div class="sprite-detail">
                  <span class="sprite-detail__label">位置：</span>
                  <span class="sprite-detail__value">{{ sprite.rect.x.toFixed(0) }}, {{ sprite.rect.y.toFixed(0)
                  }}</span>
                </div>
                <div class="sprite-detail">
                  <span class="sprite-detail__label">尺寸：</span>
                  <span class="sprite-detail__value">{{ sprite.rect.w.toFixed(0) }} × {{ sprite.rect.h.toFixed(0)
                  }}</span>
                </div>
                <div class="sprite-detail">
                  <span class="sprite-detail__label">旋转：</span>
                  <span class="sprite-detail__value">{{ sprite.rect.angle.toFixed(1) }}°</span>
                </div>
                <div class="sprite-detail">
                  <span class="sprite-detail__label">透明度：</span>
                  <span class="sprite-detail__value">{{ (sprite.opacity * 100).toFixed(0) }}%</span>
                </div>
                <div class="sprite-detail">
                  <span class="sprite-detail__label">可见：</span>
                  <span class="sprite-detail__value" :class="{ 'highlight': sprite.visible }">
                    {{ sprite.visible ? '✓' : '✗' }}
                  </span>
                </div>
                <div class="sprite-detail">
                  <span class="sprite-detail__label">层级：</span>
                  <span class="sprite-detail__value">{{ sprite.zIndex }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <div class="empty-state__icon">🎬</div>
            <div class="empty-state__text">暂无 Sprite</div>
          </div>
        </div>
      </div>

      <!-- 选中的 Clips -->
      <div v-if="activeTab === 'selection'" class="debug-section">
        <div class="section-header">
          <span class="section-title">🎯 选中信息</span>
          <button class="copy-btn" :disabled="tracksStore.selectedClips.length === 0" @click="copySelectionData"
            title="复制选中数据">
            📋 复制
          </button>
        </div>
        <div class="debug-info">
          <div class="debug-info__item">
            <span class="label">选中数量：</span>
            <span class="value highlight">{{ tracksStore.selectedClips.length }}</span>
          </div>
        </div>

        <div v-if="tracksStore.selectedClips.length > 0" class="debug-json">
          <div v-for="clip in tracksStore.selectedClips" :key="clip.id" class="selected-clip">
            <div class="selected-clip__header">
              <span>{{ getClipIcon(clip.type) }} {{ clip.name || clip.id }}</span>
            </div>
            <pre class="json-content">{{ JSON.stringify(clip, null, 2) }}</pre>
          </div>
        </div>
        <div v-else class="empty-state">
          <div class="empty-state__icon">🎯</div>
          <div class="empty-state__text">未选中任何 Clip</div>
        </div>
      </div>

      <!-- 历史记录 -->
      <div v-if="activeTab === 'history'" class="debug-section">
        <div class="section-header">
          <span class="section-title">📜 历史记录</span>
          <button class="copy-btn" @click="copyHistoryData" title="复制历史数据">
            📋 复制
          </button>
        </div>
        <div class="debug-info">
          <div class="debug-info__item">
            <span class="label">当前索引：</span>
            <span class="value">{{ historyStore.currentIndex }}</span>
          </div>
          <div class="debug-info__item">
            <span class="label">历史记录数：</span>
            <span class="value">{{ historyStore.historyStack.length }}</span>
          </div>
          <div class="debug-info__item">
            <span class="label">可撤销：</span>
            <span class="value" :class="{ 'highlight': historyStore.canUndo }">
              {{ historyStore.canUndo ? '✓' : '✗' }}
            </span>
          </div>
          <div class="debug-info__item">
            <span class="label">可重做：</span>
            <span class="value" :class="{ 'highlight': historyStore.canRedo }">
              {{ historyStore.canRedo ? '✓' : '✗' }}
            </span>
          </div>
        </div>

        <div class="history-list">
          <div v-for="(snapshot, index) in historyStore.historyStack" :key="index"
            :class="['history-item', { 'history-item--current': index === historyStore.currentIndex }]">
            <span class="history-item__index">{{ index }}</span>
            <span class="history-item__desc">{{ snapshot.description }}</span>
            <span class="history-item__time">{{ formatTimestamp(snapshot.timestamp) }}</span>
          </div>
        </div>
      </div>

      <!-- 缩放配置 -->
      <div v-if="activeTab === 'scale'" class="debug-section">
        <div class="debug-info">
          <div class="debug-info__item">
            <span class="label">缩放比例：</span>
            <span class="value highlight">{{ scaleStore.scale.toFixed(2) }}x</span>
          </div>
          <div class="debug-info__item">
            <span class="label">像素/秒：</span>
            <span class="value">{{ scaleStore.pixelsPerSecond }}</span>
          </div>
          <div class="debug-info__item">
            <span class="label">实际像素/秒：</span>
            <span class="value highlight">{{ scaleStore.actualPixelsPerSecond.toFixed(2) }}</span>
          </div>
          <div class="debug-info__item">
            <span class="label">吸附启用：</span>
            <span class="value" :class="{ 'highlight': scaleStore.snapEnabled }">
              {{ scaleStore.snapEnabled ? '✓' : '✗' }}
            </span>
          </div>
          <div class="debug-info__item">
            <span class="label">吸附阈值：</span>
            <span class="value">{{ scaleStore.snapThreshold }}px</span>
          </div>
          <div class="debug-info__item">
            <span class="label">最小缩放：</span>
            <span class="value">{{ scaleStore.minScale }}x</span>
          </div>
          <div class="debug-info__item">
            <span class="label">最大缩放：</span>
            <span class="value">{{ scaleStore.maxScale }}x</span>
          </div>
        </div>
      </div>

      <!-- 完整 JSON -->
      <div v-if="activeTab === 'json'" class="debug-section">
        <div class="section-header">
          <span class="section-title">📄 完整 JSON</span>
          <button class="copy-btn" @click="copyJsonData" title="复制 JSON 数据">
            📋 复制
          </button>
        </div>
        <div class="debug-json">
          <div class="json-block">
            <div class="json-block__title">所有轨道数据</div>
            <pre class="json-content">{{ JSON.stringify(tracksStore.tracks, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import { useTracksStore, usePlaybackStore, useHistoryStore, useScaleStore } from 'vue-clip-track'
import type { AVCanvasDebugData } from '../VideoPreview/index.vue'

const tracksStore = useTracksStore()
const playbackStore = usePlaybackStore()
const historyStore = useHistoryStore()
const scaleStore = useScaleStore()

// 注入 AVCanvas 调试数据
const avCanvasDebugData = inject<AVCanvasDebugData>('avCanvasDebugData', {
  initialized: false,
  canvasWidth: 0,
  canvasHeight: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playbackSpeed: 1,
  spriteCount: 0,
  sprites: []
})

const activeTab = ref('tracks')

const tabs = [
  { id: 'tracks', label: '轨道' },
  { id: 'player', label: '播放器' },
  { id: 'selection', label: '选中' },
  { id: 'history', label: '历史' },
  { id: 'scale', label: '缩放' },
  { id: 'json', label: 'JSON' }
]

const sortedTracks = computed(() => tracksStore.sortedTracks)

function getTrackIcon(type: string): string {
  const icons: Record<string, string> = {
    video: '🎥',
    audio: '🎵',
    subtitle: '📝',
    sticker: '😀',
    filter: '🎨',
    effect: '✨'
  }
  return icons[type] || '📄'
}

function getClipIcon(type: string): string {
  const icons: Record<string, string> = {
    video: '🎥',
    audio: '🎵',
    subtitle: '📝',
    transition: '🔀',
    sticker: '😀',
    filter: '🎨',
    effect: '✨'
  }
  return icons[type] || '📄'
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
}

// 播放进度百分比
function getPlaybackProgress(): string {
  if (avCanvasDebugData.duration <= 0) return '0.00'
  return ((avCanvasDebugData.currentTime / avCanvasDebugData.duration) * 100).toFixed(2)
}

// 可见 Sprites 数量
function getVisibleSpritesCount(): number {
  return avCanvasDebugData.sprites.filter(s => s.visible).length
}

// 当前帧显示的 Sprites 数量
function getCurrentFrameSprites(): number {
  const currentTime = avCanvasDebugData.currentTime
  return avCanvasDebugData.sprites.filter(s => {
    return currentTime >= s.offset && currentTime <= s.offset + s.duration
  }).length
}

// 复制到剪贴板
async function copyToClipboard(data: unknown, successMessage: string) {
  try {
    const jsonStr = JSON.stringify(data, null, 2)
    await navigator.clipboard.writeText(jsonStr)
    console.log(successMessage)
    // 可以添加一个 toast 提示
  } catch (error) {
    console.error('复制失败:', error)
  }
}

// 复制轨道数据
function copyTracksData() {
  const data = {
    totalTracks: tracksStore.tracks.length,
    totalDuration: playbackStore.duration,
    currentTime: playbackStore.currentTime,
    isPlaying: playbackStore.isPlaying,
    tracks: tracksStore.tracks
  }
  copyToClipboard(data, '轨道数据已复制到剪贴板')
}

// 复制播放器数据
function copyPlayerData() {
  const data = {
    ...avCanvasDebugData,
    playbackProgress: getPlaybackProgress() + '%',
    visibleSprites: getVisibleSpritesCount(),
    currentFrameSprites: getCurrentFrameSprites()
  }
  copyToClipboard(data, '播放器数据已复制到剪贴板')
}

// 复制选中数据
function copySelectionData() {
  const data = {
    selectedCount: tracksStore.selectedClips.length,
    selectedClips: tracksStore.selectedClips
  }
  copyToClipboard(data, '选中数据已复制到剪贴板')
}

// 复制历史记录数据
function copyHistoryData() {
  const data = {
    currentIndex: historyStore.currentIndex,
    totalSnapshots: historyStore.historyStack.length,
    canUndo: historyStore.canUndo,
    canRedo: historyStore.canRedo,
    historyStack: historyStore.historyStack
  }
  copyToClipboard(data, '历史记录已复制到剪贴板')
}

// 复制完整 JSON 数据
function copyJsonData() {
  copyToClipboard(tracksStore.tracks, '完整 JSON 数据已复制到剪贴板')
}

// 微秒转为可读时间字符串
function formatMicroseconds(us: number): string {
  const seconds = us / 1e6
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
}
</script>

<style scoped>
.debug-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-medium);
  overflow: hidden;
  transition: background-color var(--transition-base);
}

.debug-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  gap: 12px;
  background: var(--color-bg-elevated);
}

.debug-panel__title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  letter-spacing: -0.01em;
}

.debug-panel__tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.tab {
  padding: 5px 10px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 400;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.tab:hover {
  background: var(--color-bg-light);
  color: var(--color-text-primary);
}

.tab--active {
  background: var(--color-primary);
  color: white;
  font-weight: 500;
}

/* 区块头部 */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--color-border);
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.copy-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  background: var(--color-bg-light);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: 11px;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.copy-btn:hover:not(:disabled) {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.copy-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.debug-panel__content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.debug-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 调试信息 */
.debug-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
  padding: 14px;
  background: var(--color-bg-light);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.debug-info__item {
  display: flex;
  gap: 8px;
  font-size: 12px;
  line-height: 1.5;
}

.debug-info__item .label {
  color: var(--color-text-secondary);
  font-weight: 400;
}

.debug-info__item .value {
  color: var(--color-text-primary);
  font-family: 'Courier New', monospace;
  font-weight: 600;
  flex: 1;
}

.debug-info__item .value.highlight {
  color: var(--color-primary);
}

/* 轨道列表 */
.debug-tracks {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.track-item {
  background: var(--color-bg-light);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all var(--transition-fast);
}

.track-item:hover {
  box-shadow: var(--shadow-sm);
}

.track-item__header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--color-bg-lighter);
  border-bottom: 1px solid var(--color-border);
  font-size: 12px;
}

.track-item__icon {
  font-size: 16px;
  line-height: 1;
}

.track-item__name {
  font-weight: 500;
  color: var(--color-text-primary);
}

.track-item__type {
  padding: 3px 8px;
  background: var(--color-bg-dark);
  border-radius: var(--radius-sm);
  font-size: 11px;
  color: var(--color-text-tertiary);
  font-family: 'Courier New', monospace;
  line-height: 1;
}

.track-item__clips {
  margin-left: auto;
  color: var(--color-text-secondary);
  font-size: 11px;
  font-family: 'Courier New', monospace;
}

.track-item__clips {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.clip-item {
  padding: 8px 10px;
  background: var(--color-bg-dark);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 11px;
  transition: all var(--transition-fast);
}

.clip-item:hover {
  background: var(--color-bg-medium);
  border-color: var(--color-border-light);
  box-shadow: var(--shadow-sm);
}

.clip-item--selected {
  background: hsla(var(--theme-hue), var(--theme-saturation), var(--theme-lightness), 0.12);
  border-color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.clip-item__info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.clip-item__type {
  color: var(--color-text-secondary);
  font-family: 'Courier New', monospace;
  font-size: 11px;
}

.clip-item__name {
  color: var(--color-text-primary);
  font-weight: 400;
  font-size: 11px;
}

.clip-item__time {
  color: var(--color-text-tertiary);
  font-family: 'Courier New', monospace;
  font-size: 10px;
  line-height: 1.4;
}

.clip-item__duration {
  color: var(--color-primary);
  font-weight: 600;
}

/* JSON 显示 */
.debug-json {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.json-block {
  background: var(--color-bg-dark);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.json-block__title {
  padding: 10px 12px;
  background: var(--color-bg-light);
  border-bottom: 1px solid var(--color-border);
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
}

.json-content {
  margin: 0;
  padding: 14px;
  font-size: 11px;
  font-family: 'Courier New', monospace;
  color: var(--color-text-primary);
  overflow-x: auto;
  line-height: 1.6;
  background: var(--color-bg-dark);
}

.selected-clip {
  background: var(--color-bg-light);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.selected-clip__header {
  padding: 10px 12px;
  background: var(--color-bg-lighter);
  border-bottom: 1px solid var(--color-border);
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
}

/* 历史记录 */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: var(--color-bg-light);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-size: 12px;
  transition: all var(--transition-fast);
}

.history-item:hover {
  background: var(--color-bg-lighter);
  border-color: var(--color-border-light);
}

.history-item--current {
  background: hsla(var(--theme-hue), var(--theme-saturation), var(--theme-lightness), 0.12);
  border-color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}

.history-item__index {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: var(--color-bg-dark);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-weight: 600;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  flex-shrink: 0;
}

.history-item--current .history-item__index {
  background: var(--color-primary);
  color: white;
}

.history-item__desc {
  flex: 1;
  color: var(--color-text-primary);
  font-weight: 400;
  line-height: 1.4;
}

.history-item__time {
  color: var(--color-text-tertiary);
  font-family: 'Courier New', monospace;
  font-size: 11px;
  line-height: 1;
  flex-shrink: 0;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  gap: 16px;
}

.empty-state__icon {
  font-size: 56px;
  opacity: 0.2;
  filter: grayscale(1);
}

.empty-state__text {
  font-size: 13px;
  color: var(--color-text-tertiary);
  text-align: center;
  line-height: 1.5;
}

/* Sprites 区域 */
.sprites-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sprites-section__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
}

.sprites-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sprite-item {
  background: var(--color-bg-light);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.sprite-item__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--color-bg-elevated);
  border-bottom: 1px solid var(--color-border);
}

.sprite-item__icon {
  font-size: 14px;
}

.sprite-item__id {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: var(--color-text-secondary);
  flex: 1;
}

.sprite-item__type {
  font-size: 10px;
  font-weight: 500;
  padding: 2px 6px;
  background: var(--color-primary);
  color: white;
  border-radius: var(--radius-xs);
  text-transform: uppercase;
}

.sprite-item__details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 6px;
  padding: 10px 12px;
}

.sprite-detail {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
}

.sprite-detail__label {
  color: var(--color-text-tertiary);
  white-space: nowrap;
}

.sprite-detail__value {
  color: var(--color-text-primary);
  font-family: 'Courier New', monospace;
  font-weight: 500;
}

.sprite-detail__value.highlight {
  color: var(--color-primary);
}

/* 滚动条 */
.debug-panel__content::-webkit-scrollbar {
  width: 6px;
}

.debug-panel__content::-webkit-scrollbar-track {
  background: transparent;
}

.debug-panel__content::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}

.debug-panel__content::-webkit-scrollbar-thumb:hover {
  background: var(--color-border-light);
}
</style>
