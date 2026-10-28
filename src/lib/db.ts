import mysql, { Pool, PoolOptions } from 'mysql2/promise';
import { DbConnectionConfig, DbStats, SqlExecutionResult } from './types';

const poolCache = new Map<string, Pool>();

export function getDbConfig(override?: Partial<DbConnectionConfig>): DbConnectionConfig {
  return {
    host: override?.host || process.env.ZENRO_DB_HOST || 'localhost',
    port: override?.port ? Number(override.port) : Number(process.env.ZENRO_DB_PORT || 3306),
    user: override?.user || process.env.ZENRO_DB_USER || 'root',
    password: override?.password !== undefined ? override.password : (process.env.ZENRO_DB_PASSWORD || ''),
    database: override?.database || process.env.ZENRO_DB_NAME || 'shc_2026',
    ssl: override?.ssl !== undefined ? override.ssl : false,
  };
}

export function getPool(configOverride?: Partial<DbConnectionConfig>): Pool {
  const cfg = getDbConfig(configOverride);
  const key = `${cfg.host}:${cfg.port}:${cfg.user}:${cfg.database}`;

  if (!poolCache.has(key)) {
    const poolOptions: PoolOptions = {
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 10000,
      dateStrings: true,
    };

    if (cfg.ssl) {
      poolOptions.ssl = { rejectUnauthorized: false };
    }

    poolCache.set(key, mysql.createPool(poolOptions));
  }

  return poolCache.get(key)!;
}

const FORBIDDEN_SQL_REGEX = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|REPLACE|GRANT|REVOKE|LOCK|CALL|EXEC|EXECUTE|INTO|OUTFILE|DUMPFILE|MERGE|UPSERT|RENAME|FLUSH)\b/i;

export function sanitizeAndValidateSql(rawSql: string): { safeSql: string; error?: string } {
  let sql = rawSql.trim();

  // Strip markdown code fences if present
  sql = sql.replace(/^\s*```[a-zA-Z]*\n?/gi, '').replace(/\n?```\s*$/gi, '').trim();

  // Remove trailing semicolons for consistent execution
  sql = sql.replace(/;\s*$/, '');

  if (!sql) {
    return { safeSql: '', error: 'SQL query is empty.' };
  }

  // Must begin with SELECT, WITH, or SHOW / DESCRIBE
  const normalized = sql.replace(/^\s+/, '').toUpperCase();
  if (
    !normalized.startsWith('SELECT') &&
    !normalized.startsWith('WITH') &&
    !normalized.startsWith('SHOW') &&
    !normalized.startsWith('DESCRIBE')
  ) {
    return {
      safeSql: '',
      error: 'Security Policy: All hospital & payroll tables have STRICT READ-ONLY access. Only SELECT queries are permitted.',
    };
  }

  // Check for destructive DML / DDL commands
  if (FORBIDDEN_SQL_REGEX.test(sql)) {
    return {
      safeSql: '',
      error: 'Security Policy Violation: Write operations are forbidden. All hospital & payroll tables have strict read-only access.',
    };
  }

  // Ensure reasonable LIMIT to prevent memory exhaustion
  if (!/\bLIMIT\s+\d+/i.test(sql) && !normalized.startsWith('SHOW') && !normalized.startsWith('DESCRIBE')) {
    sql = `${sql} LIMIT 100`;
  }

  return { safeSql: sql };
}

export async function executeReadOnlyQuery(
  rawSql: string,
  configOverride?: Partial<DbConnectionConfig>
): Promise<SqlExecutionResult> {
  const cfg = getDbConfig(configOverride);
  const { safeSql, error } = sanitizeAndValidateSql(rawSql);

  if (error || !safeSql) {
    return {
      query: rawSql,
      database: cfg.database,
      executionTimeMs: 0,
      rowCount: 0,
      columns: [],
      rows: [],
      readOnlyVerified: false,
      error: error || 'Failed to validate query safety.',
    };
  }

  const pool = getPool(configOverride);
  const startTime = Date.now();

  try {
    const [rows, fields] = await pool.query(safeSql);
    const executionTimeMs = Date.now() - startTime;

    const rowList = Array.isArray(rows) ? (rows as Record<string, any>[]) : [];
    const columns = fields && Array.isArray(fields)
      ? fields.map((f: any) => f.name)
      : rowList.length > 0
      ? Object.keys(rowList[0])
      : [];

    return {
      query: safeSql,
      database: cfg.database,
      executionTimeMs,
      rowCount: rowList.length,
      columns,
      rows: rowList,
      readOnlyVerified: true,
    };
  } catch (err: any) {
    const executionTimeMs = Date.now() - startTime;
    return {
      query: safeSql,
      database: cfg.database,
      executionTimeMs,
      rowCount: 0,
      columns: [],
      rows: [],
      readOnlyVerified: true,
      error: err.message || 'Database execution failed.',
    };
  }
}

