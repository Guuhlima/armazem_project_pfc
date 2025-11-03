import { Type as T } from "@sinclair/typebox";

export const CountStatusEnum = T.Union([
  T.Literal("PENDING"),
  T.Literal("IN_PROGRESS"),
  T.Literal("RECOUNT_REQUIRED"),
  T.Literal("CLOSED"),
  T.Literal("CANCELED"),
]);

export const CountParamsIdSchema = T.Object({
  id: T.Number({ minimum: 1 }),
});

export const ListTasksQuerySchema = T.Object({
  status: T.Optional(CountStatusEnum),
});

export const StartCountBodySchema = T.Object({
  userId: T.Number({ minimum: 1 }),
});

export const InputCountBodySchema = T.Object({
  userId: T.Number({ minimum: 1 }),
  quantidade: T.Number({ minimum: 0 }),
});

export const CancelCountBodySchema = T.Object({
  motivo: T.Optional(T.String({ maxLength: 255 })),
});
