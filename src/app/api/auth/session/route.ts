import { NextRequest, NextResponse } from 'next/server';
import { verifyTenantToken, ZENRO_TENANT_COOKIE, TenantSession } from '@/lib/auth-jwt';
import { executeReadOnlyQuery } from '@/lib/db';

export async function GET(req: NextRequest) {
  return handleAuth(req);
}

export async function POST(req: NextRequest) {
  return handleAuth(req);
}

async function handleAuth(req: NextRequest) {
  try {
    // 1. Check for token in URL query, POST body, or Authorization header
    let token: string | undefined = req.nextUrl.searchParams.get('token') || undefined;
    
    if (!token && req.method === 'POST') {
      try {
        const body = await req.json();
        token = body.token;
      } catch {}
    }

    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    // 2. Fallback to existing cookie
    if (!token) {
      token = req.cookies.get(ZENRO_TENANT_COOKIE)?.value;
    }

    if (!token) {
      return NextResponse.json(
        { authenticated: false, error: 'Authentication required. No session or token found.' },
        { status: 401 }
      );
    }

    // 3. Verify cryptographic signature & expiration
    const result = verifyTenantToken(token);
    if (!result.valid || !result.session) {
      const res = NextResponse.json(
        { authenticated: false, error: result.error || 'Invalid or expired session token.' },
        { status: 401 }
      );
      // Clear invalid cookie
      res.cookies.delete(ZENRO_TENANT_COOKIE);
      return res;
    }

    const session: TenantSession = result.session;

    // 4. Query client database for organization title & logo
    let orgTitle = 'Zenro Payroll';
    let orgLogo = '';

    try {
      const queryRes = await executeReadOnlyQuery(
        'SELECT gensetting_sitetitle, gensetting_sitelogo FROM gs_generalsettings WHERE (status = 1 OR status = 0) AND (deleted = 0 OR deleted IS NULL) LIMIT 1',
        { database: session.db_name }
      );
      if (queryRes.rows && queryRes.rows.length > 0) {
        if (queryRes.rows[0].gensetting_sitetitle) {
          orgTitle = queryRes.rows[0].gensetting_sitetitle;
        }
        if (queryRes.rows[0].gensetting_sitelogo) {
          const logoFile = queryRes.rows[0].gensetting_sitelogo;
          orgLogo = logoFile.startsWith('http')
            ? logoFile
            : `${session.app_base_url.replace(/\/+$/, '')}/${logoFile.replace(/^\/+/, '')}`;
        }
      }
    } catch (e: any) {
      console.warn(`[Auth] Could not fetch site settings from ${session.db_name}:`, e.message);
    }

    // 5. Respond and set secure session cookie
    const response = NextResponse.json({
      authenticated: true,
      session: {
        db_name: session.db_name,
        app_base_url: session.app_base_url,
        user_id: session.user_id,
        user_level: session.user_level,
        org_title: orgTitle,
        org_logo: orgLogo,
        exp: session.exp,
      },
    });

    const isHttps = req.nextUrl.protocol === 'https:';
    response.cookies.set({
      name: ZENRO_TENANT_COOKIE,
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: Math.max(0, session.exp - Math.floor(Date.now() / 1000)),
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { authenticated: false, error: err.message || 'Authentication error' },
      { status: 500 }
    );
  }
}
