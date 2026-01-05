import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { message, stack, type = 'ERROR' } = body;

        const logDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir);
        }

        const logFile = path.join(logDir, 'app.log');
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${type}] ${message}\n${stack || ''}\n-----------------------------------\n`;

        fs.appendFileSync(logFile, logEntry);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to write log', error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
