import { ref, onMounted } from 'vue'

export type Theme = 'light' | 'dark'

export interface ThemeColor {
    name: string
    hue: number
    saturation: number
    lightness: number
}

// 预设主色调
export const PRESET_COLORS: ThemeColor[] = [
    { name: '默认蓝', hue: 224, saturation: 71, lightness: 61 },
    { name: '科技紫', hue: 270, saturation: 65, lightness: 58 },
    { name: '活力橙', hue: 25, saturation: 95, lightness: 53 },
    { name: '清新绿', hue: 142, saturation: 76, lightness: 46 },
    { name: '天空蓝', hue: 199, saturation: 89, lightness: 48 },
    { name: '热情红', hue: 348, saturation: 83, lightness: 47 },
    { name: '优雅粉', hue: 340, saturation: 82, lightness: 52 },
    { name: '沉稳青', hue: 187, saturation: 47, lightness: 42 }
]

const THEME_KEY = 'video-track-theme'
const COLOR_KEY = 'video-track-color'

export function useTheme() {
    const theme = ref<Theme>('dark')
    const currentColor = ref<ThemeColor>(PRESET_COLORS[0])

    // 应用主题到 DOM
    const applyTheme = (newTheme: Theme) => {
        document.documentElement.setAttribute('data-theme', newTheme)
        theme.value = newTheme
        localStorage.setItem(THEME_KEY, newTheme)
    }

    // 应用主色调到 DOM
    const applyColor = (color: ThemeColor) => {
        const root = document.documentElement
        root.style.setProperty('--theme-hue', String(color.hue))
        root.style.setProperty('--theme-saturation', `${color.saturation}%`)
        root.style.setProperty('--theme-lightness', `${color.lightness}%`)
        currentColor.value = color
        localStorage.setItem(COLOR_KEY, JSON.stringify(color))
    }

    // 切换主题
    const toggleTheme = () => {
        const newTheme = theme.value === 'dark' ? 'light' : 'dark'
        applyTheme(newTheme)
    }

    // 设置主色调
    const setColor = (color: ThemeColor) => {
        applyColor(color)
    }

    // 初始化
    onMounted(() => {
        // 加载保存的主题
        const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null
        if (savedTheme) {
            applyTheme(savedTheme)
        } else {
            // 检测系统主题
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
            applyTheme(prefersDark ? 'dark' : 'light')
        }

        // 加载保存的颜色
        const savedColor = localStorage.getItem(COLOR_KEY)
        if (savedColor) {
            try {
                const color = JSON.parse(savedColor) as ThemeColor
                applyColor(color)
            } catch {
                applyColor(PRESET_COLORS[0])
            }
        } else {
            applyColor(PRESET_COLORS[0])
        }
    })

    return {
        theme,
        currentColor,
        toggleTheme,
        setColor,
        presetColors: PRESET_COLORS
    }
}
