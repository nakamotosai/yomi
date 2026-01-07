'use client';

import React, { useState } from 'react';
import { Download, FileText, CreditCard, X, Trash2 } from 'lucide-react';
import { useVocabStore, exportToCSV, exportToAnkiTSV } from '@/store/useVocabStore';
import clsx from 'clsx';

interface VocabExportProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function VocabExport({ isOpen, onClose }: VocabExportProps) {
    const { vocabList, clearVocab, removeVocab } = useVocabStore();
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    if (!isOpen) return null;

    const handleExportCSV = () => {
        const csv = exportToCSV(vocabList);
        downloadFile(csv, 'yomi-vocab.csv', 'text/csv');
    };

    const handleExportAnki = () => {
        const tsv = exportToAnkiTSV(vocabList);
        downloadFile(tsv, 'yomi-vocab-anki.txt', 'text/plain');
    };

    const downloadFile = (content: string, filename: string, mimeType: string) => {
        const blob = new Blob(['\ufeff' + content], { type: `${mimeType};charset=utf-8` });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleClearAll = () => {
        clearVocab();
        setShowClearConfirm(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[var(--bg-elevated)] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-[var(--border-default)]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">単語帳</h2>
                    <button onClick={onClose} className="p-2 hover:bg-[var(--hover-bg)] rounded-full transition-colors">
                        <X className="w-5 h-5 text-[var(--text-muted)]" />
                    </button>
                </div>

                {/* Stats & Actions */}
                <div className="p-4 bg-[var(--bg-subtle)] border-b border-[var(--border-default)]">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-[var(--text-secondary)]">
                            保存済み: <span className="font-bold text-[var(--text-primary)]">{vocabList.length}</span> 単語
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleExportCSV}
                                disabled={vocabList.length === 0}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FileText className="w-4 h-4" />
                                CSV
                            </button>
                            <button
                                onClick={handleExportAnki}
                                disabled={vocabList.length === 0}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <CreditCard className="w-4 h-4" />
                                Anki
                            </button>
                            <button
                                onClick={() => setShowClearConfirm(true)}
                                disabled={vocabList.length === 0}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Trash2 className="w-4 h-4" />
                                全削除
                            </button>
                        </div>
                    </div>
                </div>

                {/* Vocab List */}
                <div className="overflow-y-auto max-h-[50vh] p-4">
                    {vocabList.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <Download className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>単語帳は空です</p>
                            <p className="text-sm mt-1">単語をクリックして ⭐ を押すと保存されます</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {vocabList.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between p-3 bg-[var(--bg-muted)] rounded-lg hover:bg-[var(--hover-bg)] transition-colors group border border-[var(--border-default)]"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-bold text-[var(--text-primary)]">{item.word}</span>
                                            <span className="text-[var(--text-secondary)] text-sm">{item.reading}</span>
                                            <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-subtle)] px-1.5 py-0.5 rounded border border-[var(--border-default)]">
                                                {item.pos}
                                            </span>
                                        </div>
                                        <div className="text-sm text-[var(--text-secondary)] truncate">{item.meaning}</div>
                                        <div className="text-xs text-[var(--text-faint)] truncate mt-1">{item.context}</div>
                                    </div>
                                    <button
                                        onClick={() => removeVocab(item.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Clear Confirmation */}
                {showClearConfirm && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4">
                        <div className="bg-[var(--bg-elevated)] rounded-xl p-6 max-w-sm w-full shadow-2xl border border-[var(--border-default)]">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">全ての単語を削除しますか？</h3>
                            <p className="text-sm text-[var(--text-secondary)] mb-4">この操作は取り消せません。</p>
                            <div className="flex gap-2 justify-end">
                                <button
                                    onClick={() => setShowClearConfirm(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    キャンセル
                                </button>
                                <button
                                    onClick={handleClearAll}
                                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                >
                                    全削除
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
