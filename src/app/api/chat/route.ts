import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/apiUtils';
import { AI_MODELS } from '@/lib/models';
import type { AIProvider } from '@/lib/models';
import { normalizeOpenAIStream, normalizeAnthropicStream, normalizeGoogleStream } from '@/lib/streamNormalizers';

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

async function callOpenAI(
  apiKey: string,
  model: string,
  systemContent: string,
  messages: ChatMessage[],
  useMaxCompletionTokens = false,
) {
  const tokenParam = useMaxCompletionTokens
    ? { max_completion_tokens: 1500 }
    : { max_tokens: 1500 };

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
      ...tokenParam,
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

  if (messages.length > 200) {
    return NextResponse.json({ error: 'Trop de messages dans la conversation (max 200).' }, { status: 400 });
  }

  if (typeof systemPrompt !== 'string' || typeof portfolioContext !== 'string') {
    return NextResponse.json({ error: 'Les champs "systemPrompt" et "portfolioContext" sont requis.' }, { status: 400 });
  }

  if (systemPrompt.length > 8_000) {
    return NextResponse.json({ error: 'Le "systemPrompt" dépasse la limite de 8 000 caractères.' }, { status: 400 });
  }

  if (portfolioContext.length > 20_000) {
    return NextResponse.json({ error: 'Le "portfolioContext" dépasse la limite de 20 000 caractères.' }, { status: 400 });
  }

  for (const msg of messages) {
    if (typeof msg.role !== 'string' || typeof msg.content !== 'string') {
      return NextResponse.json({ error: 'Format de message invalide (role et content requis).' }, { status: 400 });
    }
    if (!['user', 'assistant'].includes(msg.role)) {
      return NextResponse.json({ error: `Rôle de message invalide : "${msg.role}".` }, { status: 400 });
    }
    if (msg.content.length > 10_000) {
      return NextResponse.json({ error: 'Un message dépasse la limite de 10 000 caractères.' }, { status: 400 });
    }
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
        response = await callOpenAI(apiKey, model.apiModel, systemContent, messages, model.useMaxCompletionTokens);
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
