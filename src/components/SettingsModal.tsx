'use client';

import React, { useEffect, useState } from 'react';
import { X, Type, Eye, EyeOff, Music, Server, Globe, BookOpen, Palette, Speaker, Languages, Layout, Sparkles } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ttsManager } from '@/lib/tts/manager';
import { PartOfSpeech } from '@/types';
import { COLOR_THEMES, ThemeId } from '@/lib/colorThemes';
import clsx from 'clsx';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const { settings, updateSettings, toggleSetting } = useAppStore();
    const [availableVoices, setAvailableVoices] = useState<{ id: string; name: string }[]>([]);
    const [activeTab, setActiveTab] = useState<'display' | 'audio' | 'dictionary'>('display');

    useEffect(() => {
        if (!isOpen) return;
        ttsManager.getVoices(settings.ttsProvider).then(voices => {
            setAvailableVoices(voices);
        });
    }, [isOpen, settings.ttsProvider]);

    if (!isOpen) return null;

    const tabs = [
        { id: 'display', label: '显示', icon: Layout },
        { id: 'audio', label: '语音', icon: Speaker },
        { id: 'dictionary', label: '词典', icon: BookOpen },
    ] as const;

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 min-h-screen"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
                style={{ maxHeight: '85vh' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
                    <h2 className="text-xl font-bold text-gray-800 tracking-tight">设置</h2>
                    <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex-none flex px-6 border-b border-gray-100 bg-gray-50/50">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                                activeTab === tab.id
                                    ? "border-blue-500 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">

                    {/* --- DISPLAY TAB --- */}
                    {activeTab === 'display' && (
                        <div className="space-y-6">
                            <section className="space-y-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">基础显示</h3>
                                <div className="space-y-3 bg-white rounded-xl border border-gray-100 p-1 shadow-sm">
                                    <SettingToggle
                                        icon={<Type className="w-4 h-4 text-blue-500" />}
                                        label="显示假名 (Furigana)"
                                        description="在汉字上方显示读音"
                                        checked={settings.showFurigana}
                                        onChange={() => toggleSetting('showFurigana')}
                                    />
                                    <Divider />
                                    <SettingToggle
                                        icon={<BookOpen className="w-4 h-4 text-orange-500" />}
                                        label="隐藏简单单词假名"
                                        description="自动隐藏 N5/N4 级别常用词的读音"
                                        checked={settings.hideCommonFurigana}
                                        onChange={() => toggleSetting('hideCommonFurigana')}
                                    />
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">学习辅助</h3>
                                <div className="space-y-3 bg-white rounded-xl border border-gray-100 p-1 shadow-sm">
                                    <SettingToggle
                                        icon={<Music className="w-4 h-4 text-rose-500" />}
                                        label="显示声调 (Pitch Accent)"
                                        description="使用音高线标注单词声调"
                                        checked={settings.showPitchAccent}
                                        onChange={() => toggleSetting('showPitchAccent')}
                                    />
                                    <Divider />
                                    <SettingToggle
                                        icon={settings.hideParticles ? <EyeOff className="w-4 h-4 text-purple-500" /> : <Eye className="w-4 h-4 text-gray-400" />}
                                        label="助词填空模式"
                                        description="将助词隐藏为 ____ 进行练习"
                                        checked={settings.hideParticles}
                                        onChange={() => toggleSetting('hideParticles')}
                                    />
                                    <Divider />
                                    <SettingToggle
                                        icon={<Sparkles className="w-4 h-4 text-amber-500" />}
                                        label="卡拉OK高亮"
                                        description="朗读时高亮当前单词"
                                        checked={settings.karaokeMode}
                                        onChange={() => toggleSetting('karaokeMode')}
                                    />
                                    <Divider />
                                    <SettingToggle
                                        icon={<Languages className="w-4 h-4 text-green-500" />}
                                        label="显示中文翻译"
                                        description="在每个句子下方显示翻译"
                                        checked={settings.showTranslation}
                                        onChange={() => toggleSetting('showTranslation')}
                                    />
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">字体风格</h3>
                                <div className="bg-white p-1 rounded-xl border border-gray-100 shadow-sm flex gap-1">
                                    {[
                                        { id: 'sans', label: '思源黑体', previewClass: 'font-preview-sans' },
                                        { id: 'serif', label: '思源宋体', previewClass: 'font-preview-serif' }
                                    ].map((font) => (
                                        <button
                                            key={font.id}
                                            onClick={() => updateSettings({ fontFamily: font.id as 'sans' | 'serif' })}
                                            className={clsx(
                                                "flex-1 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                                                settings.fontFamily === font.id
                                                    ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200"
                                                    : "text-gray-500 hover:bg-gray-50"
                                            )}
                                        >
                                            <span className={clsx("text-lg", font.previewClass)}>あ文</span>
                                            <span>{font.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">配色风格</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {(Object.keys(COLOR_THEMES) as ThemeId[]).map((themeKey) => {
                                        const theme = COLOR_THEMES[themeKey];
                                        return (
                                            <button
                                                key={themeKey}
                                                onClick={() => updateSettings({ colorTheme: themeKey })}
                                                className={clsx(
                                                    "flex items-center gap-3 p-3 rounded-xl border transition-all text-left group",
                                                    settings.colorTheme === themeKey
                                                        ? "bg-blue-50 border-blue-300 ring-1 ring-blue-300"
                                                        : "bg-white border-gray-100 hover:border-gray-200"
                                                )}
                                            >
                                                <div className="flex gap-0.5">
                                                    <div className={clsx("w-3 h-3 rounded-full", theme.colors[PartOfSpeech.NOUN].bg, theme.colors[PartOfSpeech.NOUN].border, "border")} />
                                                    <div className={clsx("w-3 h-3 rounded-full", theme.colors[PartOfSpeech.VERB].bg, theme.colors[PartOfSpeech.VERB].border, "border")} />
                                                    <div className={clsx("w-3 h-3 rounded-full", theme.colors[PartOfSpeech.ADJECTIVE].bg, theme.colors[PartOfSpeech.ADJECTIVE].border, "border")} />
                                                </div>
                                                <div className="text-sm font-medium text-gray-700">
                                                    {theme.name}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">字体大小</h3>
                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex gap-2">
                                    {['small', 'medium', 'large'].map((size) => (
                                        <button
                                            key={size}
                                            onClick={() => updateSettings({ fontSize: size as any })}
                                            className={clsx(
                                                "flex-1 py-2 rounded-lg text-sm font-medium transition-all border",
                                                settings.fontSize === size
                                                    ? "bg-blue-50 border-blue-200 text-blue-700"
                                                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                            )}
                                        >
                                            {size === 'small' ? '小' : size === 'medium' ? '中(默认)' : '大'}
                                        </button>
                                    ))}
                                </div>
                            </section>
                        </div>
                    )}

                    {/* --- AUDIO TAB --- */}
                    {activeTab === 'audio' && (
                        <div className="space-y-6">
                            <section className="space-y-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">TTS 引擎</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'native', label: '微软 Edge', icon: Globe },
                                        { id: 'voicevox', label: 'VOICEVOX', icon: Server },
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            onClick={() => updateSettings({ ttsProvider: opt.id as any })}
                                            className={clsx(
                                                "flex flex-col items-center justify-center gap-2 py-4 rounded-xl text-sm font-medium transition-all border",
                                                settings.ttsProvider === opt.id
                                                    ? "bg-blue-50 border-blue-200 text-blue-700 ring-1 ring-blue-200"
                                                    : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300"
                                            )}
                                        >
                                            <opt.icon className="w-6 h-6 mb-1 opacity-80" />
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {settings.ttsProvider === 'native' && (
                                <div className="space-y-2 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                    <label className="text-sm font-medium text-gray-700">选择声音 (Edge)</label>
                                    <select
                                        className="w-full p-2 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                                <div className="space-y-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm animate-in fade-in">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">选择角色 (Speaker)</label>
                                        <select
                                            className="w-full p-2 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                                        <p className="text-xs text-gray-400">请确保本地 VOICEVOX 应用已启动 (端口 50021)</p>
                                    </div>
                                </div>
                            )}

                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium text-gray-700">语速</label>
                                    <span className="text-sm text-blue-600 font-mono bg-blue-50 px-2 py-0.5 rounded">x{settings.playbackSpeed}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="2.0"
                                    step="0.1"
                                    value={settings.playbackSpeed}
                                    onChange={(e) => updateSettings({ playbackSpeed: parseFloat(e.target.value) })}
                                    className="w-full accent-blue-500 h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-xs text-gray-400">
                                    <span>0.5x</span>
                                    <span>正常</span>
                                    <span>2.0x</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- DICTIONARY TAB --- */}
                    {activeTab === 'dictionary' && (
                        <div className="space-y-6">


                            <section className="space-y-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Palette className="w-3 h-3" /> 词性颜色高亮
                                    </h3>
                                    <div className="flex gap-2 text-xs">
                                        <button onClick={() => updateSettings({ activeColorPOS: Object.values(PartOfSpeech) })} className="text-blue-600 hover:underline">全选</button>
                                        <span className="text-gray-300">|</span>
                                        <button onClick={() => updateSettings({ activeColorPOS: [] })} className="text-gray-400 hover:text-gray-600 hover:underline">全关</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {Object.values(PartOfSpeech).map((pos) => {
                                        const currentList = settings.activeColorPOS || [];
                                        const isActive = currentList.includes(pos);
                                        return (
                                            <button
                                                key={pos}
                                                onClick={() => {
                                                    const newActive = isActive
                                                        ? currentList.filter(p => p !== pos)
                                                        : [...currentList, pos];
                                                    updateSettings({ activeColorPOS: newActive });
                                                }}
                                                className={clsx(
                                                    "flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all border",
                                                    isActive
                                                        ? "bg-white border-blue-200 shadow-sm text-gray-900"
                                                        : "bg-gray-50 border-transparent text-gray-400 opacity-60 hover:opacity-100"
                                                )}
                                            >
                                                <div className={clsx("w-2.5 h-2.5 rounded-full", isActive ? "bg-blue-500" : "bg-gray-300")} />
                                                <span className="truncate">{pos}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-gray-400 mt-2 px-1">
                                    * 关闭高亮后，该词性将显示为默认黑色文本。
                                </p>
                            </section>
                        </div>
                    )}
                </div>

                {/* Footer (Optional, currently empty but good for extensibility) */}
                <div className="flex-none p-4 border-t border-gray-100 bg-gray-50 text-center text-xs text-gray-400">
                    読み | YOMI Early Access • v0.1.0
                </div>
            </div>
        </div>
    );
}

// ------------------------------------------------------------------
// Sub-components for cleaner code
// ------------------------------------------------------------------

function SettingToggle({ icon, label, description, checked, onChange }: { icon: React.ReactNode, label: string, description: string, checked: boolean, onChange: () => void }) {
    return (
        <label className="flex items-center justify-between p-3 cursor-pointer group hover:bg-gray-50 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-white transition-colors">
                    {icon}
                </div>
                <div>
                    <div className="font-medium text-gray-900 text-sm">{label}</div>
                    <div className="text-xs text-gray-500">{description}</div>
                </div>
            </div>
            <div className={clsx(
                "w-11 h-6 rounded-full transition-colors relative",
                checked ? "bg-blue-500" : "bg-gray-200"
            )}>
                <input type="checkbox" className="hidden" checked={checked} onChange={onChange} />
                <div className={clsx(
                    "w-4 h-4 bg-white rounded-full absolute top-1 transition-transform shadow-sm",
                    checked ? "left-[calc(100%-1.25rem)]" : "left-1"
                )} />
            </div>
        </label>
    );
}

function Divider() {
    return <div className="h-px bg-gray-100 mx-14" />;
}
