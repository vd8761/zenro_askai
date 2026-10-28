import { executeReadOnlyQuery } from './db';
import { ZENRO_SCHEMA_DESCRIPTION, SQL_FEW_SHOT_EXAMPLES } from './schema-knowledge';
import { ChatMessage, MetricCard, SqlExecutionResult } from './types';
import { extractPayslipParams, buildPayslipPdfUrl } from './payslip-utils';

interface ProcessQueryResult {
  answer: string;
  sqlExecution?: SqlExecutionResult;
  tabularData?: {
    columns: string[];
    rows: Record<string, any>[];
  };
  metrics?: MetricCard[];
  sources: string[];
}

// Built-in rule-based intent mapper as a fast/offline fallback with multilingual awareness
function fallbackSqlGenerator(query: string): string | null {
  const q = query.toLowerCase().trim();

  // 1. Highest paid / Top salary (English, Tamil, Hindi, Telugu, Malayalam, Kannada)
  if (
    ((q.includes('highest') || q.includes('top') || q.includes('maximum') || q.includes('best') || q.includes('அதிக') || q.includes('டாப்') || q.includes('முதன்மை') || q.includes('सबसे ज्यादा') || q.includes('शीर्ष') || q.includes('टॉप') || q.includes('ఎక్కువ') || q.includes('കൂടിയ') || q.includes('ಹೆಚ್ಚು')) &&
     (q.includes('paid') || q.includes('salary') || q.includes('earner') || q.includes('ctc') || q.includes('gross') || q.includes('wage') || q.includes('சம்பளம்') || q.includes('ஊதியம்') || q.includes('வருமானம்') || q.includes('वेतन') || q.includes('सैलरी') || q.includes('జీతం') || q.includes('ശമ്പളം') || q.includes('ಸಂಬಳ'))) ||
    q.includes('top salary') || q.includes('அதிக சம்பளம்') || q.includes('सबसे ज्यादा सैलरी')
  ) {
    const matchLimit = q.match(/\b(\d+)\b/);
    const limit = matchLimit ? parseInt(matchLimit[1], 10) : 10;
    return `SELECT e.emp_code, e.emp_name, d.department_name, ds.designation_title, e.emp_fixed_gross as monthly_gross, e.emp_fixed_gross_annual as annual_ctc FROM gs_employee e LEFT JOIN gs_department d ON e.emp_department = d.department_id LEFT JOIN gs_designation ds ON e.emp_designation = ds.designation_id WHERE (e.deleted = 0 OR e.deleted IS NULL) ORDER BY e.emp_fixed_gross DESC LIMIT ${limit};`;
  }

  // 2. Department-wise salary / payroll (English, Tamil, Hindi, etc.)
  if (
    q.includes('department') || q.includes('துறை') || q.includes('பிரிவு') || q.includes('विभाग') || q.includes('శాఖ') || q.includes('വിഭാഗം') || q.includes('ವಿಭಾಗ')
  ) {
    return `SELECT COALESCE(d.department_name, 'Unassigned') as department, COUNT(e.employee_ID) as employee_count, SUM(COALESCE(e.emp_fixed_gross, 0)) as total_monthly_payroll, ROUND(AVG(COALESCE(e.emp_fixed_gross, 0)), 2) as avg_monthly_salary FROM gs_employee e LEFT JOIN gs_department d ON e.emp_department = d.department_id WHERE (e.deleted = 0 OR e.deleted IS NULL) GROUP BY d.department_name ORDER BY total_monthly_payroll DESC;`;
  }

  // 3. Employee loans (English, Tamil, Hindi, etc.)
  if (
    q.includes('loan') || q.includes('emi') || q.includes('கடன்') || q.includes('லோன்') || q.includes('ऋण') || q.includes('लोन') || q.includes('రుణం') || q.includes('വായ്പ') || q.includes('ಸಾಲ')
  ) {
    return `SELECT e.emp_code, e.emp_name, d.department_name, l.loan_refno, l.loan_amount, l.total_loan_paid, l.total_loan_due as remaining_balance, l.loan_tenure as tenure_months, l.loan_date, l.purpose_of_loan FROM gs_employee_loan l JOIN gs_employee e ON l.employee_id = e.employee_id LEFT JOIN gs_department d ON e.emp_department = d.department_id WHERE (l.deleted = 0 OR l.deleted IS NULL) ORDER BY l.loan_amount DESC LIMIT 20;`;
  }

  // 3b. Advance payments
  if (
    q.includes('advance') || q.includes('முன்பணம்') || q.includes('अग्रिम')
  ) {
    return `SELECT e.emp_code, e.emp_name, d.department_name, a.advance_payment_date, a.total_gross_salary, a.taken_advance_payment, a.purpose_of_advance_payment FROM gs_employee_advance_payment a JOIN gs_employee e ON a.employee_ID = e.employee_id LEFT JOIN gs_department d ON e.emp_department = d.department_id WHERE (a.deleted = 0 OR a.deleted IS NULL) ORDER BY a.advance_payment_date DESC LIMIT 20;`;
  }

  // 4. Payslips overview & PDF requests
  if (
    q.includes('payslip') || q.includes('net pay') || q.includes('take home') || q.includes('payroll summary') ||
    q.includes('பேஸ்லிப்') || q.includes('சம்பள சீட்டு') || q.includes('पेस्लिप') || q.includes('वेतन पर्ची') ||
    q.includes('pdf') || q.includes('newpayslip')
  ) {
    return `SELECT p.actual_payslip_id, p.employee_id, e.emp_code, e.emp_name, d.department_name, p.payslip_month, p.total_present_days, p.total_lop_days, p.total_gross_monthly, p.total_deductions, p.net_payable FROM gs_payslip_actual p JOIN gs_employee e ON p.employee_id = e.employee_id LEFT JOIN gs_department d ON e.emp_department = d.department_id WHERE (p.deleted = 0 OR p.deleted IS NULL) ORDER BY p.payslip_month DESC, p.actual_payslip_id DESC LIMIT 15;`;
  }

  // 5. Overtime, lateness, attendance, leaves
  if (
    q.includes('overtime') || q.includes('late') || q.includes('lop') || q.includes('absent') || q.includes('attendance') ||
    q.includes('ஓவர்டைம்') || q.includes('தாமதம்') || q.includes('வருகை') ||
    q.includes('देरी') || q.includes('उपस्थिति') || q.includes('ओवरटाइम')
  ) {
    return `SELECT e.emp_code, e.emp_name, d.department_name, p.payslip_month, p.total_present_days, p.total_no_of_absent_days, p.total_lop_days, p.total_overtime_hours, p.late_attendace_count_occurrences as late_count, p.net_payable FROM gs_payslip_actual p JOIN gs_employee e ON p.employee_id = e.employee_id LEFT JOIN gs_department d ON e.emp_department = d.department_id WHERE (p.deleted = 0 OR p.deleted IS NULL) AND (p.total_overtime_hours > 0 OR p.total_lop_days > 0 OR p.total_no_of_absent_days > 0) ORDER BY p.total_overtime_hours DESC, p.total_lop_days DESC LIMIT 15;`;
  }

  // 5b. Leave balances
  if (
    q.includes('leave') || q.includes('விடுப்பு') || q.includes('छुट्टी')
  ) {
    return `SELECT e.emp_code, e.emp_name, d.department_name, e.total_cl_available as casual_leave, e.total_sl_available as sick_leave, e.total_el_available as earned_leave, e.total_fl_available as festival_leave, e.total_hourly_permission_hours_available as permission_hours FROM gs_employee e LEFT JOIN gs_department d ON e.emp_department = d.department_id WHERE (e.deleted = 0 OR e.deleted IS NULL) ORDER BY e.emp_name ASC LIMIT 20;`;
  }

  // 6. Designation breakdown / Doctors & Specialists
  if (
    q.includes('doctor') || q.includes('surgeon') || q.includes('specialist') || q.includes('nurse') ||
    q.includes('மருத்துவர்') || q.includes('டாக்டர்') || q.includes('செவிலியர்') ||
    q.includes('डॉक्टर') || q.includes('चिकित्सक') || q.includes('नर्स')
  ) {
    return `SELECT e.emp_code, e.emp_name, d.department_name, ds.designation_title, e.emp_fixed_gross as monthly_gross FROM gs_employee e LEFT JOIN gs_department d ON e.emp_department = d.department_id LEFT JOIN gs_designation ds ON e.emp_designation = ds.designation_id WHERE (e.deleted = 0 OR e.deleted IS NULL) AND (ds.designation_title LIKE '%Doctor%' OR ds.designation_title LIKE '%Physician%' OR ds.designation_title LIKE '%Surgeon%' OR ds.designation_title LIKE '%Consultant%' OR ds.designation_title LIKE '%Nurse%' OR d.department_name LIKE '%Medical%' OR d.department_name LIKE '%Nursing%') ORDER BY e.emp_fixed_gross DESC LIMIT 25;`;
  }

  if (q.includes('designation') || q.includes('role') || q.includes('பதவி') || q.includes('पद')) {
    return `SELECT COALESCE(ds.designation_title, 'Unassigned') as designation, COUNT(e.employee_ID) as employee_count, ROUND(AVG(COALESCE(e.emp_fixed_gross, 0)), 2) as avg_monthly_gross, MAX(e.emp_fixed_gross) as max_salary FROM gs_employee e LEFT JOIN gs_designation ds ON e.emp_designation = ds.designation_id WHERE (e.deleted = 0 OR e.deleted IS NULL) GROUP BY ds.designation_title ORDER BY employee_count DESC LIMIT 15;`;
  }

  // 7. General employee list / Headcount
  if (
    q.includes('employee') || q.includes('staff') || q.includes('headcount') || q.includes('how many') || q.includes('list') ||
    q.includes('ஊழியர்') || q.includes('பணியாளர்') || q.includes('எத்தனை') ||
    q.includes('कर्मचारी') || q.includes('कितने') || q.includes('सूची')
  ) {
    return `SELECT e.emp_code, e.emp_name, d.department_name, ds.designation_title, e.emp_gender, e.emp_doj, e.emp_fixed_gross as monthly_gross FROM gs_employee e LEFT JOIN gs_department d ON e.emp_department = d.department_id LEFT JOIN gs_designation ds ON e.emp_designation = ds.designation_id WHERE (e.deleted = 0 OR e.deleted IS NULL) ORDER BY e.employee_ID ASC LIMIT 20;`;
  }

  return null;
}

