import { FastifyRequest, FastifyReply } from 'fastify';

export function requirePermissionExcluding(excludedPerms: string[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const user = req.user;

    if (!user || !user.permissoes || user.permissoes.length === 0) {
      return reply.status(403).send({ error: 'Acesso negado: Sem permissões atribuídas' });
    }

    if (user.permissoes.includes('SUPER-ADMIN')) {
      return;
    }

    const isBlocked = excludedPerms.some(p => user.permissoes.includes(p));

    if (isBlocked) {
      return reply.status(403).send({ error: 'Acesso negado: Permissão bloqueada' });
    }
  };
}
