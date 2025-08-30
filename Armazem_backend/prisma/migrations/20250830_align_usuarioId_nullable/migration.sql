-- Garante a coluna como NULLABLE (não torne NOT NULL aqui)
ALTER TABLE "EstoqueTelegramNotify" ADD COLUMN IF NOT EXISTS "usuarioId" INTEGER;

-- Cria a FK apontando para a tabela correta: "usuarios"
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'EstoqueTelegramNotify_usuarioId_fkey'
  ) THEN
    ALTER TABLE "EstoqueTelegramNotify"
      ADD CONSTRAINT "EstoqueTelegramNotify_usuarioId_fkey"
      FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
