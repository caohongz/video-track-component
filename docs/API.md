# VideoTrack 组件 API 文档

本文档详细介绍 VideoTrack 组件的完整 API，包括 Props、Events、Methods 和 Slots。

## 安装与使用

### 从库入口导入

```typescript
import {
  VideoTrack,
  // 类型
  type Clip,
  type Track,
  type TrackType,
  type ClipType,
  type VideoTrackConfig,
  type LocaleConfig,
  type ThemeConfig,
  // Store hooks
  useTracksStore,
  usePlaybackStore,
  useScaleStore,
  useHistoryStore,
  useDragStore,
  // 工具函数
  formatTime,
  parseTime,
  generateId,
  // 预设
  locales,
} from '@/lib'
```

---

## Props

### 基础配置

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `showToolsBar` | `boolean` | `true` | 是否显示工具栏 |
| `showRuler` | `boolean` | `true` | 是否显示时间刻度尺 |
| `enableMainTrackMode` | `boolean` | `false` | 是否启用主轨道模式（Clip自动无间隙排列） |
| `enableCrossTrackDrag` | `boolean` | `true` | 是否允许Clip跨轨道拖拽 |
| `fps` | `number` | `30` | 帧率 |
| `maxDuration` | `number` | - | 最大时长（秒），不设置则自动计算 |

### 工具栏配置

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `operationButtons` | `OperationButton[]` | `['reset', 'undo', 'redo', 'delete']` | 操作按钮配置 |
| `scaleConfigButtons` | `ScaleConfigButton[]` | `['snap']` | 缩放配置按钮 |

#### OperationButton 类型

```typescript
// 字符串简写形式
type PresetOperation = 'reset' | 'undo' | 'redo' | 'delete'

// 自定义插槽形式
interface CustomButton {
  type: 'custom'
  key: string
}

// 完整配置对象形式
interface OperationButtonConfig {
  key: string
  label?: string
  icon?: string | Component  // 支持emoji、图标字符或Vue组件
  disabled?: boolean | (() => boolean)  // 支持布尔值或函数
  onClick?: () => void
  title?: string
  className?: string
}

type OperationButton = PresetOperation | CustomButton | OperationButtonConfig
```

#### ScaleConfigButton 类型

```typescript
type ScaleConfigButton = 'snap' | CustomButton | ScaleConfigButtonConfig

interface ScaleConfigButtonConfig {
  key: string
  icon?: string | Component
  active?: boolean | (() => boolean)
  disabled?: boolean | (() => boolean)
  onClick?: () => void
  title?: string
  className?: string
}
```

### 缩放配置

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `pixelsPerSecond` | `number` | `100` | 每秒像素数 |
| `minScale` | `number` | `0.1` | 最小缩放比例 |
| `maxScale` | `number` | `10` | 最大缩放比例 |
| `defaultScale` | `number` | `1` | 默认缩放比例 |

### 吸附配置

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `enableSnap` | `boolean` | `true` | 是否启用吸附功能 |
| `snapThreshold` | `number` | `10` | 吸附阈值（像素） |

### 轨道配置

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `trackTypes` | `TrackTypeConfig` | - | 轨道类型配置 |
| `trackControlWidth` | `number` | `200` | 轨道控制区宽度 |

```typescript
interface TrackTypeConfig {
  [key: string]: {
    max: number        // 最大轨道数量
    name?: string      // 轨道类型显示名称
  }
}

// 示例
const trackTypes = {
  video: { max: 5 },
  audio: { max: 3 },
  subtitle: { max: 2 },
  customFilter: { max: 1, name: '自定义滤镜' }
}
```

### Clip 配置

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `clipConfigs` | `ClipTypeConfig` | - | Clip 类型样式和行为配置 |

