<template>
  <div class="app">
    <!-- 顶部工具栏 -->
    <div class="app__toolbar">
      <div class="toolbar__left">
        <h1 class="toolbar__title">音视频轨道组件演示</h1>
      </div>

      <div class="toolbar__center">
        <div class="toolbar__config">
          <div class="config-item">
            <label class="config-item__label">
              <input type="checkbox" v-model="enableMainTrackMode" class="config-item__checkbox" />
              <span class="config-item__text">主轨道模式</span>
            </label>
          </div>

          <div class="config-item">
            <label class="config-item__label">
              <input type="checkbox" v-model="enableCrossTrackDrag" class="config-item__checkbox" />
              <span class="config-item__text">跨轨移动</span>
            </label>
          </div>
        </div>
      </div>

      <div class="toolbar__right">
        <!-- 语言切换 -->
        <div class="language-switcher">
          <button class="toolbar__btn" @click="showLanguagePicker = !showLanguagePicker"
            :title="currentLocale === 'zh-CN' ? '切换语言' : 'Switch Language'">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="currentColor"
                stroke-width="2" />
              <path
                d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
                stroke="currentColor" stroke-width="2" />
            </svg>
          </button>
          <div v-if="showLanguagePicker" class="language-picker__panel" @click.stop>
            <div class="language-picker__title">{{ currentLocale === 'zh-CN' ? '选择语言' : 'Select Language' }}</div>
            <div class="language-picker__list">
              <button v-for="lang in languages" :key="lang.code" class="language-picker__item"
                :class="{ active: currentLocale === lang.code }" @click="setLocale(lang.code)">
                <span class="language-picker__flag">{{ lang.flag }}</span>
                <span class="language-picker__name">{{ lang.name }}</span>
                <svg v-if="currentLocale === lang.code" class="language-picker__check" width="16" height="16"
                  viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                    stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- 主题切换 -->
        <button class="toolbar__btn" @click="toggleTheme" :title="theme === 'dark' ? '切换到亮色主题' : '切换到暗色主题'">
          <svg v-if="theme === 'dark'" width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

        <!-- 注册自定义 clip 类型 -->


        <!-- 主色调选择 -->
        <div class="color-picker">
          <button class="toolbar__btn color-picker__btn" @click="showColorPicker = !showColorPicker" title="主色调">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>

          <div v-if="showColorPicker" class="color-picker__panel" @click.stop>
            <div class="color-picker__title">选择主色调</div>
            <div class="color-picker__grid">
              <button v-for="color in presetColors" :key="color.name" class="color-picker__item"
                :class="{ active: currentColor.name === color.name }" :style="{
                  backgroundColor: `hsl(${color.hue}, ${color.saturation}%, ${color.lightness}%)`
                }" @click="setColor(color)" :title="color.name">
                <svg v-if="currentColor.name === color.name" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="white" stroke-width="2" stroke-linecap="round"
                    stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 主工作区 -->
    <div class="app__workspace">
      <!-- 上部分：左中右三栏 -->
      <div class="workspace__top" :style="{ height: topHeight + 'px' }">
        <!-- 资源库 -->
        <div class="workspace__panel workspace__panel--left">
          <MediaLibrary />
        </div>

        <!-- 视频预览/调试面板 -->
        <div class="workspace__panel workspace__panel--center">
          <VideoPreview />
        </div>

        <!-- 属性面板 -->
        <div class="workspace__panel workspace__panel--right">
          <PropertyPanel />
        </div>
      </div>

      <!-- 可拖拽的分隔条 -->
      <div class="workspace__resizer" @mousedown="handleResizerMouseDown"
        :class="{ 'workspace__resizer--dragging': isResizing }">
        <div class="workspace__resizer-line"></div>
      </div>

      <!-- 下部分：轨道区域（占据整个宽度） -->
      <div class="workspace__bottom" :style="{ height: `calc(100vh - ${topHeight - 54}px)` }">
        <VideoTrack ref="videoTrackRef" :operation-buttons="operationButtons" :scale-config-buttons="scaleConfigButtons"
          :track-types="trackTypes" :clip-configs="clipConfigs" :enable-main-track-mode="enableMainTrackMode"
          :enable-cross-track-drag="enableCrossTrackDrag" :enable-snap="enableSnap" :default-scale="defaultScale"
          :locale="currentLocaleConfig" @add-transition="handleAddTransitionFromClick" @drop-media="handleDropMedia"
          @transition-added="onTransitionAdded" @clip-split="onClipSplit" @clip-copy="onClipCopy" @clip-cut="onClipCut"
          @clip-delete="onClipDelete" @clip-move="onClipMove" @clip-select="onClipSelect" @clip-paste="onClipPaste"
          @clip:added="onClipAdded" @clip:updated="onClipUpdated" @clip:removed="onClipRemoved"
          @clip:resize-start="onClipResizeStart" @clip:resize-end="onClipResizeEnd" @clip:drag-start="onClipDragStart"
          @clip:drag-end="onClipDragEnd" @track-create="onTrackCreate" @track-delete="onTrackDelete"
          @track:added="onTrackAdded" @track:removed="onTrackRemoved" @track:updated="onTrackUpdated"
          @selection:changed="onSelectionChanged" @playback:play="onPlaybackPlay" @playback:pause="onPlaybackPause"
          @playback:seek="onPlaybackSeek" @playback:timeupdate="onPlaybackTimeUpdate"
          @playback:ratechange="onPlaybackRateChange" @scale:changed="onScaleChanged"
          @history:changed="onHistoryChanged" @track-context-menu-select="onTrackContextMenuSelect"
          @clip-context-menu-select="onClipContextMenuSelect" @data:changed="onDataChanged">

          <!-- 自定义操作按钮 -->
          <template #custom-operation-import>
            <button class="tools-bar__btn" @click="handleImport" title="导入项目">
              <span class="tools-bar__icon">📁</span>
              <span class="tools-bar__label">导入</span>
            </button>
          </template>

          <template #custom-operation-export>
            <button class="tools-bar__btn" @click="handleExport" title="导出项目">
              <span class="tools-bar__icon">💾</span>
              <span class="tools-bar__label">导出</span>
            </button>
          </template>

        </VideoTrack>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
