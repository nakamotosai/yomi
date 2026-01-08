/**
 * 用户登录 API
 * POST /api/auth/login
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateUserLogin, D1Database } from '@/lib/db';
import { generateToken, createAuthCookie } from '@/lib/auth';

interface LoginRequest {
    email: string;
    password: string;
}

// 获取 D1 数据库绑定
function getDB(request: NextRequest): D1Database | null {
    const env = (request as unknown as { env?: { DB?: D1Database } }).env;
    if (env?.DB) return env.DB;

    const cf = (globalThis as unknown as { process?: { env?: { DB?: D1Database } } }).process?.env;
    if (cf?.DB) return cf.DB;

    return null;
}

export async function POST(request: NextRequest) {
    try {
        const db = getDB(request);
        if (!db) {
            return NextResponse.json(
                { error: '数据库未配置' },
                { status: 500 }
            );
        }

        const body: LoginRequest = await request.json();
        const { email, password } = body;

        // 验证必填字段
        if (!email || !password) {
            return NextResponse.json(
                { error: '邮箱和密码为必填项' },
                { status: 400 }
            );
        }

        // 验证用户登录
        const user = await validateUserLogin(db, email, password);
        if (!user) {
            return NextResponse.json(
                { error: '邮箱或密码错误' },
                { status: 401 }
            );
        }

        // 生成 Token
        const token = await generateToken(user);

        // 返回响应并设置 Cookie
        const response = NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                avatar_url: user.avatar_url
            }
        });

        response.headers.set('Set-Cookie', createAuthCookie(token));

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: '登录失败，请稍后重试' },
            { status: 500 }
        );
    }
}
