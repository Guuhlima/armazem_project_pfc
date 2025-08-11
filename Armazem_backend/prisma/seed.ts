import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.permissao.createMany({
    data: [
      { nome: 'SUPER-ADMIN' },
      { nome: 'ADMIN' },
      { nome: 'USER-EQUIP-TRANSFER' },
      { nome: 'USER-EQUIPAMENTOS'},
      { nome: 'usuarioPadrão' }
    ],
    skipDuplicates: true,
  });
}

main().finally(() => prisma.$disconnect());
