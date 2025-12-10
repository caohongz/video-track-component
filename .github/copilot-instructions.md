# Video Track Component - AI 编码指南

## 项目概述

这是 `vue-clip-track` 库的**演示项目**，展示专业级视频轨道编辑功能。核心轨道组件来自 `vue-clip-track`，视频预览基于 `@webav/av-canvas`。

**在线演示**: https://caohongz.github.io/video-track-component/

## 架构概览

```
App.vue (演示容器)
├── MediaLibrary/      # 拖拽媒体资源到轨道
├── VideoPreview/      # AVCanvas 播放预览 + DebugPanel
├── PropertyPanel/     # 选中 Clip 属性编辑
└── VideoTrack         # 核心轨道组件（来自 vue-clip-track）
```

### Pinia Stores（来自 vue-clip-track）
| Store | 职责 |
|-------|------|
| `useTracksStore` | 轨道/Clip CRUD、选中状态 |
| `usePlaybackStore` | 播放状态、当前时间、播放速率 |
| `useHistoryStore` | 撤销/重做、快照管理 |
| `useScaleStore` | 缩放比例、吸附、时间-像素转换 |
| `useDragStore` | 拖拽状态、碰撞检测 |

## 开发命令

```bash
pnpm install   # 安装依赖
pnpm dev       # 启动开发服务器 (http://localhost:3000)
pnpm build     # 构建生产版本 (vue-tsc + vite)
```

## vue-clip-track 核心 API

### 组件实例方法（通过 ref 调用）
```typescript
const videoTrackRef = ref()

// 数据导入/导出
videoTrackRef.value.exportData()           // 导出项目数据
videoTrackRef.value.importData(data)       // 导入项目数据

// 轨道操作
videoTrackRef.value.addTrack(track)
videoTrackRef.value.removeTrack(trackId)
videoTrackRef.value.getMainTrack()

// Clip 操作
videoTrackRef.value.addClip(trackId, clip)
videoTrackRef.value.removeClip(clipId)
videoTrackRef.value.updateClip(clipId, changes)
videoTrackRef.value.moveClip(clipId, targetTrackId, newStartTime)

// 选择操作
videoTrackRef.value.selectClip(clipId)
videoTrackRef.value.clearSelection()
videoTrackRef.value.getSelectedClips()

// 播放控制
videoTrackRef.value.play() / pause() / togglePlay()
videoTrackRef.value.seekTo(time)
videoTrackRef.value.setPlaybackRate(rate)

// 历史操作
videoTrackRef.value.undo() / redo()
```

### 关键事件
```typescript
@add-transition="(beforeClipId, afterClipId) => {}"  // 请求添加转场
@drop-media="(mediaData, trackId, startTime) => {}"  // 拖放媒体
@clip:added="(clip, trackId) => {}"                  // Clip 添加后
@clip:updated="(clipId, changes, oldValues) => {}"   // Clip 更新后
@selection:changed="(selectedIds, previousIds) => {}" // 选择变化
```

### 导入方式
```typescript
import {
  VideoTrack,
  // Stores
  useTracksStore, usePlaybackStore, useHistoryStore, useScaleStore, useDragStore,
  // 工具函数
  generateId, formatTime, normalizeTime, hasTimeOverlap, deepClone,
  extractVideoThumbnails, extractAudioWaveform, extractVideoAudioWaveform,
  // 语言包
  locales,
  // 类型
  type Clip, type Track, type MediaClip, type TransitionClip
} from 'vue-clip-track'
```

## 核心类型

### MediaClip（video/audio）
```typescript
interface MediaClip {
  id: string
  trackId: string
  type: 'video' | 'audio'
  startTime: number        // 轨道上的开始时间
  endTime: number          // 轨道上的结束时间
  sourceUrl: string        // 媒体文件路径
  originalDuration: number // 原始时长
  trimStart: number        // 裁剪起点
  trimEnd: number          // 裁剪终点
  playbackRate: number     // 播放速率
  thumbnails?: []          // 视频缩略图
  waveformData?: []        // 音频波形
  volume?: number          // 音量 0-1
}
```

### TransitionClip
```typescript
interface TransitionClip {
  type: 'transition'
  transitionType: string      // 'fade', 'slide', 'wipe' 等
  transitionDuration: number  // 转场时长
}
```

## 代码约定

### Vue 组件模式
- 使用 `<script setup lang="ts">` 组合式 API
- Store：`const tracksStore = useTracksStore()`
- 响应式：`ref`/`computed`，复杂状态用 Pinia

### 样式约定
- CSS 变量系统：`--color-*`、`--theme-*`
- 主题切换：`[data-theme="dark"]` / `[data-theme="light"]`
- HSL 动态主色调：`--theme-hue`、`--theme-saturation`、`--theme-lightness`
- BEM 命名：`.component__element--modifier`

### 过滤调试数据
DebugPanel 显示 Clip 数据时过滤大型字段：
```typescript
function filterUselessData(data: any): any {
  // 跳过 thumbnails、waveformData 等大数据字段
  if (key === 'thumbnails' || key === 'waveformData') continue
}
```

## 关键集成

### @webav/av-canvas 视频预览
- `VideoPreview/index.vue` 管理 AVCanvas 实例
- Sprite 与 Clip 通过 `clipSpriteMap` 映射
- 转场渲染器在 `src/utils/transitionRenderers.ts`

### 时间-像素转换
```typescript
pixelPosition = time × scale × pixelsPerSecond
time = pixelPosition / (scale × pixelsPerSecond)
```

## 重要业务逻辑

### 碰撞检测
同轨道 Clip 不能重叠（转场除外）：
```typescript
overlap = (start1 < end2) && (end1 > start2)
```

### 主轨道模式
`enableMainTrackMode=true` 时，主轨道 Clip 自动无间隙连续排列。

### 吸附功能
拖拽时自动吸附到 Clip 边缘，按住 **Shift** 临时禁用。

### 快捷键
| 功能 | Windows | Mac |
|------|---------|-----|
| 复制/剪切/粘贴 | Ctrl+C/X/V | Cmd+C/X/V |
| 撤销/重做 | Ctrl+Z / Ctrl+Y | Cmd+Z / Cmd+Shift+Z |
| 删除 | Delete | Delete |
| 播放/暂停 | Space | Space |
| 全选/取消 | Ctrl+A / Esc | Cmd+A / Esc |

## 文件路径约定

| 用途 | 路径 |
|------|------|
| 媒体资源 | `public/assets/video/`、`public/assets/audio/` |
| 工具函数 | `src/utils/`（`getVideoPath()`、`getAudioPath()`） |
| 全局样式 | `src/styles/global.css`（CSS 变量定义） |
| 文档 | `docs/`（架构、API、样式指南等） |

## 调试技巧

1. **DebugPanel**（播放器右侧 Tab）查看实时状态
2. **复制按钮**导出完整轨道/Clip JSON 数据
3. **AVCanvas 调试数据**通过 `provide/inject` 共享到 DebugPanel