export async function testConnection(
  configOverride?: Partial<DbConnectionConfig>
): Promise<{ success: boolean; message: string; latencyMs: number }> {
  const start = Date.now();
  try {
    const pool = getPool(configOverride);
    const [result] = await pool.query('SELECT 1 as is_connected');
    const latencyMs = Date.now() - start;
    if (result && Array.isArray(result) && result.length > 0) {
      return { success: true, message: 'Connected successfully', latencyMs };
    }
    return { success: false, message: 'Invalid response from database', latencyMs };
  } catch (err: any) {
    return { success: false, message: err.message || 'Connection failed', latencyMs: Date.now() - start };
  }
}

export async function getDbStats(
  configOverride?: Partial<DbConnectionConfig>
): Promise<DbStats> {
  const cfg = getDbConfig(configOverride);
  try {
    const pool = getPool(configOverride);

    const [tablesResult] = await pool.query('SHOW TABLES');
    const tablesCount = Array.isArray(tablesResult) ? tablesResult.length : 0;

    let employeeCount = 0;
    try {
      const [empResult]: any = await pool.query('SELECT COUNT(*) as count FROM gs_employee WHERE deleted = 0 OR deleted IS NULL');
      employeeCount = empResult?.[0]?.count || 0;
    } catch {
      try {
        const [empResult]: any = await pool.query('SELECT COUNT(*) as count FROM gs_employee');
        employeeCount = empResult?.[0]?.count || 0;
      } catch {}
    }

    let payslipCount = 0;
    try {
      const [payslipResult]: any = await pool.query('SELECT COUNT(*) as count FROM gs_payslip_actual');
      payslipCount = payslipResult?.[0]?.count || 0;
    } catch {}

    let departmentCount = 0;
    try {
      const [deptResult]: any = await pool.query('SELECT COUNT(*) as count FROM gs_department');
      departmentCount = deptResult?.[0]?.count || 0;
    } catch {}

    let orgTitle = 'Shadithya Hospital';
    let orgLogo = '';
    let orgLogoUrl = '';

    try {
      const [genResult]: any = await pool.query(
        'SELECT gensetting_sitetitle, gensetting_sitelogo FROM gs_generalsettings WHERE (status = 1 OR status = 0) AND (deleted = 0 OR deleted IS NULL) LIMIT 1'
      );
      if (genResult && genResult.length > 0) {
        if (genResult[0].gensetting_sitetitle) {
          orgTitle = genResult[0].gensetting_sitetitle;
        }
        if (genResult[0].gensetting_sitelogo) {
          orgLogo = genResult[0].gensetting_sitelogo;
          const logoBaseUrl =
            process.env.LOGO_BASE_URL ||
            process.env.NEXT_PUBLIC_LOGO_BASE_URL ||
            process.env.ORGANISATION_LOGO_BASE_PATH ||
            process.env.ORG_LOGO_BASE_URL ||
            '';

          if (orgLogo.startsWith('http://') || orgLogo.startsWith('https://')) {
            orgLogoUrl = orgLogo;
          } else if (logoBaseUrl) {
            const cleanBase = logoBaseUrl.endsWith('/') ? logoBaseUrl : `${logoBaseUrl}/`;
            const cleanPath = orgLogo.startsWith('/') ? orgLogo.slice(1) : orgLogo;
            orgLogoUrl = `${cleanBase}${cleanPath}`;
          } else {
            orgLogoUrl = `/${orgLogo.startsWith('/') ? orgLogo.slice(1) : orgLogo}`;
          }
        }
      }
    } catch {}

    return {
      database: cfg.database,
      host: cfg.host,
      tablesCount,
      employeeCount,
      payslipCount,
      departmentCount,
      orgTitle,
      orgLogo,
      orgLogoUrl,
      status: 'connected',
    };
  } catch (err: any) {
    return {
      database: cfg.database,
      host: cfg.host,
      tablesCount: 0,
      employeeCount: 0,
      payslipCount: 0,
      departmentCount: 0,
      status: 'error',
      error: err.message,
    };
  }
}

// =========================================================================
// AI CHAT SESSIONS & MESSAGES REPOSITORY (Strictly gs_ai_* tables only)
// =========================================================================

