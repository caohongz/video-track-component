# 转场设计说明

## 转场的概念

转场（Transition）不是一个独立的轨道类型，而是添加在**相邻两个 Clip 之间**的过渡效果。

## 转场的位置

转场 Clip 位于同一轨道内，时间上跨越两个视频/音频 Clip 的交界处。

### 示例

```
主轨道（视频）:
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Video 1    │      │  Video 2    │      │  Video 3    │
│  0s - 5s    │      │  5s - 11s   │      │  11s - 16s  │
└─────────────┘      └─────────────┘      └─────────────┘
        └──┬──┘              └──┬──┘
           │                    │
      ┌────▼────┐          ┌────▼────┐
      │ 淡入淡出 │          │  滑动   │
      │ 4.5-5.5s│          │10.5-11.5s│
      └─────────┘          └─────────┘
      转场效果 1s           转场效果 1s
```

## 转场的特点

### 1. 时间重叠
- 转场与前后两个 Clip 在时间上有重叠
- 典型配置：前 Clip 的最后 0.5s + 后 Clip 的前 0.5s = 1s 转场

### 2. 视觉样式
- 半透明背景（区分于普通 Clip）
- 左右两侧有边框标识
- 居中显示转场类型和时长
- 图标较小，不抢眼

### 3. 交互限制
- 转场 Clip 可以删除
- 转场 Clip 可以调整时长（0.1s - 5s）
- 转场 Clip 不能自由拖动（位置由相邻 Clip 决定）
- 转场 Clip 通常由右键菜单"添加转场"创建

## 转场的实现

### 数据结构
```typescript
interface TransitionClip extends BaseClip {
  type: 'transition'
  transitionType: string // 转场类型（如 'fade', 'slide', 'wipe'）
  transitionDuration: number // 转场时长（0.1~5s）
  name: string // 转场名称
}
```

### 添加转场的时机
1. 两个 Clip 相邻（endTime1 == startTime2）
2. 用户右键选择"添加转场"
3. 自动计算转场位置（跨越交界处）

### 删除转场的影响
- 删除转场不影响前后 Clip 的位置
- 主轨道模式下，删除转场后 Clip 仍然连续

## 转场类型

常见的转场类型：
- `fade`：淡入淡出
- `slide`：滑动
- `wipe`：擦除
- `dissolve`：溶解
- `zoom`：缩放
- `rotate`：旋转

## UI 设计

### 转场 Clip 样式
- 半透明背景（不遮挡下层 Clip）
- 左右边框高亮（青色）
- 垂直居中显示
- 图标 + 名称 + 时长

### 与普通 Clip 的区别
- 普通 Clip：实心背景，完整边框
- 转场 Clip：半透明背景，仅左右边框

## 使用场景

转场主要用于：
1. **主轨道模式**：在连续的视频片段之间添加平滑过渡
2. **视频/音频轨道**：创建流畅的切换效果
3. **增强观感**：提升视频的专业性和流畅性

## 注意事项

1. 转场 Clip 始终在同一轨道内
2. 转场的时间范围通常跨越两个 Clip
3. 删除前后 Clip 时，应同时删除关联的转场
4. 移动 Clip 时，关联的转场应随之调整位置

## 渲染层实现

### 渲染策略

转场效果在 `VideoPreview` 组件中通过 `tickInterceptor` 机制实现：

```
时间轴示意（两个 clip 相接）：
Video 1:     ████████████████▓▓▓▓  （4.5s-5s 淡出）
                              ↘
                               转场混合
                              ↗
Video 2:                   ▓▓▓▓████████████████  （5s-5.5s 渐入）
             0s           4.5s  5s  5.5s        11s
                          ↑─────────↑
                           转场时间段
```

### 工作流程

1. **beforeClip（转场前的视频）**：
   - 在 `transition.startTime` 到 `beforeClip.endTime` 期间
   - 正常渲染并缓存帧（供 afterClip 混合使用）
   - 应用淡出效果（透明度随 progress 降低）

2. **afterClip（转场后的视频）**：
   - 在 `afterClip.startTime` 到 `transition.endTime` 期间
   - 读取 beforeClip 的缓存帧
   - 调用转场渲染器进行帧混合

### 支持的转场类型

| 类别 | 效果 |
|------|------|
| 淡入淡出 | `fade`, `dissolve` |
| 滑动 | `slide-left`, `slide-right`, `slide-up`, `slide-down` |
| 擦除 | `wipe-left`, `wipe-right`, `wipe-up`, `wipe-down` |
| 缩放 | `zoom-in`, `zoom-out` |
| 形状遮罩 | `circle`, `diamond`, `clock` |
| 其他 | `rotate`, `blur` |

### 关键代码位置

- 转场渲染器：`src/utils/transitionRenderers.ts`
- 转场检测逻辑：`VideoPreview/index.vue` 中的 `detectTransitions()`
- 帧混合逻辑：`VideoPreview/index.vue` 中的 `createFilteredTickInterceptor()`




