'use client';

import React, { useEffect, useState } from 'react';
import {
    X, Type, Eye, EyeOff, Music, Server, Globe, BookOpen, Palette,
    Speaker, Languages, Sparkles, Sun, Moon, Info, RotateCcw,
    Github, Keyboard, ExternalLink, Settings
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
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-[var(--scheme-primary)]/10 text-[var(--scheme-primary)]">
                            <Settings className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-black tracking-tight text-[var(--text-primary)]">
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
                                }}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                                {isActive && (
                                    <div
                                        className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                                        style={{
                                            background: 'linear-gradient(to right, #ec4899, #8b5cf6, #3b82f6)',
                                            boxShadow: isDark ? '0 -2px 8px rgba(139, 92, 246, 0.5)' : 'none'
                                        }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Content Area - Scrollable */}
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
                    {/* Appearance Tab */}
                    {activeTab === 'appearance' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <section>
                                <h3 className="text-sm font-bold text-[var(--text-muted)] mb-3 flex items-center gap-2">
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
                                                settings.theme === opt.id ? "bg-[var(--scheme-primary)]/10 border-[var(--scheme-primary)] text-[var(--scheme-primary)]" : "bg-transparent border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--text-faint)]"
                                            )}
                                        >
                                            <opt.icon className="w-4 h-4" />
                                            <span className="font-medium">{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <h3 className="text-sm font-bold text-[var(--text-muted)] mb-3 flex items-center gap-2">
                                    <Type className="w-4 h-4" />
                                    {t('settings.appearance.font')}
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => updateSettings({ fontFamily: 'sans' })}
                                        className={clsx(
                                            "p-3 rounded-xl border transition-all text-center",
                                            settings.fontFamily === 'sans' ? "bg-[var(--scheme-primary)]/10 border-[var(--scheme-primary)] text-[var(--scheme-primary)]" : "bg-transparent border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--text-faint)]"
                                        )}
                                    >
                                        <span className="font-medium">{t('settings.appearance.font_sans')}</span>
                                    </button>
                                    <button
                                        onClick={() => updateSettings({ fontFamily: 'serif' })}
                                        className={clsx(
                                            "p-3 rounded-xl border transition-all text-center font-serif",
                                            settings.fontFamily === 'serif' ? "bg-[var(--scheme-primary)]/10 border-[var(--scheme-primary)] text-[var(--scheme-primary)]" : "bg-transparent border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--text-faint)]"
                                        )}
                                    >
                                        <span className="font-medium">{t('settings.appearance.font_serif')}</span>
                                    </button>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-sm font-bold text-[var(--text-muted)] mb-3 flex items-center gap-2">
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
                                                settings.fontSize === size ? "bg-[var(--scheme-primary)]/10 border-[var(--scheme-primary)] text-[var(--scheme-primary)]" : "bg-transparent border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--text-faint)]"
                                            )}
                                        >
                                            <span className="font-medium">{t(`settings.appearance.size_${size}`)}</span>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <h3 className="text-sm font-bold text-[var(--text-muted)] mb-3 flex items-center gap-2">
                                    <Palette className="w-4 h-4" />
                                    {t('settings.appearance.color_scheme')}
                                </h3>
                                <div className="space-y-3">
                                    {[
                                        { id: 'morandi', color: 'bg-slate-500', label: t('settings.appearance.scheme_morandi'), desc: t('settings.appearance.scheme_morandi_desc') },
                                        { id: 'wafu', color: 'bg-red-400', label: t('settings.appearance.scheme_wafu'), desc: t('settings.appearance.scheme_wafu_desc') },
                                        { id: 'monochrome', color: 'bg-black', label: t('settings.appearance.scheme_mono'), desc: t('settings.appearance.scheme_mono_desc') },
                                    ].map((scheme) => (
                                        <button
                                            key={scheme.id}
                                            onClick={() => updateSettings({ colorScheme: scheme.id as any })}
                                            className={clsx(
                                                "w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left",
                                                settings.colorScheme === scheme.id ? "bg-[var(--scheme-primary)]/10 border-[var(--scheme-primary)]" : "bg-transparent border-[var(--border-default)] hover:border-[var(--text-faint)]"
                                            )}
                                        >
                                            <div className={clsx("w-10 h-10 rounded-xl shadow-inner", scheme.color)} />
                                            <div className="flex-1">
                                                <div className={clsx("font-bold", settings.colorScheme === scheme.id ? "text-[var(--scheme-primary)]" : "text-[var(--text-primary)]")}>{scheme.label}</div>
                                                <div className="text-xs text-[var(--text-muted)]">{scheme.desc}</div>
                                            </div>
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
                                    <h3 className="text-sm font-bold text-[var(--text-muted)] flex items-center gap-2">
                                        <Palette className="w-4 h-4" />
                                        {t('settings.highlight.pos_colors')}
                                    </h3>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => updateSettings({ activeColorPOS: Object.values(PartOfSpeech) })}
                                            className="text-xs font-bold text-[var(--scheme-primary)] hover:opacity-70"
                                        >
                                            {t('settings.highlight.select_all')}
                                        </button>
                                        <button
                                            onClick={() => updateSettings({ activeColorPOS: [] })}
                                            className="text-xs font-bold text-[var(--text-muted)] hover:opacity-70"
                                        >
                                            {t('settings.highlight.clear_all')}
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { pos: PartOfSpeech.NOUN, label: t('settings.highlight.pos_noun'), color: '#84A69D' },
                                        { pos: PartOfSpeech.VERB, label: t('settings.highlight.pos_verb'), color: '#C8733A' },
                                        { pos: PartOfSpeech.ADJECTIVE, label: t('settings.highlight.pos_adj'), color: '#B8956B' },
                                        { pos: PartOfSpeech.PARTICLE, label: t('settings.highlight.pos_particle'), color: '#A67C7C' },
                                    ].map(({ pos, label, color }) => {
                                        const isActive = settings.activeColorPOS.includes(pos);
                                        return (
                                            <button
                                                key={pos}
                                                onClick={() => {
                                                    const newPos = isActive
                                                        ? settings.activeColorPOS.filter(p => p !== pos)
                                                        : [...settings.activeColorPOS, pos];
                                                    updateSettings({ activeColorPOS: newPos });
                                                }}
                                                className={clsx(
                                                    "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                                                    isActive ? "bg-[var(--scheme-primary)]/10 border-[var(--scheme-primary)]" : "bg-transparent border-[var(--border-default)] hover:border-[var(--text-faint)]"
                                                )}
                                            >
                                                <div
                                                    className="w-3 h-3 rounded-full shrink-0"
                                                    style={{ backgroundColor: color }}
                                                />
                                                <span className={clsx("text-sm font-bold", isActive ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]")}>
                                                    {label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>

                            <section className="pt-4 border-t border-[var(--border-default)]">
                                <h3 className="text-sm font-bold text-[var(--text-muted)] mb-4 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" />
                                    {t('settings.highlight.karaoke')}
                                </h3>
                                <div className="space-y-4">
                                    <SettingToggle
                                        label={t('settings.highlight.karaoke_label')}
                                        description={t('settings.highlight.karaoke_desc')}
                                        enabled={settings.karaokeMode}
                                        onChange={(v) => updateSettings({ karaokeMode: v })}
                                        icon={Sparkles}
                                        isDark={isDark}
                                    />

                                    {settings.karaokeMode && (
                                        <div className="pl-11 space-y-3">
                                            <div className="text-xs font-bold text-[var(--text-muted)] mb-2">{t('settings.highlight.anim_style')}</div>
                                            <div className="grid grid-cols-1 gap-2">
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
                                                            "flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                                                            settings.karaokeStyle === style.id ? "bg-[var(--scheme-primary)]/5 border-[var(--scheme-primary)]/30 text-[var(--scheme-primary)]" : "bg-transparent border-transparent hover:bg-[var(--bg-subtle)]"
                                                        )}
                                                    >
                                                        <div>
                                                            <div className={clsx("text-sm font-bold", settings.karaokeStyle === style.id ? "text-[var(--scheme-primary)]" : "text-[var(--text-primary)]")}>{style.label}</div>
                                                            <div className="text-[10px] text-[var(--text-muted)] opacity-70">{style.desc}</div>
                                                        </div>
                                                        {settings.karaokeStyle === style.id && <div className="w-1.5 h-1.5 rounded-full bg-[var(--scheme-primary)]" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    )}

                    {/* Reading Tab */}
                    {activeTab === 'reading' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <section>
                                <h3 className="text-sm font-bold text-[var(--text-muted)] mb-3 flex items-center gap-2">
                                    <BookOpen className="w-4 h-4" />
                                    {t('settings.reading.title')}
                                </h3>
                                <div className="space-y-1 rounded-2xl border border-[var(--border-default)] overflow-hidden">
                                    <SettingToggle
                                        label={t('settings.reading.furigana')}
                                        description={t('settings.reading.furigana_desc')}
                                        enabled={settings.showFurigana}
                                        onChange={(v) => updateSettings({ showFurigana: v })}
                                        icon={Type}
                                        isDark={isDark}
                                    />
                                    <Divider />
                                    <SettingToggle
                                        label={t('settings.reading.common_furigana')}
                                        description={t('settings.reading.common_furigana_desc')}
                                        enabled={settings.hideCommonFurigana}
                                        onChange={(v) => updateSettings({ hideCommonFurigana: v })}
                                        icon={BookOpen}
                                        isDark={isDark}
                                    />
                                    <Divider />
                                    <SettingToggle
                                        label={t('settings.reading.pitch_accent')}
                                        description={t('settings.reading.pitch_accent_desc')}
                                        enabled={settings.showPitchAccent}
                                        onChange={(v) => updateSettings({ showPitchAccent: v })}
                                        icon={Music}
                                        isDark={isDark}
                                    />
                                    <Divider />
                                    <SettingToggle
                                        label={t('settings.reading.translation')}
                                        description={t('settings.reading.translation_desc')}
                                        enabled={settings.showTranslation}
                                        onChange={(v) => updateSettings({ showTranslation: v })}
                                        icon={Languages}
                                        isDark={isDark}
                                    />
                                    <Divider />
                                    <SettingToggle
                                        label={t('settings.reading.particle_quiz')}
                                        description={t('settings.reading.particle_quiz_desc')}
                                        enabled={settings.hideParticles}
                                        onChange={(v) => updateSettings({ hideParticles: v })}
                                        icon={EyeOff}
                                        isDark={isDark}
                                    />
                                    <Divider />
                                    <SettingToggle
                                        label={t('settings.reading.auto_read')}
                                        description={t('settings.reading.auto_read_desc')}
                                        enabled={settings.autoReadOnClick}
                                        onChange={(v) => updateSettings({ autoReadOnClick: v })}
                                        icon={Speaker}
                                        isDark={isDark}
                                    />
                                </div>
                            </section>
                        </div>
                    )}

                    {/* Audio Tab */}
                    {activeTab === 'audio' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <section>
                                <h3 className="text-sm font-bold text-[var(--text-muted)] mb-3 flex items-center gap-2">
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
                                                "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all",
                                                settings.ttsProvider === opt.id ? "bg-[var(--scheme-primary)]/10 border-[var(--scheme-primary)] text-[var(--scheme-primary)]" : "bg-transparent border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--text-faint)]",
                                                opt.disabled && "opacity-40 cursor-not-allowed grayscale"
                                            )}
                                        >
                                            <opt.icon className="w-6 h-6 mb-1" />
                                            <span className="font-bold text-sm">{opt.label}</span>
                                            {opt.disabled && <span className="text-[10px] opacity-60">({t('settings.audio.coming_soon')})</span>}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section className="space-y-4">
                                <div className="p-4 rounded-xl border border-[var(--border-default)] space-y-3">
                                    <label className="text-sm font-bold text-[var(--text-primary)] block">
                                        {t('settings.audio.voice')}
                                    </label>
                                    <select
                                        className="w-full p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--scheme-primary)]"
                                        value={settings.nativeVoiceURI || ''}
                                        onChange={(e) => updateSettings({ nativeVoiceURI: e.target.value })}
                                    >
                                        <option value="">{t('common.default')}</option>
                                        {availableVoices.map(v => (
                                            <option key={v.id} value={v.id}>{v.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="p-4 rounded-xl border border-[var(--border-default)] space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-bold text-[var(--text-primary)]">
                                            {t('settings.audio.speed')}
                                        </label>
                                        <span className="text-sm font-black px-2 py-1 rounded-lg bg-[var(--scheme-primary)]/10 text-[var(--scheme-primary)]">
                                            {settings.playbackSpeed}x
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="2.0"
                                        step="0.1"
                                        value={settings.playbackSpeed}
                                        onChange={(e) => updateSettings({ playbackSpeed: parseFloat(e.target.value) })}
                                        className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-[var(--border-default)] accent-[var(--scheme-primary)]"
                                    />
                                    <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-bold">
                                        <span>0.5x</span>
                                        <span>1.0x</span>
                                        <span>2.0x</span>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* About Tab */}
                    {activeTab === 'about' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <section className="text-center py-4">
                                <div className="relative w-20 h-20 mx-auto mb-4">
                                    <Image
                                        src="/logo.png"
                                        alt="YOMI Logo"
                                        fill
                                        className="rounded-3xl shadow-xl object-contain border-4 border-white dark:border-slate-800"
                                        unoptimized
                                    />
                                </div>
                                <h3 className="text-2xl font-black text-[var(--text-primary)]">読み | YOMI</h3>
                                <p className="text-sm font-medium text-[var(--text-muted)] mt-1">{t('settings.about.description')}</p>
                                <p className="text-[10px] font-bold text-[var(--text-faint)] mt-3">VERSION 0.1.0 EARLY ACCESS</p>
                            </section>

                            <div className="space-y-3">
                                <section>
                                    <h3 className="text-xs font-bold text-[var(--text-muted)] mb-2 flex items-center gap-2 px-1">
                                        <Keyboard className="w-3.5 h-3.5" />
                                        {t('settings.about.shortcuts')}
                                    </h3>
                                    <div className="p-4 rounded-2xl border border-[var(--border-default)] space-y-3 bg-[var(--bg-subtle)]/30">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-[var(--text-muted)] font-medium">{t('settings.about.shortcut_play')}</span>
                                            <kbd className="px-2.5 py-1 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-default)] text-[var(--text-primary)] font-mono text-xs shadow-sm">Space</kbd>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-[var(--text-muted)] font-medium">{t('settings.about.shortcut_word')}</span>
                                            <span className="text-xs font-bold text-[var(--text-faint)]">{t('settings.about.click_detail')}</span>
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <h3 className="text-xs font-bold text-[var(--text-muted)] mb-2 flex items-center gap-2 px-1">
                                        <Globe className="w-3.5 h-3.5" />
                                        {t('settings.about.links')}
                                    </h3>
                                    <div className="grid grid-cols-1 gap-2">
                                        <a
                                            href="https://github.com/nakamotosai/yomi"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 p-4 rounded-2xl border border-[var(--border-default)] hover:border-[var(--scheme-primary)] transition-all bg-[var(--bg-subtle)]/30 group"
                                        >
                                            <Github className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--scheme-primary)]" />
                                            <span className="text-sm font-bold text-[var(--text-primary)]">GitHub</span>
                                            <ExternalLink className="w-4 h-4 ml-auto text-[var(--text-faint)]" />
                                        </a>
                                    </div>
                                </section>
                            </div>

                            <section className="pt-6">
                                <button
                                    onClick={handleResetSettings}
                                    className="w-full flex items-center justify-center gap-2 py-4 text-sm font-black rounded-2xl border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-all"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    {t('settings.about.reset')}
                                </button>
                            </section>
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

function SettingToggle({ icon: Icon, label, description, enabled, onChange, isDark }: {
    icon: React.ElementType,
    label: string,
    description: string,
    enabled: boolean,
    onChange: (v: boolean) => void,
    isDark: boolean
}) {
    return (
        <label className="flex items-center justify-between p-4 cursor-pointer group hover:bg-[var(--scheme-primary)]/5 transition-colors">
            <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-muted)] group-hover:text-[var(--scheme-primary)] group-hover:bg-[var(--scheme-primary)]/10 transition-colors">
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <div className="font-bold text-sm text-[var(--text-primary)]">{label}</div>
                    <div className="text-xs text-[var(--text-muted)]">{description}</div>
                </div>
            </div>
            <div className="relative inline-flex items-center" onClick={(e) => { e.preventDefault(); onChange(!enabled); }}>
                <div className={clsx(
                    "w-11 h-6 rounded-full transition-all duration-300",
                    enabled ? (isDark ? "bg-[var(--scheme-primary)] shadow-[0_0_10px_rgba(139,92,246,0.5)]" : "bg-[var(--scheme-primary)]") : "bg-[var(--border-default)]"
                )}>
                    <div className={clsx(
                        "absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-sm",
                        enabled ? "translate-x-5" : "translate-x-0"
                    )} />
                </div>
            </div>
        </label>
    );
}

function Divider() {
    return <div className="h-px w-full bg-[var(--border-default)] opacity-50" />;
}
