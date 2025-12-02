<template>
  <div class="video-preview">
    <div class="video-preview__header">
      <div class="video-preview__tabs">
        <button :class="['tab-btn', { 'tab-btn--active': activeTab === 'player' }]" @click="activeTab = 'player'">
          🎬 播放器
        </button>
        <button :class="['tab-btn', { 'tab-btn--active': activeTab === 'debug' }]" @click="activeTab = 'debug'">
          🔧 调试面板
        </button>
      </div>
      <div v-if="activeTab === 'player'" class="video-preview__info">
        <span class="info-item">{{ formatTime(currentTimeInSeconds) }}</span>
        <span class="info-separator">/</span>
        <span class="info-item">{{ formatTime(durationInSeconds) }}</span>
      </div>
    </div>

    <!-- 播放器内容 -->
    <div v-show="activeTab === 'player'" class="video-preview__content">
      <!-- AVCanvas 视频预览区域 -->
      <div ref="canvasContainer" class="preview-screen">
        <div v-if="!hasSprites" class="preview-screen__placeholder">
          <div class="placeholder-icon">🎬</div>
          <div class="placeholder-text">视频预览区域</div>
          <div class="placeholder-time">{{ formatTime(currentTimeInSeconds) }}</div>
        </div>

        <!-- 播放指示器 -->
        <div v-if="isPlaying && !hasSprites" class="preview-screen__playing">
          <div class="playing-indicator">▶</div>
        </div>
      </div>

      <!-- 播放进度条 -->
      <div class="preview-progress">
        <input type="range" min="0" :max="durationInSeconds" :value="currentTimeInSeconds" step="0.01"
          class="progress-slider" @input="handleSeek" />
      </div>
    </div>

    <!-- 调试面板内容 -->
    <div v-show="activeTab === 'debug'" class="video-preview__debug">
      <DebugPanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, provide, reactive } from 'vue'
import { AVCanvas } from '@webav/av-canvas'
import { MP4Clip, AudioClip, ImgClip, VisibleSprite, renderTxt2ImgBitmap } from '@webav/av-cliper'
import { usePlaybackStore, useTracksStore } from 'vue-clip-track'
import type { Clip, MediaClip, SubtitleClip, TextClip, FilterClip, EffectClip, Track } from 'vue-clip-track'
import DebugPanel from '../DebugPanel/index.vue'

// 滤镜类型定义
interface FilterConfig {
  type: string
  value: number | Record<string, number>
}

// 特效类型定义
interface EffectConfig {
  type: string
  duration: number
  startTime: number  // clip 内的相对开始时间（秒）
  endTime: number    // clip 内的相对结束时间（秒）
}

// 当前时间应用的滤镜列表（用于 tickInterceptor）
interface ActiveFilter {
  clipId: string
  trackId: string
  filterType: string
  filterValue: number | Record<string, number>
}

// 当前时间应用的特效列表
interface ActiveEffect {
  clipId: string
  trackId: string
  effectType: string
  progress: number  // 特效进度 0-1
}

// 定义事件
const emit = defineEmits<{
  (e: 'play'): void
  (e: 'pause'): void
}>()

// AVCanvas 调试数据类型
export interface AVCanvasDebugData {
  initialized: boolean
  canvasWidth: number
  canvasHeight: number
  isPlaying: boolean
  currentTime: number // 微秒
  duration: number // 微秒
  playbackSpeed: number
  spriteCount: number
  sprites: Array<{
    clipId: string
    type: string
    offset: number
    duration: number
    visible: boolean
    opacity: number
    rect: { x: number; y: number; w: number; h: number; angle: number }
    zIndex: number
  }>
}

// 扩展 Clip 类型，包含新增的空间属性
type ExtendedClipProps = {
  rect?: {
    x: number
    y: number
    w: number
    h: number
    angle: number
    fixedAspectRatio?: boolean
    fixedScaleCenter?: boolean
  }
  visible?: boolean
  opacity?: number
  flip?: 'horizontal' | 'vertical' | null
  zIndex?: number
}

type ExtendedClip = Clip & ExtendedClipProps

const playbackStore = usePlaybackStore()
const tracksStore = useTracksStore()
const playbackSpeed = ref(1)
const activeTab = ref<'player' | 'debug'>('player')

// AVCanvas 相关
const canvasContainer = ref<HTMLElement | null>(null)
let avCanvas: AVCanvas | null = null
const hasSprites = ref(false)
const isPlaying = ref(false)
const currentTime = ref(0) // 微秒
const duration = ref(playbackStore.duration * 1e6) // 转换为微秒

// 防止循环更新的标志
let isUpdatingFromCanvas = false
let isUpdatingFromStore = false

// 防止并发同步的标志
let isSyncing = false
let pendingSync = false

// Canvas 尺寸常量
const CANVAS_WIDTH = 1920
const CANVAS_HEIGHT = 1080

// 存储 clip ID 与 sprite 的映射关系
const clipSpriteMap = new Map<string, VisibleSprite>()
// 存储 sprite 事件取消监听函数
const spriteListenerMap = new Map<string, () => void>()
// 存储 clip 的关键属性快照（用于检测需要重建 sprite 的变化）
const clipSnapshotMap = new Map<string, {
  trimStart: number
  trimEnd: number
  playbackRate: number
  sourceUrl: string
  text?: string
  volume: number
}>()

// 存储 clip 所属轨道的信息（用于计算 zIndex）
const clipTrackMap = new Map<string, { trackId: string; trackOrder: number }>()

// 当前激活的滤镜列表
const activeFilters = ref<ActiveFilter[]>([])
// 当前激活的特效列表
const activeEffects = ref<ActiveEffect[]>([])

// AVCanvas 调试数据
const avCanvasDebugData = reactive<AVCanvasDebugData>({
  initialized: false,
  canvasWidth: CANVAS_WIDTH,
  canvasHeight: CANVAS_HEIGHT,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playbackSpeed: 1,
  spriteCount: 0,
  sprites: []
})

// 提供调试数据给子组件
provide('avCanvasDebugData', avCanvasDebugData)

