import { NextRequest, NextResponse } from 'next/server';
import { updateDbChatSessionTitle, deleteDbChatSession } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }
    await updateDbChatSessionTitle(id, title);
    return NextResponse.json({ success: true, id, title });
  } catch (err: any) {
    console.error('Failed to update session:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteDbChatSession(id);
    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    console.error('Failed to delete session:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