```typescript
interface ClipTypeConfig {
  [clipType: string]: {
    // 样式
    backgroundColor?: string
    borderColor?: string
    borderWidth?: number
    borderRadius?: string | number
    height?: number
    top?: number
    opacity?: number
    
    // 状态样式
    selected?: {
      backgroundColor?: string
      borderColor?: string
      boxShadow?: string
    }
    hover?: {
      backgroundColor?: string
      borderColor?: string
    }
    
    // 行为
    resizable?: boolean
    draggable?: boolean
    selectable?: boolean
    
    // 自定义组件
    component?: Component
    name?: string
  }
}
```

### 播放配置

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `playbackRates` | `number[]` | `[0.5, 1, 2, 4]` | 支持的播放速率 |

### 国际化配置

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `locale` | `LocaleConfig` | `locales['zh-CN']` | 语言配置 |

```typescript
interface LocaleConfig {
  // 操作按钮
  reset?: string
  undo?: string
  redo?: string
  delete?: string
  
  // 吸附功能
  snapOn?: string   // 当前开启时显示（点击关闭）
  snapOff?: string  // 当前关闭时显示（点击开启）
  
  // 右键菜单
  copy?: string
  cut?: string
  paste?: string
  selectAll?: string
  
  // 轨道类型名称
  trackVideo?: string
  trackAudio?: string
  trackSubtitle?: string
  trackSticker?: string
  trackFilter?: string
  trackEffect?: string
  
  // 其他
  addTrack?: string
  deleteTrack?: string
  noClipSelected?: string
}

// 预设语言包
import { locales } from '@/lib'
locales['zh-CN']  // 简体中文
locales['en-US']  // 英语
```

### 主题配置

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `theme` | `ThemeConfig` | - | 自定义主题配置 |

```typescript
interface ThemeConfig {
  // 主色调
  primaryColor?: string
  primaryColorHover?: string
  primaryColorActive?: string
  
  // 背景色
  bgColor?: string
  bgColorSecondary?: string
  bgColorTertiary?: string
  
  // 文字颜色
  textColor?: string
  textColorSecondary?: string
  textColorDisabled?: string
  
  // 边框
  borderColor?: string
  borderColorHover?: string
  
  // 轨道
  trackBgColor?: string
  trackBgColorAlt?: string
  trackBorderColor?: string
  
  // 时间线
  rulerBgColor?: string
  rulerTextColor?: string
  rulerLineColor?: string
  
  // 播放头
  playheadColor?: string
  playheadLineColor?: string
  
  // 选中状态
  selectionColor?: string
  selectionBorderColor?: string
  
  // 工具栏
  toolbarBgColor?: string
  toolbarBorderColor?: string
}
```

---

## Events

### Clip 相关事件

| 事件名 | 参数 | 说明 |
|--------|------|------|
| `clip-add` | `(clip: Clip, trackId: string)` | Clip 添加时触发 |
| `clip-move` | `(clipId: string, trackId: string, startTime: number, oldTrackId?: string)` | Clip 移动时触发 |
| `clip-resize` | `(clipId: string, startTime: number, endTime: number)` | Clip 调整大小时触发 |
| `clip-delete` | `(clipId: string)` | Clip 删除时触发 |
| `clip-select` | `(clipIds: string[])` | Clip 选中状态变化时触发 |
| `clip-copy` | `(clipIds: string[])` | Clip 复制时触发 |
| `clip-cut` | `(clipIds: string[])` | Clip 剪切时触发 |
| `clip-paste` | `(clips: Clip[], trackId: string)` | Clip 粘贴时触发 |
| `clip-split` | `(clipId: string, time: number)` | Clip 分割时触发 |
| `clip-click` | `(clip: Clip, event: MouseEvent)` | Clip 点击时触发 |
| `clip-dblclick` | `(clip: Clip, event: MouseEvent)` | Clip 双击时触发 |
| `clip-contextmenu` | `(clip: Clip, event: MouseEvent)` | Clip 右键时触发 |
| `clip-drag-start` | `(clipId: string, event: DragEvent)` | Clip 开始拖拽时触发 |
| `clip-drag-end` | `(clipId: string, event: DragEvent)` | Clip 结束拖拽时触发 |

### Track 相关事件