// 更新调试数据中的 sprites 信息
function updateDebugSprites() {
  const sprites: AVCanvasDebugData['sprites'] = []
  for (const [clipId, sprite] of clipSpriteMap) {
    const clip = findClipById(clipId)
    sprites.push({
      clipId,
      type: clip?.type || 'unknown',
      offset: sprite.time.offset,
      duration: sprite.time.duration,
      visible: sprite.visible,
      opacity: sprite.opacity,
      rect: {
        x: sprite.rect.x,
        y: sprite.rect.y,
        w: sprite.rect.w,
        h: sprite.rect.h,
        angle: sprite.rect.angle
      },
      zIndex: sprite.zIndex
    })
  }
  avCanvasDebugData.sprites = sprites
  avCanvasDebugData.spriteCount = sprites.length
}

// 计算所有 sprites 的最大结束时间（用于获取实际可播放时长）
function getMaxSpriteDuration(): number {
  let maxEndTime = 0
  for (const sprite of clipSpriteMap.values()) {
    const endTime = sprite.time.offset + sprite.time.duration
    if (endTime > maxEndTime) {
      maxEndTime = endTime
    }
  }
  return maxEndTime
}

// 获取有效的播放时长（优先使用 sprites 计算，否则使用 playbackStore）
function getEffectiveDuration(): number {
  const spriteDuration = getMaxSpriteDuration()
  const storeDuration = playbackStore.duration * 1e6
  // 使用两者中的较大值，确保有有效时长
  return Math.max(spriteDuration, storeDuration, 0)
}

// 计算属性：将微秒转换为秒
const currentTimeInSeconds = computed(() => currentTime.value / 1e6)
const durationInSeconds = computed(() => duration.value / 1e6)

// 根据 clipId 查找 clip（提前定义，供后续函数使用）
function findClipById(clipId: string): Clip | null {
  for (const track of tracksStore.tracks) {
    for (const clip of track.clips) {
      if (clip.id === clipId) {
        return clip
      }
    }
  }
  return null
}

// ============ 轨道 zIndex 计算 ============
// 根据轨道顺序计算 zIndex，轨道 order 越小（越靠上），zIndex 越大（显示在上层）
function calculateZIndexFromTrackOrder(trackOrder: number): number {
  const maxTracks = 100 // 假设最多 100 个轨道
  return (maxTracks - trackOrder) * 10 // 每个轨道之间留 10 的间隔
}

// 获取 clip 所属轨道的 order
function getTrackOrderForClip(clipId: string): number {
  const trackInfo = clipTrackMap.get(clipId)
  if (trackInfo) {
    return trackInfo.trackOrder
  }
  // 如果没有记录，尝试查找
  const clip = findClipById(clipId)
  if (clip) {
    const track = tracksStore.tracks.find(t => t.id === clip.trackId)
    if (track) {
      return track.order
    }
  }
  return 0
}

// ============ 滤镜处理 ============
// 获取当前时间点激活的滤镜
function getActiveFiltersAtTime(timeInSeconds: number): ActiveFilter[] {
  const filters: ActiveFilter[] = []

  for (const track of tracksStore.tracks) {
    if (track.visible === false) continue
    if (track.type !== 'filter') continue

    for (const clip of track.clips) {
      const filterClip = clip as FilterClip
      if (filterClip.type === 'filter' &&
        timeInSeconds >= filterClip.startTime &&
        timeInSeconds <= filterClip.endTime) {
        filters.push({
          clipId: filterClip.id,
          trackId: filterClip.trackId,
          filterType: filterClip.filterType,
          filterValue: filterClip.filterValue
        })
      }
    }
  }

  return filters
}

// 获取当前时间点激活的特效
function getActiveEffectsAtTime(timeInSeconds: number): ActiveEffect[] {
  const effects: ActiveEffect[] = []

  for (const track of tracksStore.tracks) {
    if (track.visible === false) continue
    if (track.type !== 'effect') continue

    for (const clip of track.clips) {
      const effectClip = clip as EffectClip
      if (effectClip.type === 'effect' &&
        timeInSeconds >= effectClip.startTime &&
        timeInSeconds <= effectClip.endTime) {
        // 计算特效进度
        const effectTotalDuration = effectClip.endTime - effectClip.startTime
        const elapsedTime = timeInSeconds - effectClip.startTime
        const progress = Math.min(elapsedTime / effectTotalDuration, 1)

        effects.push({
          clipId: effectClip.id,
          trackId: effectClip.trackId,
          effectType: effectClip.effectType,
          progress
        })
      }
    }
  }

  return effects
}

// 将 CSS 滤镜字符串转换为 CanvasRenderingContext2D 兼容的 filter
function buildCSSFilter(filters: ActiveFilter[]): string {
  const filterParts: string[] = []

  for (const filter of filters) {
    // 正确提取滤镜值
    let value: number
    if (typeof filter.filterValue === 'number') {
      value = filter.filterValue
    } else if (typeof filter.filterValue === 'object' && filter.filterValue !== null) {
      // 对象类型的值，尝试获取 value 属性或第一个数值属性
      value = (filter.filterValue as Record<string, number>).value ??
        Object.values(filter.filterValue).find(v => typeof v === 'number') ?? 0
    } else {
      value = 0
    }

    switch (filter.filterType) {
      case 'blur':
        // blur 的值是像素
        filterParts.push(`blur(${value}px)`)
        break
      case 'brightness':
        // brightness: 0 = 全黑, 1 = 正常, >1 = 更亮
        // 确保值在合理范围内
        filterParts.push(`brightness(${Math.max(0, value)})`)
        break
      case 'contrast':
        // contrast: 0 = 无对比度, 1 = 正常, >1 = 更高对比度
        filterParts.push(`contrast(${Math.max(0, value)})`)
        break
      case 'saturate':
      case 'saturation':
        // saturate: 0 = 灰度, 1 = 正常, >1 = 更饱和
        filterParts.push(`saturate(${Math.max(0, value)})`)
        break
      case 'grayscale':
        // grayscale: 0 = 正常, 1 = 完全灰度
        filterParts.push(`grayscale(${Math.min(Math.max(0, value), 1)})`)
        break
      case 'sepia':
        // sepia: 0 = 正常, 1 = 完全复古
        filterParts.push(`sepia(${Math.min(Math.max(0, value), 1)})`)
        break
      case 'invert':
        // invert: 0 = 正常, 1 = 完全反转
        filterParts.push(`invert(${Math.min(Math.max(0, value), 1)})`)
        break
      case 'hue-rotate':
        // hue-rotate: 角度值
        filterParts.push(`hue-rotate(${value}deg)`)
        break
      case 'opacity':
        // opacity: 0 = 透明, 1 = 不透明
        filterParts.push(`opacity(${Math.min(Math.max(0, value), 1)})`)
        break
      case 'drop-shadow':
        // drop-shadow 需要更复杂的参数
        if (typeof filter.filterValue === 'object' && filter.filterValue !== null) {
          const fv = filter.filterValue as Record<string, any>
          const offsetX = fv.offsetX ?? 4
          const offsetY = fv.offsetY ?? 4
          const blurRadius = fv.blurRadius ?? 2
          const color = fv.color ?? 'black'
          filterParts.push(`drop-shadow(${offsetX}px ${offsetY}px ${blurRadius}px ${color})`)
        }
        break
      default:
        console.warn(`Unknown filter type: ${filter.filterType}`)
    }
  }

  return filterParts.join(' ')
}

