import fp from "fastify-plugin";
import type { FastifyPluginCallback, FastifyRequest } from "fastify";

type Role = string;
type Permission = string;
type UserId = string | number;

const userRolesKey = (userId: UserId) => `user:${String(userId)}:roles`;
const rolePermsKey = (role: Role) => `role:${role}:perms`;

declare module "fastify" {
  interface FastifyInstance {
    rbac: {
      addRoleToUser(userId: UserId, role: Role): Promise<void>;
      removeRoleFromUser(userId: UserId, role: Role): Promise<void>;
      grantPermToRole(role: Role, perm: Permission): Promise<void>;
      revokePermFromRole(role: Role, perm: Permission): Promise<void>;
      userHasPermission(userId: UserId, perm: Permission): Promise<boolean>;
      requirePerm(perm: Permission): (req: FastifyRequest) => Promise<void>;
    };
  }
  interface FastifyRequest {
    hasPermission?(perm: Permission): Promise<boolean>;
  }
}

const rbacPlugin: FastifyPluginCallback = (fastify, _opts, done) => {
  const redis = fastify.redis as import("ioredis").Redis;

  async function userHasPermission(userId: UserId, needed: Permission) {
    const roles = await redis.smembers(userRolesKey(userId));
    if (!roles.length) return false;
    const pipeline = redis.pipeline();
    roles.forEach((r) => pipeline.sismember(rolePermsKey(r), needed));
    const results = await pipeline.exec();
    return results?.some(([, ok]) => ok === 1) ?? false;
  }

  fastify.decorate("rbac", {
    async addRoleToUser(userId: UserId, role: Role) {
      await redis.sadd(userRolesKey(userId), role);
    },
    async removeRoleFromUser(userId: UserId, role: Role) {
      await redis.srem(userRolesKey(userId), role);
    },
    async grantPermToRole(role: Role, perm: Permission) {
      await redis.sadd(rolePermsKey(role), perm);
    },
    async revokePermFromRole(role: Role, perm: Permission) {
      await redis.srem(rolePermsKey(role), perm);
    },
    userHasPermission,
    requirePerm(perm: Permission) {
      return async (req: FastifyRequest) => {
        const uid = (req.user as any)?.id;

        const permsFromToken: string[] = (req.user as any)?.permissoes || [];
        if (permsFromToken.includes(perm)) return;

        if (uid == null) {
          throw fastify.httpErrors.unauthorized('unauthorized');
        }
        const ok = await userHasPermission(uid, perm);
        if (!ok) {
          throw fastify.httpErrors.forbidden(`missing permission: ${perm}`);
        }
      };
    }

  });

  fastify.addHook("onRequest", async (req) => {
    req.hasPermission = async (perm: Permission) => {
      const uid = req.user?.id;
      if (uid == null) return false;
      return userHasPermission(uid, perm);
    };
  });

  done();
};


export default fp(rbacPlugin, { name: "rbac-plugin" });