| 事件名 | 参数 | 说明 |
|--------|------|------|
| `track-add` | `(track: Track)` | 轨道添加时触发 |
| `track-delete` | `(trackId: string)` | 轨道删除时触发 |
| `track-reorder` | `(trackIds: string[])` | 轨道顺序变化时触发 |
| `track-lock` | `(trackId: string, locked: boolean)` | 轨道锁定状态变化时触发 |
| `track-mute` | `(trackId: string, muted: boolean)` | 轨道静音状态变化时触发 |
| `track-solo` | `(trackId: string, solo: boolean)` | 轨道独奏状态变化时触发 |
| `track-visible` | `(trackId: string, visible: boolean)` | 轨道可见性变化时触发 |

### 播放相关事件

| 事件名 | 参数 | 说明 |
|--------|------|------|
| `play` | - | 开始播放时触发 |
| `pause` | - | 暂停播放时触发 |
| `stop` | - | 停止播放时触发 |
| `seek` | `(time: number)` | 跳转时间时触发 |
| `playback-rate-change` | `(rate: number)` | 播放速率变化时触发 |
| `time-update` | `(currentTime: number)` | 当前时间更新时触发（播放时连续触发） |

### 缩放与视图事件

| 事件名 | 参数 | 说明 |
|--------|------|------|
| `scale-change` | `(scale: number)` | 缩放比例变化时触发 |
| `snap-toggle` | `(enabled: boolean)` | 吸附功能开关时触发 |
| `scroll` | `(scrollLeft: number, scrollTop: number)` | 滚动时触发 |

### 历史记录事件

| 事件名 | 参数 | 说明 |
|--------|------|------|
| `undo` | `(action: HistoryAction)` | 撤销操作时触发 |
| `redo` | `(action: HistoryAction)` | 重做操作时触发 |
| `history-change` | `(canUndo: boolean, canRedo: boolean)` | 历史记录状态变化时触发 |

### 数据事件

| 事件名 | 参数 | 说明 |
|--------|------|------|
| `data-import` | `(data: ExportData)` | 数据导入时触发 |
| `data-export` | `(data: ExportData)` | 数据导出时触发 |

---

## Methods

通过 `ref` 获取组件实例后调用方法：

```vue
<template>
  <VideoTrack ref="videoTrackRef" />
</template>

<script setup>
import { ref } from 'vue'

const videoTrackRef = ref()

// 调用方法
videoTrackRef.value?.play()
</script>
```

### 轨道操作

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `addTrack` | `(type: TrackType, index?: number)` | `Track` | 添加轨道 |
| `removeTrack` | `(trackId: string)` | `void` | 删除轨道 |
| `getTrack` | `(trackId: string)` | `Track \| undefined` | 获取轨道 |
| `getAllTracks` | - | `Track[]` | 获取所有轨道 |
| `getTracksByType` | `(type: TrackType)` | `Track[]` | 获取指定类型的轨道 |
| `reorderTracks` | `(trackIds: string[])` | `void` | 重新排序轨道 |
| `lockTrack` | `(trackId: string, locked: boolean)` | `void` | 锁定/解锁轨道 |
| `muteTrack` | `(trackId: string, muted: boolean)` | `void` | 静音/取消静音轨道 |
| `soloTrack` | `(trackId: string, solo: boolean)` | `void` | 独奏/取消独奏轨道 |
| `setTrackVisible` | `(trackId: string, visible: boolean)` | `void` | 设置轨道可见性 |

### Clip 操作

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `addClip` | `(trackId: string, clip: Partial<Clip>)` | `Clip` | 添加 Clip |
| `removeClip` | `(clipId: string)` | `void` | 删除 Clip |
| `updateClip` | `(clipId: string, updates: Partial<Clip>)` | `void` | 更新 Clip |
| `moveClip` | `(clipId: string, trackId: string, startTime: number)` | `void` | 移动 Clip |
| `getClip` | `(clipId: string)` | `Clip \| undefined` | 获取 Clip |
| `getAllClips` | - | `Clip[]` | 获取所有 Clip |
| `getClipsByTrack` | `(trackId: string)` | `Clip[]` | 获取轨道上的所有 Clip |
| `getClipsByType` | `(type: ClipType)` | `Clip[]` | 获取指定类型的所有 Clip |
| `splitClip` | `(clipId: string, time: number)` | `[Clip, Clip]` | 分割 Clip |
| `duplicateClip` | `(clipId: string, targetTrackId?: string)` | `Clip` | 复制 Clip |
| `registerClipType` | `(type: string, config: ClipTypeConfig)` | `void` | 注册自定义 Clip 类型 |

