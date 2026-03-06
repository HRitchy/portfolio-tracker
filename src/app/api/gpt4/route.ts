import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/apiUtils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface RequestBody {
  messages: ChatMessage[];
  systemPrompt: string;
  portfolioContext: string;
}

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, 20);
  if (limited) return limited;

  const apiKey = request.headers.get('x-openai-key');
  if (!apiKey || !apiKey.startsWith('sk-')) {
    return NextResponse.json(
      { error: 'Clé API OpenAI manquante ou invalide. Elle doit commencer par "sk-".' },
      { status: 401 },
    );
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide (JSON attendu).' }, { status: 400 });
  }

  const { messages, systemPrompt, portfolioContext } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Le champ "messages" est requis et ne doit pas être vide.' }, { status: 400 });
  }

  if (typeof systemPrompt !== 'string' || typeof portfolioContext !== 'string') {
    return NextResponse.json({ error: 'Les champs "systemPrompt" et "portfolioContext" sont requis.' }, { status: 400 });
  }

  const systemContent = `${systemPrompt}\n\n---\n\n## Données temps réel du portefeuille\n\n${portfolioContext}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemContent },
          ...messages,
        ],
        stream: true,
        max_tokens: 1500,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      let errorMsg = `Erreur OpenAI (${response.status})`;
      try {
        const errData = await response.json();
        errorMsg = errData?.error?.message ?? errorMsg;
      } catch {
        // ignore JSON parse failures for error body
      }
      return NextResponse.json({ error: errorMsg }, { status: response.status });
    }

    // Forward the SSE stream directly
    return new NextResponse(response.body, {
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
