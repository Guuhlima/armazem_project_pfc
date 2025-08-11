import Fastify from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { equipamentosRoutes } from './routes/equipment.routes'
import { usuariosRoutes } from './routes/user.routes'            // <- remover .js
import { transferenciasRoutes } from './routes/transfer.routes'
import { estoquesRoutes } from './routes/stock.routes'            // <- adicionar ./
import { estoqueItensRoutes } from './routes/stockItens.routes'   // <- adicionar ./
import cors from '@fastify/cors'
import dotenv from 'dotenv'

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

const app = Fastify().withTypeProvider<TypeBoxTypeProvider>();

await app.register(cors, {
  origin: 'http://localhost:3000',
});

app.register(equipamentosRoutes);
app.register(usuariosRoutes);
// app.register(historicoRoutes);
app.register(transferenciasRoutes);
app.register(estoquesRoutes);
app.register(estoqueItensRoutes);

app.listen({ port: PORT }, (err, address) => {
  if (err) {
    console.error('Erro ao iniciar o servidor:', err);
    process.exit(1);
  }
  console.log(`🚀 Servidor rodando em ${address}`);

  //await startConsumer();
});
