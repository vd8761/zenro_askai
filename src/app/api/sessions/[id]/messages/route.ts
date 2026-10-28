import { NextRequest, NextResponse } from 'next/server';
import { getDbChatMessages } from '@/lib/db';
import { getTenantSessionFromRequest } from '@/lib/auth-jwt';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const tenantSession = getTenantSessionFromRequest(req);
    const dbName = tenantSession?.db_name || process.env.ZENRO_DB_NAME || 'shc_2026';
    const messages = await getDbChatMessages(id, dbName);
    return NextResponse.json({ success: true, messages });
  } catch (err: any) {
    console.error('Failed to get session messages:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