// Fetch organization name dynamically from gs_generalsettings
async function getOrganisationName(dbOverride?: { database?: string; host?: string }): Promise<string> {
  try {
    const res = await executeReadOnlyQuery(
      'SELECT gensetting_sitetitle FROM gs_generalsettings WHERE (status = 1 OR status = 0) AND (deleted = 0 OR deleted IS NULL) LIMIT 1',
      dbOverride
    );
    if (res.rows && res.rows.length > 0 && res.rows[0].gensetting_sitetitle) {
      return res.rows[0].gensetting_sitetitle;
    }
  } catch {}
  return 'Zenro Payroll';
}

// Call external LLM (Groq, OpenAI, or Gemini) to generate SQL
async function generateSqlWithLLM(query: string, history: ChatMessage[], orgName: string = 'Zenro Payroll'): Promise<string | null> {
  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GOOGLE_API_KEY;

  const systemPrompt = `You are a MySQL database and payroll expert for Zenro HRMS & Payroll at ${orgName}.
Your task is to write a single, safe, read-only MySQL SELECT query that answers the user's question accurately.

MULTILINGUAL RULE:
The user question may be in ANY language (English, Tamil தமிழ், Hindi हिंदी, Telugu తెలుగు, Malayalam മലയാളம், Kannada ಕನ್ನಡ, French, Spanish, Arabic, etc.).
Understand the semantic intent regardless of language and translate it into the appropriate MySQL query.

RULES:
1. Return ONLY the raw SQL query. No explanations, no markdown blocks, no formatting.
2. Strictly read-only: Use only SELECT, JOIN, GROUP BY, ORDER BY, LIMIT. Never write INSERT, UPDATE, DELETE, DROP, or ALTER.
3. Zenro table names follow the "gs_" prefix (e.g. gs_employee, gs_payslip_actual, gs_department, gs_designation, gs_employee_loan, gs_daily_actual_attendance).
4. Always filter active employees with (e.deleted = 0 OR e.deleted IS NULL) when querying gs_employee.
5. Limit the output to maximum 50 rows unless explicitly asked for more.
6. Column Selection: Always select human-friendly business columns like emp_code, emp_name, department_name, designation_title, dates, and amounts.
   EXCEPTION: When querying payslips (gs_payslip_actual), ALWAYS include 'p.actual_payslip_id', 'p.employee_id', and 'p.payslip_month' along with 'e.emp_name', 'p.total_gross_monthly', and 'p.net_payable', so the application can construct direct links to the official PDF generator ('newpayslip.php?m={month}&y={year}&emp_ID={employee_id}').
7. Payslip & PDF Knowledge: The hospital system generates official employee payslip PDFs via 'newpayslip.php?m={month}&y={year}&emp_ID={employee_id}'. When the user asks for payslips, payslip PDFs, or salary slips (e.g. "can i get last month payslip pdf?", "payslip pdf", "payslip of vinothini"), query gs_payslip_actual joined with gs_employee.
ZENRO SCHEMA:
${ZENRO_SCHEMA_DESCRIPTION}

EXAMPLES:
${SQL_FEW_SHOT_EXAMPLES.map(ex => `User: ${ex.question}\nSQL: ${ex.sql}`).join('\n\n')}
`;

  // Try Groq (Fast & Versatile)
  if (groqKey) {
    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-4).map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: query },
      ];

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || 'qwen/qwen3.8-27b',
          messages,
          temperature: 0.1,
          max_tokens: 400,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) {
          const sql = cleanSql(content);
          if (sql) return sql;
        }
      }
    } catch (e) {
      console.warn('Groq SQL generation failed, falling back to other providers:', e);
    }
  }

  // Try OpenAI
  if (openaiKey) {
    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-4).map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: query },
      ];

      const model = process.env.OPENAI_MINI_MODEL || process.env.OPENAI_MODEL || 'gpt-6-luna';
      const isReasoning = /gpt-6|o1|o3/i.test(model);

      const requestBody: any = {
        model,
        messages,
      };

      if (isReasoning) {
        requestBody.max_completion_tokens = 1200;
      } else {
        requestBody.max_tokens = 400;
        requestBody.temperature = 0.1;
      }

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) {
          const sql = cleanSql(content);
          if (sql) return sql;
        }
      }
    } catch (e) {
      console.warn('OpenAI SQL generation failed:', e);
    }
  }

  // Try Gemini
  if (geminiKey) {
    try {
      const promptText = `${systemPrompt}\n\nUSER QUESTION: ${query}\nGenerate the MySQL SELECT query:`;
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GOOGLE_MODEL || 'gemini-3.8-flash'}:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 400 },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          const sql = cleanSql(text);
          if (sql) return sql;
        }
      }
    } catch (e) {
      console.warn('Gemini SQL generation failed:', e);
    }
  }

  return null;
}