// 从组件库导入组件和类型
import {
  VideoTrack,
  useTracksStore,
  usePlaybackStore,
  useHistoryStore,
  generateId,
  normalizeTime,
  extractVideoThumbnails,
  extractAudioWaveform,
  extractVideoAudioWaveform,
  locales,
  type OperationButton,
  type ScaleConfigButton,
  type TrackTypeConfig,
  type TransitionClip,
  type Clip,
  type MediaClip,
  type Track,
  type LocaleConfig
} from 'vue-clip-track'
import MediaLibrary from './components/MediaLibrary/index.vue'
import PropertyPanel from './components/PropertyPanel/index.vue'
import VideoPreview from './components/VideoPreview/index.vue'
import { useTheme } from './composables/useTheme'
import { createMockTracks } from './utils/mockData'

const tracksStore = useTracksStore()
const playbackStore = usePlaybackStore()
const historyStore = useHistoryStore()

// 主题管理
const { theme, currentColor, toggleTheme, setColor, presetColors } = useTheme()
const showColorPicker = ref(false)

// 语言管理
const showLanguagePicker = ref(false)
const currentLocale = ref<string>('zh-CN')
const languages = [
  { code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
  { code: 'en-US', name: 'English', flag: '🇺🇸' }
]
const currentLocaleConfig = computed<LocaleConfig>(() => locales[currentLocale.value] || locales['zh-CN'])

function setLocale(code: string) {
  currentLocale.value = code
  showLanguagePicker.value = false
}

// 点击外部关闭选择器
const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.color-picker')) {
    showColorPicker.value = false
  }
  if (!target.closest('.language-switcher')) {
    showLanguagePicker.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

const operationButtons = ref<OperationButton[]>([
  'reset',
  'undo',
  'redo',
  'split',
  'delete',
  // 自定义按钮示例
  { type: 'custom', key: 'import' },
  { type: 'custom', key: 'export' }
])

const scaleConfigButtons = ref<ScaleConfigButton[]>(['snap'])

const trackTypes = ref<TrackTypeConfig>({
  video: { max: 5 },
  audio: { max: 3 },
  subtitle: { max: 2 },
  text: { max: 2 },  // 添加文本轨道类型
  sticker: { max: 2 },
  filter: { max: 1 },
  effect: { max: 2 }
})

// 配置选项
const enableMainTrackMode = ref(true)
const enableCrossTrackDrag = ref(true)
const enableSnap = ref(true)
const defaultScale = ref(1)
// 自定义 clip 组件示例
const CustomVideoClip = {
  props: ['clip'],
  template: `
    <div class="custom-video-clip">
      <div class="custom-video-icon">🎬</div>
      <div class="custom-video-name">{{ clip.name || '视频' }}</div>
      <div class="custom-video-duration">{{ Math.round((clip.endTime - clip.startTime) * 100) / 100 }}s</div>
    </div>
  `
}

// 自定义文本 clip 组件
const CustomTextClip = {
  props: ['clip'],
  template: `
    <div class="custom-text-clip">
      <div class="custom-text-icon">📝</div>
      <div class="custom-text-content">{{ clip.text || '文本内容' }}</div>
    </div>
  `
}

// 自定义 clip 配置示例（只覆盖部分配置）
const clipConfigs = ref({
  video: {
    backgroundColor: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
    borderColor: '#667eea',
    height: 60,
    component: CustomVideoClip, // 使用自定义组件
    selected: {
      borderColor: '#ff6b6b',
      boxShadow: '0 0 0 3px rgba(255, 107, 107, 0.3)'
    }
  },
  audio: {
    backgroundColor: 'linear-gradient(45deg, #f093fb 0%, #f5576c 100%)',
    height: 36,
    selected: {
      borderColor: '#4ecdc4'
    }
  }
})

// VideoTrack 组件引用
const videoTrackRef = ref()

// 自定义操作按钮处理函数
function handleImport() {
  alert('导入功能 - 这里可以实现项目导入逻辑')
}

function handleExport() {
  alert('导出功能 - 这里可以实现项目导出逻辑')
}

// 布局调整
const topHeight = ref(600) // 上部分默认高度减小
const isResizing = ref(false)
const minTopHeight = 200 // 最小高度
const minBottomHeight = 300 // 轨道区域最小高度

// 处理分隔条拖拽
function handleResizerMouseDown(event: MouseEvent) {
  isResizing.value = true
  const startY = event.clientY
  const startHeight = topHeight.value

  function handleMouseMove(e: MouseEvent) {
    const deltaY = e.clientY - startY
    const newHeight = startHeight + deltaY

    // 获取工作区总高度
    const workspaceHeight = window.innerHeight - 60 // 减去工具栏高度和分隔条
    const maxTopHeight = workspaceHeight - minBottomHeight - 6 // 6是分隔条高度

    // 限制高度范围
    if (newHeight >= minTopHeight && newHeight <= maxTopHeight) {
      topHeight.value = newHeight
    }
  }

  function handleMouseUp() {
    isResizing.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  document.body.style.cursor = 'ns-resize'
  document.body.style.userSelect = 'none'
}

// 根据素材类型获取对应的轨道类型
function getTrackTypeForMedia(mediaType: string): string {
  const typeMapping: Record<string, string> = {
    video: 'video',
    audio: 'audio',
    subtitle: 'subtitle',
    text: 'text',  // 文本使用独立的 text 轨道
    sticker: 'sticker',
    filter: 'filter',
    effect: 'effect'
  }
  return typeMapping[mediaType] || mediaType
}

// 根据素材类型获取默认时长
function getDefaultDuration(mediaType: string, mediaData: any): number {
  // 如果素材自带时长信息，优先使用
  if (mediaData.duration && mediaData.duration > 0) {
    return mediaData.duration
  }

  // 默认时长配置
  const defaultDurations: Record<string, number> = {
    video: 5,
    audio: 30,
    subtitle: 3,
    text: 3,
    sticker: 3,
    filter: 3,
    effect: 3,
    transition: 3
  }

  return defaultDurations[mediaType] || 3
}

// 检查轨道在指定时间范围是否有足够空间（不重叠）
function hasSpaceInTrack(track: any, startTime: number, duration: number): boolean {
  const endTime = startTime + duration

  // 检查是否与轨道上任何 clip 重叠
  for (const clip of track.clips) {
    // 转场 clip 不参与重叠检测
    if (clip.type === 'transition') continue

    // 检查是否重叠：新 clip 的开始时间 < 现有 clip 的结束时间 且 新 clip 的结束时间 > 现有 clip 的开始时间
    if (startTime < clip.endTime && endTime > clip.startTime) {
      return false // 有重叠，没有空间
    }
  }

  return true // 没有重叠，有空间
}

// 查找或创建匹配类型且有足够空间的轨道
function findOrCreateTrackWithSpace(
  mediaType: string,
  startTime: number,
  duration: number,
  preferredTrackId?: string
): { track: any, isNew: boolean } {
  const requiredTrackType = getTrackTypeForMedia(mediaType)

  // 1. 如果指定了目标轨道，先检查类型是否匹配且有空间
  if (preferredTrackId) {
    const preferredTrack = tracksStore.tracks.find(t => t.id === preferredTrackId)
    if (preferredTrack && preferredTrack.type === requiredTrackType) {
      if (hasSpaceInTrack(preferredTrack, startTime, duration)) {
        return { track: preferredTrack, isNew: false }
      }
    }
  }

  // 2. 查找同类型的所有轨道，按照排序顺序遍历检查是否有空间
  const sameTypeTracks = tracksStore.sortedTracks.filter(
    t => t.type === requiredTrackType && !t.isMain
  )

  for (const track of sameTypeTracks) {
    if (hasSpaceInTrack(track, startTime, duration)) {
      return { track, isNew: false }
    }
  }

  // 3. 所有同类型轨道都没有空间，创建新轨道
  const trackCount = tracksStore.getTrackCountByType(requiredTrackType as any)
  const trackNames: Record<string, string> = {
    video: '视频',
    audio: '音频',
    subtitle: '字幕',
    text: '文本',  // 添加文本轨道名称
    sticker: '贴纸',
    filter: '滤镜',
    effect: '特效'
  }

  const newTrack = {
    id: generateId('track-'),
    type: requiredTrackType,
    name: `${trackNames[requiredTrackType] || requiredTrackType}${trackCount + 1}`,
    visible: true,
    locked: false,
    clips: [],
    order: tracksStore.tracks.length
  }

  tracksStore.addTrack(newTrack)
  return { track: newTrack, isNew: true }
}

// 处理从资源库拖拽媒体到轨道
async function handleDropMedia(mediaData: any, trackId: string, startTime: number) {
  console.log('Drop media:', mediaData, trackId, startTime)

  try {
    // 转场需要特殊处理，不走常规逻辑
    if (mediaData.type === 'transition') {
      handleDropTransition(mediaData, trackId, startTime)
      return
    }

    // 计算素材的时长
    const duration = getDefaultDuration(mediaData.type, mediaData)

    // 根据素材类型查找或创建匹配的轨道（带空间检测）
    const { track, isNew } = findOrCreateTrackWithSpace(mediaData.type, startTime, duration, trackId)
    if (!track) {
      console.error('Failed to find or create track for type:', mediaData.type)
      return
    }

    if (isNew) {
      console.log('Created new track:', track.name, 'for media type:', mediaData.type)
    }

    // 根据素材类型创建对应的 Clip
    let clip: Partial<Clip> = {
      id: generateId('clip-'),
      trackId: track.id,
      startTime: normalizeTime(startTime),
      selected: false
    }

    if (mediaData.type === 'video') {
      // 获取媒体的真实 URL
      const sourceUrl = mediaData.sourceUrl || mediaData.url || mediaData.id

      clip = {
        ...clip,
        type: 'video',
        name: mediaData.name,
        endTime: normalizeTime(startTime + duration),
        sourceUrl: sourceUrl,
        originalDuration: duration,
        trimStart: 0,
        trimEnd: duration,
        playbackRate: 1,
        // 如果资源库已经提取了缩略图，直接使用
        thumbnails: mediaData.thumbnails || []
      } as Partial<MediaClip>

      // 添加 clip 到轨道
      tracksStore.addClip(track.id, clip as Clip)
      historyStore.pushSnapshot(`添加 ${mediaData.name}`)

      // 如果没有缩略图，异步加载
      if (!mediaData.thumbnails || mediaData.thumbnails.length === 0) {
        loadVideoClipThumbnails(clip.id!, sourceUrl)
      }
      return
    } else if (mediaData.type === 'audio') {
      const sourceUrl = mediaData.sourceUrl || mediaData.url || mediaData.id

      clip = {
        ...clip,
        type: 'audio',
        name: mediaData.name,
        endTime: normalizeTime(startTime + duration),
        sourceUrl: sourceUrl,
        originalDuration: duration,
        trimStart: 0,
        trimEnd: duration,
        playbackRate: 1,
        volume: 1,
        // 如果资源库已经提取了波形数据，直接使用
        waveformData: mediaData.waveformData || []
      } as Partial<MediaClip>

      // 添加 clip 到轨道
      tracksStore.addClip(track.id, clip as Clip)
      historyStore.pushSnapshot(`添加 ${mediaData.name}`)

      // 如果没有波形数据，异步加载
      if (!mediaData.waveformData || mediaData.waveformData.length === 0) {
        loadAudioClipWaveform(clip.id!, sourceUrl)
      }
      return
    } else if (mediaData.type === 'subtitle') {
      clip = {
        ...clip,
        type: 'subtitle',
        name: mediaData.name,
        endTime: normalizeTime(startTime + duration),
        text: '示例字幕文本'
      }
    } else if (mediaData.type === 'text') {
      clip = {
        ...clip,
        type: 'text',
        name: mediaData.name,
        endTime: normalizeTime(startTime + duration),
        text: '自定义文本内容'
      }
    } else if (mediaData.type === 'sticker') {
      clip = {
        ...clip,
        type: 'sticker',
        name: mediaData.name,
        endTime: normalizeTime(startTime + duration),
        sourceUrl: mediaData.id
      }
    } else if (mediaData.type === 'filter' || mediaData.type === 'effect') {
      clip = {
        ...clip,
        type: mediaData.type,
        name: mediaData.name,
        endTime: normalizeTime(startTime + duration),
        effectType: mediaData.id
      }
    }

    tracksStore.addClip(track.id, clip as Clip)
    historyStore.pushSnapshot(`添加 ${mediaData.name}`)
  } catch (error: any) {
    alert(error.message)
  }
}

// 异步加载视频 clip 的缩略图
async function loadVideoClipThumbnails(clipId: string, sourceUrl: string) {
  try {
    const result = await extractVideoThumbnails(sourceUrl, { count: 20, width: 120 })
    // 更新 clip 的缩略图
    const clip = tracksStore.getClip(clipId) as MediaClip
    if (clip && clip.type === 'video') {
      clip.thumbnails = result.thumbnails
      // 如果时长为 0，更新时长
      if (result.duration > 0 && clip.endTime - clip.startTime <= 0) {
        clip.endTime = clip.startTime + result.duration
        clip.originalDuration = result.duration
        clip.trimEnd = result.duration
      }
    }
  } catch (error) {
    console.error('Failed to load video thumbnails:', error)
  }
}

// 异步加载音频 clip 的波形数据
async function loadAudioClipWaveform(clipId: string, sourceUrl: string) {
  try {
    // 根据文件类型选择提取方法
    // 使用更多采样点（500）以获取完整精细的波形数据
    const isVideo = sourceUrl.match(/\.(mp4|webm|mov|avi)$/i)
    const result = isVideo
      ? await extractVideoAudioWaveform(sourceUrl, { samples: 500 })
      : await extractAudioWaveform(sourceUrl, { samples: 500 })

    // 更新 clip 的波形数据
    const clip = tracksStore.getClip(clipId) as MediaClip
    if (clip && clip.type === 'audio') {
      // 存储完整的波形数据（对应整个原始音频）
      clip.waveformData = result.waveformData

      // 更新原始时长
      if (result.duration > 0) {
        clip.originalDuration = result.duration
        // 如果 clip 的 endTime - startTime 小于等于 0 或 trimEnd 未设置，更新
        const clipDuration = clip.endTime - clip.startTime
        if (clipDuration <= 0) {
          clip.endTime = clip.startTime + result.duration
          clip.trimEnd = result.duration
        }
        // 确保 trimEnd 不超过原始时长
        if (clip.trimEnd > result.duration) {
          clip.trimEnd = result.duration
        }
      }
    }
  } catch (error) {
    console.error('Failed to load audio waveform:', error)
  }
}

// 初始化时加载所有音频 clip 的波形数据
async function loadInitialAudioWaveforms() {
  for (const track of tracksStore.tracks) {
    for (const clip of track.clips) {
      if (clip.type === 'audio') {
        const mediaClip = clip as MediaClip
        if (!mediaClip.waveformData || mediaClip.waveformData.length === 0) {
          await loadAudioClipWaveform(mediaClip.id, mediaClip.sourceUrl)
        }
      }
    }
  }
}

// 处理转场拖拽
function handleDropTransition(transitionData: any, trackId: string, dropTime: number) {
  const track = tracksStore.tracks.find(t => t.id === trackId)
  if (!track) return

  // 获取所有非转场的 clips 并按开始时间排序
  const clips = track.clips
    .filter(c => c.type !== 'transition')
    .sort((a, b) => a.startTime - b.startTime)

  if (clips.length === 0) {
    ElMessage.warning('转场需要添加在两个相邻的 Clip 之间')
    return
  }

  // 查找 dropTime 落在哪个 clip 上
  const targetClip = clips.find(c => dropTime >= c.startTime && dropTime <= c.endTime)

  let beforeClip = null
  let afterClip = null

  if (targetClip) {
    // 鼠标在某个 clip 上，判断在前半部分还是后半部分
    const clipMidPoint = (targetClip.startTime + targetClip.endTime) / 2
    const isInFirstHalf = dropTime < clipMidPoint

    if (isInFirstHalf) {
      // 在前半部分，找前面相邻的 clip
      const targetIndex = clips.indexOf(targetClip)
      if (targetIndex > 0) {
        const prevClip = clips[targetIndex - 1]
        // 检查是否相邻（允许 0.1 秒误差）
        if (Math.abs(prevClip.endTime - targetClip.startTime) < 0.1) {
          beforeClip = prevClip
          afterClip = targetClip
        }
      }
    } else {
      // 在后半部分，找后面相邻的 clip
      const targetIndex = clips.indexOf(targetClip)
      if (targetIndex < clips.length - 1) {
        const nextClip = clips[targetIndex + 1]
        // 检查是否相邻（允许 0.1 秒误差）
        if (Math.abs(targetClip.endTime - nextClip.startTime) < 0.1) {
          beforeClip = targetClip
          afterClip = nextClip
        }
      }
    }
  } else {
    // 鼠标不在任何 clip 上，尝试找 dropTime 附近的相邻 clips（兼容原有逻辑）
    for (let i = 0; i < clips.length - 1; i++) {
      if (clips[i].endTime <= dropTime && clips[i + 1].startTime >= dropTime) {
        // 检查是否相邻
        if (Math.abs(clips[i].endTime - clips[i + 1].startTime) < 0.1) {
          beforeClip = clips[i]
          afterClip = clips[i + 1]
          break
        }
      }
    }
  }

  if (!beforeClip || !afterClip) {
    ElMessage.warning('转场需要添加在两个相邻的 Clip 之间')
    return
  }

  addTransitionBetweenClips(beforeClip.id, afterClip.id, transitionData.subType)
}

// 添加转场（通过点击相接位置）
function handleAddTransitionFromClick(beforeClipId: string, afterClipId: string) {
  // 默认使用淡入淡出效果
  addTransitionBetweenClips(beforeClipId, afterClipId, 'fade')
}

// 通用的添加转场方法
function addTransitionBetweenClips(beforeClipId: string, afterClipId: string, transitionType: string = 'fade') {
  const beforeClip = tracksStore.getClip(beforeClipId)
  const afterClip = tracksStore.getClip(afterClipId)

  if (!beforeClip || !afterClip) {
    console.error('未找到clip')
    return
  }

  // 检查是否已经有转场
  const track = tracksStore.tracks.find(t => t.id === beforeClip.trackId)
  if (!track) return

  const hasExistingTransition = track.clips.some(c =>
    c.type === 'transition' &&
    c.startTime < beforeClip.endTime &&
    c.endTime > beforeClip.endTime
  )

  if (hasExistingTransition) {
    ElMessage.warning('该位置已存在转场')
    return
  }

  // 创建转场 clip
  const transitionDuration = 1 // 默认 1 秒
  const transitionNames: Record<string, string> = {
    fade: '淡入淡出',
    slide: '滑动',
    wipe: '擦除',
    dissolve: '溶解',
    zoom: '缩放',
    rotate: '旋转'
  }

  const transitionClip: TransitionClip = {
    id: generateId('clip-'),
    trackId: beforeClip.trackId,
    type: 'transition',
    startTime: normalizeTime(beforeClip.endTime - transitionDuration / 2),
    endTime: normalizeTime(afterClip.startTime + transitionDuration / 2),
    selected: false,
    transitionType,
    transitionDuration: normalizeTime(transitionDuration),
    name: transitionNames[transitionType] || transitionType
  }

  // 添加到轨道
  tracksStore.addClip(beforeClip.trackId, transitionClip)
  historyStore.pushSnapshot('添加转场')

  // 清空选择
  tracksStore.clearSelection()

  // 发射转场添加成功事件
  handleTransitionAdded(transitionClip, beforeClip, afterClip)
}

// 处理转场添加成功事件 - 内部调用，触发 VideoTrack 的事件
function handleTransitionAdded(transitionClip: TransitionClip, beforeClip: Clip, afterClip: Clip) {
  // 通过 VideoTrack 组件 emit transitionAdded 事件
  if (videoTrackRef.value) {
    videoTrackRef.value.emitTransitionAdded(transitionClip, beforeClip.id, afterClip.id)
  }
}

// 响应转场添加成功事件 - 外部处理，用户可以在这里实现自己的逻辑
function onTransitionAdded(transitionClip: any, beforeClipId: string, afterClipId: string) {
  console.log('转场添加成功:', transitionClip.name)
  console.log('位置: 在 clip', beforeClipId, '和', afterClipId, '之间')

  // 显示成功消息
  ElMessage.success(`已添加转场: ${transitionClip.name}`)

  // 这里可以实现用户自定义的逻辑，例如：
  // - 自动播放转场区域预览
  // - 跳转到转场位置
  // - 选中转场 clip
  // 示例：自动跳转到转场开始位置
  playbackStore.seekTo(transitionClip.startTime)
}

// ============ Clip 事件处理 ============
function onClipCut(clipIds: string[]) {
  console.log('[Event] clipCut - 剪切 clips:', clipIds)
}

function onClipCopy(clipIds: string[]) {
  console.log('[Event] clipCopy - 复制 clips:', clipIds)
}

function onClipDelete(clipId: string) {
  console.log('[Event] clipDelete - 删除 clip:', clipId)
}

function onClipMove(clipId: string, trackId: string, startTime: number) {
  console.log('[Event] clipMove - 移动 clip:', clipId, '到轨道:', trackId, '时间:', startTime)
}

function onClipSelect(clipIds: string[]) {
  console.log('[Event] clipSelect - 选中 clips:', clipIds)
}

function onClipPaste(clips: any[], trackId: string, time: number) {
  console.log('[Event] clipPaste - 粘贴 clips:', clips, '到轨道:', trackId, '时间:', time)
}

function onClipSplit(originalClipId: string, leftClip: any, rightClip: any, splitTime: number) {
  console.log('[Event] clipSplit - 分割 clip:', originalClipId, '在时间:', splitTime)
  console.log('  左侧 clip:', leftClip?.id, '右侧 clip:', rightClip?.id)
}

function onClipAdded(clip: any, trackId: string) {
  console.log('[Event] clip:added - 添加 clip:', clip.id, '到轨道:', trackId)
}

function onClipUpdated(clipId: string, changes: any, oldValues: any) {
  console.log('[Event] clip:updated - 更新 clip:', clipId)
  console.log('  变更:', changes)
  console.log('  旧值:', oldValues)
}

function onClipRemoved(clip: any, trackId: string) {
  console.log('[Event] clip:removed - 移除 clip:', clip.id, '从轨道:', trackId)
}

function onClipResizeStart(clip: any, edge: 'left' | 'right') {
  console.log('[Event] clip:resize-start - 开始调整大小:', clip.id, '边缘:', edge)
}

function onClipResizeEnd(clip: any, oldStartTime: number, oldEndTime: number) {
  console.log('[Event] clip:resize-end - 结束调整大小:', clip.id)
  console.log('  旧时间: [', oldStartTime, '-', oldEndTime, ']')
  console.log('  新时间: [', clip.startTime, '-', clip.endTime, ']')
}

function onClipDragStart(clip: any) {
  console.log('[Event] clip:drag-start - 开始拖拽:', clip.id)
}

function onClipDragEnd(clip: any, fromTrackId: string, toTrackId: string) {
  console.log('[Event] clip:drag-end - 结束拖拽:', clip.id)
  console.log('  从轨道:', fromTrackId, '到轨道:', toTrackId)
}

// ============ Track 事件处理 ============
function onTrackCreate(trackId: string) {
  console.log('[Event] trackCreate - 创建轨道:', trackId)
}

function onTrackDelete(trackId: string) {
  console.log('[Event] trackDelete - 删除轨道:', trackId)
}

function onTrackAdded(track: any) {
  console.log('[Event] track:added - 添加轨道:', track.id, track.name)
}

function onTrackRemoved(track: any) {
  console.log('[Event] track:removed - 移除轨道:', track.id, track.name)
}

function onTrackUpdated(trackId: string, changes: any) {
  console.log('[Event] track:updated - 更新轨道:', trackId, '变更:', changes)
}

// ============ 选择事件处理 ============
function onSelectionChanged(selectedClipIds: string[], previousIds: string[]) {
  console.log('[Event] selection:changed - 选择变化')
  console.log('  当前选中:', selectedClipIds)
  console.log('  之前选中:', previousIds)
}

// ============ 播放事件处理 ============
function onPlaybackPlay() {
  console.log('[Event] playback:play - 开始播放')
}

function onPlaybackPause() {
  console.log('[Event] playback:pause - 暂停播放')
}

function onPlaybackSeek(time: number) {
  console.log('[Event] playback:seek - 跳转到:', time)
}

function onPlaybackTimeUpdate(time: number) {
  // 这个事件可能会频繁触发，可以选择性地打印
  // console.log('[Event] playback:timeupdate - 当前时间:', time)
}

function onPlaybackRateChange(rate: number) {
  console.log('[Event] playback:ratechange - 播放速率变化:', rate)
}

// ============ 缩放事件处理 ============
function onScaleChanged(scale: number) {
  console.log('[Event] scale:changed - 缩放变化:', scale)
}

// ============ 历史记录事件处理 ============
function onHistoryChanged(state: { canUndo: boolean, canRedo: boolean }) {
  console.log('[Event] history:changed - 历史状态变化:', state)
}

// ============ 右键菜单事件处理 ============
function onTrackContextMenuSelect(key: string, track: any, time: number) {
  console.log('[Event] trackContextMenuSelect - 轨道右键菜单选择:', key)
  console.log('  轨道:', track.id, '时间:', time)
}

function onClipContextMenuSelect(key: string, clip: any) {
  console.log('[Event] clipContextMenuSelect - Clip 右键菜单选择:', key)
  console.log('  Clip:', clip.id)
}

// ============ 数据变化事件处理 ============
function onDataChanged() {
  console.log('[Event] data:changed - 数据发生变化')
}

// 初始化模拟数据
async function initializeTracks() {
  // 清空现有轨道
  tracksStore.reset()

  // 根据主轨道模式生成数据
  const mockTracks = createMockTracks(enableMainTrackMode.value)
  mockTracks.forEach((track) => {
    tracksStore.addTrack(track)
  })

  // 设置总时长
  const maxDuration = enableMainTrackMode.value ? 30 : 30
  playbackStore.setDuration(maxDuration)

  // 重置播放时间
  playbackStore.seekTo(0)

  // 初始化历史记录
  historyStore.initialize()

  // 加载初始音频 clip 的波形数据
  loadInitialAudioWaveforms()
}

// 监听主轨道模式变化
watch(enableMainTrackMode, () => {
  initializeTracks()
})

onMounted(() => {
  initializeTracks()
})
</script>

<style scoped>
.app {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-dark);
  color: var(--color-text-primary);
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  transition: background-color var(--transition-base);
}

/* 顶部工具栏 - 参考剪映样式 */
.app__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  background: var(--color-bg-elevated);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  gap: 12px;
  height: 48px;
  /* 减小高度 */
  box-shadow: var(--shadow-sm);
  z-index: 10;
}

