import { FastifyInstance } from "fastify";
import { getUserStockRole, updateUserStockRole, listUserStocks } from "../controllers/adminUserStock.controller";

export async function adminUserStockRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.get("/admin/usuarios/:userId/estoques/:estoqueId/role", {
    preHandler: [app.rbac.requirePerm("user:manage")],
    handler: getUserStockRole,
  });

  app.put("/admin/usuarios/:userId/estoques/:estoqueId/role", {
    preHandler: [app.rbac.requirePerm("user:manage")],
    handler: updateUserStockRole,
  });

  app.get("/admin/usuarios/:userId/estoques", {
    preHandler: [app.rbac.requirePerm("user:manage")],
    handler: listUserStocks,
  });
}
