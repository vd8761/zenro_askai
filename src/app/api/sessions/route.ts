import { NextRequest, NextResponse } from 'next/server';
import { getDbChatSessions, createDbChatSession } from '@/lib/db';
import { getTenantSessionFromRequest } from '@/lib/auth-jwt';

export async function GET(req: NextRequest) {
  try {
    const tenantSession = getTenantSessionFromRequest(req);
    const dbName = tenantSession?.db_name || process.env.ZENRO_DB_NAME || 'shc_2026';
    const userId = tenantSession ? Number(tenantSession.user_id) || 1 : 1;

    const sessions = await getDbChatSessions(userId, dbName);
    return NextResponse.json({ success: true, sessions });
  } catch (err: any) {
    console.error('Failed to get sessions:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantSession = getTenantSessionFromRequest(req);
    const dbName = tenantSession?.db_name || process.env.ZENRO_DB_NAME || 'shc_2026';
    const userId = tenantSession ? Number(tenantSession.user_id) || 1 : 1;

    const body = await req.json().catch(() => ({}));
    const title = body.title || 'New Conversation';
    const sessionId = await createDbChatSession(title, userId, dbName);
    return NextResponse.json({ success: true, sessionId, title });
  } catch (err: any) {
    console.error('Failed to create session:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
