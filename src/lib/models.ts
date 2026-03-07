export type AIProvider = 'openai' | 'anthropic' | 'google';

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  apiModel: string;
  useMaxCompletionTokens?: boolean;
}

export const AI_MODELS: AIModel[] = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', apiModel: 'gpt-4o' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', apiModel: 'gpt-4o-mini' },
  { id: 'o3-mini', name: 'o3 Mini', provider: 'openai', apiModel: 'o3-mini', useMaxCompletionTokens: true },
  { id: 'gpt-5.4', name: 'GPT 5.4', provider: 'openai', apiModel: 'gpt-5.4', useMaxCompletionTokens: true },
  { id: 'claude-sonnet', name: 'Claude Sonnet 4', provider: 'anthropic', apiModel: 'claude-sonnet-4-20250514' },
  { id: 'claude-haiku', name: 'Claude Haiku 3.5', provider: 'anthropic', apiModel: 'claude-haiku-4-5-20251001' },
  { id: 'gemini-2-flash', name: 'Gemini 2.0 Flash', provider: 'google', apiModel: 'gemini-2.0-flash' },
  { id: 'gemini-2-5-pro', name: 'Gemini 2.5 Pro', provider: 'google', apiModel: 'gemini-2.5-pro-preview-06-05' },
];

export const DEFAULT_MODEL_ID = 'gpt-4o';

export function getModelById(id: string): AIModel | undefined {
  return AI_MODELS.find((m) => m.id === id);
}

export function getModelsByProvider(provider: AIProvider): AIModel[] {
  return AI_MODELS.filter((m) => m.provider === provider);
}

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google AI',
};

export const API_KEY_PLACEHOLDERS: Record<AIProvider, string> = {
  openai: 'sk-...',
  anthropic: 'sk-ant-...',
  google: 'AIza...',
};
