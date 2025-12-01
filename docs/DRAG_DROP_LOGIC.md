# 拖拽放置逻辑说明

## 概述

组件支持两种拖拽模式：**同轨移动**和**跨轨移动**，每种模式有不同的碰撞处理策略。

## 一、同轨移动模式

### 场景
- `enableCrossTrackDrag = false`（禁用跨轨）
- 或者水平拖拽（垂直移动 < 40px）

### 智能放置规则

当拖拽的 Clip 与目标位置的 Clip 重叠时，根据**鼠标位置**决定放在前面还是后面。

#### 判断逻辑

```typescript
// 计算移动 Clip 的中心位置
const movingCenter = (movingClip.startTime + movingClip.endTime) / 2

// 计算已存在 Clip 的中心位置
const existingCenter = (existingClip.startTime + existingClip.endTime) / 2

if (movingCenter < existingCenter) {
  // 移动 Clip 的中心在左侧 → 放在前面
  position = existingClip.startTime - movingClipDuration
} else {
  // 移动 Clip 的中心在右侧 → 放在后面
  position = existingClip.endTime
}
```

#### 示例

**场景1：向右拖拽，鼠标靠近已存在 Clip 的左侧**
```
拖拽前:
[Moving]              [Existing]
0-3s                  10-15s

拖拽到 9s（中心在 Existing 左侧）:
                 [Moving]
                 [Existing]
                 7-10s    10-15s
                 ↑ 自动放在前面（紧贴）
```

**场景2：向右拖拽，鼠标靠近已存在 Clip 的右侧**
```
拖拽前:
[Moving]              [Existing]
0-3s                  10-15s

拖拽到 13s（中心在 Existing 右侧）:
                 [Existing][Moving]
                 10-15s    15-18s
                           ↑ 自动放在后面（紧贴）
```

**场景3：向左拖拽**
```
拖拽前:
[Existing]            [Moving]
0-5s                  10-13s

拖拽到 3s（中心在 Existing 右侧）:
[Existing][Moving]
0-5s      5-8s
          ↑ 自动放在后面（紧贴）
```

### 边界情况

1. **放在前面时，起始位置 < 0**
   ```
   移动到 0 位置
   [Moving][Existing]
   0-3s    3-8s
   ```

2. **多个 Clip 重叠**
   ```
   只处理第一个检测到重叠的 Clip
   其他 Clips 按相对位置调整
   ```

## 二、跨轨移动模式

### 场景
- `enableCrossTrackDrag = true`（启用跨轨）
- 垂直拖拽（垂直移动 ≥ 40px）

### 智能放置规则

#### 规则1：目标轨道无重叠
```
源轨道:    [Moving]
           ↓ 垂直拖拽
目标轨道:  [ClipA]        [ClipB]
           0-5s           15-20s

结果:      [ClipA] [Moving] [ClipB]
           0-5s    7-10s     15-20s
           ✓ 直接放置在目标轨道
```

#### 规则2：目标轨道有重叠 → 新建轨道
```
源轨道:    [Moving]
           ↓ 垂直拖拽
目标轨道:  [ClipA][ClipB]
           0-5s   5-10s
           ↑ 目标位置 7s 会重叠

结果:      新建同类型轨道
新轨道:    [Moving]
           7-10s
           ✓ 放置在新轨道
```

### 新建轨道规则

1. **轨道类型**：与目标轨道相同类型
2. **轨道名称**：`类型名称 + 数量`（如"视频3"）
3. **轨道顺序**：放在所有轨道之后
4. **自动命名**：
   - 视频 → 视频1, 视频2, 视频3...
   - 音频 → 音频1, 音频2, 音频3...
   - 其他类型同理

### 跨轨移动触发条件

```typescript
const deltaY = event.clientY - dragStartY
const isMovingVertically = Math.abs(deltaY) > 40 // 垂直移动超过 40px

if (isMovingVertically && enableCrossTrackDrag) {
  // 识别目标轨道
  const targetTrackId = getTargetTrackId(event.clientY)
  // 执行跨轨移动...
}
```

## 三、多选拖拽

### 保持相对位置

拖拽多个选中的 Clips 时，它们的相对时间位置保持不变。

```
选中 Clip1 和 Clip2:
[Clip1]    [Clip2]
0-3s       5-8s
↑ 间隔 2s

拖拽到 10s:
          [Clip1]    [Clip2]
          10-13s     15-18s
          ↑ 间隔仍为 2s
```

