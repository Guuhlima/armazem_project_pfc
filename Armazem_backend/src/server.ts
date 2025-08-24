// server.ts (versão ajustada)
import Fastify from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import redis from '@fastify/redis'
import dotenv from 'dotenv'
import sensible from '@fastify/sensible'

import { equipamentosRoutes } from './routes/equipment.routes'
import { authRoutes } from './routes/auth.routes'
import { usuariosRoutes } from './routes/user.routes'
import { transferenciasRoutes } from './routes/transfer.routes'
import { estoquesRoutes } from './routes/stock.routes'
import { estoqueItensRoutes } from './routes/stockItens.routes'
import { resetPasswordRoutes } from './routes/resetPassword.routes'
import { notificationsRoutes } from 'routes/notificacoes.routes'
import { requestsRoutes } from 'routes/requests.routes'

import rbacPlugin from './plugins/rbac'

dotenv.config()

const PORT = Number(process.env.PORT) || 4000
const HOST = process.env.HOST ?? '0.0.0.0'

const app = Fastify({ logger: true }).withTypeProvider<TypeBoxTypeProvider>()

await app.register(cors, {
  origin(origin, cb) {
    const allow = ['http://localhost:3000', 'http://127.0.0.1:3000']
    if (!origin) return cb(null, true)
    if (allow.includes(origin)) return cb(null, true)
    cb(new Error('CORS not allowed'), false)
  },
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
})

await app.register(sensible)

await app.register(jwt, { secret: process.env.JWT_SECRET! })

app.decorate('authenticate', async function (request: any, reply: any) {
  try {
    const payload = await request.jwtVerify();
    request.user = {
      id: (payload as any).sub ?? (payload as any).id,
      nome: (payload as any).nome ?? null,
      email: (payload as any).email ?? '',
      permissoes: (payload as any).permissoes ?? [],
    };
  } catch (err) {
    request.log.warn({ err }, 'unauthorized');
    return reply.code(401).send({ error: 'unauthorized' });
  }
});

await app.register(redis, { url: process.env.REDIS_URL ?? 'redis://localhost:6379' })
await app.register(rbacPlugin)

/* ----------------- ROTAS ------------------ */

// 🔓 públicas
await app.register(authRoutes)
await app.register(resetPasswordRoutes)
await app.register(usuariosRoutes, { prefix: '/user' });

// 🔒 equipamentos
await app.register(async (r) => {
  r.addHook('onRequest', r.authenticate)
  r.register(equipamentosRoutes)
})

// 🔒 usuários (CRUD) — RBAC correto: 'user:manage'
// await app.register(async (r) => {
//   r.addHook('onRequest', r.authenticate)
//   r.addHook('preHandler', r.rbac.requirePerm('user:manage'))
//   r.register(usuariosRoutes)
// })

// 🔒 transferências
await app.register(async (r) => {
  r.addHook('onRequest', r.authenticate)
  r.addHook('preHandler', r.rbac.requirePerm('transfer:manage'))
  r.register(transferenciasRoutes)
})

// 🔒 estoques
await app.register(async (r) => {
  r.addHook('onRequest', r.authenticate)
  r.register(estoquesRoutes)
  r.register(estoqueItensRoutes)
})

await app.register(async (r) => {
  r.addHook('onRequest', r.authenticate)
  r.register(notificationsRoutes)
})

await app.register(async (r) => {
  r.addHook('onRequest', r.authenticate);
  r.register(requestsRoutes, { prefix: '/requests' });
});

await app.ready()
app.log.info(app.printRoutes())

try {
  const address = await app.listen({ port: PORT, host: HOST })
  app.log.info(`🚀 Servidor rodando em ${address}`)
} catch (err) {
  app.log.error(err, 'Erro ao iniciar o servidor')
  process.exit(1)
}
