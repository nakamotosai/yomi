'use client';

import React, { useEffect, useState } from 'react';
import {
    X, Type, Eye, EyeOff, Music, Server, Globe, BookOpen, Palette,
    Speaker, Languages, Sparkles, Sun, Moon, Info, RotateCcw,
    Github, Keyboard, ExternalLink, Settings, User, Home
} from 'lucide-react';
import Image from 'next/image';
import { useAppStore } from '@/store/useAppStore';
import { useI18n } from '@/lib/i18n';
import { ttsManager } from '@/lib/tts/manager';
import { PartOfSpeech } from '@/types';
import clsx from 'clsx';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type TabId = 'appearance' | 'highlight' | 'reading' | 'audio' | 'about';

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const { settings, updateSettings } = useAppStore();
    const { t } = useI18n();
    const [availableVoices, setAvailableVoices] = useState<{ id: string; name: string }[]>([]);
    const [activeTab, setActiveTab] = useState<TabId>('appearance');
    const isDark = settings.theme === 'dark';
    const isWafu = settings.colorScheme === 'wafu';
    const isMorandi = settings.colorScheme === 'morandi' || !settings.colorScheme;
    const isMonochrome = settings.colorScheme === 'monochrome';

    useEffect(() => {
        if (!isOpen) return;
        ttsManager.getVoices(settings.ttsProvider).then(voices => {
            setAvailableVoices(voices);
        });
    }, [isOpen, settings.ttsProvider]);

    if (!isOpen) return null;

    const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
        { id: 'appearance', label: t('settings.tabs.appearance'), icon: Palette },
        { id: 'highlight', label: t('settings.tabs.highlight'), icon: Sparkles },
        { id: 'reading', label: t('settings.tabs.reading'), icon: BookOpen },
        { id: 'audio', label: t('settings.tabs.audio'), icon: Speaker },
        { id: 'about', label: t('settings.tabs.about'), icon: Info },
    ];

    const handleResetSettings = () => {
        if (confirm(t('settings.about.reset_confirm'))) {
            localStorage.removeItem('yomi-app-store-v9');
            window.location.reload();
        }
    };

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 min-h-screen"
            style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <div
                className="rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
                style={{
                    height: '600px',
                    maxHeight: '90vh',
                    background: isWafu ? '#F2EADC' : (isMorandi ? (isDark ? 'rgba(30, 41, 59, 0.95)' : 'var(--bg-base)') : 'var(--bg-elevated)'),
                    backdropFilter: isWafu ? 'none' : 'blur(24px) saturate(180%)',
                    border: isWafu ? '1px solid rgba(140, 112, 99, 0.2)' : (isMorandi ? `1px solid var(--border-default)` : `1px solid var(--border-default)`)
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="flex-none flex items-center justify-between px-6 py-4"
                    style={{
                        borderBottom: `1px solid var(--border-default)`,
                        background: 'transparent'
                    }}
                >
                    <div className="flex items-center gap-2">
                        <div className={clsx("p-2 rounded-xl transition-colors", isMorandi ? "bg-slate-500/10 text-slate-500" : "bg-[var(--scheme-primary)]/10 text-[var(--scheme-primary)]")}>
                            <Settings className="w-5 h-5" />
                        </div>
                        <h2 className={clsx("text-xl font-black tracking-tight", isMorandi ? "text-slate-500" : "text-[var(--text-primary)]")}>
                            {t('settings.title')}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 rounded-full transition-colors hover:bg-[var(--bg-subtle)]"
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
                        background: 'transparent'
                    }}
                >
                    {tabs.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={clsx(
                                    "flex items-center gap-1.5 px-4 py-2.5 my-1 text-sm font-medium transition-all rounded-lg relative border border-transparent",
                                    isActive && isMorandi && "rainbow-highlight"
                                )}
                                style={{
                                    color: isActive
                                        ? (isWafu ? 'var(--accent-primary)' : (isMorandi ? '#64748b' : (isDark ? 'white' : 'var(--text-primary)')))
                                        : 'var(--text-muted)',
                                    background: isActive
                                        ? (isWafu ? 'rgba(140, 112, 99, 0.08)' : (isMorandi ? 'transparent' : (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.4)')))
                                        : 'transparent',
                                }}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                                {isActive && !isMorandi && (
                                    <div
                                        className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                                        style={{
                                            background: 'var(--scheme-primary)',
                                            boxShadow: isDark ? '0 -2px 8px rgba(var(--scheme-primary-rgb), 0.5)' : 'none'
                                        }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Content Area - Scrollable */}
                <div
                    className="flex-1 overflow-y-auto p-6 settings-scroll-container"
                    style={{
                        background: 'transparent',
                    }}
                >
                    {/* Appearance Tab */}
                    {activeTab === 'appearance' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <section>
                                <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: isWafu ? 'var(--accent-primary)' : (isMorandi ? '#64748b' : 'var(--text-muted)') }}>
                                    <Palette className="w-4 h-4" />
                                    {t('settings.appearance.theme')}
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { id: 'light', label: t('settings.appearance.theme_light'), icon: Sun },
                                        { id: 'dark', label: t('settings.appearance.theme_dark'), icon: Moon }
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            onClick={() => updateSettings({ theme: opt.id as any })}
                                            className={clsx(
                                                "flex items-center justify-center gap-2 p-3 rounded-xl border transition-all",
                                                settings.theme === opt.id
                                                    ? (isMorandi ? "rainbow-highlight border-transparent text-[#64748b] scale-[1.02]" : "bg-[var(--scheme-primary)]/10 border-[var(--scheme-primary)] text-[var(--scheme-primary)]")
                                                    : "bg-transparent border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--text-faint)]"
                                            )}
                                        >
                                            <opt.icon className="w-4 h-4" />
                                            <span className="font-medium">{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: isWafu ? 'var(--accent-primary)' : (isMorandi ? '#64748b' : 'var(--text-muted)') }}>
                                    <Palette className="w-4 h-4" />
                                    {t('settings.appearance.color_scheme')}
                                </h3>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { id: 'morandi', label: t('settings.appearance.scheme_morandi'), colors: ['#84A69D', '#C8733A', '#B8956B'] },
                                        { id: 'wafu', label: t('settings.appearance.scheme_wafu'), colors: ['#A63D40', '#E9B872', '#1E3231'] },
                                        { id: 'monochrome', label: t('settings.appearance.scheme_mono'), colors: ['#333333', '#666666', '#999999'] },
                                    ].map((scheme) => (
                                        <button
                                            key={scheme.id}
                                            onClick={() => updateSettings({ colorScheme: scheme.id as any })}
                                            className={clsx(
                                                "p-2.5 rounded-xl border transition-all flex flex-col items-center justify-center gap-1.5",
                                                settings.colorScheme === scheme.id
                                                    ? (isMorandi ? "rainbow-highlight border-transparent text-[#64748b] scale-[1.02]" : "bg-[var(--scheme-primary)]/10 border-[var(--scheme-primary)] text-[var(--scheme-primary)]")
                                                    : "bg-transparent border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--text-faint)]"
                                            )}
                                        >
                                            <span className="font-bold text-sm">{scheme.label}</span>
                                            <div className="flex gap-1">
                                                {scheme.colors.map((c, i) => (
                                                    <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c }} />
                                                ))}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: isWafu ? 'var(--accent-primary)' : (isMorandi ? '#64748b' : 'var(--text-muted)') }}>
                                    <Type className="w-4 h-4" />
                                    {t('settings.appearance.font')}
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => updateSettings({ fontFamily: 'sans' })}
                                        className={clsx(
                                            "p-3 rounded-xl border transition-all text-center",
                                            settings.fontFamily === 'sans'
                                                ? (isMorandi ? "rainbow-highlight border-transparent text-[#64748b] scale-[1.02]" : "bg-[var(--scheme-primary)]/10 border-[var(--scheme-primary)] text-[var(--scheme-primary)]")
                                                : "bg-transparent border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--text-faint)]"
                                        )}
                                    >
                                        <span className="font-medium">{t('settings.appearance.font_sans')}</span>
                                    </button>
                                    <button
                                        onClick={() => updateSettings({ fontFamily: 'serif' })}
                                        className={clsx(
                                            "p-3 rounded-xl border transition-all text-center font-serif",
                                            settings.fontFamily === 'serif'
                                                ? (isMorandi ? "rainbow-highlight border-transparent text-[#64748b] scale-[1.02]" : "bg-[var(--scheme-primary)]/10 border-[var(--scheme-primary)] text-[var(--scheme-primary)]")
                                                : "bg-transparent border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--text-faint)]"
                                        )}
                                    >
                                        <span className="font-medium">{t('settings.appearance.font_serif')}</span>
                                    </button>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: isWafu ? 'var(--accent-primary)' : (isMorandi ? '#64748b' : 'var(--text-muted)') }}>
                                    <div className="w-4 h-4 flex items-center justify-center text-[10px] border-2 border-current rounded-sm font-bold">A</div>
                                    {t('settings.appearance.font_size')}
                                </h3>
                                <div className="grid grid-cols-3 gap-3">
                                    {(['small', 'medium', 'large'] as const).map((size) => (
                                        <button
                                            key={size}
                                            onClick={() => updateSettings({ fontSize: size })}
                                            className={clsx(
                                                "p-3 rounded-xl border transition-all text-center capitalize",
                                                settings.fontSize === size
                                                    ? (isMorandi ? "rainbow-highlight border-transparent text-[#64748b] scale-[1.02]" : "bg-[var(--scheme-primary)]/10 border-[var(--scheme-primary)] text-[var(--scheme-primary)]")
                                                    : "bg-transparent border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--text-faint)]"
                                            )}
                                        >
                                            <span className="font-medium">{t(`settings.appearance.size_${size}`)}</span>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        </div>
                    )}

                    {/* Highlight Tab */}
                    {activeTab === 'highlight' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <section>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-bold mb-3 flex items-center gap-2 px-1" style={{ color: isWafu ? 'var(--accent-primary)' : (isMorandi ? '#64748b' : 'var(--text-muted)') }}>
                                        <Palette className="w-4 h-4" />
                                        {t('settings.highlight.pos_colors')}
                                    </h3>
                                    <div className="flex gap-4 px-1">
                                        {(() => {
                                            const allPos = Object.values(PartOfSpeech);
                                            const isAllSelected = allPos.every(p => settings.activeColorPOS.includes(p));
                                            return (
                                                <button
                                                    onClick={() => {
                                                        if (isAllSelected) {
                                                            updateSettings({ activeColorPOS: [] });
                                                        } else {
                                                            updateSettings({ activeColorPOS: allPos });
                                                        }
                                                    }}
                                                    className={clsx(
                                                        "text-xs font-bold transition-colors hover:opacity-70",
                                                        isAllSelected
                                                            ? (isMorandi ? "text-slate-500" : "text-[var(--scheme-primary)]")
                                                            : "text-[var(--text-muted)]"
                                                    )}
                                                >
                                                    {t('settings.highlight.select_all')}
                                                </button>
                                            );
                                        })()}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {(() => {
                                        const MAJOR_POS = [PartOfSpeech.NOUN, PartOfSpeech.VERB, PartOfSpeech.ADJECTIVE, PartOfSpeech.PARTICLE];
                                        const OTHERS_POS = [
                                            PartOfSpeech.PRONOUN, PartOfSpeech.PROPER_NOUN, PartOfSpeech.AUXILIARY,
                                            PartOfSpeech.ADVERB, PartOfSpeech.CONJUNCTION, PartOfSpeech.INTERJECTION,
                                            PartOfSpeech.PREFIX, PartOfSpeech.SUFFIX, PartOfSpeech.OTHER
                                        ];

                                        const buttons = [
                                            { id: 'noun', pos: [PartOfSpeech.NOUN], label: t('settings.highlight.pos_noun'), color: '#84A69D' },
                                            { id: 'verb', pos: [PartOfSpeech.VERB], label: t('settings.highlight.pos_verb'), color: '#C8733A' },
                                            { id: 'adj', pos: [PartOfSpeech.ADJECTIVE], label: t('settings.highlight.pos_adj'), color: '#B8956B' },
                                            { id: 'particle', pos: [PartOfSpeech.PARTICLE], label: t('settings.highlight.pos_particle'), color: '#A67C7C' },
                                            { id: 'others', pos: OTHERS_POS, label: t('settings.highlight.pos_others'), color: '#2D6D8B' },
                                        ];

                                        return buttons.map(({ id, pos, label, color }) => {
                                            const isActive = pos.every(p => settings.activeColorPOS.includes(p));
                                            const isPartlyActive = !isActive && pos.some(p => settings.activeColorPOS.includes(p));

                                            return (
                                                <button
                                                    key={id}
                                                    onClick={() => {
                                                        let newPos: PartOfSpeech[];
                                                        if (isActive) {
                                                            newPos = settings.activeColorPOS.filter(p => !pos.includes(p));
                                                        } else {
                                                            newPos = Array.from(new Set([...settings.activeColorPOS, ...pos]));
                                                        }
                                                        updateSettings({ activeColorPOS: newPos });
                                                    }}
                                                    className={clsx(
                                                        "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                                                        (isActive || isPartlyActive)
                                                            ? (isMorandi ? "rainbow-highlight border-transparent scale-[1.02]" : "bg-[var(--scheme-primary)]/10 border-[var(--scheme-primary)]")
                                                            : "bg-transparent border-[var(--border-default)] hover:border-[var(--text-faint)]"
                                                    )}
                                                >
                                                    <div
                                                        className="w-3 h-3 rounded-full shrink-0"
                                                        style={{ backgroundColor: color }}
                                                    />
                                                    <span className={clsx("text-sm font-bold", (isActive || isPartlyActive) ? (isMorandi ? "text-[#64748b]" : "text-[var(--text-primary)]") : "text-[var(--text-muted)]")}>
                                                        {label}
                                                    </span>
                                                </button>
                                            );
                                        });
                                    })()}
                                </div>
                            </section>

                            <section>
                                <SettingToggle
                                    label={t('settings.highlight.karaoke')}
                                    description={t('settings.highlight.karaoke_desc')}
                                    enabled={settings.karaokeMode}
                                    onChange={(v) => updateSettings({ karaokeMode: v })}
                                    icon={Sparkles}
                                    isDark={isDark}
                                    isWafu={isWafu}
                                    isMorandi={isMorandi}
                                />

                                {settings.karaokeMode && (
                                    <div className="mt-4 space-y-3">
                                        <div className={clsx("text-[11px] font-bold uppercase tracking-wider px-1", isMorandi ? "text-slate-500" : "text-[var(--text-muted)]")}>{t('settings.highlight.anim_style')}</div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                { id: 'glow-only', label: t('settings.highlight.style_glow'), desc: t('settings.highlight.style_glow_desc') },
                                                { id: 'glow-scale', label: t('settings.highlight.style_glow_scale'), desc: t('settings.highlight.style_glow_scale_desc') },
                                                { id: 'float-up', label: t('settings.highlight.style_float'), desc: t('settings.highlight.style_float_desc') },
                                                { id: 'sky-drop', label: t('settings.highlight.style_drop'), desc: t('settings.highlight.style_drop_desc') },
                                                { id: 'border', label: t('settings.highlight.style_border'), desc: t('settings.highlight.style_border_desc') },
                                                { id: 'bounce', label: t('settings.highlight.style_bounce'), desc: t('settings.highlight.style_bounce_desc') },
                                                { id: 'text-magnify', label: t('settings.highlight.style_magnify'), desc: t('settings.highlight.style_magnify_desc') },
                                                { id: 'underline', label: t('settings.highlight.style_underline'), desc: t('settings.highlight.style_underline_desc') },
                                            ].map((style) => (
                                                <button
                                                    key={style.id}
                                                    onClick={() => updateSettings({ karaokeStyle: style.id as any })}
                                                    className={clsx(
                                                        "flex flex-col items-start p-2.5 rounded-xl border transition-all text-left h-full",
                                                        settings.karaokeStyle === style.id
                                                            ? (isMorandi ? "rainbow-highlight border-transparent bg-transparent scale-[1.02]" : "bg-[var(--scheme-primary)]/10 border-[var(--scheme-primary)] shadow-sm")
                                                            : "bg-transparent border-[var(--border-default)] hover:border-[var(--text-faint)]"
                                                    )}
                                                >
                                                    <div className={clsx("text-xs font-bold mb-0.5", isMorandi ? "text-[#64748b]" : (settings.karaokeStyle === style.id ? "text-[var(--scheme-primary)]" : "text-[var(--text-primary)]"))}>
                                                        {style.label}
                                                    </div>
                                                    <div className={clsx("text-[10px] leading-tight", isMorandi ? "text-slate-500" : "text-[var(--text-muted)] opacity-80")}>
                                                        {style.desc}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </section>
                        </div>
                    )}

                    {/* Reading Tab */}
                    {activeTab === 'reading' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="space-y-1 rounded-2xl border border-[var(--border-default)] overflow-hidden">
                                <SettingToggle
                                    label={t('settings.reading.furigana')}
                                    description={t('settings.reading.furigana_desc')}
                                    enabled={settings.showFurigana}
                                    onChange={(v) => updateSettings({ showFurigana: v })}
                                    icon={Type}
                                    isDark={isDark}
                                    isWafu={isWafu}
                                    isMorandi={isMorandi}
                                />
                                <Divider />
                                <SettingToggle
                                    label={t('settings.reading.common_furigana')}
                                    description={t('settings.reading.common_furigana_desc')}
                                    enabled={settings.hideCommonFurigana}
                                    onChange={(v) => updateSettings({ hideCommonFurigana: v })}
                                    icon={BookOpen}
                                    isDark={isDark}
                                    isWafu={isWafu}
                                    isMorandi={isMorandi}
                                />
                                <Divider />
                                <SettingToggle
                                    label={t('settings.reading.pitch_accent')}
                                    description={t('settings.reading.pitch_accent_desc')}
                                    enabled={settings.showPitchAccent}
                                    onChange={(v) => updateSettings({ showPitchAccent: v })}
                                    icon={Music}
                                    isDark={isDark}
                                    isWafu={isWafu}
                                    isMorandi={isMorandi}
                                />
                                <Divider />
                                <SettingToggle
                                    label={t('settings.reading.translation')}
                                    description={t('settings.reading.translation_desc')}
                                    enabled={settings.showTranslation}
                                    onChange={(v) => updateSettings({ showTranslation: v })}
                                    icon={Languages}
                                    isDark={isDark}
                                    isWafu={isWafu}
                                    isMorandi={isMorandi}
                                />
                                <Divider />
                                <SettingToggle
                                    label={t('settings.reading.particle_quiz')}
                                    description={t('settings.reading.particle_quiz_desc')}
                                    enabled={settings.hideParticles}
                                    onChange={(v) => updateSettings({ hideParticles: v })}
                                    icon={EyeOff}
                                    isDark={isDark}
                                    isWafu={isWafu}
                                    isMorandi={isMorandi}
                                />
                                <Divider />
                                <SettingToggle
                                    label={t('settings.reading.auto_read')}
                                    description={t('settings.reading.auto_read_desc')}
                                    enabled={settings.autoReadOnClick}
                                    onChange={(v) => updateSettings({ autoReadOnClick: v })}
                                    icon={Speaker}
                                    isDark={isDark}
                                    isWafu={isWafu}
                                    isMorandi={isMorandi}
                                />
                            </div>
                        </div>
                    )}

                    {/* Audio Tab */}
                    {activeTab === 'audio' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <section>
                                <h3 className="text-sm font-bold mb-3 flex items-center gap-2 px-1" style={{ color: isWafu ? 'var(--accent-primary)' : (isMorandi ? '#64748b' : 'var(--text-muted)') }}>
                                    <Speaker className="w-4 h-4" />
                                    {t('settings.audio.engine')}
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { id: 'native', label: t('settings.audio.engine_edge'), icon: Globe },
                                        { id: 'voicevox', label: 'VOICEVOX', icon: Server, disabled: true }
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            disabled={opt.disabled}
                                            onClick={() => updateSettings({ ttsProvider: opt.id as any })}
                                            className={clsx(
                                                "flex items-center justify-center gap-3 p-3 rounded-xl border transition-all h-12",
                                                settings.ttsProvider === opt.id
                                                    ? (isMorandi ? "rainbow-highlight border-transparent text-slate-500" : "bg-[var(--scheme-primary)]/10 border-[var(--scheme-primary)] text-[var(--scheme-primary)]")
                                                    : "bg-transparent border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--text-faint)]",
                                                opt.disabled && "opacity-40 cursor-not-allowed grayscale"
                                            )}
                                        >
                                            <opt.icon className="w-4 h-4 shrink-0" />
                                            <span className="font-bold text-sm whitespace-nowrap">{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <h3 className="text-sm font-bold mb-3 flex items-center gap-2 px-1" style={{ color: isWafu ? 'var(--accent-primary)' : (isMorandi ? '#64748b' : 'var(--text-muted)') }}>
                                    <User className="w-4 h-4" />
                                    {t('settings.audio.voice')}
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { id: 'ja-JP-NanamiNeural', label: t('settings.audio.voice_female'), icon: User },
                                        { id: 'ja-JP-KeitaNeural', label: t('settings.audio.voice_male'), icon: User }
                                    ].map((voice) => {
                                        const isActive = settings.nativeVoiceURI === voice.id || (!settings.nativeVoiceURI && voice.id === 'ja-JP-NanamiNeural');
                                        return (
                                            <button
                                                key={voice.id}
                                                onClick={() => updateSettings({ nativeVoiceURI: voice.id })}
                                                className={clsx(
                                                    "flex items-center justify-center p-3 rounded-xl border transition-all gap-3 h-12",
                                                    isActive
                                                        ? (isMorandi ? "rainbow-highlight border-transparent text-slate-500" : "bg-[var(--scheme-primary)]/10 border-[var(--scheme-primary)] text-[var(--scheme-primary)]")
                                                        : "bg-transparent border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--text-faint)]"
                                                )}
                                            >
                                                <voice.icon className="w-4 h-4 shrink-0" />
                                                <span className="font-bold text-sm whitespace-nowrap">{voice.label}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </section>

                            <section>
                                <div className="flex justify-between items-center mb-3 px-1">
                                    <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: isWafu ? 'var(--accent-primary)' : (isMorandi ? '#64748b' : 'var(--text-muted)') }}>
                                        <Speaker className="w-4 h-4" />
                                        {t('settings.audio.speed')}
                                    </h3>
                                    <span className={clsx("text-xs font-black px-1.5 py-0.5 rounded-lg", isMorandi ? "bg-slate-500/10 text-slate-500" : "bg-[var(--scheme-primary)]/10 text-[var(--scheme-primary)]")}>
                                        {settings.playbackSpeed}x
                                    </span>
                                </div>
                                <div className="p-3 rounded-xl border border-[var(--border-default)] space-y-2">
                                    <div className="relative pt-2 pb-1">
                                        <input
                                            type="range"
                                            min="0.7"
                                            max="1.3"
                                            step="0.05"
                                            value={settings.playbackSpeed}
                                            onChange={(e) => updateSettings({ playbackSpeed: parseFloat(e.target.value) })}
                                            className="speed-range-slider w-full h-1.5 rounded-lg cursor-pointer relative z-10"
                                            style={{
                                                WebkitAppearance: 'none',
                                                appearance: 'none',
                                                background: 'var(--border-default)',
                                                outline: 'none',
                                                ['--scheme-primary' as any]: isMorandi ? '#64748b' : 'var(--scheme-primary)'
                                            }}
                                        />
                                    </div>
                                    <div className={clsx("flex justify-between text-[9px] font-bold px-0.5", isMorandi ? "text-slate-500/80" : "text-[var(--text-muted)]")}>
                                        <span>0.7x</span>
                                        <span>1.0x</span>
                                        <span>1.3x</span>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* About Tab */}
                    {activeTab === 'about' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <section className="flex items-center justify-center gap-6 p-6 py-8 border-b border-[var(--border-default)] mb-4">
                                <div className="relative w-16 h-16 shrink-0">
                                    <Image
                                        src="/logo.png"
                                        alt="YOMI Logo"
                                        fill
                                        className="rounded-[20px] shadow-2xl object-contain border-[2px] border-white/10"
                                        unoptimized
                                    />
                                </div>
                                <div className="space-y-1.5 min-w-0 flex flex-col justify-center text-left">
                                    <h3 className={clsx("text-xl font-black tracking-tight", isMorandi ? "text-slate-500" : "text-[var(--text-primary)]")}>
                                        読み <span className="text-[var(--text-muted)] font-light mx-1">|</span> YOMI
                                    </h3>
                                    <p className="text-xs font-bold text-[var(--text-muted)] leading-relaxed">
                                        {t('settings.about.desc')}
                                    </p>
                                    <div className="flex items-center gap-2.5 mt-2">
                                        <span className={clsx("text-[9px] font-black px-2 py-0.5 rounded-full border", isMorandi ? "bg-slate-500/10 text-slate-500 border-slate-500/20" : "bg-[var(--scheme-primary)]/10 text-[var(--scheme-primary)] border-[var(--scheme-primary)]/20")}>
                                            V0.1.0
                                        </span>
                                        <span className="text-[9px] font-bold text-[var(--text-faint)] uppercase tracking-widest">
                                            Early Access
                                        </span>
                                    </div>
                                </div>
                            </section>

                            <div className="space-y-3">
                                <section>
                                    <h3 className="text-xs font-bold text-[var(--text-muted)] mb-3 flex items-center gap-2 px-1">
                                        <Globe className="w-3.5 h-3.5" />
                                        {t('settings.about.links')}
                                    </h3>
                                    <div className="grid grid-cols-1 gap-2">
                                        <a
                                            href="https://saaaai.com/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={clsx(
                                                "flex items-center gap-3 p-4 rounded-2xl border transition-all bg-[var(--bg-subtle)]/30 group",
                                                isMorandi ? "border-[var(--border-default)] hover:border-slate-500/40" : "border-[var(--border-default)] hover:border-[var(--scheme-primary)]"
                                            )}
                                        >
                                            <Home className={clsx("w-5 h-5 text-[var(--text-muted)] transition-colors", isMorandi ? "group-hover:text-slate-500" : "group-hover:text-[var(--scheme-primary)]")} />
                                            <span className={clsx("text-sm font-bold", isMorandi ? "text-slate-500" : "text-[var(--text-primary)]")}>作者个人主页 saaaai.com</span>
                                            <ExternalLink className="w-4 h-4 ml-auto text-[var(--text-faint)]" />
                                        </a>
                                    </div>
                                </section>

                                <section className="pt-6">
                                    <button
                                        onClick={handleResetSettings}
                                        className="w-full flex items-center justify-center gap-2 py-4 text-sm font-black rounded-2xl border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-all"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        {t('settings.about.reset_settings')}
                                    </button>
                                </section>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div
                    className="flex-none p-4 text-center text-[10px] font-black tracking-widest uppercase opacity-40"
                    style={{
                        borderTop: `1px solid var(--border-default)`,
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

function SettingToggle({ icon: Icon, label, description, enabled, onChange, isDark, isWafu, isMorandi }: {
    icon: React.ElementType,
    label: string,
    description: string,
    enabled: boolean,
    onChange: (v: boolean) => void,
    isDark: boolean,
    isWafu: boolean,
    isMorandi: boolean
}) {
    return (
        <label className="flex items-center justify-between p-3 cursor-pointer group transition-colors">
            <div className="flex items-center">
                <div>
                    <div className={clsx("font-bold text-sm leading-tight", isMorandi ? "text-slate-500" : "text-[var(--text-primary)]")}>{label}</div>
                    <div className="text-[11px] text-[var(--text-muted)] leading-tight mt-0.5">{description}</div>
                </div>
            </div>
            <div className="relative inline-flex items-center h-6" onClick={(e) => { e.preventDefault(); onChange(!enabled); }}>
                <div className={clsx(
                    "w-10 h-6 rounded-full transition-all duration-300 flex items-center px-1",
                    enabled
                        ? (isWafu
                            ? "bg-[var(--accent-primary)]"
                            : (isMorandi
                                ? "bg-slate-500 shadow-sm"
                                : (isDark
                                    ? "bg-[var(--scheme-primary)] shadow-[0_0_10px_rgba(var(--scheme-primary-rgb),0.5)]"
                                    : "bg-[var(--scheme-primary)]")))
                        : "bg-[var(--border-default)]"
                )}>
                    <div className={clsx(
                        "w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-sm",
                        enabled ? "translate-x-4" : "translate-x-0"
                    )} />
                </div>
            </div>
        </label>
    );
}

function Divider() {
    return <div className="h-px w-full bg-[var(--border-default)] opacity-50" />;
}
