import { NextRequest, NextResponse } from 'next/server';
import { getDbStats, testConnection } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const database = searchParams.get('database') || undefined;
    const host = searchParams.get('host') || undefined;

    const stats = await getDbStats({ database, host });
    return NextResponse.json({ success: true, stats });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { host, port, user, password, database, ssl } = body;

    const result = await testConnection({ host, port: Number(port), user, password, database, ssl });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
