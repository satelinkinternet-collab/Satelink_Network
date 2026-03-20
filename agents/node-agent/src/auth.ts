import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const IDENTITY_DIR = path.join(process.env.HOME || '/tmp', '.satelink');
const IDENTITY_FILE = path.join(IDENTITY_DIR, 'node_identity.json');

interface NodeIdentity {
    nodeId: string;
    publicKey: string;
    privateKey: string;
    createdAt: number;
}

export class NodeAuth {
    private identity: NodeIdentity | null = null;

    /**
     * Generates an Ed25519 keypair on first run, persists to ~/.satelink/node_identity.json
     * with restricted permissions (mode 0o600).
     */
    async initialize(): Promise<NodeIdentity> {
        if (this.identity) return this.identity;

        // Try loading existing identity
        if (fs.existsSync(IDENTITY_FILE)) {
            const raw = fs.readFileSync(IDENTITY_FILE, 'utf8');
            this.identity = JSON.parse(raw) as NodeIdentity;
            return this.identity;
        }

        // Generate new Ed25519 keypair
        const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });

        const nodeId = crypto.createHash('sha256')
            .update(publicKey)
            .digest('hex')
            .substring(0, 16);

        this.identity = {
            nodeId,
            publicKey,
            privateKey,
            createdAt: Date.now()
        };

        // Persist with restricted permissions
        if (!fs.existsSync(IDENTITY_DIR)) {
            fs.mkdirSync(IDENTITY_DIR, { recursive: true, mode: 0o700 });
        }
        fs.writeFileSync(IDENTITY_FILE, JSON.stringify(this.identity, null, 2), { mode: 0o600 });

        return this.identity;
    }

    /**
     * Signs a JSON payload with the node's Ed25519 private key.
     * Returns base64-encoded signature.
     */
    signRequest(payload: object): string {
        if (!this.identity) throw new Error('NodeAuth not initialized');

        const data = JSON.stringify(payload);
        const sign = crypto.sign(null, Buffer.from(data), this.identity.privateKey);
        return sign.toString('base64');
    }

    /**
     * Verifies a signature against a public key (used by control plane).
     */
    static verifySignature(payload: object, signature: string, publicKeyPem: string): boolean {
        const data = JSON.stringify(payload);
        return crypto.verify(
            null,
            Buffer.from(data),
            publicKeyPem,
            Buffer.from(signature, 'base64')
        );
    }

    getNodeId(): string {
        if (!this.identity) throw new Error('NodeAuth not initialized');
        return this.identity.nodeId;
    }

    getPublicKey(): string {
        if (!this.identity) throw new Error('NodeAuth not initialized');
        return this.identity.publicKey;
    }
}
