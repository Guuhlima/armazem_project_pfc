import '@fastify/jwt';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      id: number;
      nome: string | null;
      email: string;
      permissoes: string[];
    };
  }
}
