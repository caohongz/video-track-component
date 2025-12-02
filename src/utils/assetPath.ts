/// <reference types="vite/client" />

/**
 * 获取静态资源的完整路径
 * 在开发环境和生产环境（如 GitHub Pages）都能正确工作
 * @param path 资源相对路径，如 'assets/video/bunny_0.mp4'
 * @returns 完整的资源路径
 */
export function getAssetPath(path: string): string {
    // 移除开头的斜杠（如果有）
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    // import.meta.env.BASE_URL 在开发环境是 '/'，在生产环境是 '/video-track-component/'
    const base = import.meta.env.BASE_URL;
    return `${base}${cleanPath}`;
}

/**
 * 视频资源路径
 */
export function getVideoPath(filename: string): string {
    return getAssetPath(`assets/video/${filename}`);
}

/**
 * 音频资源路径
 */
export function getAudioPath(filename: string): string {
    return getAssetPath(`assets/audio/${filename}`);
}
