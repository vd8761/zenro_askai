import { NextRequest, NextResponse } from 'next/server';

// Linguistic normalizer to guarantee 100% proper Tamil spelling, grammar, and pronunciation
async function normalizeSpeechTranscript(rawText: string, language?: string): Promise<string> {
  const clean = rawText.trim();
  if (!clean || clean.length < 3) return clean;

  const googleKey = process.env.GOOGLE_API_KEY;
  const geminiModel = process.env.GOOGLE_MODEL || 'gemini-3.8-flash';
  const groqKey = process.env.GROQ_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  const prompt = `You are an expert Tamil language linguist and speech transcript normalizer for Zenro Hospital Payroll Copilot.
The user spoke a query (in Tamil, English, or Tamil-English code-mixed speech like Tanglish).
Raw speech recognition may contain colloquial phonetic artifacts (such as broken characters like 'ஃ', garbled contractions like 'லிஸ்டனக்குவேன்', 'பராப்பரா', 'யாருமிஃ ட்', 'நிப்பெரு டோடுலா').

Your task:
1. Fix any phonetic speech-to-text corruption, typos, or merged words.
2. Produce clean, grammatically correct, natural Tamil phrasing (e.g. 'கடந்த மாதத்தில் அட்டெண்டன்ஸ் சரியாக பராமரிக்காத ஊழியர்களின் பட்டியல் எனக்கு வேண்டும்').
3. Keep common hospital payroll business words properly formatted (attendance / வருகை, salary / சம்பளம், leaves / விடுப்பு, loans / கடன்கள், payslip / பேஸ்லிப்).
4. Return ONLY the clean, corrected query sentence. Do not add quotes, markdown, or explanations.`;

  // 1. Try Google Gemini (gemini-3.8-flash)
  if (googleKey && !googleKey.startsWith('YOUR_')) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${googleKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${prompt}\n\nInput speech: ${clean}\nNormalized text:` }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 250 },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const output = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (output) return output;
      }
    } catch {}
  }

  // 2. Backup normalizer via Groq Qwen 27B
  if (groqKey) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: 'qwen/qwen3.8-27b',
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: clean },
          ],
          temperature: 0.1,
          max_tokens: 200,
        }),
      });

      const data = await res.json();
      const output = data.choices?.[0]?.message?.content?.trim();
      if (output) return output;
    } catch {}
  }

  // 3. Fallback to OpenAI
  if (openAiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: clean },
          ],
          temperature: 0.1,
          max_tokens: 200,
        }),
      });

      const data = await res.json();
      const output = data.choices?.[0]?.message?.content?.trim();
      if (output) return output;
    } catch {}
  }

  return clean;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as Blob | null;
    const language = (formData.get('language') as string) || 'auto';

    if (!audioFile) {
      return NextResponse.json({ success: false, error: 'No audio file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const mimeType = audioFile.type || 'audio/webm';
    const cleanMime = mimeType.split(';')[0];

    // ─────────────────────────────────────────────────────────────────────────────
    // Google Gemini API — Dedicated SOTA Model for All-Language Speech Transcription
    // Model: gemini-3.8-flash (Google's latest native multimodal audio model)
    // ─────────────────────────────────────────────────────────────────────────────
    const googleKey = process.env.GOOGLE_API_KEY;
    const geminiModel = process.env.GOOGLE_MODEL || 'gemini-3.8-flash';

    if (!googleKey || googleKey.startsWith('YOUR_')) {
      return NextResponse.json(
        {
          success: false,
          error:
            'GOOGLE_API_KEY is not configured in .env.local. Gemini API is the dedicated transcription engine.',
          provider: 'gemini',
        },
        { status: 500 }
      );
    }

    const base64Audio = buffer.toString('base64');
    const langDirective =
      language && language === 'ta'
        ? 'The speaker is speaking in Tamil (தமிழ்). Transcribe strictly into proper, grammatically correct Tamil script (தமிழ் எழுத்துக்கள்).'
        : language && language !== 'auto'
        ? `The speaker is speaking in ${language}. Transcribe accurately in ${language}.`
        : 'The speaker may speak in Tamil (தமிழ்), English, Hindi, or Tanglish. Transcribe with 100% phonetic and semantic accuracy into proper Tamil or English as spoken.';

    const geminiPrompt = `You are an expert native Tamil and multilingual audio speech-to-text transcription engine for Zenro Hospital Payroll and HRMS Copilot.
${langDirective}

CRITICAL RULES:
1. High-accuracy transcription: Transcribe the spoken audio with 100% correct spelling, natural grammar, and proper pronunciation.
2. Hospital & Payroll vocabulary: Accurately capture domain terms:
   - Attendance: வருகை / அட்டெண்டன்ஸ்
   - Salary / Payroll: சம்பளம் / பேரோல்
   - Payslip: சம்பள சீட்டு / பேஸ்லிப்
   - Leaves: விடுப்பு / லீவ்
   - Loans / Advances: கடன்கள் / அட்வான்ஸ்
   - Deductions: பிடித்தங்கள் / டிடக்ஷன்
   - Overtime: கூடுதல் நேரம் / ஓவர்டைம்
   - Last month / Current month: கடந்த மாதம் / இந்த மாதம்
   - Employees / Staff / Doctors / Nurses: ஊழியர்கள் / பணியாளர்கள் / மருத்துவர்கள் / செவிலியர்கள்
3. Never output garbled phonetic contractions or orphan letters (e.g. avoid 'ஃ', 'லிஸ்டனக்குவேன்', 'பராப்பரா', 'யாருமிஃ ட்', 'நிப்பெரு').
4. Output ONLY the raw transcribed sentence or question. Do not include quotes, markdown formatting, commentary, or conversational filler.`;

    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${googleKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: geminiPrompt },
                  {
                    inlineData: {
                      mimeType: cleanMime,
                      data: base64Audio,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 1000,
            },
          }),
        }
      );

      const geminiData = await geminiRes.json();

      if (geminiRes.ok) {
        const transcribed = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (transcribed) {
          const polished = await normalizeSpeechTranscript(transcribed, language);
          return NextResponse.json({
            success: true,
            provider: 'gemini',
            model: geminiModel,
            text: polished,
          });
        }
      }

      // Handle Gemini API error responses
      if (geminiData.error) {
        const errMessage = geminiData.error.message || JSON.stringify(geminiData.error);
        console.warn(`Gemini API (${geminiModel}) error:`, errMessage);

        const isLeaked =
          geminiData.error.code === 403 ||
          errMessage.toLowerCase().includes('leaked') ||
          errMessage.toLowerCase().includes('permission_denied');

        if (isLeaked) {
          // If emergency fallback is permitted in env, provide it while warning
          if (process.env.ALLOW_AUDIO_FALLBACK === 'true') {
            const fallbackResult = await runFallbackTranscription(buffer, cleanMime, language);
            if (fallbackResult) {
              return NextResponse.json({
                success: true,
                provider: 'groq-whisper-fallback',
                text: fallbackResult,
                warning: 'Gemini API key was reported as leaked; fallback transcription was used.',
              });
            }
          }

          return NextResponse.json(
            {
              success: false,
              error:
                'Google Gemini API Error (403): Your GOOGLE_API_KEY was reported as leaked by Google. Please obtain a fresh API key from https://aistudio.google.com/app/apikey and update GOOGLE_API_KEY in your .env.local file.',
              provider: 'gemini',
              model: geminiModel,
            },
            { status: 403 }
          );
        }

        return NextResponse.json(
          {
            success: false,
            error: `Gemini API Error: ${errMessage}`,
            provider: 'gemini',
            model: geminiModel,
          },
          { status: geminiRes.status || 500 }
        );
      }
    } catch (geminiErr: any) {
      console.warn('Gemini transcription request failed:', geminiErr.message);
      return NextResponse.json(
        {
          success: false,
          error: `Gemini transcription request failed: ${geminiErr.message}`,
          provider: 'gemini',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: `Could not transcribe audio using Google Gemini (${geminiModel}).`,
      },
      { status: 500 }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// Emergency helper if ALLOW_AUDIO_FALLBACK is explicitly enabled
async function runFallbackTranscription(
  buffer: Buffer,
  cleanMime: string,
  language?: string
): Promise<string | null> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return null;

  try {
    const groqFormData = new FormData();
    const audioBlob = new Blob([new Uint8Array(buffer)], { type: cleanMime });
    groqFormData.append('file', audioBlob, 'speech.webm');
    groqFormData.append('model', 'whisper-large-v3');
    groqFormData.append('response_format', 'json');
    groqFormData.append(
      'prompt',
      'மருத்துவமனை ஊதிய உரையாடல்: ஊழியர் வருகை பதிவு, அட்டெண்டன்ஸ், சம்பளம், விடுப்பு, கடன்கள், பேஸ்லிப்.'
    );
    if (language === 'ta') {
      groqFormData.append('language', 'ta');
    }

    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey}` },
      body: groqFormData,
    });

    const groqData = await groqRes.json();
    if (groqData.text) {
      return await normalizeSpeechTranscript(groqData.text.trim(), language);
    }
  } catch {}
  return null;
}
