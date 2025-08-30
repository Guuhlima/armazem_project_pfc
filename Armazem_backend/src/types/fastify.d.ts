import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: number;
      nome?: string | null;
      email?: string;
      permissoes?: string[];
      jti?: string;
    };
    user: {
      id: number;
      nome: string | null;
      email: string;
      permissoes: string[];
    };
  }
}
