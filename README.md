# 音视频轨道组件

基于 Vue 3 + TypeScript 的音视频轨道编辑组件，支持轨道管理、片段编辑、时间线控制等核心功能。

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发

```bash
pnpm dev
```

访问 `http://localhost:3000` 查看演示页面。

### 构建

```bash
pnpm build
```

## 功能特性

### 核心功能

- ✅ **轨道管理**：支持视频、音频、字幕、文本、贴纸、滤镜、特效等多种轨道类型
- ✅ **片段编辑**：拖拽移动、调整时长、跨轨道移动
- ✅ **转场效果**：在相邻 Clip 之间添加转场（支持拖拽添加和点击添加）
- ✅ **时间线控制**：动态刻度、拖拽卡尺、吸附功能
- ✅ **播放控制**：播放/暂停、播放速率调整、时间显示（HH:MM:SS:FF）
- ✅ **撤销/重做**：支持操作历史记录（最多 50 条）
- ✅ **快捷键支持**：完整的快捷键系统
- ✅ **右键菜单**：Clip 和轨道的上下文菜单（复制、剪切、粘贴、删除等操作）
- ✅ **吸附功能**：自动吸附到其他 Clip 边缘（按住 Shift 临时禁用）

### 高级功能

- ✅ **主轨道模式**：支持主轨道连续排列规则，Clips 自动无间隙排列
- ✅ **跨轨移动**：可配置是否允许 Clip 在轨道间移动
- ✅ **自定义扩展**：自定义按钮、Clip 类型、轨道类型
- ✅ **边缘滚动**：拖拽 Clip 到边缘时自动滚动时间轴
- ✅ **碰撞检测**：同轨道 Clip 移动时自动处理重叠
- ✅ **国际化支持**：内置中英文语言包，支持自定义语言配置
- ✅ **主题定制**：支持自定义主色调和主题切换
- ✅ **媒体处理**：支持提取视频缩略图和音频波形数据

### 视觉特性

- ✅ **视频缩略图**：视频 Clip 显示缩略图序列
- ✅ **音频波形**：音频 Clip 显示波形可视化
- ✅ **拖拽预览**：拖拽时显示预览框指示放置位置
- ✅ **新建轨道提示**：跨轨拖拽时提示新建轨道

## 使用方法

### 基础用法

```vue
<template>
  <VideoTrack
    :operation-buttons="operationButtons"
    :scale-config-buttons="scaleConfigButtons"
    :track-types="trackTypes"
    :enable-main-track-mode="false"
    :enable-cross-track-drag="true"
    @add-transition="handleAddTransition"
    @drop-media="handleDropMedia"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VideoTrack } from 'vue-clip-track';
import 'vue-clip-track/style.css';

const operationButtons = ref(['reset', 'undo', 'redo', 'delete']);
const scaleConfigButtons = ref(['snap']);
const trackTypes = ref({
  video: { max: 5 },
  audio: { max: 3 },
  subtitle: { max: 2 },
  text: { max: 2 },
});

function handleAddTransition(beforeClipId: string, afterClipId: string) {
  console.log('Add transition between:', beforeClipId, afterClipId);
}

function handleDropMedia(mediaData: any, trackId: string, startTime: number) {
  console.log('Drop media:', mediaData, trackId, startTime);
}
</script>
```

### 配置项

| 属性                   | 类型                  | 默认值                                | 说明               |
| ---------------------- | --------------------- | ------------------------------------- | ------------------ |
| `operationButtons`     | `OperationButton[]`   | `['reset', 'undo', 'redo', 'delete']` | 操作按钮配置       |
| `scaleConfigButtons`   | `ScaleConfigButton[]` | `['snap']`                            | 缩放配置按钮       |
| `trackTypes`           | `TrackTypeConfig`     | -                                     | 轨道类型配置       |
| `clipConfigs`          | `ClipTypeConfig`      | -                                     | Clip 类型样式配置  |
| `showToolsBar`         | `boolean`             | `true`                                | 是否显示工具栏     |
| `enableMainTrackMode`  | `boolean`             | `false`                               | 是否启用主轨道模式 |
| `enableCrossTrackDrag` | `boolean`             | `true`                                | 是否允许跨轨移动   |
| `fps`                  | `number`              | `30`                                  | 帧率               |
| `pixelsPerSecond`      | `number`              | `100`                                 | 每秒像素数         |
| `minScale`             | `number`              | `0.1`                                 | 最小缩放比例       |
| `maxScale`             | `number`              | `10`                                  | 最大缩放比例       |
| `defaultScale`         | `number`              | `1`                                   | 默认缩放比例       |
| `enableSnap`           | `boolean`             | `true`                                | 是否启用吸附       |
| `snapThreshold`        | `number`              | `10`                                  | 吸附阈值（像素）   |
| `locale`               | `LocaleConfig`        | 中文                                  | 国际化配置         |