### 选择操作

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `selectClip` | `(clipId: string, append?: boolean)` | `void` | 选中 Clip（append为true时追加选中） |
| `selectClips` | `(clipIds: string[])` | `void` | 批量选中 Clip |
| `deselectClip` | `(clipId: string)` | `void` | 取消选中 Clip |
| `deselectAll` | - | `void` | 取消所有选中 |
| `selectAll` | - | `void` | 全选 |
| `getSelectedClips` | - | `Clip[]` | 获取已选中的 Clip |
| `toggleClipSelection` | `(clipId: string)` | `void` | 切换 Clip 选中状态 |

### 剪贴板操作

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `copySelectedClips` | - | `void` | 复制选中的 Clip |
| `cutSelectedClips` | - | `void` | 剪切选中的 Clip |
| `paste` | `(trackId?: string, time?: number)` | `void` | 粘贴 Clip |
| `deleteSelectedClips` | - | `void` | 删除选中的 Clip |

### 播放控制

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `play` | - | `void` | 开始播放 |
| `pause` | - | `void` | 暂停播放 |
| `stop` | - | `void` | 停止播放（并回到开始位置） |
| `togglePlay` | - | `void` | 切换播放/暂停 |
| `seek` | `(time: number)` | `void` | 跳转到指定时间 |
| `setPlaybackRate` | `(rate: number)` | `void` | 设置播放速率 |
| `getCurrentTime` | - | `number` | 获取当前播放时间 |
| `getDuration` | - | `number` | 获取总时长 |
| `isPlaying` | - | `boolean` | 获取播放状态 |

### 缩放与视图

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `setScale` | `(scale: number)` | `void` | 设置缩放比例 |
| `getScale` | - | `number` | 获取当前缩放比例 |
| `zoomIn` | `(step?: number)` | `void` | 放大 |
| `zoomOut` | `(step?: number)` | `void` | 缩小 |
| `fitToView` | - | `void` | 自适应视图 |
| `scrollTo` | `(time: number)` | `void` | 滚动到指定时间 |
| `scrollToClip` | `(clipId: string)` | `void` | 滚动到指定 Clip |
| `toggleSnap` | - | `void` | 切换吸附功能 |
| `setSnapEnabled` | `(enabled: boolean)` | `void` | 设置吸附功能开关 |

### 历史记录

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `undo` | - | `void` | 撤销 |
| `redo` | - | `void` | 重做 |
| `canUndo` | - | `boolean` | 是否可以撤销 |
| `canRedo` | - | `boolean` | 是否可以重做 |
| `clearHistory` | - | `void` | 清空历史记录 |
| `reset` | - | `void` | 重置到初始状态 |

### 数据导入导出

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `exportData` | - | `ExportData` | 导出数据 |
| `importData` | `(data: ExportData)` | `void` | 导入数据 |
| `exportAsJSON` | - | `string` | 导出为 JSON 字符串 |
| `importFromJSON` | `(json: string)` | `void` | 从 JSON 字符串导入 |

```typescript
interface ExportData {
  version: string
  tracks: Track[]
  clips: Clip[]
  currentTime: number
  scale: number
  duration: number
}
```

---

## Slots

### 工具栏插槽

