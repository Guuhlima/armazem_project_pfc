import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      id: number;
      nome: string;
      email: string;
      permissoes: string[];
    };
  }
}