### 碰撞检测

- 只检测**第一个 Clip**（primary clip）的碰撞
- 其他 Clips 跟随第一个 Clip 移动
- 选中的 Clips 之间**允许重叠**（它们是一组）

## 四、吸附功能

### 吸附目标

1. **时间刻度**：根据缩放比例的刻度点（0.2s/0.5s/1s/2s）
2. **其他 Clip 边缘**：同轨道非选中 Clips 的开始和结束位置

### 吸附优先级

```
拖拽时的吸附：
1. 首先吸附到刻度
2. 其次吸附到其他 Clip 边缘
3. 选择最近的吸附点（阈值 10px）
```

### 吸附与碰撞的关系

1. **先吸附**：计算吸附后的位置
2. **后检测**：检查吸附位置是否会重叠
3. **再调整**：如果重叠，应用智能放置规则

## 五、配置组合效果

| 主轨道模式 | 跨轨移动 | 拖拽行为 |
|-----------|---------|----------|
| ❌ | ❌ | 仅同轨移动，智能放置前/后 |
| ❌ | ✅ | 可跨轨移动，重叠时新建轨道 |
| ✅ | ❌ | 主轨道连续排列，不可跨轨 |
| ✅ | ✅ | 主轨道连续，可移出/移入 |

## 六、转场的特殊处理

### 转场不参与碰撞

```typescript
// 检测重叠时忽略转场
if (clip.type === 'transition') return false
```

### 转场可以重叠

转场 Clip 的本质是跨越两个视频 Clip 的交界，因此：
- ✅ 转场与视频/音频 Clip 重叠是正常的
- ✅ 不影响其他 Clips 的放置
- ✅ 不会触发新建轨道

## 七、性能优化

### 实时移动

拖拽过程中（`mousemove`）：
- 仅更新 Clip 的视觉位置
- 不检测碰撞（性能考虑）
- 不调整到最终位置

### 松手时处理

拖拽结束时（`mouseup`）：
- 执行碰撞检测
- 应用智能放置规则
- 保存历史记录

## 八、用户体验

### 视觉反馈

1. **拖拽中**：Clip 跟随鼠标移动
2. **重叠时**：Clip 保持跟手，不立即调整
3. **松手时**：Clip 自动调整到正确位置（有动画）

### 预期行为

- ✅ 拖拽时完全跟手
- ✅ 松手时智能放置
- ✅ 不会出现重叠
- ✅ 跨轨时自动新建轨道
- ✅ 多选时保持相对位置

## 九、示例场景

### 场景A：向右移动遇到阻挡

```
初始:
[A]         [B]     [C]
0-3s        8-12s   15-20s

拖拽 A 到 10s（与 B 重叠，中心偏右）:
            [B][A]  [C]
            8-12s   15-20s
                ↑ 自动放在 B 后面（12s）
```

### 场景B：向左移动遇到阻挡

```
初始:
[A]         [B]     [C]
0-3s        8-12s   15-20s

拖拽 C 到 10s（与 B 重叠，中心偏左）:
[A]     [C][B]
0-3s    5-8s  8-12s
        ↑ 自动放在 B 前面（8-3=5s）
```

### 场景C：跨轨移动有重叠

```
轨道1: [A]
       0-5s
       ↓ 垂直拖拽到轨道2
       
轨道2: [B][C][D]
       0-3s 3-6s 6-10s
       ↑ 所有位置都被占满

结果:  新建轨道3
轨道3: [A]
       0-5s
       ✓ 放置在新轨道
```

## 十、调试技巧

### 查看拖拽状态

```javascript
// 控制台输出
console.log('拖拽的 Clips:', draggedClips.value)
console.log('目标轨道:', targetTrackId)
console.log('是否重叠:', hasOverlap)
console.log('放置位置:', position)
```

### 常见问题

1. **Clips 仍然重叠**
   - 检查是否禁用了碰撞检测
   - 确认转场 Clips 被正确忽略

2. **跨轨不生效**
   - 确认 `enableCrossTrackDrag = true`
   - 垂直移动距离需 ≥ 40px
   - 检查目标轨道的 `data-track-id`

3. **新建轨道失败**
   - 检查轨道类型配置
   - 确认未达到最大数量限制