// 应用特效到帧数据
function applyEffectsToFrame(
  effects: ActiveEffect[],
  frame: VideoFrame | ImageBitmap,
  time: number
): { opacity: number; transform: string } {
  let opacity = 1
  let transform = ''

  for (const effect of effects) {
    switch (effect.effectType) {
      case 'fadeIn':
        // 淡入：透明度从 0 到 1
        opacity *= effect.progress
        break
      case 'fadeOut':
        // 淡出：透明度从 1 到 0
        opacity *= (1 - effect.progress)
        break
      case 'flash':
        // 闪烁效果：使用正弦波
        const flashFrequency = 4 // 每秒闪烁 4 次
        opacity *= 0.5 + 0.5 * Math.sin(effect.progress * Math.PI * 2 * flashFrequency)
        break
      case 'pulse':
        // 脉冲效果：放大缩小
        const pulseScale = 1 + 0.1 * Math.sin(effect.progress * Math.PI * 4)
        transform += ` scale(${pulseScale})`
        break
      case 'shake':
        // 抖动效果
        const shakeIntensity = 10 // 像素
        const shakeX = Math.sin(effect.progress * Math.PI * 20) * shakeIntensity * (1 - effect.progress)
        const shakeY = Math.cos(effect.progress * Math.PI * 20) * shakeIntensity * (1 - effect.progress)
        transform += ` translate(${shakeX}px, ${shakeY}px)`
        break
      case 'zoomIn':
        // 放大进入
        const zoomInScale = 0.5 + 0.5 * effect.progress
        opacity *= effect.progress
        transform += ` scale(${zoomInScale})`
        break
      case 'zoomOut':
        // 缩小退出
        const zoomOutScale = 1 + 0.5 * effect.progress
        opacity *= (1 - effect.progress)
        transform += ` scale(${zoomOutScale})`
        break
      case 'slideInLeft':
        const slideLeftX = -100 * (1 - effect.progress)
        transform += ` translateX(${slideLeftX}%)`
        break
      case 'slideInRight':
        const slideRightX = 100 * (1 - effect.progress)
        transform += ` translateX(${slideRightX}%)`
        break
      case 'rotateIn':
        const rotateAngle = 360 * (1 - effect.progress)
        opacity *= effect.progress
        transform += ` rotate(${rotateAngle}deg)`
        break
      case 'blur-in':
        // 模糊进入（从模糊到清晰）
        // 这需要通过滤镜实现，这里只返回透明度
        opacity *= effect.progress
        break
      case 'blur-out':
        opacity *= (1 - effect.progress)
        break
      default:
        console.warn(`Unknown effect type: ${effect.effectType}`)
    }
  }

  return { opacity: Math.max(0, Math.min(1, opacity)), transform }
}

// 创建带滤镜的 tickInterceptor
// 注意：time 参数是 clip 内部的相对时间（微秒），需要转换为全局时间轴时间
function createFilteredTickInterceptor(
  originalClip: Clip
): ((time: number, tickRet: any) => Promise<any>) | undefined {
  // 如果不是视频或贴纸，不需要滤镜
  if (originalClip.type !== 'video' && originalClip.type !== 'sticker') {
    return undefined
  }

  // 获取播放倍速（用于时间转换）
  const mediaClip = originalClip as MediaClip
  const playbackRate = mediaClip.playbackRate || 1

  // 缓存 canvas 和 context，避免每帧创建
  let cachedCanvas: OffscreenCanvas | null = null
  let cachedCtx: OffscreenCanvasRenderingContext2D | null = null
  let cachedWidth = 0
  let cachedHeight = 0

  return async (time: number, tickRet: any) => {
    if (!tickRet.video) return tickRet

    // 计算全局时间轴时间
    // time 是 clip 内部的相对时间（微秒），这是视频素材内部的时间
    // 当有倍速时，视频内部时间流逝更快（playbackRate > 1）或更慢（playbackRate < 1）
    // 在时间轴上，clip 的持续时间 = 视频实际时长 / playbackRate
    // 因此：时间轴上经过的时间 = (内部时间 / playbackRate)
    // 全局时间 = clip.startTime + (内部时间 / playbackRate)
    const elapsedTimeOnTimeline = (time / 1e6) / playbackRate
    const globalTimeInSeconds = originalClip.startTime + elapsedTimeOnTimeline

    // 获取当前激活的滤镜和特效
    const filters = getActiveFiltersAtTime(globalTimeInSeconds)
    const effects = getActiveEffectsAtTime(globalTimeInSeconds)

    // 如果没有滤镜和特效，直接返回
    if (filters.length === 0 && effects.length === 0) {
      return tickRet
    }

    try {
      const frame = tickRet.video as VideoFrame | ImageBitmap
      const width = 'displayWidth' in frame ? frame.displayWidth : frame.width
      const height = 'displayHeight' in frame ? frame.displayHeight : frame.height

      // 复用或创建 canvas（性能优化）
      if (!cachedCanvas || cachedWidth !== width || cachedHeight !== height) {
        cachedCanvas = new OffscreenCanvas(width, height)
        cachedCtx = cachedCanvas.getContext('2d')
        cachedWidth = width
        cachedHeight = height
      }

      const ctx = cachedCtx
      if (!ctx) return tickRet

      // 清除之前的内容
      ctx.clearRect(0, 0, width, height)

      // 重置变换和滤镜
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.filter = 'none'
      ctx.globalAlpha = 1

      // 应用 CSS 滤镜
      if (filters.length > 0) {
        ctx.filter = buildCSSFilter(filters)
      }

      // 应用特效（透明度部分）
      const effectResult = applyEffectsToFrame(effects, frame, time)
      ctx.globalAlpha = effectResult.opacity

      // 绘制帧
      ctx.drawImage(frame, 0, 0)

      // 如果原始帧是 VideoFrame，需要关闭它以释放内存
      if ('close' in frame && typeof frame.close === 'function') {
        frame.close()
      }

      // 创建新的 ImageBitmap
      const newFrame = await createImageBitmap(cachedCanvas)

      return {
        ...tickRet,
        video: newFrame
      }
    } catch (error) {
      console.warn('Failed to apply filters/effects:', error)
      return tickRet
    }
  }
}

