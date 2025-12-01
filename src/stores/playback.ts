import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePlaybackStore = defineStore('playback', () => {
  // 状态
  const currentTime = ref(0)
  const duration = ref(120) // 默认 2 分钟
  const isPlaying = ref(false)
  const playbackRate = ref(1)

  // 播放定时器
  let playInterval: number | null = null

  // 播放
  function play() {
    if (isPlaying.value) return
    isPlaying.value = true
    
    // 模拟播放进度
    playInterval = window.setInterval(() => {
      if (currentTime.value >= duration.value) {
        pause()
        currentTime.value = 0
      } else {
        currentTime.value += 0.1 * playbackRate.value
      }
    }, 100)
  }

  // 暂停
  function pause() {
    isPlaying.value = false
    if (playInterval) {
      clearInterval(playInterval)
      playInterval = null
    }
  }

  // 跳转到指定时间
  function seekTo(time: number) {
    currentTime.value = Math.max(0, Math.min(time, duration.value))
  }

  // 设置播放速度
  function setPlaybackRate(rate: number) {
    playbackRate.value = rate
  }

  // 设置总时长
  function setDuration(newDuration: number) {
    duration.value = newDuration
  }

  return {
    currentTime,
    duration,
    isPlaying,
    playbackRate,
    play,
    pause,
    seekTo,
    setPlaybackRate,
    setDuration
  }
})
