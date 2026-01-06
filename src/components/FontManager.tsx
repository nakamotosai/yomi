'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

// 直接使用字体名称，不依赖 CSS 变量
const FONT_SANS = '"Noto Sans SC", "Noto Sans JP", "Hiragino Sans", "Microsoft YaHei", sans-serif';
const FONT_SERIF = '"Noto Serif SC", "Noto Serif JP", "Hiragino Mincho ProN", "SimSun", serif';

export default function FontManager() {
    const { settings } = useAppStore();

    useEffect(() => {
        const fontFamily = settings?.fontFamily || 'sans';
        const fontValue = fontFamily === 'serif' ? FONT_SERIF : FONT_SANS;

        // 设置 data 属性
        document.documentElement.setAttribute('data-font', fontFamily);
        document.body.setAttribute('data-font', fontFamily);

        // 直接设置 CSS 样式（最高优先级）
        document.documentElement.style.setProperty('font-family', fontValue, 'important');
        document.body.style.setProperty('font-family', fontValue, 'important');

        // 遍历所有元素强制应用字体（确保覆盖 Tailwind 等框架样式）
        const allElements = document.querySelectorAll('*');
        allElements.forEach((el) => {
            if (el instanceof HTMLElement) {
                el.style.setProperty('font-family', 'inherit', 'important');
            }
        });

        console.log('[FontManager] Font changed to:', fontFamily, '| Value:', fontValue);
    }, [settings?.fontFamily]);

    return null;
}
