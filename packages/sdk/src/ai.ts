import type {
  SatelinkAIOptions,
  ChatMessage,
  ChatCompletionOptions,
  ChatCompletionResponse,
  Model
} from './types.js';

const DEFAULT_BASE_URL = 'https://rpc.satelink.network';

export class SatelinkAI {
  private apiKey: string;
  private baseUrl: string;

  constructor(options: SatelinkAIOptions) {
    if (!options.apiKey) {
      throw new Error('API key is required for SatelinkAI');
    }
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey
    };
  }

  async chat(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
  ): Promise<ChatCompletionResponse> {
    const body = {
      model: options.model || 'satelink-default',
      messages,
      max_tokens: options.max_tokens || 1000,
      temperature: options.temperature,
      stream: false
    };

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `AI request failed: ${response.status} - ${error.error?.message || response.statusText}`
      );
    }

    return response.json();
  }

  async complete(prompt: string, options: ChatCompletionOptions = {}): Promise<string> {
    const body = {
      model: options.model || 'satelink-default',
      prompt,
      max_tokens: options.max_tokens || 100,
      temperature: options.temperature
    };

    const response = await fetch(`${this.baseUrl}/v1/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `AI request failed: ${response.status} - ${error.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    return data.choices?.[0]?.text || '';
  }

  async getModels(): Promise<Model[]> {
    const response = await fetch(`${this.baseUrl}/v1/models`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
  }

  get models(): Promise<Model[]> {
    return this.getModels();
  }
}
