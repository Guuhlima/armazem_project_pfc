import crypto from 'crypto'
import bcrypt from 'bcrypt'

export function generateToken(): { token: string; tokenHash: string} {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    return {token, tokenHash};
}

export async function hashPassword(plain: string){
    return bcrypt.hash(plain, 10);
}

export function isExpired(date: Date) {
    return date.getTime() < Date.now();
}