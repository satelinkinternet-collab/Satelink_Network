export interface SatelinkRPCOptions {
  apiKey?: string;
  chain?: string;
  baseUrl?: string;
}

export interface SatelinkAIOptions {
  apiKey: string;
  baseUrl?: string;
}

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: unknown[];
  id: number | string;
}

export interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0';
  id: number | string;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface Model {
  id: string;
  object: 'model';
  owned_by: string;
  created: number;
}

export interface TransactionRequest {
  to?: string;
  from?: string;
  data?: string;
  value?: string;
  gas?: string;
  gasPrice?: string;
}