// 计算 sprite 在 canvas 中的位置和尺寸（保持宽高比居中显示）
function calculateSpriteRect(mediaWidth: number, mediaHeight: number) {
  const mediaAspect = mediaWidth / mediaHeight
  const canvasAspect = CANVAS_WIDTH / CANVAS_HEIGHT

  let w: number, h: number, x: number, y: number

  if (mediaAspect > canvasAspect) {
    // 媒体更宽，以宽度为基准
    w = CANVAS_WIDTH
    h = CANVAS_WIDTH / mediaAspect
    x = 0
    y = (CANVAS_HEIGHT - h) / 2
  } else {
    // 媒体更高，以高度为基准
    h = CANVAS_HEIGHT
    w = CANVAS_HEIGHT * mediaAspect
    x = (CANVAS_WIDTH - w) / 2
    y = 0
  }

  return { x, y, w, h }
}

// 获取 clip 的关键属性快照（用于检测是否需要重建 sprite）
function getClipSnapshot(clip: Clip) {
  const mediaClip = clip as MediaClip
  const textClip = clip as SubtitleClip | TextClip
  return {
    trimStart: mediaClip.trimStart || 0,
    trimEnd: mediaClip.trimEnd || 0,
    playbackRate: mediaClip.playbackRate || 1,
    sourceUrl: mediaClip.sourceUrl || '',
    text: textClip.text || '',
    volume: (mediaClip as any).volume ?? 1  // 音量变化需要重建 sprite
  }
}

// 检查 clip 的关键属性是否发生变化（需要重建 sprite）
function needsRebuildSprite(clip: Clip): boolean {
  const oldSnapshot = clipSnapshotMap.get(clip.id)
  if (!oldSnapshot) return true // 没有快照，需要创建

  const newSnapshot = getClipSnapshot(clip)

  // 比较关键属性
  return (
    oldSnapshot.trimStart !== newSnapshot.trimStart ||
    oldSnapshot.trimEnd !== newSnapshot.trimEnd ||
    oldSnapshot.playbackRate !== newSnapshot.playbackRate ||
    oldSnapshot.sourceUrl !== newSnapshot.sourceUrl ||
    oldSnapshot.text !== newSnapshot.text ||
    oldSnapshot.volume !== newSnapshot.volume  // 音量变化需要重建
  )
}

// 同步 sprite 属性到 clip
function syncSpriteToClip(clipId: string, sprite: VisibleSprite) {
  const clip = findClipById(clipId)
  if (!clip) return

  // 防止循环更新
  isUpdatingFromCanvas = true

  // 更新 clip 的 rect 属性
  tracksStore.updateClip(clipId, {
    rect: {
      x: sprite.rect.x,
      y: sprite.rect.y,
      w: sprite.rect.w,
      h: sprite.rect.h,
      angle: sprite.rect.angle,
      fixedAspectRatio: sprite.rect.fixedAspectRatio,
      fixedScaleCenter: sprite.rect.fixedScaleCenter,
    },
    opacity: sprite.opacity,
    visible: sprite.visible,
    flip: sprite.flip,
    zIndex: sprite.zIndex,
  })

  console.log(`[Sync] Sprite -> Clip ${clipId}:`, {
    rect: { x: sprite.rect.x, y: sprite.rect.y, w: sprite.rect.w, h: sprite.rect.h, angle: sprite.rect.angle },
    opacity: sprite.opacity,
  })

  setTimeout(() => {
    isUpdatingFromCanvas = false
  }, 0)
}

// 为 sprite 设置属性变化监听
function setupSpriteListeners(clipId: string, sprite: VisibleSprite) {
  // 移除旧的监听器
  const oldUnsubscribe = spriteListenerMap.get(clipId)
  if (oldUnsubscribe) {
    oldUnsubscribe()
  }

  // 监听 rect 属性变化
  const unsubscribeRect = sprite.rect.on('propsChange', (changedProps) => {
    if (isUpdatingFromStore) return
    console.log(`[Event] Sprite rect changed for clip ${clipId}:`, changedProps)
    syncSpriteToClip(clipId, sprite)
  })

  // 监听 sprite 属性变化（zIndex 等）
  const unsubscribeSprite = sprite.on('propsChange', (changedProps) => {
    if (isUpdatingFromStore) return
    console.log(`[Event] Sprite props changed for clip ${clipId}:`, changedProps)
    syncSpriteToClip(clipId, sprite)
  })

  // 合并取消监听函数
  spriteListenerMap.set(clipId, () => {
    unsubscribeRect()
    unsubscribeSprite()
  })
}

