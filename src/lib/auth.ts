/**
 * YOMI 认证工具模块
 * 处理密码哈希、JWT Token 生成/验证
 */

// JWT 密钥（生产环境应使用环境变量）
const JWT_SECRET = 'yomi-jwt-secret-change-in-production';
const JWT_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000; // 7 天

export interface User {
    id: string;
    email: string;
    username: string | null;
    avatar_url: string | null;
    oauth_provider: string | null;
    created_at: string;
}

export interface JWTPayload {
    userId: string;
    email: string;
    exp: number;
    iat: number;
}

/**
 * 使用 Web Crypto API (PBKDF2) 哈希密码
 * Edge 环境兼容
 */
export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));

    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        256
    );

    const hashArray = new Uint8Array(derivedBits);
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const hashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');

    return `${saltHex}:${hashHex}`;
}

/**
 * 验证密码
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const [saltHex, hashHex] = storedHash.split(':');
    if (!saltHex || !hashHex) return false;

    const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    const encoder = new TextEncoder();

    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        256
    );

    const hashArray = new Uint8Array(derivedBits);
    const computedHashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');

    return computedHashHex === hashHex;
}

/**
 * Base64 URL 编码
 */
function base64UrlEncode(data: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...data));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Base64 URL 解码
 */
function base64UrlDecode(str: string): Uint8Array {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    const binary = atob(padded);
    return new Uint8Array([...binary].map(c => c.charCodeAt(0)));
}

/**
 * 生成 JWT Token
 */
export async function generateToken(user: User): Promise<string> {
    const header = {
        alg: 'HS256',
        typ: 'JWT'
    };

    const payload: JWTPayload = {
        userId: user.id,
        email: user.email,
        iat: Date.now(),
        exp: Date.now() + JWT_EXPIRES_IN
    };

    const encoder = new TextEncoder();
    const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
    const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));

    const data = `${headerB64}.${payloadB64}`;

    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(JWT_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    const signatureB64 = base64UrlEncode(new Uint8Array(signature));

    return `${data}.${signatureB64}`;
}

/**
 * 验证 JWT Token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [headerB64, payloadB64, signatureB64] = parts;
        const encoder = new TextEncoder();
        const data = `${headerB64}.${payloadB64}`;

        // 验证签名
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(JWT_SECRET),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );

        const signature = base64UrlDecode(signatureB64);
        const signatureBuffer = new Uint8Array(signature).buffer as ArrayBuffer;
        const isValid = await crypto.subtle.verify('HMAC', key, signatureBuffer, encoder.encode(data));

        if (!isValid) return null;

        // 解析 payload
        const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64));
        const payload: JWTPayload = JSON.parse(payloadJson);

        // 检查过期
        if (payload.exp < Date.now()) return null;

        return payload;
    } catch {
        return null;
    }
}

/**
 * 从请求中获取 Token
 */
export function getTokenFromRequest(request: Request): string | null {
    // 先尝试从 Cookie 获取
    const cookies = request.headers.get('cookie');
    if (cookies) {
        const match = cookies.match(/auth_token=([^;]+)/);
        if (match) return match[1];
    }

    // 再尝试从 Authorization header 获取
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }

    return null;
}

/**
 * 生成用户 ID
 */
export function generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * 创建认证 Cookie
 */
export function createAuthCookie(token: string): string {
    const maxAge = 7 * 24 * 60 * 60; // 7 天
    return `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

/**
 * 创建清除认证的 Cookie
 */
export function clearAuthCookie(): string {
    return 'auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
}
