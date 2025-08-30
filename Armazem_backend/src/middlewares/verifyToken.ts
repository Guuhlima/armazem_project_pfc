import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

interface UserTokenPayload {
  id?: number | string;
  sub?: number | string;
  userId?: number | string;
  nome: string;
  email: string;
  permissoes?: string[];
}

export async function verifyToken(req: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Token ausente' });
    }

    const token = authHeader.slice('Bearer '.length);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as UserTokenPayload;

    if (!decoded || typeof decoded !== 'object') {
      return reply.status(401).send({ error: 'Token inválido' });
    }

    const uid = decoded.id ?? decoded.userId ?? decoded.sub;
    if (uid == null) {
      // Sem ID não tem como usar RBAC baseado em Redis
      return reply.status(401).send({ error: 'Token sem identificador de usuário' });
    }

    // Normalize user para o RBAC
    (req as any).user = { ...decoded, id: uid };
  } catch (error) {
    req.log?.error({ error }, 'JWT verify error');
    return reply.status(401).send({ error: 'Token inválido ou expirado' });
  }
}
