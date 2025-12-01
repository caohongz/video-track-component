# 碰撞检测与防重叠设计

## 概述

为了保证 Clip 的可视性和操作便利性，组件实现了完整的碰撞检测机制，确保同一轨道内的 Clip（除转场外）不会重叠。

## 重叠检测算法

### 时间区间重叠判断

两个 Clip 在时间上重叠的条件：
```
Clip1: [start1, end1]
Clip2: [start2, end2]

重叠条件: start1 < end2 && end1 > start2
```

### 示例

```
情况1 - 完全重叠:
Clip1: |-------|
Clip2:   |-----|
结果: 重叠 ✗

情况2 - 部分重叠:
Clip1: |-------|
Clip2:       |-----|
结果: 重叠 ✗

情况3 - 相邻不重叠:
Clip1: |-------|
Clip2:         |-----|
结果: 不重叠 ✓

情况4 - 有间隙:
Clip1: |-------|
Clip2:             |-----|
结果: 不重叠 ✓
```

## 拖拽时的碰撞处理

### 检测流程

```
用户拖拽 Clip
    ↓
计算新位置
    ↓
检查是否会重叠 ──→ 不重叠 → 直接放置 ✓
    ↓
  会重叠
    ↓
查找最近的可用位置
    ↓
自动调整到可用位置 ✓
```

### 查找可用位置策略

1. **遍历轨道上所有 Clip**（按时间排序）
2. **检查每个间隙**是否足够放下当前 Clip
3. **选择最接近期望位置的间隙**
4. **特殊位置**：
   - 第一个 Clip 之前（时间 0 开始）
   - 每两个 Clip 之间
   - 最后一个 Clip 之后

### 代码实现

```typescript
function findNonOverlappingPosition(
  trackId: string,
  preferredStartTime: number,
  duration: number,
  excludeClipId: string
): number {
  // 1. 获取轨道所有非转场 Clips
  const clips = track.clips
    .filter(c => c.id !== excludeClipId && c.type !== 'transition')
    .sort((a, b) => a.startTime - b.startTime)

  // 2. 遍历查找可用间隙
  for (let i = 0; i < clips.length; i++) {
    const positionAfter = clips[i].endTime
    const nextClip = clips[i + 1]
    
    // 检查是否有足够空间
    if (!nextClip || positionAfter + duration <= nextClip.startTime) {
      // 找到可用位置，选择最接近期望位置的
      if (closer to preferred) {
        bestPosition = positionAfter
      }
    }
  }

  return bestPosition
}
```

## 转场的特殊处理

### 转场可以重叠

转场 Clip 是特殊的，它们：
- ✅ **可以与视频/音频 Clip 重叠**（这是转场的本质）
- ✅ **不参与碰撞检测**（检测时被忽略）
- ✅ **不影响其他 Clip 的放置**

### 示例

```
允许的布局:
Video1: |---------|
                 |淡入淡出|  ← 转场重叠在两个视频之间
Video2:          |---------|

不允许的布局:
Video1: |---------|
Video2:      |---------|  ← 两个视频不能重叠 ✗
```

## 跨轨移动模式

### 模式对比

| 模式 | 描述 | 行为 |
|------|------|------|
| **启用跨轨移动** | 默认模式 | Clip 可以拖拽到其他轨道 |
| **禁用跨轨移动** | 限制模式 | Clip 只能在当前轨道内移动 |

### 禁用跨轨移动时

```typescript
// 检测垂直移动
const isMovingVertically = Math.abs(deltaY) > 30

if (!enableCrossTrackDrag && isMovingVertically) {
  // 阻止跨轨移动，保持在原轨道
  return
}
```

## 主轨道模式的特殊规则

### 主轨道的连续排列

主轨道模式下，Clips 必须：
- ✅ **从 0 开始**
- ✅ **连续排列**（无间隙）
- ✅ **自动顺延**（插入时后方 Clip 后移）

### 插入逻辑

```
初始状态:
[Clip1: 0-5s][Clip2: 5-11s][Clip3: 11-16s]

插入 Clip4（3s 时长）到 5s 位置:
[Clip1: 0-5s][Clip4: 5-8s][Clip2: 8-14s][Clip3: 14-19s]
                             ↑           ↑
                           自动后移    自动后移
```

## 性能优化

### 快速检测

1. **提前返回**：如果轨道为空，无需检测
2. **排序一次**：Clips 按 startTime 排序后缓存
3. **忽略转场**：转场 Clip 在检测时直接跳过

### 时间复杂度

- **单次检测**：O(n)，n 为轨道上的 Clip 数量
- **查找位置**：O(n log n)，包含排序

## 边界情况处理

### 1. 轨道为空
```typescript
if (clips.length === 0) {
  return Math.max(0, preferredStartTime)
}
```

### 2. 所有位置都被占满
```typescript
// 放在最后一个 Clip 之后
return lastClip.endTime
```

### 3. Clip 时长大于所有间隙
```typescript
// 选择最大的间隙或放在末尾
return findLargestGap() || lastClip.endTime
```

## 用户反馈

### 视觉提示

当 Clip 因重叠被调整位置时：
- Clip 自动移动到最近的可用位置
- 吸附功能辅助定位
- 无需额外提示（行为自然）

### 操作提示

- 拖拽时 Clip 跟手移动
- 释放时自动调整到有效位置
- 如果期望位置无效，自动选择最近的有效位置

## 配置项

```vue
<VideoTrack
  :enable-cross-track-drag="true"  <!-- 允许跨轨移动 -->
  :enable-main-track-mode="false"   <!-- 主轨道模式 -->
/>
```

### 组合效果

| 主轨道模式 | 跨轨移动 | 效果 |
|-----------|---------|------|
| ❌ | ❌ | 只能同轨移动，不能重叠 |
| ❌ | ✅ | 可以跨轨移动，不能重叠 |
| ✅ | ❌ | 主轨道连续排列，不能跨轨 |
| ✅ | ✅ | 主轨道连续排列，可以跨轨 |




