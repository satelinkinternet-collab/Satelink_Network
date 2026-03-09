import jwt from 'jsonwebtoken';
import 'dotenv/config';

const secret = process.env.JWT_SECRET || 'testsecret';
const token = jwt.sign(
    { wallet: '0xadmin', role: 'admin_super', userId: 'admin', type: 'access' },
    secret,
    { expiresIn: '1h', issuer: 'satelink-core' }
);
console.log(token);
