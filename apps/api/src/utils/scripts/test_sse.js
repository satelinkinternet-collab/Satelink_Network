import jwt from 'jsonwebtoken';
import 'dotenv/config';

if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is required. Set it in .env before running this script.');
    process.exit(1);
}
const token = jwt.sign(
    { wallet: '0xadmin', role: 'admin_super', userId: 'admin', type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '1h', issuer: 'satelink-core' }
);
console.log(token);