function cleanSql(raw: string): string | null {
  let s = raw.trim();

  // If the model wrapped SQL in code block, extract the block contents
  const match = s.match(/```(?:sql)?\s*([\s\S]*?)\s*```/i);
  if (match) {
    s = match[1].trim();
  }

  s = s.replace(/^\s*```[a-zA-Z]*\n?/gi, '').replace(/\n?```\s*$/gi, '').trim();
  s = s.replace(/;+\s*$/, '').trim();

  // Validate that it actually begins with a read-only statement
  if (!/^(SELECT|WITH|SHOW|DESCRIBE)\b/i.test(s)) {
    return null;
  }

  return s;
}

// Generate natural language synthesis of the DB results with full multilingual support
async function synthesizeAnswer(
  query: string,
  sql: string,
  execResult: SqlExecutionResult,
  preferredLanguage?: string,
  orgName: string = 'Zenro Payroll',
  appBaseUrl?: string
): Promise<{ answer: string; metrics: MetricCard[] }> {
  const metrics: MetricCard[] = [];

  // Compute smart metrics based on columns
  if (execResult.rows && execResult.rows.length > 0) {
    const keys = Object.keys(execResult.rows[0]);

    // Check for payroll / salary totals
    const salaryKey = keys.find(k => /monthly_gross|salary|ctc|net_payable|total_monthly_payroll|net_pay/i.test(k));
    if (salaryKey) {
      const total = execResult.rows.reduce((sum, r) => sum + (Number(r[salaryKey]) || 0), 0);
      const avg = total / execResult.rows.length;

      metrics.push({
        label: 'Total Analyzed Payout',
        value: `₹${Math.round(total).toLocaleString('en-IN')}`,
        type: 'currency',
      });
      metrics.push({
        label: 'Average per Unit',
        value: `₹${Math.round(avg).toLocaleString('en-IN')}`,
        type: 'currency',
      });
    }

    metrics.push({
      label: 'Verified Records',
      value: execResult.rowCount,
      type: 'number',
    });
  }

  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const langDirective = preferredLanguage && preferredLanguage !== 'auto'
    ? `LANGUAGE REQUIREMENT: Formulate your response in "${preferredLanguage}".`
    : `LANGUAGE REQUIREMENT: Automatically detect the language of the User Question (English, Tamil தமிழ், Hindi हिंदी, Telugu తెలుగు, Malayalam മലയാളம், Kannada ಕನ್ನಡ, French, Spanish, Arabic, etc.) and formulate your ENTIRE response fluently in that exact SAME language!`;

  const tenantBaseUrl = appBaseUrl ? (appBaseUrl.endsWith('/') ? appBaseUrl : `${appBaseUrl}/`) : (process.env.NEXT_PUBLIC_LOGO_BASE_URL || 'http://localhost/shadithyahospital_zenro/');

  const synthesisPrompt = `You are the Zenro HR & Payroll AI Copilot for ${orgName}.
You have executed a live remote database query to answer the user's question.

User Question: "${query}"
Organisation: ${orgName}
Records Retrieved: ${execResult.rowCount}

DATA RESULTS (JSON):
${JSON.stringify(execResult.rows.slice(0, 20), null, 2)}

${langDirective}

INSTRUCTIONS:
1. Provide a sharp, executive-level summary and strategic takeaways in clean Markdown.
2. Note: An interactive Data Table with all records, search, and CSV export is automatically displayed directly beneath your response. Do NOT repeat or dump every individual row. Focus on high-level insights: top earners/departments, key averages, and meaningful patterns.
3. Format all currency figures in Indian Rupee format (e.g., ₹39,800/month, ₹4.77 Lakhs).
4. Use clean bullet points or bold text for key insights.
5. Always refer to the organisation as "${orgName}" (never expose internal database technical identifiers like shc_2026).
6. Keep the tone authoritative, concise, and helpful. Avoid verbose filler like "Executed query in 47ms...".
7. PAYSLIP & PDF ACCESS:
   In this payroll application, employee payslip PDFs are generated via:
   ${tenantBaseUrl}newpayslip.php?m={month_number}&y={year}&emp_ID={employee_id}

   CRITICAL RULES FOR PAYSLIP PDF LINKS:
   - 'newpayslip.php' REQUIRES exact query parameters: 'm' (month number 1-12 e.g. 9), 'y' (4-digit year e.g. 2026), and 'emp_ID' (the employee_id number).
   - NEVER EVER link to 'newpayslip.php' bare or without 'm', 'y', and 'emp_ID'. Calling 'newpayslip.php' without parameters results in a blank/empty PDF!
   - Example of a correct link:
     [📄 Download Payslip ({emp_name})](${tenantBaseUrl}newpayslip.php?m=9&y=2026&emp_ID=1)
   - NEVER show internal script filenames like 'newpayslip.php' or 'Open newpayslip.php' in user-facing text. Keep the response concise: provide the summary directly with the clean "[📄 Download Payslip]" link.`;

  // Call LLM for synthesis if available
  if (groqKey) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || 'qwen/qwen3.8-27b',
          messages: [{ role: 'user', content: synthesisPrompt }],
          temperature: 0.2,
          max_tokens: 800,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) {
          return { answer: text, metrics };
        }
      }
    } catch {}
  }

  if (openaiKey) {
    try {
      const model = process.env.OPENAI_FLAGSHIP_MODEL || process.env.OPENAI_MODEL || 'gpt-6-luna';
      const isReasoning = /gpt-6|o1|o3/i.test(model);

      const requestBody: any = {
        model,
        messages: [{ role: 'user', content: synthesisPrompt }],
      };

      if (isReasoning) {
        requestBody.max_completion_tokens = 1500;
      } else {
        requestBody.max_tokens = 800;
        requestBody.temperature = 0.2;
      }

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) {
          return { answer: text, metrics };
        }
      }
    } catch {}
  }

  // Native rule-based synthesis if no LLM responded
  return generateDeterministicSummary(query, execResult, metrics, preferredLanguage, orgName, appBaseUrl);
}

