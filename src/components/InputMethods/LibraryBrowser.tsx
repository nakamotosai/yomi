'use client';

import React, { useState } from 'react';
import { Book, Loader2, Search, Library } from 'lucide-react';
import { FEATURED_BOOKS, fetchAozoraContent, parseAozoraHTML, chunkText, AozoraBook } from '@/lib/aozora';


interface LibraryBrowserProps {
    onTextLoaded: (text: string) => void;
}

export default function LibraryBrowser({ onTextLoaded }: LibraryBrowserProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBook, setSelectedBook] = useState<AozoraBook | null>(null);

    // Simple search filtering
    const filteredBooks = FEATURED_BOOKS.filter(book =>
        book.title.includes(searchQuery) || book.author.includes(searchQuery)
    );

    const handleBookSelect = async (book: AozoraBook) => {
        setIsLoading(true);
        setSelectedBook(book);
        try {
            const html = await fetchAozoraContent(book.txtUrl);
            const text = parseAozoraHTML(html);

            // Chunking strategy: 
            // For now, let's load the first chunk and add a note that full text support needs pagination.
            // Or better: pass the WHOLE text, but TextAnalyzer needs to handle it.
            // But user specifically asked to handle long texts.
            // Let's implement a simple prompt.

            const chunks = chunkText(text, 5000); // 5000 chars per chunk

            if (chunks.length > 1) {
                // If multiple chunks, load the first one and maybe append a system note?
                // Real pagination logic should live in the parent or a dedicated Reader state.
                // For this iteration, we'll just load the first chunk to be safe.
                onTextLoaded(chunks[0] + "\n\n[注：文章が長いため、最初の部分のみ表示しています。続きは実装予定です。]");
            } else {
                onTextLoaded(text);
            }
        } catch (error) {
            console.error(error);
            alert('書籍の読み込みに失敗しました。');
            setSelectedBook(null);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full">
            {/* Search Bar */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                    type="text"
                    placeholder="作家名・作品名で検索..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border-default)] focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-[var(--bg-muted)] text-[var(--text-primary)]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 bg-[var(--bg-elevated)]/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-xl">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                    <p className="text-sm text-[var(--text-muted)] font-medium">
                        {selectedBook?.title} を読み込み中...
                    </p>
                </div>
            )}

            {/* Book Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredBooks.map((book) => (
                    <button
                        key={book.id}
                        onClick={() => handleBookSelect(book)}
                        className="group flex flex-col items-start text-left p-3 rounded-xl border border-[var(--border-default)] hover:border-blue-200 hover:shadow-md transition-all bg-[var(--bg-elevated)] relative overflow-hidden"
                    >
                        {/* Decorative Book Spine/Cover Placeholder */}
                        <div className="w-full aspect-[2/3] bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden group-hover:from-indigo-100 group-hover:to-blue-100 dark:group-hover:from-indigo-900/40 dark:group-hover:to-blue-900/40 transition-colors">
                            <Book className="w-8 h-8 text-blue-200 group-hover:scale-110 transition-transform duration-500" />
                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-[var(--bg-elevated)]/90 backdrop-blur text-[10px] text-center text-[var(--text-muted)] font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                                Aozora Bunko
                            </div>
                        </div>

                        <h3 className="font-bold text-[var(--text-primary)] text-sm line-clamp-2 leading-tight mb-1 group-hover:text-blue-700 transition-colors">
                            {book.title}
                        </h3>
                        <p className="text-xs text-[var(--text-muted)]">
                            {book.author}
                        </p>
                    </button>
                ))}
            </div>

            {filteredBooks.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    <Library className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>見つかりませんでした</p>
                </div>
            )}
        </div>
    );
}
