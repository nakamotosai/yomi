/**
 * 用户登出 API
 * POST /api/auth/logout
 */

import { NextResponse } from 'next/server';

export const runtime = 'edge';
import { clearAuthCookie } from '@/lib/auth';

export async function POST() {
    const response = NextResponse.json({ success: true });
    response.headers.set('Set-Cookie', clearAuthCookie());
    return response;
}
