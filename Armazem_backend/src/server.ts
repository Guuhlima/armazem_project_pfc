// server.ts
import Fastify from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import redis from '@fastify/redis'
import dotenv from 'dotenv'
import sensible from '@fastify/sensible'
import cookie from '@fastify/cookie'
import { hydrateRbacFromPrisma } from './utils/rbacHydrate';

import { equipamentosRoutes } from './routes/equipment.routes'
import { authRoutes } from './routes/auth.routes'
import { usuariosRoutes } from './routes/user.routes'
import { transferenciasRoutes } from './routes/transfer.routes'
import { estoquesRoutes } from './routes/stock.routes'
import { estoqueItensRoutes } from './routes/stockItens.routes'
import { resetPasswordRoutes } from './routes/resetPassword.routes'
import { notificationsRoutes } from 'routes/notificacoes.routes'
import { requestsRoutes } from 'routes/requests.routes'
import { adminUserStockRoutes } from './routes/adminUserStock.routes';

import { estoqueNotifyRoutes } from './routes/estoqueNotify.routes';
import '../src/service/telegram.service';

import rbacPlugin from './plugins/rbac'

dotenv.config()

const PORT = Number(process.env.PORT) || 4000
const HOST = process.env.HOST ?? '0.0.0.0'
const isProd = process.env.NODE_ENV === 'production'
const WEB_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.WEB_ORIGIN ?? '',
].filter(Boolean)

const app = Fastify({ logger: true }).withTypeProvider<TypeBoxTypeProvider>()

/* ---------- CORS (com credenciais) ---------- */
await app.register(cors, {
  origin(origin, cb) {
    if (!origin) return cb(null, true) // permitir tools locais (curl, etc.)
    if (WEB_ORIGINS.includes(origin)) return cb(null, true)
    cb(new Error('CORS not allowed'), false)
  },
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true, // 👈 obrigatório p/ cookies cross-site
})

await app.register(sensible)

/* ---------- Cookies devem vir ANTES do JWT ---------- */
await app.register(cookie, {
  // se quiser assinar cookies não-HttpOnly:
  // secret: process.env.COOKIE_SECRET,
})

/* ---------- JWT lendo do cookie accessToken ---------- */
await app.register(jwt, {
  secret: process.env.JWT_SECRET!,
  cookie: {
    cookieName: 'accessToken', // 👈 request.jwtVerify() vai buscar aqui
    signed: false,
  },
})

/* ---------- Redis + RBAC ---------- */
await app.register(redis, { url: process.env.REDIS_URL ?? 'redis://localhost:6379' })
await app.register(rbacPlugin)
await hydrateRbacFromPrisma(app);

/* ---------- Decorator authenticate (via cookie) ---------- */
app.decorate('authenticate', async function (request: any, reply: any) {
  try {
    // Lê do cookie 'accessToken' por causa da opção em fastify-jwt acima
    const payload = await request.jwtVerify()
    request.user = {
      id: payload?.sub ?? payload?.id,
      nome: payload?.nome ?? null,
      email: payload?.email ?? '',
      permissoes: payload?.permissoes ?? [],
    }
  } catch (err) {
    request.log.warn({ err }, 'unauthorized')
    return reply.code(401).send({ error: 'unauthorized' })
  }
})

/* ----------------- ROTAS ------------------ */

// 🔓 públicas
await app.register(authRoutes)               // login deve setar cookies HttpOnly
await app.register(resetPasswordRoutes)
await app.register(usuariosRoutes, { prefix: '/user' })

// 🔒 equipamentos
await app.register(async (r) => {
  r.addHook('onRequest', r.authenticate)
  r.register(equipamentosRoutes)
})

// 🔒 transferências (perm necessária)
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

// 🔒 notificações
await app.register(async (r) => {
  r.addHook('onRequest', r.authenticate)
  r.register(notificationsRoutes)
})

// 🔒 solicitações
await app.register(async (r) => {
  r.addHook('onRequest', r.authenticate)
  r.register(requestsRoutes, { prefix: '/requests' })
})

// 🔒 telegram notify (gestão)
await app.register(async (r) => {
  r.addHook('onRequest', r.authenticate); // já resolve auth aqui
  r.register(estoqueNotifyRoutes);        // sem prefixo extra
});

// 🔒 admin: role por usuário/estoque
await app.register(async (r) => {
  r.addHook('onRequest', r.authenticate);
  r.register(adminUserStockRoutes);
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
