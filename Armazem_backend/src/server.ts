import Fastify from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import redis from "@fastify/redis";
import dotenv from "dotenv";
import sensible from "@fastify/sensible";
import cookie from "@fastify/cookie";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import rbacPlugin from "./plugins/rbac";
import { hydrateRbacFromPrisma } from "./utils/rbacHydrate";

import { equipamentosRoutes } from "./routes/equipment.routes";
import { authRoutes } from "./routes/auth.routes";
import { usuariosRoutes } from "./routes/user.routes";
import { transferenciasRoutes } from "./routes/transfer.routes";
import { estoquesRoutes } from "./routes/stock.routes";
import { estoqueItensRoutes } from "./routes/stockItens.routes";
import { resetPasswordRoutes } from "./routes/resetPassword.routes";
import { notificationsRoutes } from "./routes/notificacoes.routes";
import { requestsRoutes } from "./routes/requests.routes";
import { adminUserStockRoutes } from "./routes/adminUserStock.routes";
import { agendamentoRoutes } from "./routes/agendamento.routes";
import { movimentacoesRoutes } from "routes/movimentacoes.routes";

import { startSchedulerLoop } from "./workers/scheduler";
import { startConsumer } from "./workers/consumer-transfer";
import "./service/telegram.service";

dotenv.config();

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST ?? "0.0.0.0";
const WEB_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  process.env.WEB_ORIGIN ?? "",
].filter(Boolean);

async function bootstrap() {
  const app = Fastify({ logger: true }).withTypeProvider<TypeBoxTypeProvider>();

  const ajv = new Ajv({ removeAdditional: true, coerceTypes: true });
  addFormats(ajv);
  app.setValidatorCompiler(({ schema }) => ajv.compile(schema));

  await app.register(cors, {
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (WEB_ORIGINS.includes(origin)) return cb(null, true);
      cb(new Error("CORS not allowed"), false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  await app.register(sensible);
  await app.register(cookie);

  await app.register(jwt, {
    secret: process.env.JWT_SECRET!,
    cookie: { cookieName: "accessToken", signed: false },
  });

  if (process.env.REDIS_URL) {
    await app.register(redis, { url: process.env.REDIS_URL });
  }

  await app.register(rbacPlugin);
  await hydrateRbacFromPrisma(app);

  app.decorate("authenticate", async function (request: any, reply: any) {
    try {
      const payload = await request.jwtVerify();
      request.user = {
        id: payload?.sub ?? payload?.id,
        nome: payload?.nome ?? null,
        email: payload?.email ?? "",
        permissoes: payload?.permissoes ?? [],
      };
    } catch (err) {
      request.log.warn({ err }, "unauthorized");
      return reply.code(401).send({ error: "unauthorized" });
    }
  });

  await app.register(authRoutes);
  await app.register(resetPasswordRoutes);
  await app.register(usuariosRoutes, { prefix: "/user" });

  await app.register(async (r) => {
    r.addHook("onRequest", r.authenticate);
    r.register(equipamentosRoutes);
  });

  await app.register(async (r) => {
    r.addHook("onRequest", r.authenticate);
    r.addHook("preHandler", r.rbac.requirePerm("transfer:manage"));
    r.register(transferenciasRoutes);
  });

  await app.register(async (r) => {
    r.addHook("onRequest", r.authenticate);
    r.register(estoquesRoutes);
    r.register(estoqueItensRoutes);
  });

  await app.register(async (r) => {
    r.addHook("onRequest", r.authenticate);
    r.register(notificationsRoutes);
  });

  await app.register(async (r) => {
    r.addHook("onRequest", r.authenticate);
    r.register(requestsRoutes, { prefix: "/requests" });
  });

  await app.register(async (r) => {
    r.addHook("onRequest", r.authenticate);
    r.register(adminUserStockRoutes);
  });

  await app.register(async (r) => {
    r.addHook("onRequest", r.authenticate);
    r.register(movimentacoesRoutes);
  })

  await app.register(agendamentoRoutes);

  startConsumer();
  startSchedulerLoop();

  await app.ready();
  app.log.info(app.printRoutes());

  try {
    const address = await app.listen({ port: PORT, host: HOST });
    app.log.info(`Servidor rodando em ${address}`);
  } catch (err) {
    app.log.error(err, "Erro ao iniciar o servidor");
    process.exit(1);
  }
}

bootstrap();
