import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/apiUtils';
import { AI_MODELS } from '@/lib/models';
import type { AIProvider } from '@/lib/models';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface RequestBody {
  messages: ChatMessage[];
  systemPrompt: string;
  portfolioContext: string;
  modelId: string;
}

// ── Provider dispatchers ───────────────────────────────────

async function callOpenAI(apiKey: string, model: string, systemContent: string, messages: ChatMessage[]) {
  return fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemContent }, ...messages],
      stream: true,
      max_tokens: 1500,
      temperature: 0.4,
    }),
  });
}

async function callAnthropic(apiKey: string, model: string, systemContent: string, messages: ChatMessage[]) {
  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      system: systemContent,
      messages,
      stream: true,
      max_tokens: 1500,
      temperature: 0.4,
    }),
  });
}

async function callGoogle(apiKey: string, model: string, systemContent: string, messages: ChatMessage[]) {
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemContent }] },
        contents,
        generationConfig: { temperature: 0.4, maxOutputTokens: 1500 },
      }),
    },
  );
}

// ── Stream normalizers (convert provider SSE → OpenAI-format SSE) ──

function normalizeOpenAIStream(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  // OpenAI already uses our target format — pass through
  return body;
}

function normalizeAnthropicStream(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';

  return new ReadableStream({
    async start(controller) {
      const reader = body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (!data) continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
                const normalized = JSON.stringify({
                  choices: [{ delta: { content: parsed.delta.text } }],
                });
                controller.enqueue(encoder.encode(`data: ${normalized}\n\n`));
              }
            } catch {
              // skip non-JSON lines
            }
          }
        }
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

function normalizeGoogleStream(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';

  return new ReadableStream({
    async start(controller) {
      const reader = body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (!data) continue;

            try {
              const parsed = JSON.parse(data);
              const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (typeof text === 'string' && text) {
                const normalized = JSON.stringify({
                  choices: [{ delta: { content: text } }],
                });
                controller.enqueue(encoder.encode(`data: ${normalized}\n\n`));
              }
            } catch {
              // skip non-JSON lines
            }
          }
        }
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

// ── Error extraction per provider ──

async function extractErrorMessage(response: Response, provider: AIProvider): Promise<string> {
  const status = response.status;
  try {
    const errData = await response.json();
    if (provider === 'openai') return errData?.error?.message ?? `Erreur OpenAI (${status})`;
    if (provider === 'anthropic') return errData?.error?.message ?? `Erreur Anthropic (${status})`;
    if (provider === 'google') return errData?.error?.message ?? `Erreur Google AI (${status})`;
  } catch {
    // ignore
  }
  return `Erreur du fournisseur (${status})`;
}

// ── Main handler ───────────────────────────────────────────

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, 20);
  if (limited) return limited;

  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Clé API manquante.' },
      { status: 401 },
    );
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide (JSON attendu).' }, { status: 400 });
  }

  const { messages, systemPrompt, portfolioContext, modelId } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Le champ "messages" est requis et ne doit pas être vide.' }, { status: 400 });
  }

  if (typeof systemPrompt !== 'string' || typeof portfolioContext !== 'string') {
    return NextResponse.json({ error: 'Les champs "systemPrompt" et "portfolioContext" sont requis.' }, { status: 400 });
  }

  const model = AI_MODELS.find((m) => m.id === modelId);
  if (!model) {
    return NextResponse.json({ error: `Modèle "${modelId}" non reconnu.` }, { status: 400 });
  }

  const systemContent = `${systemPrompt}\n\n---\n\n## Données temps réel du portefeuille\n\n${portfolioContext}`;

  try {
    let response: Response;

    switch (model.provider) {
      case 'openai':
        response = await callOpenAI(apiKey, model.apiModel, systemContent, messages);
        break;
      case 'anthropic':
        response = await callAnthropic(apiKey, model.apiModel, systemContent, messages);
        break;
      case 'google':
        response = await callGoogle(apiKey, model.apiModel, systemContent, messages);
        break;
    }

    if (!response.ok) {
      const errorMsg = await extractErrorMessage(response, model.provider);
      return NextResponse.json({ error: errorMsg }, { status: response.status });
    }

    if (!response.body) {
      return NextResponse.json({ error: 'Réponse vide du fournisseur.' }, { status: 502 });
    }

    let normalizedStream: ReadableStream<Uint8Array>;
    switch (model.provider) {
      case 'openai':
        normalizedStream = normalizeOpenAIStream(response.body);
        break;
      case 'anthropic':
        normalizedStream = normalizeAnthropicStream(response.body);
        break;
      case 'google':
        normalizedStream = normalizeGoogleStream(response.body);
        break;
    }

    return new NextResponse(normalizedStream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur réseau interne';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
