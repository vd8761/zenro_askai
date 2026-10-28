import { NextRequest, NextResponse } from 'next/server';
import { processUserQuery } from '@/lib/ai-engine';
import {
  createDbChatSession,
  updateDbChatSessionTitle,
  insertDbChatMessage,
} from '@/lib/db';
import { ChatMessage } from '@/lib/types';
import { getTenantSessionFromRequest } from '@/lib/auth-jwt';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate Request
    const tenantSession = getTenantSessionFromRequest(req);

    // In production, strictly reject unauthenticated calls
    if (!tenantSession && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Active Zenro Payroll session required.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const rawMessage = body.message || body.query;
    let { sessionId, history = [], dbOverride, language } = body;

    if (!rawMessage || typeof rawMessage !== 'string' || !rawMessage.trim()) {
      return NextResponse.json({ success: false, error: 'Message is required.' }, { status: 400 });
    }

    // Determine target database and app url from verified session or fallback
    const targetDatabase = tenantSession?.db_name || dbOverride?.database || process.env.ZENRO_DB_NAME || 'shc_2026';
    const targetAppUrl = tenantSession?.app_base_url || process.env.NEXT_PUBLIC_LOGO_BASE_URL || 'http://localhost/shadithyahospital_zenro/';
    const targetUserId = tenantSession ? Number(tenantSession.user_id) || 1 : 1;

    const effectiveDbOverride = {
      database: targetDatabase,
      host: dbOverride?.host || process.env.ZENRO_DB_HOST || 'localhost',
    };

    const trimmedMsg = rawMessage.trim();
    let isNewSession = false;
    let sessionTitle = '';

    // If no sessionId provided, create a new session in gs_ai_chat_session in client DB
    if (!sessionId) {
      isNewSession = true;
      sessionTitle = trimmedMsg.length > 50 ? `${trimmedMsg.substring(0, 50)}...` : trimmedMsg;
      sessionId = await createDbChatSession(sessionTitle, targetUserId, targetDatabase);
    }

    // 1. Record User Message in gs_ai_chat_messages in client DB
    await insertDbChatMessage(sessionId, 'user', trimmedMsg, undefined, undefined, targetDatabase);

    // 2. Execute query and AI synthesis against the verified tenant database
    const result = await processUserQuery(
      trimmedMsg,
      history as ChatMessage[],
      effectiveDbOverride,
      language,
      targetAppUrl
    );

    // 3. Record Assistant Response in gs_ai_chat_messages
    const sqlResultPayload = {
      executionTimeMs: result.sqlExecution?.executionTimeMs,
      rowCount: result.sqlExecution?.rowCount,
      columns: result.tabularData?.columns || result.sqlExecution?.columns || [],
      rows: result.tabularData?.rows || result.sqlExecution?.rows || [],
      metrics: result.metrics || [],
    };

    const assistantMsgId = await insertDbChatMessage(
      sessionId,
      'assistant',
      result.answer,
      result.sqlExecution?.query,
      sqlResultPayload,
      targetDatabase
    );

    return NextResponse.json({
      success: true,
      sessionId,
      sessionTitle: isNewSession ? sessionTitle : undefined,
      messageId: assistantMsgId,
      answer: result.answer,
      sqlExecution: result.sqlExecution,
      tabularData: result.tabularData,
      metrics: result.metrics,
      sources: result.sources,
      data: {
        ...result,
        messageId: assistantMsgId,
        sessionId,
        sessionTitle: isNewSession ? sessionTitle : undefined,
      },
    });
  } catch (err: any) {
    console.error('Chat API Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'An error occurred while processing your request.',
      },
      { status: 500 }
    );
  }
}
