import { describe, it, expect } from 'vitest';
import { normalizeAnthropicStream, normalizeGoogleStream, normalizeOpenAIStream } from '../streamNormalizers';

/** Build a ReadableStream from one or more raw SSE strings */
function makeStream(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

/** Consume a ReadableStream and return all emitted text */
async function readStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  const decoder = new TextDecoder();
  const reader = stream.getReader();
  let result = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value);
  }
  return result;
}

/** Parse normalized SSE output into an array of content strings */
function parseNormalizedSSE(raw: string): string[] {
  return raw
    .split('\n')
    .filter((l) => l.startsWith('data: ') && l !== 'data: [DONE]')
    .map((l) => {
      const parsed = JSON.parse(l.slice(6));
      return parsed.choices[0].delta.content as string;
    });
}

// ── normalizeOpenAIStream ─────────────────────────────────────────────────────

describe('normalizeOpenAIStream', () => {
  it('passes the stream through unchanged', async () => {
    const payload = 'data: {"choices":[{"delta":{"content":"hello"}}]}\n\ndata: [DONE]\n\n';
    const stream = makeStream(payload);
    const output = await readStream(normalizeOpenAIStream(stream));
    expect(output).toBe(payload);
  });
});

// ── normalizeAnthropicStream ──────────────────────────────────────────────────

describe('normalizeAnthropicStream', () => {
  it('converts a content_block_delta event to OpenAI format', async () => {
    const event = JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } });
    const stream = makeStream(`data: ${event}\n\n`);
    const output = await readStream(normalizeAnthropicStream(stream));
    const chunks = parseNormalizedSSE(output);
    expect(chunks).toEqual(['Hello']);
    expect(output).toContain('data: [DONE]');
  });

  it('handles multiple chunks in sequence', async () => {
    const e1 = JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: 'Foo' } });
    const e2 = JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: 'Bar' } });
    const stream = makeStream(`data: ${e1}\n\ndata: ${e2}\n\n`);
    const output = await readStream(normalizeAnthropicStream(stream));
    const chunks = parseNormalizedSSE(output);
    expect(chunks).toEqual(['Foo', 'Bar']);
  });

  it('ignores non-content_block_delta event types', async () => {
    const ping = JSON.stringify({ type: 'ping' });
    const delta = JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hi' } });
    const stream = makeStream(`data: ${ping}\n\ndata: ${delta}\n\n`);
    const output = await readStream(normalizeAnthropicStream(stream));
    const chunks = parseNormalizedSSE(output);
    expect(chunks).toEqual(['Hi']);
  });

  it('silently skips malformed (non-JSON) lines', async () => {
    const stream = makeStream('data: not-json\n\n');
    const output = await readStream(normalizeAnthropicStream(stream));
    expect(parseNormalizedSSE(output)).toHaveLength(0);
    expect(output).toContain('data: [DONE]');
  });

  it('handles chunks split across multiple reads', async () => {
    const event = JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: 'Split' } });
    const full = `data: ${event}\n\n`;
    const mid = Math.floor(full.length / 2);
    const stream = makeStream(full.slice(0, mid), full.slice(mid));
    const output = await readStream(normalizeAnthropicStream(stream));
    const chunks = parseNormalizedSSE(output);
    expect(chunks).toEqual(['Split']);
  });

  it('emits [DONE] even when there are no content events', async () => {
    const stream = makeStream('data: {"type":"message_start"}\n\n');
    const output = await readStream(normalizeAnthropicStream(stream));
    expect(output).toContain('data: [DONE]');
    expect(parseNormalizedSSE(output)).toHaveLength(0);
  });
});

// ── normalizeGoogleStream ─────────────────────────────────────────────────────

describe('normalizeGoogleStream', () => {
  it('converts a Google candidates event to OpenAI format', async () => {
    const event = JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'Bonjour' }] } }],
    });
    const stream = makeStream(`data: ${event}\n\n`);
    const output = await readStream(normalizeGoogleStream(stream));
    const chunks = parseNormalizedSSE(output);
    expect(chunks).toEqual(['Bonjour']);
    expect(output).toContain('data: [DONE]');
  });

  it('handles multiple Google chunks', async () => {
    const e1 = JSON.stringify({ candidates: [{ content: { parts: [{ text: 'A' }] } }] });
    const e2 = JSON.stringify({ candidates: [{ content: { parts: [{ text: 'B' }] } }] });
    const stream = makeStream(`data: ${e1}\n\ndata: ${e2}\n\n`);
    const output = await readStream(normalizeGoogleStream(stream));
    expect(parseNormalizedSSE(output)).toEqual(['A', 'B']);
  });

  it('ignores events with missing candidates array', async () => {
    const event = JSON.stringify({ usageMetadata: { promptTokenCount: 10 } });
    const stream = makeStream(`data: ${event}\n\n`);
    const output = await readStream(normalizeGoogleStream(stream));
    expect(parseNormalizedSSE(output)).toHaveLength(0);
    expect(output).toContain('data: [DONE]');
  });

  it('ignores events with empty candidates array', async () => {
    const event = JSON.stringify({ candidates: [] });
    const stream = makeStream(`data: ${event}\n\n`);
    const output = await readStream(normalizeGoogleStream(stream));
    expect(parseNormalizedSSE(output)).toHaveLength(0);
  });

  it('silently skips malformed (non-JSON) lines', async () => {
    const stream = makeStream('data: {bad json}\n\n');
    const output = await readStream(normalizeGoogleStream(stream));
    expect(parseNormalizedSSE(output)).toHaveLength(0);
    expect(output).toContain('data: [DONE]');
  });

  it('handles chunks split across multiple reads', async () => {
    const event = JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Split' }] } }] });
    const full = `data: ${event}\n\n`;
    const mid = Math.floor(full.length / 2);
    const stream = makeStream(full.slice(0, mid), full.slice(mid));
    const output = await readStream(normalizeGoogleStream(stream));
    expect(parseNormalizedSSE(output)).toEqual(['Split']);
  });

  it('emits [DONE] on empty stream', async () => {
    const stream = makeStream('');
    const output = await readStream(normalizeGoogleStream(stream));
    expect(output).toContain('data: [DONE]');
  });
});