function generateDeterministicSummary(
  query: string,
  execResult: SqlExecutionResult,
  metrics: MetricCard[],
  preferredLanguage?: string,
  orgName: string = 'Zenro Payroll',
  appBaseUrl?: string
): { answer: string; metrics: MetricCard[] } {
  const isTamil = /[\u0B80-\u0BFF]/.test(query) || preferredLanguage?.toLowerCase().includes('tamil');

  if (execResult.error) {
    if (isTamil) {
      return {
        answer: `⚠️ **தரவுத்தள எச்சரிக்கை**\n\n${orgName} தரவுத்தளத்தில் வினவலை இயக்க முடியவில்லை.\n\nபிழை விவரங்கள்:\n\`\`\`\n${execResult.error}\n\`\`\``,
        metrics,
      };
    }
    return {
      answer: `⚠️ **Database Query Warning**\n\nThe query could not be completed on ${orgName} database.\n\n**Error Details:**\n\`\`\`\n${execResult.error}\n\`\`\`\n\nPlease check your table privileges.`,
      metrics,
    };
  }

  if (execResult.rowCount === 0) {
    if (isTamil) {
      return {
        answer: `🔍 **பதிவுகள் எதுவும் கிடைக்கவில்லை**\n\nஉங்கள் வினவல் **${execResult.executionTimeMs}ms** நேரத்தில் வெற்றிகரமாக இயக்கப்பட்டது, ஆனால் பொருந்தக்கூடிய தகவல்கள் கிடைக்கவில்லை.`,
        metrics,
      };
    }
    return {
      answer: `🔍 **No Records Found**\n\nYour query was executed successfully against ${orgName} database in **${execResult.executionTimeMs}ms**, but returned 0 rows matching your criteria.\n\nTry adjusting filters or checking if the requested payroll month/employee code exists in the database.`,
      metrics,
    };
  }

  const rows = execResult.rows;
  let summary = isTamil
    ? `### 📊 ${orgName} சம்பளப் பகுப்பாய்வு\n\n**${execResult.executionTimeMs}ms** நேரத்தில் **${execResult.rowCount} பதிவுகள்** பெறப்பட்டன.\n\n`
    : `### 📊 ${orgName} Payroll Summary\n\nExecuted live query on **${orgName} Database** in **${execResult.executionTimeMs}ms**, returning **${execResult.rowCount} verified records**.\n\n`;

  // Check top items
  if (rows[0]?.emp_name && rows[0]?.monthly_gross !== undefined) {
    summary += isTamil ? `**முக்கிய விவரங்கள்:**\n` : `**Key Highlights:**\n`;
    rows.slice(0, 5).forEach((r, idx) => {
      const gross = Number(r.monthly_gross || 0).toLocaleString('en-IN');
      const annual = Number(r.annual_ctc || 0).toLocaleString('en-IN');
      summary += isTamil
        ? `${idx + 1}. **${r.emp_name}** (${r.emp_code || 'N/A'}) - **₹${gross}/மாதம்** (வருடாந்திரம்: ₹${annual}) | துறை: *${r.department_name || 'N/A'}*\n`
        : `${idx + 1}. **${r.emp_name}** (${r.emp_code || 'N/A'}) - **₹${gross}/month** (Annual: ₹${annual}) | Dept: *${r.department_name || 'N/A'}*\n`;
    });
  } else if (rows[0]?.department && rows[0]?.total_monthly_payroll !== undefined) {
    summary += isTamil ? `**துறை வாரியான சம்பளப் பட்டியல்:**\n` : `**Department Breakdown:**\n`;
    rows.forEach(r => {
      const total = Number(r.total_monthly_payroll || 0).toLocaleString('en-IN');
      const avg = Number(r.avg_monthly_salary || 0).toLocaleString('en-IN');
      summary += isTamil
        ? `- **${r.department}**: மொத்தம் **₹${total}** / மாதம் (**${r.employee_count} பணியாளர்கள்**, சராசரி: ₹${avg})\n`
        : `- **${r.department}**: **₹${total}** monthly total across **${r.employee_count} employees** (Avg: ₹${avg})\n`;
    });
  } else if (rows[0]?.loan_amount !== undefined) {
    summary += isTamil ? `**ஊழியர்களின் கடன்கள் (Loans):**\n` : `**Active Employee Loans:**\n`;
    rows.slice(0, 5).forEach(r => {
      const loan = Number(r.loan_amount || 0).toLocaleString('en-IN');
      const paid = Number(r.total_loan_paid || 0).toLocaleString('en-IN');
      const rem = Number(r.remaining_balance || r.total_loan_due || 0).toLocaleString('en-IN');
      const tenure = r.tenure_months || r.loan_tenure || 'N/A';
      summary += isTamil
        ? `- **${r.emp_name}** (${r.emp_code || ''}): கடன் ₹${loan} | செலுத்தியது: ₹${paid} | மீதி: ₹${rem} | கால அளவு: ${tenure} மாதங்கள்\n`
        : `- **${r.emp_name}** (${r.emp_code || ''}): Loan ₹${loan} | Paid: ₹${paid} | Remaining: ₹${rem} | Tenure: ${tenure} months\n`;
    });
  } else if (rows[0]?.actual_payslip_id !== undefined || (rows[0]?.net_payable !== undefined && rows[0]?.payslip_month !== undefined)) {
    const baseUrl = appBaseUrl ? (appBaseUrl.endsWith('/') ? appBaseUrl : `${appBaseUrl}/`) : (process.env.NEXT_PUBLIC_LOGO_BASE_URL || 'http://localhost/shadithyahospital_zenro/');
    summary += isTamil ? `**சமீபத்திய சம்பள சீட்டுகள் மற்றும் PDF விவரங்கள்:**\n\n` : `**Recent Payslips & Official PDF Access:**\n\n`;
    rows.slice(0, 8).forEach(r => {
      const net = Number(r.net_payable || 0).toLocaleString('en-IN');
      const gross = Number(r.total_gross_monthly || 0).toLocaleString('en-IN');

      const pdfParams = extractPayslipParams(r);
      const monthStr = pdfParams?.monthStr || 'N/A';
      const pdfUrl = buildPayslipPdfUrl(r, baseUrl);

      const downloadAction = pdfUrl
        ? (isTamil ? `➔ [📄 **சம்பள சீட்டு பதிவிறக்கம் (Download Payslip)**](${pdfUrl})` : `➔ [📄 **Download Payslip**](${pdfUrl})`)
        : '';

      summary += isTamil
        ? `- **${r.emp_name}** (${monthStr}) — மொத்த ஊதியம்: **₹${gross}** | நிகர ஊதியம்: **₹${net}** ${downloadAction}\n`
        : `- **${r.emp_name}** (${monthStr}) — Gross: **₹${gross}** | Net Pay: **₹${net}** ${downloadAction}\n`;
    });
  } else {
    summary += isTamil
      ? `வெற்றிகரமாக ${execResult.rowCount} பதிவுகள் பெறப்பட்டன. கீழேயுள்ள அட்டவணையில் விவரங்களைப் பார்க்கலாம்.\n`
      : `Successfully queried ${execResult.rowCount} rows. You can review the details in the interactive table below.\n`;
  }

  return { answer: summary, metrics };
}