// 根据 clip 创建对应的 Sprite
async function createSpriteFromClip(clip: Clip, track: Track): Promise<VisibleSprite | null> {
  try {
    const mediaClip = clip as MediaClip
    const extClip = clip as ExtendedClip // 类型转换以访问新属性
    let sprite: VisibleSprite | null = null
    let originalWidth = 0
    let originalHeight = 0

    // 安全边界阈值（秒），避免在边界处 split 导致找不到采样点
    const SPLIT_SAFETY_MARGIN = 0.1

    if (clip.type === 'video' && mediaClip.sourceUrl) {
      // 创建视频 Sprite
      const response = await fetch(mediaClip.sourceUrl)
      if (!response.ok) {
        console.warn(`Failed to fetch video: ${mediaClip.sourceUrl}`)
        return null
      }
      // 获取视频音量设置（默认为 1）
      const volume = (mediaClip as any).volume ?? 1
      let mp4Clip = new MP4Clip(response.body!, { audio: { volume } })
      await mp4Clip.ready
      originalWidth = mp4Clip.meta.width
      originalHeight = mp4Clip.meta.height

      // 处理 trimStart 和 trimEnd
      // trimStart: 视频素材内部的起始时间（秒）
      // trimEnd: 视频素材内部的结束时间（秒）
      const trimStart = mediaClip.trimStart || 0
      const trimEnd = mediaClip.trimEnd || (mp4Clip.meta.duration / 1e6) // 转换为秒
      const playbackRate = mediaClip.playbackRate || 1
      const originalDuration = mp4Clip.meta.duration / 1e6 // 秒

      // 使用 split 方法处理 trim
      // trimStart: 从视频的第 trimStart 秒开始播放
      // trimEnd: 播放到视频的第 trimEnd 秒
      // 只有当 trimStart > 安全边界 时才需要分割前面的部分
      if (trimStart > SPLIT_SAFETY_MARGIN && trimStart < originalDuration - SPLIT_SAFETY_MARGIN) {
        console.log(`[Video] Splitting at trimStart=${trimStart}s (${trimStart * 1e6} us)`)
        try {
          const [beforePart, afterPart] = await mp4Clip.split(trimStart * 1e6)
          beforePart.destroy() // 销毁前面不需要的部分
          mp4Clip = afterPart
          await mp4Clip.ready
          console.log(`[Video] After trimStart split, new duration=${mp4Clip.meta.duration / 1e6}s`)
        } catch (splitError) {
          console.warn(`[Video] Failed to split at trimStart, using original clip:`, splitError)
        }
      }

      // 计算需要保留的时长（从新 clip 的起始算起）
      const keepDuration = trimEnd - trimStart
      const currentDuration = mp4Clip.meta.duration / 1e6
      // 只有当需要裁剪的时长明显小于当前时长时才分割（留出安全边界）
      if (keepDuration > SPLIT_SAFETY_MARGIN && keepDuration < currentDuration - SPLIT_SAFETY_MARGIN) {
        console.log(`[Video] Splitting to keep duration=${keepDuration}s`)
        try {
          const [keepPart, discardPart] = await mp4Clip.split(keepDuration * 1e6)
          discardPart.destroy() // 销毁后面不需要的部分
          mp4Clip = keepPart
          await mp4Clip.ready
          console.log(`[Video] After trimEnd split, final duration=${mp4Clip.meta.duration / 1e6}s`)
        } catch (splitError) {
          console.warn(`[Video] Failed to split at trimEnd, using current clip:`, splitError)
        }
      }

      // 设置滤镜和特效的 tickInterceptor
      const interceptor = createFilteredTickInterceptor(clip)
      if (interceptor) {
        mp4Clip.tickInterceptor = interceptor
      }

      sprite = new VisibleSprite(mp4Clip)

      // sprite.time.offset: 在时间轴上开始显示的时间（微秒）
      // sprite.time.duration: 在时间轴上的持续时间（微秒）
      sprite.time.offset = clip.startTime * 1e6
      sprite.time.duration = (clip.endTime - clip.startTime) * 1e6
      sprite.time.playbackRate = playbackRate

      console.log(`[Video] Clip ${clip.id}: trimStart=${trimStart}s, trimEnd=${trimEnd}s, playbackRate=${playbackRate}, effective duration=${mp4Clip.meta.duration / 1e6}s`)
    } else if (clip.type === 'audio' && mediaClip.sourceUrl) {
      // 创建音频 Sprite（音频无可视区域）
      const response = await fetch(mediaClip.sourceUrl)
      if (!response.ok) {
        console.warn(`Failed to fetch audio: ${mediaClip.sourceUrl}`)
        return null
      }
      // 获取音量设置（默认为 1）
      const volume = (mediaClip as any).volume ?? 1
      let audioClip = new AudioClip(response.body!, { volume })
      await audioClip.ready

      // 处理音频的 trim
      const trimStart = mediaClip.trimStart || 0
      const trimEnd = mediaClip.trimEnd || (audioClip.meta.duration / 1e6)
      const playbackRate = mediaClip.playbackRate || 1
      const originalDuration = audioClip.meta.duration / 1e6

      // 使用 split 方法处理 trim（带安全边界检查）
      if (trimStart > SPLIT_SAFETY_MARGIN && trimStart < originalDuration - SPLIT_SAFETY_MARGIN) {
        try {
          const [beforePart, afterPart] = await audioClip.split(trimStart * 1e6)
          beforePart.destroy()
          audioClip = afterPart
          await audioClip.ready
        } catch (splitError) {
          console.warn(`[Audio] Failed to split at trimStart, using original clip:`, splitError)
        }
      }

      const keepDuration = trimEnd - trimStart
      const currentDuration = audioClip.meta.duration / 1e6
      if (keepDuration > SPLIT_SAFETY_MARGIN && keepDuration < currentDuration - SPLIT_SAFETY_MARGIN) {
        try {
          const [keepPart, discardPart] = await audioClip.split(keepDuration * 1e6)
          discardPart.destroy()
          audioClip = keepPart
          await audioClip.ready
        } catch (splitError) {
          console.warn(`[Audio] Failed to split at trimEnd, using current clip:`, splitError)
        }
      }

      sprite = new VisibleSprite(audioClip)

      sprite.time.offset = clip.startTime * 1e6
      sprite.time.duration = (clip.endTime - clip.startTime) * 1e6
      sprite.time.playbackRate = playbackRate

      console.log(`[Audio] Clip ${clip.id}: trimStart=${trimStart}s, trimEnd=${trimEnd}s, effective duration=${audioClip.meta.duration / 1e6}s`)
    } else if (clip.type === 'sticker' && mediaClip.sourceUrl) {
      // 创建图片/贴纸 Sprite
      const response = await fetch(mediaClip.sourceUrl)
      if (!response.ok) {
        console.warn(`Failed to fetch image: ${mediaClip.sourceUrl}`)
        return null
      }
      const blob = await response.blob()
      const imageBitmap = await createImageBitmap(blob)
      const imgClip = new ImgClip(imageBitmap)
      await imgClip.ready

      // 设置滤镜和特效的 tickInterceptor
      const interceptor = createFilteredTickInterceptor(clip)
      if (interceptor) {
        imgClip.tickInterceptor = interceptor
      }

      sprite = new VisibleSprite(imgClip)
      originalWidth = imageBitmap.width
      originalHeight = imageBitmap.height

      sprite.time.offset = clip.startTime * 1e6
      sprite.time.duration = (clip.endTime - clip.startTime) * 1e6
    } else if (clip.type === 'subtitle' || clip.type === 'text') {
      // 创建字幕/文本 Sprite
      const textClip = clip as SubtitleClip | TextClip
      const text = textClip.text || ''
      if (!text) return null

      // 构建 CSS 样式
      const fontSize = ('fontSize' in textClip ? textClip.fontSize : 48) || 48
      const fontFamily = ('fontFamily' in textClip ? textClip.fontFamily : 'Arial') || 'Arial'
      const color = ('color' in textClip ? textClip.color : 'white') || 'white'
      const backgroundColor = ('backgroundColor' in textClip ? textClip.backgroundColor : '') || ''
      const textAlign = ('textAlign' in textClip ? textClip.textAlign : 'center') || 'center'

      let cssText = `
        font-size: ${fontSize}px;
        font-family: ${fontFamily};
        color: ${color};
        text-align: ${textAlign};
        white-space: pre-wrap;
        padding: 8px 16px;
      `
      if (backgroundColor) {
        cssText += `background-color: ${backgroundColor};`
      }

      try {
        const imgBitmap = await renderTxt2ImgBitmap(text, cssText)
        const imgClip = new ImgClip(imgBitmap)
        await imgClip.ready
        sprite = new VisibleSprite(imgClip)
        originalWidth = imgBitmap.width
        originalHeight = imgBitmap.height

        // 字幕默认位置：底部居中
        if (!extClip.rect || extClip.rect.w <= 0 || extClip.rect.h <= 0) {
          const x = (CANVAS_WIDTH - originalWidth) / 2
          const y = CANVAS_HEIGHT - originalHeight - 80 // 距离底部 80px
          sprite.rect.x = x
          sprite.rect.y = y
          sprite.rect.w = originalWidth
          sprite.rect.h = originalHeight
        }

        sprite.time.offset = clip.startTime * 1e6
        sprite.time.duration = (clip.endTime - clip.startTime) * 1e6

        console.log(`[Subtitle] Created for clip ${clip.id}: "${text.substring(0, 20)}..." at ${sprite.rect.x}, ${sprite.rect.y}`)
      } catch (error) {
        console.error(`Failed to render text for clip ${clip.id}:`, error)
        return null
      }
    }

    if (!sprite) return null

    // 设置 sprite 的空间属性（如果已保存）
    if (extClip.rect && extClip.rect.w > 0 && extClip.rect.h > 0) {
      sprite.rect.x = extClip.rect.x
      sprite.rect.y = extClip.rect.y
      sprite.rect.w = extClip.rect.w
      sprite.rect.h = extClip.rect.h
      sprite.rect.angle = extClip.rect.angle || 0
      if (extClip.rect.fixedAspectRatio !== undefined) {
        sprite.rect.fixedAspectRatio = extClip.rect.fixedAspectRatio
      }
      if (extClip.rect.fixedScaleCenter !== undefined) {
        sprite.rect.fixedScaleCenter = extClip.rect.fixedScaleCenter
      }
      console.log(`[Sprite] Using saved rect for clip ${clip.id}:`, extClip.rect)
    } else if (originalWidth > 0 && originalHeight > 0 && clip.type !== 'subtitle' && clip.type !== 'text') {
      // 非字幕类型：根据原始尺寸计算默认 rect（居中显示）
      const rect = calculateSpriteRect(originalWidth, originalHeight)
      sprite.rect.x = rect.x
      sprite.rect.y = rect.y
      sprite.rect.w = rect.w
      sprite.rect.h = rect.h
      console.log(`[Sprite] Created default rect for clip ${clip.id}: original ${originalWidth}x${originalHeight}, display ${rect.w}x${rect.h} at (${rect.x}, ${rect.y})`)
    }

    // 设置其他属性
    if (extClip.opacity !== undefined) {
      sprite.opacity = extClip.opacity
    }
    if (extClip.visible !== undefined) {
      sprite.visible = extClip.visible
    }
    if (extClip.flip) {
      sprite.flip = extClip.flip
    }

    // 设置 zIndex：优先使用 clip 自身的 zIndex，否则根据轨道顺序计算
    // 轨道 order 越小（越靠上），zIndex 越大（显示在上层）
    if (extClip.zIndex !== undefined) {
      sprite.zIndex = extClip.zIndex
    } else {
      // 根据轨道顺序计算 zIndex
      sprite.zIndex = calculateZIndexFromTrackOrder(track.order)
    }

    // 记录 clip 和轨道的映射关系
    clipTrackMap.set(clip.id, { trackId: track.id, trackOrder: track.order })

    console.log(`[Sprite] Set zIndex for clip ${clip.id}: ${sprite.zIndex} (track order: ${track.order})`)

    return sprite
  } catch (error) {
    console.error(`Failed to create sprite for clip ${clip.id}:`, error)
    return null
  }
}