| 插槽名 | 作用域 | 说明 |
|--------|--------|------|
| `toolbar-before` | - | 工具栏前方 |
| `toolbar-after` | - | 工具栏后方 |
| `operations-prepend` | - | 操作按钮区前方 |
| `operations-append` | - | 操作按钮区后方 |
| `playback-prepend` | - | 播放控制区前方 |
| `playback-append` | - | 播放控制区后方 |
| `scale-prepend` | - | 缩放区前方 |
| `scale-append` | - | 缩放区后方 |
| `custom-operation-{key}` | - | 自定义操作按钮（key 对应 CustomButton.key） |
| `custom-scale-config-{key}` | - | 自定义缩放配置按钮 |

### 时间线插槽

| 插槽名 | 作用域 | 说明 |
|--------|--------|------|
| `ruler-before` | - | 时间刻度尺前方 |
| `ruler-after` | - | 时间刻度尺后方 |

### 轨道区插槽

| 插槽名 | 作用域 | 说明 |
|--------|--------|------|
| `tracks-before` | - | 轨道区前方 |
| `tracks-after` | - | 轨道区后方 |
| `track-control` | `{ track: Track }` | 自定义轨道控制区 |
| `clip` | `{ clip: Clip, track: Track }` | 自定义 Clip 渲染 |

### 使用示例

```vue
<template>
  <VideoTrack
    :operation-buttons="['undo', 'redo', { type: 'custom', key: 'export' }]"
    :scale-config-buttons="['snap', { type: 'custom', key: 'grid' }]"
  >
    <!-- 工具栏前方添加 logo -->
    <template #toolbar-before>
      <div class="logo">MyEditor</div>
    </template>
    
    <!-- 操作按钮区前方添加按钮 -->
    <template #operations-prepend>
      <button @click="newProject">新建</button>
    </template>
    
    <!-- 自定义导出按钮 -->
    <template #custom-operation-export>
      <button @click="handleExport">
        💾 导出
      </button>
    </template>
    
    <!-- 自定义网格按钮 -->
    <template #custom-scale-config-grid>
      <button :class="{ active: showGrid }" @click="toggleGrid">
        ⊞ 网格
      </button>
    </template>
    
    <!-- 播放控制后方添加内容 -->
    <template #playback-append>
      <span class="fps-display">30 FPS</span>
    </template>
    
    <!-- 自定义轨道控制区 -->
    <template #track-control="{ track }">
      <div class="custom-track-control">
        <span>{{ track.name }}</span>
        <button @click="editTrack(track)">编辑</button>
      </div>
    </template>
  </VideoTrack>
</template>
```

---

## 类型定义

### Track

```typescript
interface Track {
  id: string
  type: TrackType
  name: string
  order: number
  locked: boolean
  muted: boolean
  solo: boolean
  visible: boolean
  height: number
  clips: Clip[]
}

type TrackType = 'video' | 'audio' | 'subtitle' | 'sticker' | 'filter' | 'effect' | string
```

### Clip

```typescript
interface Clip {
  id: string
  type: ClipType
  trackId: string
  startTime: number
  endTime: number
  duration: number
  name: string
  
  // 媒体相关
  src?: string
  originalDuration?: number
  trimStart?: number
  trimEnd?: number
  
  // 视频/图片特有
  width?: number
  height?: number
  thumbnail?: string
  
  // 音频特有
  volume?: number
  waveform?: number[]
  
  // 字幕特有
  text?: string
  fontSize?: number
  fontFamily?: string
  color?: string
  
  // 转场特有
  transitionType?: string
  transitionDuration?: number
  
  // 特效/滤镜特有
  effectType?: string
  filterType?: string
  intensity?: number
  
  // 自定义数据
  data?: Record<string, any>
}

type ClipType = 
  | 'video' 
  | 'audio' 
  | 'subtitle' 
  | 'text' 
  | 'sticker' 
  | 'filter' 
  | 'effect' 
  | 'transition'
  | string
```

---

## 快捷键

