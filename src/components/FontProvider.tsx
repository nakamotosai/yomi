'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

interface FontProviderProps {
    children: React.ReactNode;
}

// 直接使用 Google Fonts 的字体名称
const FONT_SANS = '"Noto Sans SC", "Noto Sans JP", sans-serif';
const FONT_SERIF = '"Noto Serif SC", "Noto Serif JP", serif';

export default function FontProvider({ children }: FontProviderProps) {
    const { settings } = useAppStore();
    const fontFamily = settings?.fontFamily || 'sans';

    useEffect(() => {
        const fontValue = fontFamily === 'serif' ? FONT_SERIF : FONT_SANS;

        // 创建或更新 style 标签
        let styleEl = document.getElementById('yomi-font-style') as HTMLStyleElement;
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'yomi-font-style';
            document.head.appendChild(styleEl);
        }

        // 直接注入 CSS 规则覆盖所有元素
        styleEl.textContent = `
            html, body, * {
                font-family: ${fontValue} !important;
            }
        `;

        // 设置 data 属性
        document.body.setAttribute('data-font', fontFamily);

        console.log('[FontProvider] Applied font:', fontFamily, '| CSS:', fontValue);
    }, [fontFamily]);

    return <>{children}</>;
}
