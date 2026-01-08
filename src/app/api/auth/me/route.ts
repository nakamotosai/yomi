/**
 * 获取当前用户信息 API
 * GET /api/auth/me
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserById, D1Database } from '@/lib/db';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

// 获取 D1 数据库绑定
function getDB(request: NextRequest): D1Database | null {
    const env = (request as unknown as { env?: { DB?: D1Database } }).env;
    if (env?.DB) return env.DB;

    const cf = (globalThis as unknown as { process?: { env?: { DB?: D1Database } } }).process?.env;
    if (cf?.DB) return cf.DB;

    return null;
}

export async function GET(request: NextRequest) {
    try {
        // 获取 Token
        const token = getTokenFromRequest(request);
        if (!token) {
            return NextResponse.json(
                { error: '未登录' },
                { status: 401 }
            );
        }

        // 验证 Token
        const payload = await verifyToken(token);
        if (!payload) {
            return NextResponse.json(
                { error: 'Token 已过期或无效' },
                { status: 401 }
            );
        }

        const db = getDB(request);
        if (!db) {
            // 如果没有数据库，返回基础信息
            return NextResponse.json({
                user: {
                    id: payload.userId,
                    email: payload.email,
                    username: null,
                    avatar_url: null
                }
            });
        }

        // 获取用户信息
        const user = await getUserById(db, payload.userId);
        if (!user) {
            return NextResponse.json(
                { error: '用户不存在' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                avatar_url: user.avatar_url
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        return NextResponse.json(
            { error: '获取用户信息失败' },
            { status: 500 }
        );
    }
}