### 事件

| 事件名             | 参数                                                   | 说明                     |
| ------------------ | ------------------------------------------------------ | ------------------------ |
| `add-transition`   | `(beforeClipId: string, afterClipId: string)`          | 请求添加转场时触发       |
| `drop-media`       | `(mediaData: any, trackId: string, startTime: number)` | 从资源库拖放媒体时触发   |
| `transition-added` | `(transitionClip: any, beforeClipId, afterClipId)`     | 转场添加成功后触发       |
| `track-delete`     | `(trackId: string)`                                    | 轨道删除时触发           |

### 快捷键

| 功能      | 快捷键             | 说明                   |
| --------- | ------------------ | ---------------------- |
| 播放/暂停 | `Space`            | -                      |
| 撤销      | `Ctrl+Z` / `Cmd+Z` | -                      |
| 重做      | `Ctrl+Y` / `Cmd+Y` | -                      |
| 复制      | `Ctrl+C` / `Cmd+C` | 选中 Clip 时生效       |
| 剪切      | `Ctrl+X` / `Cmd+X` | 选中 Clip 时生效       |
| 粘贴      | `Ctrl+V` / `Cmd+V` | -                      |
| 删除      | `Delete`           | 选中 Clip 时生效       |
| 放大      | `Ctrl++` / `Cmd++` | -                      |
| 缩小      | `Ctrl+-` / `Cmd+-` | -                      |
| 时间前进  | `→`                | 每次 0.1 秒            |
| 时间后退  | `←`                | 每次 0.1 秒            |
| 全选      | `Ctrl+A` / `Cmd+A` | -                      |
| 取消选中  | `Esc`              | -                      |
| 禁用吸附  | `Shift`            | 拖拽时按住临时禁用吸附 |

### 自定义扩展

#### 自定义操作按钮

支持在操作按钮区添加自定义功能按钮，可以控制按钮的位置和顺序。

```vue
<template>
  <VideoTrack
    :operation-buttons="[
      'reset',
      'undo',
      'redo',
      { type: 'custom', key: 'import' },
      'delete',
      { type: 'custom', key: 'export' },
    ]"
  >
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
</template>
```

#### 自定义缩放配置按钮

```vue
<template>
  <VideoTrack
    :scale-config-buttons="[
      'snap',
      { type: 'custom', key: 'grid' },
    ]"
  >
    <template #custom-scale-config-grid>
      <button
        class="tools-bar__btn tools-bar__btn--toggle"
        :class="{ 'tools-bar__btn--active': showGrid }"
        @click="toggleGrid"
      >
        <span class="tools-bar__icon">⊞</span>
        <span class="tools-bar__label">网格</span>
      </button>
    </template>
  </VideoTrack>
</template>
```

#### 配置轨道类型数量限制

```typescript
const trackTypes = {
  video: { max: 5 },
  audio: { max: 3 },
  subtitle: { max: 2 },
  text: { max: 2 },
  sticker: { max: 2 },
  filter: { max: 1 },
  effect: { max: 2 },
};
```

#### 自定义 Clip 样式

通过 `clipConfigs` prop 可以自定义各类型 Clip 的样式：

```typescript
const clipConfigs = ref({
  video: {
    backgroundColor: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
    borderColor: '#667eea',
    height: 60,
    selected: {
      borderColor: '#ff6b6b',
      boxShadow: '0 0 0 3px rgba(255, 107, 107, 0.3)',
    },
  },
  audio: {
    backgroundColor: 'linear-gradient(45deg, #f093fb 0%, #f5576c 100%)',
    height: 36,
  },
});
```

### 使用 Stores

组件导出了内部使用的 Pinia stores，供高级用户直接操作：

```typescript
import {
  useTracksStore,
  usePlaybackStore,
  useHistoryStore,
  useScaleStore,
  useDragStore,
} from 'vue-clip-track';

// 轨道操作
const tracksStore = useTracksStore();
tracksStore.addTrack(track);
tracksStore.addClip(trackId, clip);
tracksStore.removeClip(clipId);
tracksStore.selectClip(clipId);

// 播放控制
const playbackStore = usePlaybackStore();
playbackStore.play();
playbackStore.pause();
playbackStore.seekTo(time);

// 历史记录
const historyStore = useHistoryStore();
historyStore.undo();
historyStore.redo();
historyStore.pushSnapshot('操作描述');

// 缩放控制
const scaleStore = useScaleStore();
scaleStore.setScale(2);
scaleStore.zoomIn();
scaleStore.zoomOut();
```