// 同步轨道中的 clips 到 AVCanvas
async function syncClipsToCanvas() {
  if (!avCanvas) return

  // 如果正在同步，标记需要再次同步
  if (isSyncing) {
    pendingSync = true
    return
  }
  isSyncing = true

  // 收集所有需要处理的 clips 及其所属轨道
  const allClipsWithTrack: { clip: Clip; track: Track }[] = []
  for (const track of tracksStore.tracks) {
    // 跳过隐藏的轨道 - 隐藏轨道中的 clip 不在播放器中显示
    if (track.visible === false) {
      continue
    }
    for (const clip of track.clips) {
      // 处理视频、音频、贴纸、字幕、文本类型
      if (['video', 'audio', 'sticker', 'subtitle', 'text'].includes(clip.type)) {
        allClipsWithTrack.push({ clip, track })
      }
    }
  }

  // 获取当前已有的 clip IDs
  const currentClipIds = new Set(allClipsWithTrack.map(item => item.clip.id))

  // 移除不再存在的 sprites、监听器和快照
  for (const [clipId, sprite] of clipSpriteMap) {
    if (!currentClipIds.has(clipId)) {
      // 移除监听器
      const unsubscribe = spriteListenerMap.get(clipId)
      if (unsubscribe) {
        unsubscribe()
        spriteListenerMap.delete(clipId)
      }
      avCanvas.removeSprite(sprite)
      clipSpriteMap.delete(clipId)
      clipSnapshotMap.delete(clipId)
      clipTrackMap.delete(clipId)
      console.log(`Removed sprite for clip: ${clipId}`)
    }
  }

  // 添加新的 sprites 或更新现有的
  for (const { clip, track } of allClipsWithTrack) {
    const extClip = clip as ExtendedClip
    const existingSprite = clipSpriteMap.get(clip.id)

    // 检查是否需要重建 sprite（关键属性变化）
    const shouldRebuild = existingSprite && needsRebuildSprite(clip)

    if (shouldRebuild && existingSprite) {
      // 需要重建 sprite：移除旧的
      console.log(`[Rebuild] Clip ${clip.id} needs rebuild due to trim/playback changes`)
      const unsubscribe = spriteListenerMap.get(clip.id)
      if (unsubscribe) {
        unsubscribe()
        spriteListenerMap.delete(clip.id)
      }
      avCanvas.removeSprite(existingSprite)
      clipSpriteMap.delete(clip.id)
      clipSnapshotMap.delete(clip.id)
      clipTrackMap.delete(clip.id)
    }

    const currentSprite = clipSpriteMap.get(clip.id)

    if (currentSprite) {
      // 更新现有 sprite 的时间（来自 store 的更新，设置标志防止循环）
      if (!isUpdatingFromCanvas) {
        isUpdatingFromStore = true
        currentSprite.time.offset = clip.startTime * 1e6
        currentSprite.time.duration = (clip.endTime - clip.startTime) * 1e6

        // 同步其他属性（如果来自 store 更新）
        if (extClip.rect && extClip.rect.w > 0 && extClip.rect.h > 0) {
          currentSprite.rect.x = extClip.rect.x
          currentSprite.rect.y = extClip.rect.y
          currentSprite.rect.w = extClip.rect.w
          currentSprite.rect.h = extClip.rect.h
          currentSprite.rect.angle = extClip.rect.angle || 0
        }
        if (extClip.opacity !== undefined) {
          currentSprite.opacity = extClip.opacity
        }
        if (extClip.visible !== undefined) {
          currentSprite.visible = extClip.visible
        }
        if (extClip.flip !== undefined) {
          currentSprite.flip = extClip.flip
        }

        // 更新 zIndex（如果轨道顺序变化）
        const oldTrackInfo = clipTrackMap.get(clip.id)
        if (oldTrackInfo && oldTrackInfo.trackOrder !== track.order) {
          // 轨道顺序变化，更新 zIndex
          const newZIndex = extClip.zIndex !== undefined
            ? extClip.zIndex
            : calculateZIndexFromTrackOrder(track.order)
          currentSprite.zIndex = newZIndex
          clipTrackMap.set(clip.id, { trackId: track.id, trackOrder: track.order })
          console.log(`[Sprite] Updated zIndex for clip ${clip.id}: ${newZIndex} (track order changed: ${oldTrackInfo.trackOrder} -> ${track.order})`)
        } else if (extClip.zIndex !== undefined) {
          currentSprite.zIndex = extClip.zIndex
        }

        setTimeout(() => {
          isUpdatingFromStore = false
        }, 0)
      }
    } else {
      // 创建新的 sprite（传递 track 参数）
      const sprite = await createSpriteFromClip(clip, track)
      if (sprite) {
        await avCanvas.addSprite(sprite)
        clipSpriteMap.set(clip.id, sprite)
        // 保存 clip 的关键属性快照
        clipSnapshotMap.set(clip.id, getClipSnapshot(clip))
        // 设置属性变化监听
        setupSpriteListeners(clip.id, sprite)
        console.log(`Added sprite for clip: ${clip.id}`)
      }
    }
  }

  hasSprites.value = clipSpriteMap.size > 0

  // 更新调试数据
  updateDebugSprites()

  // 更新有效播放时长
  const effectiveDuration = getEffectiveDuration()
  if (effectiveDuration > 0) {
    duration.value = effectiveDuration
    avCanvasDebugData.duration = effectiveDuration
  }

  isSyncing = false

  // 如果有待处理的同步请求，再次同步
  if (pendingSync) {
    pendingSync = false
    await syncClipsToCanvas()
  }
}

