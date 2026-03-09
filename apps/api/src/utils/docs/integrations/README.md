# Satelink Integration Recipes

This guide provides copy-paste recipes for integrating Satelink Network into your application.

## Prerequisites
- A Satelink API Key (from Partner Portal)
- Base URL (Production: `https://api.satelink.network`, Local: `http://localhost:8080`)

---

## 1. Node.js (using SDK)

First, install the SDK (once published, or link locally):
```bash
npm install satelink-js
```

```javascript
const { SatelinkClient } = require('satelink-js');

const client = new SatelinkClient({
  apiKey: process.env.SATELINK_API_KEY,
  baseUrl: 'http://localhost:8080' // or production URL
});

async function run() {
  // 1. Check Cost
  const pricing = await client.getPricing();
  console.log('Pricing:', pricing.data);

  // 2. Execute Op
  const result = await client.executeOp({
    opType: 'social_sentiment',
    payload: { query: 'Satelink', platforms: ['twitter'] },
    idempotencyKey: `req_${Date.now()}` // Prevent duplicates
  });

  if (result.ok) {
    console.log('Success:', result.data);
  } else {
    console.error('Failed:', result.error, 'Trace:', result.trace_id);
  }
}

run();
```

---

## 2. Python (using requests)

```python
import requests
import os
import time

API_KEY = os.getenv('SATELINK_API_KEY')
BASE_URL = 'http://localhost:8080'

headers = {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
}

def execute_op():
    payload = {
        'op_type': 'social_sentiment',
        'payload': {'query': 'DePIN', 'limit': 100}
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/v1/ops/execute",
            json=payload,
            headers=headers
        )
        response.raise_for_status()
        print("Success:", response.json())
        
    except requests.exceptions.HTTPError as e:
        print(f"Error: {e}")
        if 'X-Trace-Id' in response.headers:
            print(f"Trace ID: {response.headers['X-Trace-Id']}")

execute_op()
```

---

## 3. Next.js (API Route)

Create `app/api/satelink/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { SatelinkClient } from 'satelink-js';

const client = new SatelinkClient({
  apiKey: process.env.SATELINK_API_KEY!,
  baseUrl: process.env.NEXT_PUBLIC_SATELINK_URL
});

export async function POST(req: Request) {
  const body = await req.json();
  
  const result = await client.executeOp({
    opType: 'social_sentiment',
    payload: body
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
```
