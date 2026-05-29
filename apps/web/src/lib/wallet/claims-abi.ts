export const CLAIMS_ABI = [
  {
    name: 'claim',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'nodeId', type: 'string' },
      { name: 'amount', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'expiry', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    name: 'hasClaimed',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'nonce', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export { CLAIMS_CONTRACT, POLYGON_CHAIN_ID } from './config';
