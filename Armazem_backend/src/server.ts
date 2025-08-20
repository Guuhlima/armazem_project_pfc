import Fastify from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { equipamentosRoutes } from './routes/equipment.routes'
import { usuariosRoutes } from './routes/user.routes'
import { transferenciasRoutes } from './routes/transfer.routes'
import { estoquesRoutes } from './routes/stock.routes' 
import { estoqueItensRoutes } from './routes/stockItens.routes'
import { resetPasswordRoutes } from 'routes/resetPassword.routes'
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
app.register(resetPasswordRoutes);

app.listen({ port: PORT }, (err, address) => {
  if (err) {
    console.error('Erro ao iniciar o servidor:', err);
    process.exit(1);
  }
  console.log(`🚀 Servidor rodando em ${address}`);

  //await startConsumer();
});
