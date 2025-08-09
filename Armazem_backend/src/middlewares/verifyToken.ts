import { FastifyRequest, FastifyReply } from 'fastify';
import jwt, { JwtPayload } from 'jsonwebtoken';

interface UserTokenPayload {
  id: number;
  nome: string;
  email: string;
  permissoes: string[];
}

export async function verifyToken(req: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Token ausente' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as UserTokenPayload;
    req.user = decoded;

    if (typeof decoded === 'string' || !decoded || typeof decoded !== 'object') {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    req.user = decoded

  } catch (error) {
    console.error(error);
    return reply.status(401).send({ error: 'Token inválido ou expirado' });
  }
}
