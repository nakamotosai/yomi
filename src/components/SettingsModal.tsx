'use client';

import React, { useEffect, useState } from 'react';
import {
    X, Type, Eye, EyeOff, Music, Server, Globe, BookOpen, Palette,
    Speaker, Languages, Sparkles, Sun, Moon, Info, RotateCcw,
    Github, Keyboard, ExternalLink
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ttsManager } from '@/lib/tts/manager';
import { PartOfSpeech } from '@/types';
import { COLOR_THEMES, ThemeId } from '@/lib/colorThemes';
import clsx from 'clsx';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type TabId = 'appearance' | 'reading' | 'audio' | 'about';

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const { settings, updateSettings, toggleSetting } = useAppStore();
    const [availableVoices, setAvailableVoices] = useState<{ id: string; name: string }[]>([]);
    const [activeTab, setActiveTab] = useState<TabId>('appearance');
    const isDark = settings.theme === 'dark';

    useEffect(() => {
        if (!isOpen) return;
        ttsManager.getVoices(settings.ttsProvider).then(voices => {
            setAvailableVoices(voices);
        });
    }, [isOpen, settings.ttsProvider]);

    if (!isOpen) return null;

    const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
        { id: 'appearance', label: '外观', icon: Palette },
        { id: 'reading', label: '阅读', icon: BookOpen },
        { id: 'audio', label: '语音', icon: Speaker },
        { id: 'about', label: '关于', icon: Info },
    ];

    const handleResetSettings = () => {
        if (confirm('确定要重置所有设置为默认值吗？')) {
            localStorage.removeItem('yomi-app-store-v4');
            window.location.reload();
        }
    };

    // 通用样式
    const cardStyle = {
        background: 'var(--bg-elevated)',
        border: `1px solid var(--border-default)`,
    };

    const sectionTitleStyle = { color: 'var(--text-faint)' };
    const labelStyle = { color: 'var(--text-primary)' };
    const descStyle = { color: 'var(--text-muted)' };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 min-h-screen"
            style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <div
                className="rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
                style={{
                    maxHeight: '85vh',
                    background: 'var(--bg-elevated)',
                    border: `1px solid var(--border-default)`
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="flex-none flex items-center justify-between px-6 py-4"
                    style={{
                        borderBottom: `1px solid var(--border-default)`,
                        background: 'var(--bg-elevated)'
                    }}
                >
                    <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>设置</h2>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 rounded-full transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div
                    className="flex-none flex px-4 gap-1"
                    style={{
                        borderBottom: `1px solid var(--border-default)`,
                        background: 'var(--bg-elevated)'
                    }}
                >
                    {tabs.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className="flex items-center gap-1.5 px-4 py-2.5 my-1 text-sm font-medium transition-all rounded-lg relative"
                                style={{
                                    color: isActive ? (isDark ? 'white' : 'var(--text-primary)') : 'var(--text-muted)',
                                    background: isActive
                                        ? (isDark ? 'transparent' : 'rgba(255, 255, 255, 0.9)')
                                        : 'transparent',
                                    boxShadow: isActive && !isDark
                                        ? '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)'
                                        : 'none',
                                    border: isActive && !isDark
                                        ? '1px solid rgba(148, 163, 184, 0.2)'
                                        : '1px solid transparent'
                                }}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                                {/* 深色模式保留彩虹下划线 */}
                                {isActive && isDark && (
                                    <div
                                        className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                                        style={{
                                            background: 'linear-gradient(to right, #ec4899, #8b5cf6, #3b82f6)',
                                            boxShadow: '0 -2px 8px rgba(139, 92, 246, 0.5)'
                                        }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Content Area - Scrollable - 毛玻璃效果 */}
                <div
                    className="flex-1 overflow-y-auto p-6"
                    style={{
                        background: isDark
                            ? 'rgba(30, 30, 40, 0.85)'
                            : 'rgba(255, 255, 255, 0.6)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)'
                    }}
                >

                    {/* ==================== 外观 TAB ==================== */}
                    {activeTab === 'appearance' && (
                        <div className="space-y-4">
                            {/* 主题 + 字体风格 - 一行两列 */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* 主题切换 */}
                                <div>
                                    <h3 className="text-xs font-medium mb-2" style={sectionTitleStyle}>主题</h3>
                                    <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: isDark ? 'transparent' : 'rgba(0,0,0,0.03)' }}>
                                        {[
                                            { id: 'light', label: '浅色', icon: Sun },
                                            { id: 'dark', label: '深色', icon: Moon }
                                        ].map((t) => (
                                            <button
                                                key={t.id}
                                                onClick={() => updateSettings({ theme: t.id as 'light' | 'dark' })}
                                                className={clsx(
                                                    "flex-1 py-2 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5",
                                                    isDark && settings.theme === t.id && "rainbow-highlight"
                                                )}
                                                style={{
                                                    background: settings.theme === t.id
                                                        ? (isDark ? 'rgba(0,0,0,0.4)' : 'white')
                                                        : 'transparent',
                                                    backdropFilter: settings.theme === t.id && isDark ? 'blur(8px)' : 'none',
                                                    WebkitBackdropFilter: settings.theme === t.id && isDark ? 'blur(8px)' : 'none',
                                                    border: isDark
                                                        ? (settings.theme === t.id ? 'none' : '1px solid rgba(255,255,255,0.15)')
                                                        : 'none',
                                                    borderRadius: '8px',
                                                    color: settings.theme === t.id ? (isDark ? 'white' : 'var(--text-primary)') : 'var(--text-muted)',
                                                    boxShadow: settings.theme === t.id && !isDark ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                                                }}
                                            >
                                                <t.icon className="w-3.5 h-3.5" />
                                                <span>{t.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 字体风格 */}
                                <div>
                                    <h3 className="text-xs font-medium mb-2" style={sectionTitleStyle}>字体</h3>
                                    <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: isDark ? 'transparent' : 'rgba(0,0,0,0.03)' }}>
                                        {[
                                            { id: 'serif', label: '宋体' },
                                            { id: 'sans', label: '黑体' }
                                        ].map((font) => (
                                            <button
                                                key={font.id}
                                                onClick={() => updateSettings({ fontFamily: font.id as 'sans' | 'serif' })}
                                                className={clsx(
                                                    "flex-1 py-2 rounded-md text-xs font-medium transition-all",
                                                    isDark && settings.fontFamily === font.id && "rainbow-highlight"
                                                )}
                                                style={{
                                                    background: settings.fontFamily === font.id
                                                        ? (isDark ? 'rgba(0,0,0,0.4)' : 'white')
                                                        : 'transparent',
                                                    backdropFilter: settings.fontFamily === font.id && isDark ? 'blur(8px)' : 'none',
                                                    WebkitBackdropFilter: settings.fontFamily === font.id && isDark ? 'blur(8px)' : 'none',
                                                    border: isDark
                                                        ? (settings.fontFamily === font.id ? 'none' : '1px solid rgba(255,255,255,0.15)')
                                                        : 'none',
                                                    borderRadius: '8px',
                                                    color: settings.fontFamily === font.id ? (isDark ? 'white' : 'var(--text-primary)') : 'var(--text-muted)',
                                                    boxShadow: settings.fontFamily === font.id && !isDark ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                                                }}
                                            >
                                                {font.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* 字体大小 */}
                            <div>
                                <h3 className="text-xs font-medium mb-2" style={sectionTitleStyle}>字体大小</h3>
                                <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: isDark ? 'transparent' : 'rgba(0,0,0,0.03)' }}>
                                    {[
                                        { id: 'small', label: '小' },
                                        { id: 'medium', label: '中' },
                                        { id: 'large', label: '大' }
                                    ].map((size) => (
                                        <button
                                            key={size.id}
                                            onClick={() => updateSettings({ fontSize: size.id as 'small' | 'medium' | 'large' })}
                                            className={clsx(
                                                "flex-1 py-2 rounded-md text-xs font-medium transition-all",
                                                isDark && settings.fontSize === size.id && "rainbow-highlight"
                                            )}
                                            style={{
                                                background: settings.fontSize === size.id
                                                    ? (isDark ? 'rgba(0,0,0,0.4)' : 'white')
                                                    : 'transparent',
                                                backdropFilter: settings.fontSize === size.id && isDark ? 'blur(8px)' : 'none',
                                                WebkitBackdropFilter: settings.fontSize === size.id && isDark ? 'blur(8px)' : 'none',
                                                border: isDark
                                                    ? (settings.fontSize === size.id ? 'none' : '1px solid rgba(255,255,255,0.15)')
                                                    : 'none',
                                                borderRadius: '8px',
                                                color: settings.fontSize === size.id ? (isDark ? 'white' : 'var(--text-primary)') : 'var(--text-muted)',
                                                boxShadow: settings.fontSize === size.id && !isDark ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                                            }}
                                        >
                                            {size.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 词性配色 + 颜色高亮 - 并排 */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* 词性配色风格 */}
                                <div>
                                    <h3 className="text-xs font-medium mb-2" style={sectionTitleStyle}>高亮样式</h3>
                                    <div className="space-y-1">
                                        {(Object.keys(COLOR_THEMES) as ThemeId[]).map((themeKey) => {
                                            const theme = COLOR_THEMES[themeKey];
                                            const isSelected = settings.colorTheme === themeKey;
                                            return (
                                                <button
                                                    key={themeKey}
                                                    onClick={() => updateSettings({ colorTheme: themeKey })}
                                                    className={clsx(
                                                        "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all text-left",
                                                        isDark && isSelected && "rainbow-highlight"
                                                    )}
                                                    style={{
                                                        background: isSelected
                                                            ? (isDark ? 'rgba(0,0,0,0.4)' : 'white')
                                                            : 'transparent',
                                                        backdropFilter: isSelected && isDark ? 'blur(8px)' : 'none',
                                                        WebkitBackdropFilter: isSelected && isDark ? 'blur(8px)' : 'none',
                                                        border: isDark
                                                            ? (isSelected ? 'none' : '1px solid rgba(255,255,255,0.15)')
                                                            : 'none',
                                                        borderRadius: '8px',
                                                        boxShadow: isSelected && !isDark ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                                                    }}
                                                >
                                                    <div className="flex gap-0.5">
                                                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#84A69D' }} />
                                                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#C8733A' }} />
                                                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#B8956B' }} />
                                                    </div>
                                                    <span className="text-xs" style={{ color: isSelected && isDark ? 'white' : 'var(--text-primary)' }}>
                                                        {theme.name}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* 词性颜色高亮 */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-xs font-medium" style={sectionTitleStyle}>颜色高亮</h3>
                                        <div className="flex gap-1.5 text-[10px]">
                                            <button onClick={() => updateSettings({ activeColorPOS: Object.values(PartOfSpeech) })} style={{ color: 'var(--text-primary)' }}>全选</button>
                                            <span style={{ color: 'var(--text-faint)' }}>|</span>
                                            <button onClick={() => updateSettings({ activeColorPOS: [] })} style={{ color: 'var(--text-muted)' }}>全关</button>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        {[
                                            { label: '名词', color: '#84A69D', members: [PartOfSpeech.NOUN, PartOfSpeech.PREFIX, PartOfSpeech.SUFFIX] },
                                            { label: '动词', color: '#C8733A', members: [PartOfSpeech.VERB, PartOfSpeech.AUXILIARY] },
                                            { label: '形容词/副词', color: '#B8956B', members: [PartOfSpeech.ADJECTIVE, PartOfSpeech.ADVERB] },
                                            { label: '助词/连词', color: '#9B8AA5', members: [PartOfSpeech.PARTICLE, PartOfSpeech.CONJUNCTION, PartOfSpeech.INTERJECTION, PartOfSpeech.OTHER, PartOfSpeech.SYMBOL] },
                                        ].map((group) => {
                                            const currentList = settings.activeColorPOS || [];
                                            const isFullyActive = group.members.every(m => currentList.includes(m));
                                            return (
                                                <button
                                                    key={group.label}
                                                    onClick={() => {
                                                        let newActive: PartOfSpeech[];
                                                        if (isFullyActive) {
                                                            newActive = currentList.filter(p => !group.members.includes(p));
                                                        } else {
                                                            newActive = [...new Set([...currentList, ...group.members])];
                                                        }
                                                        updateSettings({ activeColorPOS: newActive });
                                                    }}
                                                    className={clsx(
                                                        "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all text-left",
                                                        isDark && isFullyActive && "rainbow-highlight"
                                                    )}
                                                    style={{
                                                        background: isFullyActive
                                                            ? (isDark ? 'rgba(0,0,0,0.4)' : 'white')
                                                            : 'transparent',
                                                        backdropFilter: isFullyActive && isDark ? 'blur(8px)' : 'none',
                                                        WebkitBackdropFilter: isFullyActive && isDark ? 'blur(8px)' : 'none',
                                                        border: isDark
                                                            ? (isFullyActive ? 'none' : '1px solid rgba(255,255,255,0.15)')
                                                            : 'none',
                                                        borderRadius: '8px',
                                                        boxShadow: isFullyActive && !isDark ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                                                    }}
                                                >
                                                    <div
                                                        className="w-2.5 h-2.5 rounded-full transition-opacity"
                                                        style={{ background: group.color, opacity: isFullyActive ? 1 : 0.3 }}
                                                    />
                                                    <span className="text-xs" style={{ color: isFullyActive ? (isDark ? 'white' : 'var(--text-primary)') : 'var(--text-muted)' }}>
                                                        {group.label}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ==================== 阅读 TAB ==================== */}
                    {activeTab === 'reading' && (
                        <div className="space-y-6">
                            {/* 假名显示 */}
                            <section className="space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={sectionTitleStyle}>假名显示</h3>
                                <div className="space-y-3 rounded-xl p-1 shadow-sm" style={cardStyle}>
                                    <SettingToggle
                                        icon={<Type className="w-4 h-4" style={{ color: 'var(--color-noun)' }} />}
                                        label="显示假名 (Furigana)"
                                        description="在汉字上方显示读音"
                                        checked={settings.showFurigana}
                                        onChange={() => toggleSetting('showFurigana')}
                                        isDark={isDark}
                                    />
                                    <Divider isDark={isDark} />
                                    <SettingToggle
                                        icon={<BookOpen className="w-4 h-4" style={{ color: '#f97316' }} />}
                                        label="隐藏简单词假名"
                                        description="自动隐藏 N5/N4 级别常用词的读音"
                                        checked={settings.hideCommonFurigana}
                                        onChange={() => toggleSetting('hideCommonFurigana')}
                                        isDark={isDark}
                                    />
                                </div>
                            </section>

                            {/* 学习辅助 */}
                            <section className="space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={sectionTitleStyle}>学习辅助</h3>
                                <div className="space-y-3 rounded-xl p-1 shadow-sm" style={cardStyle}>
                                    <SettingToggle
                                        icon={<Music className="w-4 h-4" style={{ color: 'var(--color-verb)' }} />}
                                        label="显示声调 (Pitch Accent)"
                                        description="使用音高线标注单词声调"
                                        checked={settings.showPitchAccent}
                                        onChange={() => toggleSetting('showPitchAccent')}
                                        isDark={isDark}
                                    />
                                    <Divider isDark={isDark} />
                                    <SettingToggle
                                        icon={<Languages className="w-4 h-4" style={{ color: 'var(--color-adverb)' }} />}
                                        label="显示中文翻译"
                                        description="在每个句子下方显示翻译"
                                        checked={settings.showTranslation}
                                        onChange={() => toggleSetting('showTranslation')}
                                        isDark={isDark}
                                    />
                                    <Divider isDark={isDark} />
                                    <SettingToggle
                                        icon={<Sparkles className="w-4 h-4" style={{ color: 'var(--color-adjective)' }} />}
                                        label="卡拉OK高亮"
                                        description="朗读时高亮当前单词"
                                        checked={settings.karaokeMode}
                                        onChange={() => toggleSetting('karaokeMode')}
                                        isDark={isDark}
                                    />
                                    <Divider isDark={isDark} />
                                    <SettingToggle
                                        icon={settings.hideParticles ? <EyeOff className="w-4 h-4" style={{ color: 'var(--color-auxiliary)' }} /> : <Eye className="w-4 h-4" style={{ color: 'var(--text-faint)' }} />}
                                        label="助词填空模式"
                                        description="将助词隐藏为 ____ 进行练习"
                                        checked={settings.hideParticles}
                                        onChange={() => toggleSetting('hideParticles')}
                                        isDark={isDark}
                                    />
                                </div>
                            </section>
                        </div>
                    )}

                    {/* ==================== 语音 TAB ==================== */}
                    {activeTab === 'audio' && (
                        <div className="space-y-6">
                            <section className="space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={sectionTitleStyle}>TTS 引擎</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'native', label: '微软 Edge', icon: Globe },
                                        { id: 'voicevox', label: 'VOICEVOX', icon: Server },
                                    ].map((opt) => {
                                        const isSelected = settings.ttsProvider === opt.id;
                                        return (
                                            <button
                                                key={opt.id}
                                                onClick={() => updateSettings({ ttsProvider: opt.id as 'native' | 'voicevox' })}
                                                className={clsx(
                                                    "flex flex-col items-center justify-center gap-2 py-4 rounded-xl text-sm font-medium transition-all",
                                                    isDark && isSelected && "rainbow-highlight"
                                                )}
                                                style={{
                                                    background: isSelected
                                                        ? (isDark ? 'transparent' : 'var(--bg-elevated)')
                                                        : (isDark ? 'var(--bg-muted)' : 'white'),
                                                    border: isSelected && isDark ? 'none' : `1px solid ${isSelected ? 'var(--border-default)' : 'var(--border-default)'}`,
                                                    color: isSelected ? (isDark ? 'white' : 'var(--text-primary)') : 'var(--text-muted)',
                                                    boxShadow: !isDark && isSelected ? 'var(--shadow-md)' : 'none'
                                                }}
                                            >
                                                <opt.icon className="w-6 h-6 mb-1 opacity-80" />
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>

                            {settings.ttsProvider === 'native' && (
                                <div className="space-y-2 p-4 rounded-xl shadow-sm" style={cardStyle}>
                                    <label className="text-sm font-medium" style={labelStyle}>选择声音 (Edge)</label>
                                    <select
                                        className={clsx(
                                            "w-full p-2 rounded-lg focus:outline-none appearance-none",
                                            isDark && "rainbow-input"
                                        )}
                                        style={{
                                            background: isDark ? 'var(--bg-subtle)' : 'var(--bg-subtle)',
                                            border: isDark ? '1px solid transparent' : `1px solid var(--border-default)`,
                                            color: 'var(--text-primary)',
                                            colorScheme: isDark ? 'dark' : 'light'
                                        }}
                                        value={settings.nativeVoiceURI || ''}
                                        onChange={(e) => updateSettings({ nativeVoiceURI: e.target.value })}
                                    >
                                        <option value="">默认 (Default)</option>
                                        {availableVoices.map(v => (
                                            <option key={v.id} value={v.id}>{v.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {settings.ttsProvider === 'voicevox' && (
                                <div className="space-y-4 p-4 rounded-xl shadow-sm animate-in fade-in" style={cardStyle}>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium" style={labelStyle}>选择角色 (Speaker)</label>
                                        <select
                                            className={clsx(
                                                "w-full p-2 rounded-lg focus:outline-none appearance-none",
                                                isDark && "rainbow-input"
                                            )}
                                            style={{
                                                background: isDark ? 'var(--bg-subtle)' : 'rgb(249, 250, 251)',
                                                border: isDark ? '1px solid transparent' : `1px solid var(--border-default)`,
                                                color: 'var(--text-primary)',
                                                colorScheme: isDark ? 'dark' : 'light'
                                            }}
                                            value={settings.voicevoxSpeakerId || 3}
                                            onChange={(e) => updateSettings({ voicevoxSpeakerId: parseInt(e.target.value) || 3 })}
                                        >
                                            {availableVoices.length === 0 && (
                                                <option value={settings.voicevoxSpeakerId}>{settings.voicevoxSpeakerId || 3} (Loading...)</option>
                                            )}
                                            {availableVoices.map(v => (
                                                <option key={v.id} value={v.id}>{v.name}</option>
                                            ))}
                                        </select>
                                        <p className="text-xs" style={descStyle}>请确保本地 VOICEVOX 应用已启动 (端口 50021)</p>
                                    </div>
                                </div>
                            )}

                            <div className="p-4 rounded-xl shadow-sm space-y-3" style={cardStyle}>
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium" style={labelStyle}>语速</label>
                                    <span
                                        className="text-sm font-mono px-2 py-0.5 rounded"
                                        style={{
                                            background: isDark ? 'var(--accent-primary-light)' : 'rgb(239, 246, 255)',
                                            color: isDark ? 'var(--accent-primary)' : 'var(--text-primary)'
                                        }}
                                    >
                                        x{settings.playbackSpeed}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="2.0"
                                    step="0.1"
                                    value={settings.playbackSpeed}
                                    onChange={(e) => updateSettings({ playbackSpeed: parseFloat(e.target.value) })}
                                    className={clsx(
                                        "w-full h-2 rounded-lg cursor-pointer",
                                        isDark ? "rainbow-range" : "appearance-none"
                                    )}
                                    style={{
                                        background: isDark ? 'transparent' : 'rgb(241, 245, 249)',
                                        accentColor: isDark ? undefined : 'var(--text-primary)'
                                    }}
                                />
                                <div className="flex justify-between text-xs" style={descStyle}>
                                    <span>0.5x</span>
                                    <span>正常</span>
                                    <span>2.0x</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ==================== 关于 TAB ==================== */}
                    {activeTab === 'about' && (
                        <div className="space-y-6">
                            {/* 应用信息 */}
                            <section className="text-center py-6">
                                <img
                                    src="/logo.png"
                                    alt="YOMI Logo"
                                    className="w-16 h-16 mx-auto mb-4 rounded-2xl shadow-lg"
                                />
                                <h3 className="text-xl font-bold" style={labelStyle}>読み | YOMI</h3>
                                <p className="text-sm mt-1" style={descStyle}>日语阅读学习助手</p>
                                <p className="text-xs mt-2" style={sectionTitleStyle}>版本 0.1.0 (Early Access)</p>
                            </section>

                            {/* 快捷键 */}
                            <section className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={sectionTitleStyle}>
                                    <Keyboard className="w-3 h-3" />
                                    快捷键
                                </h3>
                                <div className="rounded-xl p-4 shadow-sm space-y-2" style={cardStyle}>
                                    <div className="flex justify-between text-sm">
                                        <span style={descStyle}>播放/暂停</span>
                                        <kbd
                                            className="px-2 py-0.5 rounded text-xs font-mono"
                                            style={{ background: isDark ? 'var(--bg-subtle)' : 'rgb(241, 245, 249)', color: 'var(--text-primary)' }}
                                        >
                                            Space
                                        </kbd>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span style={descStyle}>点击单词</span>
                                        <span className="text-xs" style={sectionTitleStyle}>查看详情</span>
                                    </div>
                                </div>
                            </section>

                            {/* 链接 */}
                            <section className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={sectionTitleStyle}>链接</h3>
                                <div className="space-y-2">
                                    <a
                                        href="https://github.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                                        style={cardStyle}
                                    >
                                        <Github className="w-5 h-5" style={descStyle} />
                                        <span className="text-sm font-medium" style={labelStyle}>GitHub</span>
                                        <ExternalLink className="w-4 h-4 ml-auto" style={sectionTitleStyle} />
                                    </a>
                                </div>
                            </section>

                            {/* 重置设置 */}
                            <section className="pt-4" style={{ borderTop: `1px solid var(--border-default)` }}>
                                <button
                                    onClick={handleResetSettings}
                                    className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-xl transition-colors"
                                    style={{ color: '#ef4444' }}
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    重置所有设置
                                </button>
                            </section>
                        </div>
                    )}
                </div>

                {/* Footer - 毛玻璃效果 */}
                <div
                    className="flex-none p-3 text-center text-xs"
                    style={{
                        borderTop: isDark
                            ? '1px solid rgba(255, 255, 255, 0.1)'
                            : '1px solid rgba(148, 163, 184, 0.15)',
                        background: isDark
                            ? 'rgba(30, 30, 40, 0.9)'
                            : 'rgba(255, 255, 255, 0.7)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        color: 'var(--text-faint)'
                    }}
                >
                    読み | YOMI Early Access • v0.1.0
                </div>
            </div>
        </div>
    );
}

// ------------------------------------------------------------------
// Sub-components
// ------------------------------------------------------------------

function SettingToggle({ icon, label, description, checked, onChange, isDark }: {
    icon: React.ReactNode,
    label: string,
    description: string,
    checked: boolean,
    onChange: () => void,
    isDark: boolean
}) {
    return (
        <label className="flex items-center justify-between p-3 cursor-pointer group rounded-lg transition-colors">
            <div className="flex items-center gap-3">
                <div
                    className="p-2 rounded-lg transition-colors"
                    style={{ background: 'var(--bg-subtle)' }}
                >
                    {icon}
                </div>
                <div>
                    <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{label}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{description}</div>
                </div>
            </div>
            <div
                className="w-11 h-6 rounded-full transition-all relative"
                style={{
                    background: checked
                        ? (isDark ? 'linear-gradient(135deg, #ec4899, #8b5cf6, #3b82f6)' : 'var(--text-primary)')
                        : (isDark ? 'var(--bg-subtle)' : 'var(--bg-subtle)'),
                    boxShadow: checked && isDark ? '0 0 10px rgba(139, 92, 246, 0.4)' : 'none'
                }}
            >
                <input type="checkbox" className="hidden" checked={checked} onChange={onChange} />
                <div
                    className="w-4 h-4 bg-white rounded-full absolute top-1 transition-transform shadow-sm"
                    style={{ left: checked ? 'calc(100% - 1.25rem)' : '0.25rem' }}
                />
            </div>
        </label>
    );
}

function Divider({ isDark }: { isDark: boolean }) {
    return <div className="h-px mx-14" style={{ background: 'var(--border-default)' }} />;
}