.toolbar__left,
.toolbar__center,
.toolbar__right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar__left {
  min-width: 200px;
}

.toolbar__center {
  flex: 1;
  justify-content: center;
}

.toolbar__right {
  min-width: 200px;
  justify-content: flex-end;
}

.toolbar__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  letter-spacing: -0.01em;
}

.toolbar__config {
  display: flex;
  gap: 16px;
  align-items: center;
}

.config-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.config-item__label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
  transition: opacity var(--transition-fast);
}

.config-item__label:hover {
  opacity: 0.85;
}

.config-item__text {
  font-size: 12px;
  font-weight: 400;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

/* 美化 checkbox - 参考剪映风格 */
.config-item__checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border: 1.5px solid var(--color-border-strong);
  border-radius: 3px;
  background: transparent;
  cursor: pointer;
  position: relative;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.config-item__checkbox:hover {
  border-color: var(--color-primary);
  background: var(--color-bg-lighter);
}

.config-item__checkbox:checked {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.config-item__checkbox:checked::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

/* 工具栏按钮 */
.toolbar__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.toolbar__btn:hover {
  background: var(--color-bg-light);
  color: var(--color-text-primary);
}

.toolbar__btn:active {
  transform: scale(0.95);
}

/* 颜色选择器 */
.color-picker {
  position: relative;
}

.color-picker__btn {
  position: relative;
}

.color-picker__btn::after {
  content: '';
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 16px;
  height: 3px;
  background: var(--color-primary);
  border-radius: 2px;
}

.color-picker__panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  padding: 12px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  min-width: 240px;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.color-picker__title {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border);
}

.color-picker__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.color-picker__item {
  width: 48px;
  height: 48px;
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.color-picker__item:hover {
  transform: scale(1.1);
  box-shadow: var(--shadow-md);
}

.color-picker__item.active {
  border-color: white;
  box-shadow: var(--shadow-lg);
}

.color-picker__item:active {
  transform: scale(0.95);
}

/* 语言选择器 */
.language-switcher {
  position: relative;
}

.language-picker__panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  padding: 8px 0;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  min-width: 180px;
  animation: slideDown 0.2s ease-out;
}

.language-picker__title {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  padding: 4px 12px 8px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 4px;
}

.language-picker__list {
  display: flex;
  flex-direction: column;
}

.language-picker__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--color-text-primary);
  font-size: 14px;
  text-align: left;
  width: 100%;
}

