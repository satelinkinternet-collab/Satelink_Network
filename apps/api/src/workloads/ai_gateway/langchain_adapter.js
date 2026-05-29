/**
 * LangChain Tool Adapter (S3-004)
 *
 * Provides tool definitions for AI agents (LangChain, AutoGPT, CrewAI).
 * Enables AI agents to execute blockchain RPC calls via Satelink.
 *
 * Endpoints:
 * - GET /v1/tools/langchain — LangChain tool spec
 * - GET /v1/tools/openai — OpenAI function calling spec
 * - POST /v1/tools/execute — Execute a tool call
 */

import { Router } from 'express';
import crypto from 'crypto';

const SUPPORTED_CHAINS = ['ethereum', 'polygon', 'arbitrum', 'base', 'polygon-amoy'];

const COMMON_RPC_METHODS = [
  'eth_blockNumber',
  'eth_getBalance',
  'eth_getTransactionCount',
  'eth_getTransactionByHash',
  'eth_getTransactionReceipt',
  'eth_call',
  'eth_estimateGas',
  'eth_gasPrice',
  'eth_getBlockByNumber',
  'eth_getBlockByHash',
  'eth_getLogs',
  'eth_chainId',
  'net_version'
];

const LANGCHAIN_TOOL_SPEC = {
  name: 'satelink_rpc',
  description: 'Execute blockchain RPC calls on Ethereum, Polygon, Arbitrum, Base via Satelink DePIN network. Use this to query blockchain state, check balances, get transaction info, and more.',
  parameters: {
    type: 'object',
    properties: {
      chain: {
        type: 'string',
        description: 'The blockchain to query',
        enum: SUPPORTED_CHAINS
      },
      method: {
        type: 'string',
        description: 'The JSON-RPC method to call',
        enum: COMMON_RPC_METHODS
      },
      params: {
        type: 'array',
        description: 'Parameters for the RPC method',
        items: { type: 'string' }
      }
    },
    required: ['chain', 'method']
  }
};

const OPENAI_FUNCTION_SPEC = {
  type: 'function',
  function: {
    name: 'satelink_rpc',
    description: 'Execute blockchain RPC calls on Ethereum, Polygon, Arbitrum, Base via Satelink DePIN network. Returns JSON-RPC response with blockchain data.',
    parameters: {
      type: 'object',
      properties: {
        chain: {
          type: 'string',
          description: 'The blockchain to query (ethereum, polygon, arbitrum, base, polygon-amoy)',
          enum: SUPPORTED_CHAINS
        },
        method: {
          type: 'string',
          description: 'The JSON-RPC method (eth_blockNumber, eth_getBalance, eth_call, etc.)',
          enum: COMMON_RPC_METHODS
        },
        params: {
          type: 'array',
          description: 'Parameters for the RPC method. Example: ["0x742d35Cc6634C0532925a3b844Bc9e7595f7bA8f", "latest"] for eth_getBalance',
          items: { type: 'string' }
        }
      },
      required: ['chain', 'method']
    }
  }
};

const SATELINK_MEV_TOOL = {
  name: 'satelink_mev',
  description: 'Submit private transactions to MEV-protected relay. Transactions are not broadcast to public mempool.',
  parameters: {
    type: 'object',
    properties: {
      chain: {
        type: 'string',
        description: 'The blockchain (ethereum, polygon, arbitrum)',
        enum: ['ethereum', 'polygon', 'arbitrum']
      },
      signedTx: {
        type: 'string',
        description: 'The signed raw transaction hex (0x...)'
      }
    },
    required: ['chain', 'signedTx']
  }
};

async function executeRpcCall(chain, method, params) {
  const rpcUrl = `https://rpc.satelink.network/rpc/${chain}`;

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params: params || [],
        id: Date.now()
      })
    });

    if (!response.ok) {
      return { error: `RPC request failed: ${response.status}` };
    }

    const data = await response.json();
    return data;
  } catch (err) {
    return { error: err.message };
  }
}

export function createLangChainAdapterRouter(db, redis) {
  const router = Router();

  router.get('/langchain', (req, res) => {
    res.json({
      ok: true,
      format: 'langchain',
      tools: [
        LANGCHAIN_TOOL_SPEC,
        SATELINK_MEV_TOOL
      ],
      usage: {
        python: `
from langchain.tools import StructuredTool
import requests

def satelink_rpc(chain: str, method: str, params: list = None):
    response = requests.post(
        f"https://rpc.satelink.network/rpc/{chain}",
        json={"jsonrpc": "2.0", "method": method, "params": params or [], "id": 1}
    )
    return response.json()

tool = StructuredTool.from_function(
    func=satelink_rpc,
    name="satelink_rpc",
    description="Execute blockchain RPC calls via Satelink"
)
        `.trim()
      }
    });
  });

  router.get('/openai', (req, res) => {
    res.json({
      ok: true,
      format: 'openai_functions',
      tools: [OPENAI_FUNCTION_SPEC],
      usage: {
        example: `
{
  "model": "gpt-4o",
  "messages": [{"role": "user", "content": "What is the current block number on Ethereum?"}],
  "tools": [${JSON.stringify(OPENAI_FUNCTION_SPEC)}]
}
        `.trim()
      }
    });
  });

  router.post('/execute', async (req, res) => {
    const { tool, arguments: args } = req.body || {};

    if (!tool) {
      return res.status(400).json({ error: 'tool name required' });
    }

    if (tool === 'satelink_rpc') {
      const { chain, method, params } = args || {};

      if (!chain || !method) {
        return res.status(400).json({ error: 'chain and method required' });
      }

      if (!SUPPORTED_CHAINS.includes(chain)) {
        return res.status(400).json({ error: `Unsupported chain: ${chain}` });
      }

      const result = await executeRpcCall(chain, method, params);
      res.json({ ok: true, result });
    } else {
      res.status(400).json({ error: `Unknown tool: ${tool}` });
    }
  });

  return router;
}
