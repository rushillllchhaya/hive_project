import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// POST /api/ai/rewrite — AI-powered comment rewriting
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, commentText, context } = body;

    if (!commentText) {
      return NextResponse.json(
        { success: false, error: 'Comment text is required' },
        { status: 400 }
      );
    }

    // Determine which AI provider to use
    const nvidiaKey = process.env.NVIDIA_API_KEY;
    const googleKey = process.env.GOOGLE_AI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!nvidiaKey && !googleKey && !openaiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'No AI API key configured. Set NVIDIA_API_KEY, GOOGLE_AI_API_KEY, or OPENAI_API_KEY in environment variables.',
        },
        { status: 503 }
      );
    }

    // Build the prompt based on action
    const prompt = buildPrompt(action, commentText, context);

    let suggestion: string;

    if (nvidiaKey) {
      suggestion = await callNvidia(nvidiaKey, prompt);
    } else if (googleKey) {
      suggestion = await callGemini(googleKey, prompt);
    } else if (openaiKey) {
      suggestion = await callOpenAI(openaiKey, prompt);
    } else {
      return NextResponse.json({ success: false, error: 'No AI provider available' }, { status: 503 });
    }

    // Validate the AI response
    if (!suggestion || suggestion.trim().length === 0) {
      return NextResponse.json({
        success: false,
        original: commentText,
        suggestion: '',
        error: 'AI returned an empty response. Original text preserved.',
      });
    }

    return NextResponse.json({
      success: true,
      original: commentText,
      suggestion: suggestion.trim(),
    });
  } catch (error) {
    console.error('AI rewrite error:', error);
    return NextResponse.json(
      {
        success: false,
        error: `AI service error: ${error instanceof Error ? error.message : 'Unknown error'}. Original text preserved.`,
        original: '',
        suggestion: '',
      },
      { status: 500 }
    );
  }
}

// ============================================================
// Build prompt based on action type
// ============================================================
function buildPrompt(action: string, text: string, context?: string): string {
  const contextNote = context?.trim()
    ? `\nReference Category: The user's template section is labeled "${context.trim()}". However, you must ONLY describe the exact components, defects, and systems present in the inspector's input. Never force or assume this comment is about "${context.trim()}" if the input describes a different component, trade, or issue.`
    : '';

  const coreRules = `
Strict Rules:
1. Focus STRICTLY on the actual components, defects, and systems mentioned in the input text. Never invent or prepend unrelated home systems (e.g., do NOT mention roofing, attic, or general structure unless explicitly stated in the input).
2. Do NOT prepend or output markdown headings (such as "**Roofing System:**") or section titles. If the input contains existing section titles or headers, strip them away completely.
3. Do NOT fabricate artificial condition statements (such as "The roofing system appears to be in generally good condition").
4. Active rephrasing: Do NOT return the input text verbatim. Even if the input is already formatted or lengthy, actively rephrase, polish, and synthesize the narrative into clear, objective, liability-conscious inspection report language following InterNACHI SOP standards.
5. Structure: State the factual observation, explain the potential implication or safety concern, and recommend evaluation by a licensed specialist in the relevant trade (e.g. licensed plumber, electrician, HVAC technician, roofing contractor).${contextNote}`;

  switch (action) {
    case 'rewrite':
      return `You are an expert home inspection report writer. Rewrite the following inspector notes into a concise, professional, report-ready finding.
${coreRules}

Input:
${text}

Output the professional rewritten comment only, no explanations or preamble.`;

    case 'suggest':
      return `You are an expert home inspection report writer. Expand the following brief inspector note into a complete, professional defect narrative suitable for an official inspection report.
${coreRules}

Input:
${text}

Output the expanded professional defect comment only, no explanations or preamble.`;

    case 'summarize':
      return `You are an expert home inspection report writer. Summarize the following inspection observations into a clear, unified summary paragraph preserving all technical findings.
${coreRules}

Input:
${text}

Output the summary only, no explanations or preamble.`;

    case 'bulk-edit':
      return `You are an expert home inspection report writer. Improve the following inspection comment for clarity, grammar, and professionalism while maintaining factual accuracy.
${coreRules}

Input:
${text}

Output the improved comment only, no explanations or preamble.`;

    default:
      return `You are an expert home inspection report writer. Rewrite the following inspection text to be professional, objective, and clear.
${coreRules}

Input:
${text}

Output the rewritten text only.`;
  }
}

// ============================================================
// Gemini API call
// ============================================================
async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorData}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ============================================================
// NVIDIA NIM API call (OpenAI-compatible) with auto-fallback
// ============================================================
const DEFAULT_NVIDIA_MODELS = [
  'meta/llama-3.2-11b-vision-instruct',
  'nvidia/llama-3.1-nemotron-70b-instruct',
  'meta/llama-3.2-90b-vision-instruct',
];

// Models known to have reached EOL/sunset on NVIDIA NIM
const RETIRED_MODELS = new Set([
  'meta/llama-3.3-70b-instruct',
  'meta/llama-3-70b-instruct',
  'meta/llama-3-8b-instruct',
  'meta/llama3-70b-instruct',
  'meta/llama3-8b-instruct',
]);

async function callNvidia(apiKey: string, prompt: string): Promise<string> {
  let configuredModel = process.env.NVIDIA_MODEL?.trim();

  // If configured model is known to be sunset/retired, swap to active Llama 3.2
  if (!configuredModel || RETIRED_MODELS.has(configuredModel)) {
    configuredModel = DEFAULT_NVIDIA_MODELS[0];
  }

  // List of models to try in order
  const modelsToTry = [configuredModel, ...DEFAULT_NVIDIA_MODELS.filter(m => m !== configuredModel)];

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        // If 410 (Gone), 404 (Not Found), or model retired/unavailable, continue to fallback
        if (
          response.status === 410 ||
          response.status === 404 ||
          errorData.includes('no longer available') ||
          errorData.includes('end of life') ||
          errorData.includes('reached its end')
        ) {
          console.warn(`[NVIDIA AI] Model ${model} is unavailable (${response.status}). Trying fallback...`);
          lastError = new Error(`NVIDIA model ${model} unavailable: ${errorData}`);
          continue;
        }
        throw new Error(`NVIDIA API error (${response.status}): ${errorData}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      if (content) return content;
    } catch (err: any) {
      lastError = err;
      // If it's an authorization failure, throw immediately without trying fallbacks
      if (err.message?.includes('(401)') || err.message?.includes('(403)')) {
        throw err;
      }
    }
  }

  throw lastError || new Error('NVIDIA NIM API failed to generate response');
}

// ============================================================
// OpenAI API call
// ============================================================
async function callOpenAI(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorData}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}