.language-picker__item:hover {
  background: var(--color-bg-hover);
}

.language-picker__item.active {
  background: hsla(var(--color-primary-hue), var(--color-primary-saturation), var(--color-primary-lightness), 0.1);
  color: var(--color-primary);
}

.language-picker__flag {
  font-size: 18px;
  line-height: 1;
}

.language-picker__name {
  flex: 1;
}

.language-picker__check {
  color: var(--color-primary);
}

/* 工作区 */
.app__workspace {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

/* 上部分：左中右三栏 */
.workspace__top {
  flex-shrink: 0;
  display: flex;
  transition: height 0s;
  background: var(--color-bg-dark);
}

.workspace__panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-bg-medium);
  transition: background-color var(--transition-base);
}

.workspace__panel--left {
  width: 280px;
  flex-shrink: 0;
  border-right: 1px solid var(--color-border);
}

.workspace__panel--center {
  flex: 1;
  min-width: 0;
}

.workspace__panel--right {
  width: 280px;
  flex-shrink: 0;
  border-left: 1px solid var(--color-border);
}

/* 可拖拽的分隔条 - 参考剪映样式 */
.workspace__resizer {
  height: 6px;
  flex-shrink: 0;
  background: var(--color-bg-medium);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  cursor: ns-resize;
  position: relative;
  transition: background var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.workspace__resizer:hover {
  background: var(--color-bg-light);
}

.workspace__resizer--dragging {
  background: var(--color-primary);
  opacity: 0.6;
}

.workspace__resizer-line {
  width: 48px;
  height: 2px;
  background: var(--color-border-light);
  border-radius: 2px;
  pointer-events: none;
  transition: all var(--transition-fast);
}

.workspace__resizer:hover .workspace__resizer-line {
  background: var(--color-primary);
  width: 64px;
}

.workspace__resizer--dragging .workspace__resizer-line {
  background: rgba(255, 255, 255, 0.9);
  width: 80px;
}

/* 下部分：轨道区域（占据整个宽度） */
.workspace__bottom {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--color-bg-medium);
  transition: background-color var(--transition-base);
}

/* 自定义 clip 组件样式 */
.custom-video-clip {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.custom-video-icon {
  font-size: 20px;
  margin-bottom: 4px;
}

.custom-video-name {
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.custom-video-duration {
  font-size: 10px;
  opacity: 0.8;
  margin-top: 2px;
}
</style>