export async function processUserQuery(
  query: string,
  history: ChatMessage[] = [],
  dbOverride?: { database?: string; host?: string },
  preferredLanguage?: string,
  appBaseUrl?: string
): Promise<ProcessQueryResult> {
  const cleanQ = query.trim();
  const orgName = await getOrganisationName(dbOverride);

  // Step 1: Generate SQL query using LLM or Fallback Intent Engine
  let sql = await generateSqlWithLLM(cleanQ, history, orgName);

  if (!sql) {
    sql = fallbackSqlGenerator(cleanQ);
  }

  // If still no SQL could be generated (e.g. conversational greeting)
  if (!sql) {
    const qLower = cleanQ.toLowerCase();
    const isTamil = /[\u0B80-\u0BFF]/.test(cleanQ) || preferredLanguage?.toLowerCase().includes('tamil');

    if (qLower.includes('hi') || qLower.includes('hello') || qLower.includes('hey') || cleanQ.includes('வணக்கம்') || cleanQ.includes('नमस्ते')) {
      if (isTamil) {
        return {
          answer: `👋 **வணக்கம்! நான் ${orgName}-ன் Zenro AI உதவியாளர்.**\n\nமருத்துவமனை ஊழியர்கள், சம்பளம், வருகை, கடன்கள் மற்றும் விடுப்பு விவரங்களை எந்த மொழியிலும் என்னிடம் கேட்கலாம்:\n\n- 💰 **சம்பளம் மற்றும் படிகள்**: அதிக ஊதியம் பெறும் மருத்துவர்கள், செவிலியர்கள்\n- 👥 **துறை விவரங்கள்**: துறை வாரியான பணியாளர் எண்ணிக்கை\n- 💳 **கடன்கள் (Loans)**: செயலில் உள்ள கடன்கள் மற்றும் EMI விவரங்கள்\n- 📑 **பேஸ்லிப் (Payslips)**: மாத சம்பள சீட்டுகள், PF, ESI பிடித்தங்கள்\n\n*இன்று எதைப் பற்றி தெரிந்து கொள்ள விரும்புகிறீர்கள்?*`,
          sources: [`${orgName} HRMS`],
        };
      }
      return {
        answer: `👋 **Hello! I am your Zenro HR & Payroll AI Copilot for ${orgName}.**\n\nI can directly query your live hospital records to provide instant insights in any language:\n\n- 💰 **Salary & Compensation**: Top earners, average CTC, department salary totals\n- 📑 **Payslips & Payouts**: Monthly net payable, gross, PF/ESI/TDS deductions\n- ⏱️ **Attendance & Overtime**: LOP days, punch logs, late deductions, overtime hours\n- 💳 **Loans & Advances**: Active loans, remaining balance, monthly EMI deductions\n- 👥 **Headcount & Demographics**: Department and designation distributions\n\n*What would you like to explore today?*`,
        sources: [`${orgName} HRMS`],
      };
    }

    // Default to top employees list
    sql = `SELECT e.emp_code, e.emp_name, d.department_name, ds.designation_title, e.emp_fixed_gross as monthly_gross FROM gs_employee e LEFT JOIN gs_department d ON e.emp_department = d.department_id LEFT JOIN gs_designation ds ON e.emp_designation = ds.designation_id WHERE (e.deleted = 0 OR e.deleted IS NULL) ORDER BY e.emp_fixed_gross DESC LIMIT 10;`;
  }

  // Step 2: Execute SQL against remote/local Zenro DB
  const execResult = await executeReadOnlyQuery(sql, dbOverride);

  // Step 3: Synthesize natural response & compute stats with language support
  const { answer, metrics } = await synthesizeAnswer(cleanQ, sql, execResult, preferredLanguage, orgName, appBaseUrl);

  return {
    answer,
    sqlExecution: execResult,
    tabularData: execResult.rows.length > 0 ? {
      columns: execResult.columns,
      rows: execResult.rows,
    } : undefined,
    metrics,
    sources: [`${orgName} HRMS`],
  };
}