// 初始化 AVCanvas
onMounted(async () => {
  if (canvasContainer.value) {
    try {
      avCanvas = new AVCanvas(canvasContainer.value, {
        bgColor: '#1a1a2e',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
      })

      // 监听时间更新事件
      avCanvas.on('timeupdate', (time: number) => {
        currentTime.value = time
        avCanvasDebugData.currentTime = time
        // 同步到 playbackStore，设置标志防止循环
        isUpdatingFromCanvas = true
        playbackStore.seekTo(time / 1e6)
        // 使用 nextTick 或 setTimeout 重置标志
        setTimeout(() => {
          isUpdatingFromCanvas = false
        }, 0)
      })

      // 监听播放状态事件
      avCanvas.on('playing', () => {
        isPlaying.value = true
        avCanvasDebugData.isPlaying = true
        isUpdatingFromCanvas = true
        playbackStore.play()
        emit('play') // 发出播放事件
        setTimeout(() => {
          isUpdatingFromCanvas = false
        }, 0)
      })

      avCanvas.on('paused', () => {
        isPlaying.value = false
        avCanvasDebugData.isPlaying = false
        isUpdatingFromCanvas = true
        playbackStore.pause()
        emit('pause') // 发出暂停事件
        setTimeout(() => {
          isUpdatingFromCanvas = false
        }, 0)
      })

      // 监听活动 sprite 变化（用户选择/取消选择 sprite）
      avCanvas.on('activeSpriteChange', (sprite: VisibleSprite | null) => {
        if (sprite) {
          // 查找对应的 clipId
          for (const [clipId, s] of clipSpriteMap) {
            if (s === sprite) {
              console.log(`[Event] Active sprite changed to clip: ${clipId}`)
              // 同步最新属性到 clip
              syncSpriteToClip(clipId, sprite)
              // 选中对应的轨道 clip
              tracksStore.selectClip(clipId)
              break
            }
          }
        } else {
          // 取消选中所有 clip
          tracksStore.clearSelection()
        }
      })

      console.log('AVCanvas initialized successfully')
      avCanvasDebugData.initialized = true

      // 初始化时同步现有的 clips
      await syncClipsToCanvas()

      // 显示第一帧
      if (clipSpriteMap.size > 0) {
        avCanvas.previewFrame(0)
      }
    } catch (error) {
      console.error('Failed to initialize AVCanvas:', error)
    }
  }
})

