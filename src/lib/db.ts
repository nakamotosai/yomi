/**
 * YOMI 数据库操作模块
 * 封装 D1 数据库操作，便于将来迁移
 */

import { User, generateUserId, hashPassword, verifyPassword } from './auth';

// D1 数据库类型定义
export interface D1Database {
    prepare(query: string): D1PreparedStatement;
    batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
    exec(query: string): Promise<D1ExecResult>;
}

interface D1PreparedStatement {
    bind(...values: unknown[]): D1PreparedStatement;
    first<T = unknown>(colName?: string): Promise<T | null>;
    run<T = unknown>(): Promise<D1Result<T>>;
    all<T = unknown>(): Promise<D1Result<T>>;
    raw<T = unknown>(): Promise<T[]>;
}

interface D1Result<T = unknown> {
    results?: T[];
    success: boolean;
    error?: string;
    meta?: object;
}

interface D1ExecResult {
    count: number;
    duration: number;
}

// 数据库行类型
interface UserRow {
    id: string;
    email: string;
    username: string | null;
    password_hash: string | null;
    oauth_provider: string | null;
    oauth_id: string | null;
    avatar_url: string | null;
    created_at: string;
    updated_at: string;
}

interface VocabItemRow {
    id: string;
    user_id: string;
    word: string;
    reading: string | null;
    base_form: string | null;
    meaning: string | null;
    pos: string | null;
    context: string | null;
    created_at: string;
}

interface UserSettingsRow {
    user_id: string;
    settings: string;
    updated_at: string;
}

export interface VocabItem {
    id: string;
    word: string;
    reading: string | null;
    baseForm: string | null;
    meaning: string | null;
    pos: string | null;
    context: string | null;
    createdAt: number;
}

/**
 * 将 UserRow 转换为 User
 */
function rowToUser(row: UserRow): User {
    return {
        id: row.id,
        email: row.email,
        username: row.username,
        avatar_url: row.avatar_url,
        oauth_provider: row.oauth_provider,
        created_at: row.created_at
    };
}

/**
 * 将 VocabItemRow 转换为 VocabItem
 */
function rowToVocabItem(row: VocabItemRow): VocabItem {
    return {
        id: row.id,
        word: row.word,
        reading: row.reading,
        baseForm: row.base_form,
        meaning: row.meaning,
        pos: row.pos,
        context: row.context,
        createdAt: new Date(row.created_at).getTime()
    };
}

// ============================================================
// 用户相关操作
// ============================================================

/**
 * 通过邮箱和密码创建用户
 */