| 功能 | Windows/Linux | macOS |
|------|---------------|-------|
| 播放/暂停 | `Space` | `Space` |
| 撤销 | `Ctrl+Z` | `Cmd+Z` |
| 重做 | `Ctrl+Y` / `Ctrl+Shift+Z` | `Cmd+Y` / `Cmd+Shift+Z` |
| 复制 | `Ctrl+C` | `Cmd+C` |
| 剪切 | `Ctrl+X` | `Cmd+X` |
| 粘贴 | `Ctrl+V` | `Cmd+V` |
| 删除 | `Delete` / `Backspace` | `Delete` / `Backspace` |
| 全选 | `Ctrl+A` | `Cmd+A` |
| 取消选中 | `Esc` | `Esc` |
| 放大 | `Ctrl++` / `Ctrl+=` | `Cmd++` / `Cmd+=` |
| 缩小 | `Ctrl+-` | `Cmd+-` |
| 时间前进 | `→` | `→` |
| 时间后退 | `←` | `←` |
| 帧前进 | `Shift+→` | `Shift+→` |
| 帧后退 | `Shift+←` | `Shift+←` |

---

## 完整示例

```vue
<template>
  <VideoTrack
    ref="videoTrackRef"
    :operation-buttons="operationButtons"
    :scale-config-buttons="['snap']"
    :track-types="trackTypes"
    :clip-configs="clipConfigs"
    :locale="locales['zh-CN']"
    :enable-main-track-mode="true"
    :enable-cross-track-drag="true"
    :fps="30"
    :pixels-per-second="100"
    @clip-add="onClipAdd"
    @clip-move="onClipMove"
    @clip-delete="onClipDelete"
    @clip-select="onClipSelect"
    @track-add="onTrackAdd"
    @play="onPlay"
    @pause="onPause"
    @time-update="onTimeUpdate"
    @scale-change="onScaleChange"
    @undo="onUndo"
    @redo="onRedo"
  >
    <template #operations-append>
      <button @click="handleSave">💾 保存</button>
    </template>
  </VideoTrack>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { VideoTrack, locales, type Clip, type Track } from '@/lib'

const videoTrackRef = ref()

const operationButtons = ref([
  'reset',
  'undo', 
  'redo',
  {
    key: 'split',
    label: '分割',
    icon: '✂️',
    disabled: () => videoTrackRef.value?.getSelectedClips().length === 0,
    onClick: () => handleSplit()
  },
  'delete'
])

const trackTypes = {
  video: { max: 3 },
  audio: { max: 2 },
  subtitle: { max: 1 }
}

const clipConfigs = {
  video: {
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    height: 64
  }
}

// 事件处理
function onClipAdd(clip: Clip, trackId: string) {
  console.log('Clip added:', clip.id, 'to track:', trackId)
}

function onClipMove(clipId: string, trackId: string, startTime: number) {
  console.log('Clip moved:', clipId, 'to', trackId, 'at', startTime)
}

function onClipDelete(clipId: string) {
  console.log('Clip deleted:', clipId)
}

function onClipSelect(clipIds: string[]) {
  console.log('Selected clips:', clipIds)
}

function onTrackAdd(track: Track) {
  console.log('Track added:', track.id)
}

function onPlay() {
  console.log('Playback started')
}

function onPause() {
  console.log('Playback paused')
}

function onTimeUpdate(time: number) {
  // 实时更新时间显示
}

function onScaleChange(scale: number) {
  console.log('Scale changed:', scale)
}

function onUndo(action: any) {
  console.log('Undo:', action)
}

function onRedo(action: any) {
  console.log('Redo:', action)
}

// 操作方法
function handleSplit() {
  const clips = videoTrackRef.value?.getSelectedClips()
  if (clips?.length === 1) {
    const currentTime = videoTrackRef.value?.getCurrentTime()
    videoTrackRef.value?.splitClip(clips[0].id, currentTime)
  }
}

function handleSave() {
  const data = videoTrackRef.value?.exportAsJSON()
  localStorage.setItem('project', data)
}

// 初始化
onMounted(() => {
  // 从本地存储恢复项目
  const saved = localStorage.getItem('project')
  if (saved) {
    videoTrackRef.value?.importFromJSON(saved)
  }
})
</script>
```