// 监听轨道数据变化
watch(
  () => tracksStore.tracks,
  async () => {
    await syncClipsToCanvas()
    // 同步后显示当前帧
    if (avCanvas && clipSpriteMap.size > 0 && !isPlaying.value) {
      avCanvas.previewFrame(currentTime.value)
    }
  },
  { deep: true }
)

// 监听 playbackStore 的时间变化（来自轨道编辑器的 seek）
watch(
  () => playbackStore.currentTime,
  (newTime) => {
    // 如果是从 canvas 更新的，跳过
    if (isUpdatingFromCanvas) return

    const timeInMicroseconds = newTime * 1e6
    currentTime.value = timeInMicroseconds

    // 如果没有在播放，预览该帧
    if (avCanvas && !isPlaying.value) {
      isUpdatingFromStore = true
      avCanvas.previewFrame(timeInMicroseconds)
      setTimeout(() => {
        isUpdatingFromStore = false
      }, 0)
    }
  }
)

// 监听 playbackStore 的播放状态变化
watch(
  () => playbackStore.isPlaying,
  (newIsPlaying) => {
    // 如果是从 canvas 更新的，跳过
    if (isUpdatingFromCanvas) return

    if (!avCanvas) return

    if (newIsPlaying && !isPlaying.value) {
      // 开始播放
      const effectiveDuration = getEffectiveDuration()
      if (effectiveDuration <= 0) {
        console.warn('[Playback] No valid duration, cannot play')
        return
      }

      // 如果已到结尾，从头开始
      if (currentTime.value >= effectiveDuration - 1000) {
        currentTime.value = 0
      }

      isUpdatingFromStore = true
      avCanvas.play({
        start: currentTime.value,
        end: effectiveDuration,
        playbackRate: playbackSpeed.value
      })
      isPlaying.value = true
      setTimeout(() => {
        isUpdatingFromStore = false
      }, 0)
    } else if (!newIsPlaying && isPlaying.value) {
      // 暂停播放
      isUpdatingFromStore = true
      avCanvas.pause()
      isPlaying.value = false
      setTimeout(() => {
        isUpdatingFromStore = false
      }, 0)
    }
  }
)

// 监听 playbackStore 的 duration 变化
watch(() => playbackStore.duration, (newDuration) => {
  duration.value = newDuration * 1e6
  avCanvasDebugData.duration = newDuration * 1e6
})

// 清理 AVCanvas
onUnmounted(() => {

  // 清理所有监听器
  for (const unsubscribe of spriteListenerMap.values()) {
    unsubscribe()
  }
  spriteListenerMap.clear()
  clipSpriteMap.clear()
  clipSnapshotMap.clear()
  clipTrackMap.clear()

  if (avCanvas) {
    avCanvas.destroy()
    avCanvas = null
  }
})

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

function handleSeek(event: Event) {
  const target = event.target as HTMLInputElement
  const timeInSeconds = parseFloat(target.value)
  const timeInMicroseconds = timeInSeconds * 1e6

  currentTime.value = timeInMicroseconds
  isUpdatingFromCanvas = true
  playbackStore.seekTo(timeInSeconds)
  setTimeout(() => {
    isUpdatingFromCanvas = false
  }, 0)

  if (avCanvas) {
    avCanvas.previewFrame(timeInMicroseconds)
  }
}

// 暴露 AVCanvas 实例供外部使用
defineExpose({
  avCanvas: computed(() => avCanvas),
  addSprite: async (sprite: any) => {
    if (avCanvas) {
      await avCanvas.addSprite(sprite)
      hasSprites.value = true
    }
  },
  removeSprite: (sprite: any) => {
    if (avCanvas) {
      avCanvas.removeSprite(sprite)
      // 检查是否还有 sprites
      // hasSprites.value = avCanvas.sprites.length > 0
    }
  }
})
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

.video-preview__tabs {
  display: flex;
  gap: 4px;
}

.tab-btn {
  padding: 6px 12px;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tab-btn:hover {
  background: var(--color-bg-light);
  color: var(--color-text-primary);
  border-color: var(--color-primary);
}

.tab-btn--active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.tab-btn--active:hover {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
  color: white;
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

.video-preview__debug {
  flex: 1;
  overflow: auto;
}

/* 预览屏幕 */
.preview-screen {
  flex: 1;
  position: relative;
  background: var(--color-bg-dark);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  min-height: 200px;
}

/* 
 * AVCanvas 样式覆盖
 * 注意：不要使用 CSS 来缩放 canvas，否则会导致选框与 sprite 错位
 * AVCanvas 内部使用 canvas 的实际尺寸来计算交互坐标
 */
.preview-screen :deep(canvas) {
  display: block;
}

.preview-screen__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  opacity: 0.4;
  position: absolute;
  z-index: 1;
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
  z-index: 2;
}

.playing-indicator {
  font-size: 48px;
  color: var(--color-primary);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {

  0%,
  100% {
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