export async function createUser(
    db: D1Database,
    email: string,
    password: string,
    username?: string
): Promise<User> {
    const id = generateUserId();
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();

    await db.prepare(`
        INSERT INTO users (id, email, username, password_hash, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, email, username || null, passwordHash, now, now).run();

    return {
        id,
        email,
        username: username || null,
        avatar_url: null,
        oauth_provider: null,
        created_at: now
    };
}

/**
 * 通过 OAuth 创建/更新用户
 */
export async function createOrUpdateOAuthUser(
    db: D1Database,
    provider: string,
    oauthId: string,
    email: string,
    username?: string,
    avatarUrl?: string
): Promise<User> {
    // 先检查是否存在
    const existing = await db.prepare(`
        SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ?
    `).bind(provider, oauthId).first<UserRow>();

    if (existing) {
        // 更新现有用户
        const now = new Date().toISOString();
        await db.prepare(`
            UPDATE users SET email = ?, username = ?, avatar_url = ?, updated_at = ?
            WHERE id = ?
        `).bind(email, username || existing.username, avatarUrl || existing.avatar_url, now, existing.id).run();

        return rowToUser({ ...existing, email, username: username || existing.username, avatar_url: avatarUrl || existing.avatar_url });
    }

    // 创建新用户
    const id = generateUserId();
    const now = new Date().toISOString();

    await db.prepare(`
        INSERT INTO users (id, email, username, oauth_provider, oauth_id, avatar_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, email, username || null, provider, oauthId, avatarUrl || null, now, now).run();

    return {
        id,
        email,
        username: username || null,
        avatar_url: avatarUrl || null,
        oauth_provider: provider,
        created_at: now
    };
}

/**
 * 通过邮箱获取用户
 */
export async function getUserByEmail(db: D1Database, email: string): Promise<UserRow | null> {
    return db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<UserRow>();
}

/**
 * 通过 ID 获取用户
 */
export async function getUserById(db: D1Database, id: string): Promise<User | null> {
    const row = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>();
    return row ? rowToUser(row) : null;
}

/**
 * 验证用户登录
 */
export async function validateUserLogin(
    db: D1Database,
    email: string,
    password: string
): Promise<User | null> {
    const row = await getUserByEmail(db, email);
    if (!row || !row.password_hash) return null;

    const isValid = await verifyPassword(password, row.password_hash);
    if (!isValid) return null;

    return rowToUser(row);
}

/**
 * 检查邮箱是否已存在
 */
export async function emailExists(db: D1Database, email: string): Promise<boolean> {
    const row = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    return row !== null;
}

/**
 * 检查用户名是否已存在
 */
export async function usernameExists(db: D1Database, username: string): Promise<boolean> {
    const row = await db.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
    return row !== null;
}

// ============================================================
// 词汇收藏相关操作
// ============================================================

/**
 * 保存词汇收藏
 */
export async function saveVocabItem(
    db: D1Database,
    userId: string,
    item: Omit<VocabItem, 'createdAt'>
): Promise<VocabItem> {
    const now = new Date().toISOString();

    await db.prepare(`
        INSERT OR REPLACE INTO vocab_items (id, user_id, word, reading, base_form, meaning, pos, context, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        item.id,
        userId,
        item.word,
        item.reading,
        item.baseForm,
        item.meaning,
        item.pos,
        item.context,
        now
    ).run();

    return {
        ...item,
        createdAt: new Date(now).getTime()
    };
}

/**
 * 批量保存词汇收藏
 */
export async function saveVocabItems(
    db: D1Database,
    userId: string,
    items: VocabItem[]
): Promise<void> {
    const statements = items.map(item =>
        db.prepare(`
            INSERT OR REPLACE INTO vocab_items (id, user_id, word, reading, base_form, meaning, pos, context, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            item.id,
            userId,
            item.word,
            item.reading,
            item.baseForm,
            item.meaning,
            item.pos,
            item.context,
            new Date(item.createdAt).toISOString()
        )
    );

    await db.batch(statements);
}

/**
 * 获取用户所有词汇收藏
 */
export async function getVocabItems(db: D1Database, userId: string): Promise<VocabItem[]> {
    const result = await db.prepare(`
        SELECT * FROM vocab_items WHERE user_id = ? ORDER BY created_at DESC
    `).bind(userId).all<VocabItemRow>();

    return (result.results || []).map(rowToVocabItem);
}

/**
 * 删除词汇收藏
 */
export async function deleteVocabItem(db: D1Database, userId: string, itemId: string): Promise<void> {
    await db.prepare(`
        DELETE FROM vocab_items WHERE id = ? AND user_id = ?
    `).bind(itemId, userId).run();
}

/**
 * 清空用户所有词汇收藏
 */
export async function clearVocabItems(db: D1Database, userId: string): Promise<void> {
    await db.prepare('DELETE FROM vocab_items WHERE user_id = ?').bind(userId).run();
}

// ============================================================
// 用户设置相关操作
// ============================================================

/**
 * 保存用户设置
 */
export async function saveUserSettings(
    db: D1Database,
    userId: string,
    settings: Record<string, unknown>
): Promise<void> {
    const now = new Date().toISOString();
    const settingsJson = JSON.stringify(settings);

    await db.prepare(`
        INSERT OR REPLACE INTO user_settings (user_id, settings, updated_at)
        VALUES (?, ?, ?)
    `).bind(userId, settingsJson, now).run();
}

/**
 * 获取用户设置
 */
export async function getUserSettings(
    db: D1Database,
    userId: string
): Promise<Record<string, unknown> | null> {
    const row = await db.prepare(`
        SELECT settings FROM user_settings WHERE user_id = ?
    `).bind(userId).first<UserSettingsRow>();

    if (!row) return null;

    try {
        return JSON.parse(row.settings);
    } catch {
        return null;
    }
}

// ============================================================
// 系统日志相关操作
// ============================================================

export async function createSystemLog(
    db: D1Database,
    type: string,
    message: string,
    stack?: string
): Promise<void> {
    const id = generateUserId(); // Reuse UUID generation
    const now = new Date().toISOString();

    await db.prepare(`
        INSERT INTO system_logs (id, type, message, stack, created_at)
        VALUES (?, ?, ?, ?, ?)
    `).bind(id, type, message, stack || null, now).run();
}

// ============================================================
// AI 缓存相关操作
// ============================================================

export async function getAICache(db: D1Database, key: string): Promise<string | null> {
    const row = await db.prepare('SELECT value FROM ai_cache WHERE key = ?').bind(key).first<{ value: string }>();
    return row ? row.value : null;
}

export async function setAICache(db: D1Database, key: string, value: string): Promise<void> {
    const now = new Date().toISOString();
    await db.prepare(`
        INSERT OR REPLACE INTO ai_cache (key, value, created_at)
        VALUES (?, ?, ?)
    `).bind(key, value, now).run();
}