async function ensureAiChatTables(pool: Pool): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gs_ai_chat_session (
        session_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL DEFAULT 1,
        session_title VARCHAR(255) NOT NULL,
        createdon DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedon DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        status TINYINT NOT NULL DEFAULT 1
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gs_ai_chat_messages (
        message_id INT AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        sender ENUM('user', 'assistant') NOT NULL,
        content LONGTEXT NOT NULL,
        generated_sql TEXT,
        sql_result_json LONGTEXT,
        createdon DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_session (session_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (err: any) {
    console.warn('[DB] Warning ensuring gs_ai_* tables:', err.message);
  }
}

export async function getDbChatSessions(userId = 1, dbName?: string): Promise<any[]> {
  const pool = getPool(dbName ? { database: dbName } : undefined);
  await ensureAiChatTables(pool);
  const [rows]: any = await pool.query(
    'SELECT session_id, user_id, session_title, createdon, updatedon, status FROM gs_ai_chat_session WHERE status = 1 ORDER BY updatedon DESC LIMIT 50'
  );
  return rows.map((r: any) => ({
    id: String(r.session_id),
    title: r.session_title,
    createdAt: new Date(r.createdon).toISOString(),
    updatedAt: new Date(r.updatedon).toISOString(),
  }));
}

export async function createDbChatSession(title = 'New Conversation', userId = 1, dbName?: string): Promise<string> {
  const pool = getPool(dbName ? { database: dbName } : undefined);
  await ensureAiChatTables(pool);
  const [res]: any = await pool.query(
    'INSERT INTO gs_ai_chat_session (user_id, session_title, createdon, updatedon, status) VALUES (?, ?, NOW(), NOW(), 1)',
    [userId, title]
  );
  return String(res.insertId);
}

export async function updateDbChatSessionTitle(sessionId: string | number, title: string, dbName?: string): Promise<void> {
  const pool = getPool(dbName ? { database: dbName } : undefined);
  await pool.query(
    'UPDATE gs_ai_chat_session SET session_title = ?, updatedon = NOW() WHERE session_id = ?',
    [title, Number(sessionId)]
  );
}

export async function deleteDbChatSession(sessionId: string | number, dbName?: string): Promise<void> {
  const pool = getPool(dbName ? { database: dbName } : undefined);
  // Soft delete (status = 0) matching Zenro standard pattern
  await pool.query(
    'UPDATE gs_ai_chat_session SET status = 0, updatedon = NOW() WHERE session_id = ?',
    [Number(sessionId)]
  );
}

export async function getDbChatMessages(sessionId: string | number, dbName?: string, appTitle = 'Zenro Payroll'): Promise<any[]> {
  const pool = getPool(dbName ? { database: dbName } : undefined);
  await ensureAiChatTables(pool);
  const [rows]: any = await pool.query(
    'SELECT message_id, session_id, sender, content, generated_sql, sql_result_json, createdon FROM gs_ai_chat_messages WHERE session_id = ? ORDER BY message_id ASC',
    [Number(sessionId)]
  );

  return rows.map((r: any) => {
    let parsedJson: any = null;
    if (r.sql_result_json) {
      try {
        parsedJson = JSON.parse(r.sql_result_json);
      } catch {}
    }

    return {
      id: String(r.message_id),
      role: r.sender as 'user' | 'assistant',
      content: r.content,
      timestamp: new Date(r.createdon).toISOString(),
      sqlExecution: r.generated_sql ? {
        query: r.generated_sql,
        database: appTitle,
        executionTimeMs: parsedJson?.executionTimeMs || 5,
        rowCount: parsedJson?.rowCount || (parsedJson?.rows?.length || 0),
        columns: parsedJson?.columns || [],
        rows: parsedJson?.rows || [],
        readOnlyVerified: true,
      } : undefined,
      tabularData: parsedJson?.rows && parsedJson.rows.length > 0 ? {
        columns: parsedJson.columns,
        rows: parsedJson.rows,
      } : undefined,
      metrics: parsedJson?.metrics,
      sources: [`${appTitle} Records`],
    };
  });
}

export async function insertDbChatMessage(
  sessionId: string | number,
  sender: 'user' | 'assistant',
  content: string,
  generatedSql?: string,
  sqlResultJson?: any,
  dbName?: string
): Promise<string> {
  const pool = getPool(dbName ? { database: dbName } : undefined);
  await ensureAiChatTables(pool);
  const jsonStr = sqlResultJson ? (typeof sqlResultJson === 'string' ? sqlResultJson : JSON.stringify(sqlResultJson)) : null;
  const [res]: any = await pool.query(
    'INSERT INTO gs_ai_chat_messages (session_id, sender, content, generated_sql, sql_result_json, createdon) VALUES (?, ?, ?, ?, ?, NOW())',
    [Number(sessionId), sender, content, generatedSql || null, jsonStr]
  );
  // Update session updatedon timestamp
  await pool.query('UPDATE gs_ai_chat_session SET updatedon = NOW() WHERE session_id = ?', [Number(sessionId)]);
  return String(res.insertId);
}