### 使用工具函数

```typescript
import {
  generateId,
  formatTime,
  normalizeTime,
  extractVideoThumbnails,
  extractAudioWaveform,
} from 'vue-clip-track';

// 生成唯一 ID
const clipId = generateId('clip-');

// 格式化时间显示
const timeStr = formatTime(125.5, 30); // "00:02:05:15"

// 规范化时间精度
const time = normalizeTime(1.234567); // 1.23

// 提取视频缩略图
const result = await extractVideoThumbnails(videoUrl, { count: 10, width: 120 });

// 提取音频波形
const waveform = await extractAudioWaveform(audioUrl, { samples: 500 });
```

## 项目结构

```
video-track-component/
├── src/                      # 演示应用源码
│   ├── components/           # 演示用组件
│   │   ├── MediaLibrary/     # 资源库
│   │   ├── PropertyPanel/    # 属性面板
│   │   └── DebugPanel/       # 调试面板
│   ├── App.vue               # 演示应用
│   └── main.ts
├── packages/
│   └── video-track/          # 组件库源码
│       ├── src/
│       │   ├── components/   # 核心组件
│       │   │   ├── index.vue       # 主组件
│       │   │   ├── ToolsBar/       # 工具栏
│       │   │   ├── Ruler/          # 时间线标尺
│       │   │   ├── Tracks/         # 轨道组件
│       │   │   └── ContextMenu/    # 右键菜单
│       │   ├── stores/       # Pinia 状态管理
│       │   │   ├── tracks.ts       # 轨道数据
│       │   │   ├── playback.ts     # 播放状态
│       │   │   ├── history.ts      # 历史记录
│       │   │   ├── scale.ts        # 缩放状态
│       │   │   └── drag.ts         # 拖拽状态
│       │   ├── composables/  # Vue 组合式函数
│       │   │   ├── useResize.ts    # 调整大小
│       │   │   ├── useSelection.ts # 选择逻辑
│       │   │   ├── useKeyboard.ts  # 快捷键
│       │   │   └── useAutoScroll.ts# 自动滚动
│       │   ├── types/        # TypeScript 类型
│       │   ├── utils/        # 工具函数
│       │   └── styles/       # 全局样式
│       └── package.json
└── ...
```

## 技术栈

- **Vue 3**：渐进式 JavaScript 框架
- **TypeScript**：类型安全
- **Pinia**：Vue 状态管理
- **Vite**：快速构建工具

## 浏览器兼容性

- Chrome >= 90
- Firefox >= 88
- Safari >= 14
- Edge >= 90

## 样式设计

组件采用现代化视觉设计：

- 🎨 支持自定义主色调（HSL 色彩系统）
- 🌓 支持亮色/暗色主题切换
- ✨ 微动画：按钮、图标、悬停效果
- 🌈 彩色轨道：不同类型 Clip 使用不同渐变色
- 🎯 视觉层次：阴影、圆角、过渡动画
- ⚡ 流畅体验：60fps 动画，GPU 加速

## License

MIT
- **Pinia**：Vue 状态管理
- **Vite**：快速构建工具

## 浏览器兼容性

- Chrome >= 90
- Firefox >= 88
- Safari >= 14
- Edge >= 90

## 样式设计

组件采用现代化、充满活力的视觉设计：

- 🎨 **渐变蓝紫色系**主题，简洁美观
- ✨ **微动画**：按钮、图标、悬停效果
- 🌈 **彩色轨道**：不同类型 Clip 使用不同渐变色
- 💎 **毛玻璃效果**：工具栏、菜单支持 backdrop-filter
- 🎯 **视觉层次**：阴影、圆角、过渡动画
- ⚡ **流畅体验**：60fps 动画，GPU 加速

详见 [样式设计指南](./docs/STYLE_GUIDE.md)

## API 文档

完整的 API 文档请参阅 [API 文档](./docs/API.md)，包含：

- 📋 **Props**：所有配置项详解
- 📡 **Events**：25+ 事件类型
- 🔧 **Methods**：40+ API 方法
- 🎰 **Slots**：丰富的插槽支持
- 🌍 **i18n**：国际化配置
- 🎨 **Theme**：主题定制

## License

MIT
