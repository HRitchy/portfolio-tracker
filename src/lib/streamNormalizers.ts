/**
 * Stream normalizers — convert each provider's SSE format to the OpenAI format:
 *   data: {"choices":[{"delta":{"content":"..."}}]}\n\n
 *
 * All functions return a ReadableStream<Uint8Array> that ends with:
 *   data: [DONE]\n\n
 */

function createLineProcessor(
  extractText: (parsed: unknown) => string | null,
): (body: ReadableStream<Uint8Array>) => ReadableStream<Uint8Array> {
  return (body) => {
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
                const text = extractText(parsed);
                if (typeof text === 'string' && text) {
                  const normalized = JSON.stringify({
                    choices: [{ delta: { content: text } }],
                  });
                  controller.enqueue(encoder.encode(`data: ${normalized}\n\n`));
                }
              } catch {
                // skip non-JSON or unrecognized lines
              }
            }
          }
        } catch (err) {
          controller.error(err);
        }
      },
    });
  };
}

export function normalizeOpenAIStream(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  // OpenAI already uses our target format — pass through
  return body;
}

export const normalizeAnthropicStream = createLineProcessor((parsed) => {
  const p = parsed as Record<string, unknown>;
  if (
    p.type === 'content_block_delta' &&
    p.delta !== null &&
    typeof p.delta === 'object' &&
    (p.delta as Record<string, unknown>).type === 'text_delta'
  ) {
    return (p.delta as Record<string, unknown>).text as string;
  }
  return null;
});

export const normalizeGoogleStream = createLineProcessor((parsed) => {
  const p = parsed as Record<string, unknown>;
  const candidates = p?.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const text = candidates[0]?.content?.parts?.[0]?.text;
  return typeof text === 'string' ? text : null;
});
