import { useCallback, useMemo } from 'react';
import zh from '../locales/zh.json';
import ja from '../locales/ja.json';
import { useAppStore } from '../store/useAppStore';

const translations = { zh, ja };

export type TranslationKey = string; // Simplified for dynamic access

/**
 * 极简 i18n 工具
 * 支持对象路径，如 "settings.appearance.theme"
 */
export function useI18n() {
    const language = useAppStore((state) => state.uiLanguage) || 'zh';

    // Memoize the dictionary reference
    const dict = useMemo(() => (translations as any)[language] || translations.zh, [language]);

    const t = useCallback((keyPath: string): string => {
        const keys = keyPath.split('.');
        let result: any = dict;

        for (const key of keys) {
            if (result && typeof result === 'object' && key in result) {
                result = result[key];
            } else {
                console.warn(`[i18n] Key path not found: ${keyPath} in ${language}`);
                return keyPath;
            }
        }

        return typeof result === 'string' ? result : keyPath;
    }, [dict, language]);

    return { t, language };
}
