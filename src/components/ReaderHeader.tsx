import React from 'react';
import { PlayCircle, PauseCircle, Square, Languages, Type, Settings } from 'lucide-react';
import clsx from 'clsx';
import { useI18n } from '@/lib/i18n';
import { useAppStore } from '@/store/useAppStore';

interface ReaderHeaderProps {
    isInputOpen: boolean;
    onToggleInput: () => void;
    isTranslationVisible: boolean;
    onToggleTranslation: () => void;
    isLoadingTranslation: boolean;
    isSpeaking: boolean;
    isPaused: boolean;
    onPlay: () => void;
    onStop: () => void;
}

const ReaderHeader: React.FC<ReaderHeaderProps> = ({
    isInputOpen,
    onToggleInput,
    isTranslationVisible,
    onToggleTranslation,
    isLoadingTranslation,
    isSpeaking,
    isPaused,
    onPlay,
    onStop,
}) => {
    const { t } = useI18n(); // Removed 'language' as it's no longer used
    // Removed: const { setUiLanguage } = useAppStore(); // setUiLanguage is no longer needed

    return (
        <div className="flex flex-wrap items-center gap-2 w-full px-2 shrink-0 select-none justify-center overflow-visible">
            {/* Left Column: Fixed Left Pair */}
            <div className="flex flex-wrap items-center justify-center gap-2 min-w-0 max-w-full overflow-visible p-1">
                {/* Input Toggle Button */}
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleInput(); }}
                    className={clsx(
                        "flex items-center justify-center gap-1.5 px-3 sm:px-4 rounded-2xl transition-all duration-300 h-9 sm:h-10 whitespace-nowrap border text-[var(--accent-primary)]",
                        isInputOpen
                            ? "rainbow-highlight text-[var(--accent-primary)]"
                            : "bg-transparent border-transparent shadow-sm interactive-tag opacity-70"
                    )}
                    title={t('header.title_input')}
                >
                    <Type className="w-4 h-4" />
                    <span className="text-[13px] sm:text-[14px] font-bold tracking-wide">{t('header.input_text')}</span>
                </button>

                {/* Translation Toggle Button */}
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleTranslation(); }}
                    className={clsx(
                        "flex items-center justify-center gap-1.5 px-3 sm:px-4 rounded-2xl transition-all duration-300 h-9 sm:h-10 whitespace-nowrap border text-[var(--accent-primary)]",
                        isTranslationVisible
                            ? "rainbow-highlight text-[var(--accent-primary)]"
                            : "bg-transparent border-transparent shadow-sm interactive-tag opacity-70"
                    )}
                    title={isTranslationVisible ? t('header.title_close_trans') : t('header.title_show_trans')}
                >
                    <Languages className={clsx("w-4 h-4", isLoadingTranslation && "animate-spin")} />
                    <span className="text-[13px] sm:text-[14px] font-bold tracking-wide">{t('header.full_translation')}</span>
                </button>

                {/* Play/Pause Button */}
                <button
                    onClick={(e) => { e.stopPropagation(); onPlay(); }}
                    className={clsx(
                        "flex items-center justify-center gap-1.5 px-3 sm:px-4 rounded-2xl transition-all duration-300 h-9 sm:h-10 whitespace-nowrap border text-[var(--accent-primary)]",
                        (isSpeaking && !isPaused)
                            ? "rainbow-highlight text-[var(--accent-primary)]"
                            : "bg-transparent border-transparent shadow-sm interactive-tag opacity-70"
                    )}
                >
                    {isSpeaking && !isPaused ? (
                        <>
                            <PauseCircle className="w-4 h-4" />
                            <span className="text-[13px] sm:text-[14px] font-bold tracking-wide">{t('header.pause')}</span>
                        </>
                    ) : (
                        <>
                            <PlayCircle className="w-4 h-4" />
                            <span className="text-[13px] sm:text-[14px] font-bold tracking-wide">
                                {isPaused ? t('header.resume') : t('header.play_all')}
                            </span>
                        </>
                    )}
                </button>

                {/* Stop Button */}
                {(isSpeaking || isPaused) && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onStop(); }}
                        className={clsx(
                            "flex items-center justify-center gap-1.5 px-3 sm:px-4 rounded-2xl transition-all duration-300 h-9 sm:h-10 whitespace-nowrap border text-[var(--accent-primary)]",
                            "bg-transparent border-transparent shadow-sm interactive-tag opacity-70"
                        )}
                        title={t('header.title_stop')}
                    >
                        <Square className="w-4 h-4" />
                        <span className="text-[13px] sm:text-[14px] font-bold tracking-wide">{t('header.stop')}</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default ReaderHeader;
