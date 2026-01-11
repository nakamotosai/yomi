/**
 * 用户注册 API
 * POST /api/auth/register
 */

import { NextRequest, NextResponse } from 'next/server';
import { createUser, emailExists, usernameExists, D1Database } from '@/lib/db';
import { generateToken, createAuthCookie } from '@/lib/auth';

export const runtime = 'edge';

interface RegisterRequest {
    email: string;
    password: string;
    username?: string;
}

// 获取 D1 数据库绑定
function getDB(request: NextRequest): D1Database | null {
    // Cloudflare Pages 环境
    const env = (request as unknown as { env?: { DB?: D1Database } }).env;
    if (env?.DB) return env.DB;

    // Next.js with @cloudflare/next-on-pages
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

        const body: RegisterRequest = await request.json();
        const { email, password, username } = body;

        // 验证必填字段
        if (!email || !password) {
            return NextResponse.json(
                { error: '邮箱和密码为必填项' },
                { status: 400 }
            );
        }

        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: '邮箱格式不正确' },
                { status: 400 }
            );
        }

        // 验证密码长度
        if (password.length < 6) {
            return NextResponse.json(
                { error: '密码至少需要 6 个字符' },
                { status: 400 }
            );
        }

        // 检查邮箱是否已存在
        if (await emailExists(db, email)) {
            return NextResponse.json(
                { error: '该邮箱已被注册' },
                { status: 409 }
            );
        }

        // 检查用户名是否已存在
        if (username && await usernameExists(db, username)) {
            return NextResponse.json(
                { error: '该用户名已被使用' },
                { status: 409 }
            );
        }

        // 创建用户
        const user = await createUser(db, email, password, username);

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
        console.error('Register error:', error);
        return NextResponse.json(
            { error: '注册失败，请稍后重试' },
            { status: 500 }
        );
    }
}
