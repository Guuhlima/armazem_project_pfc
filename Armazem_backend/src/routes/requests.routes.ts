import type { FastifyInstance } from 'fastify';
import {
  listRequests,
  getRequestById,
  approveRequest,
  rejectRequest,
} from '../controllers/requests.controller';

export async function requestsRoutes(app: FastifyInstance) {
  // todas exigem auth
  app.addHook('onRequest', app.authenticate);

  // prefix opcional será aplicado no server.ts; aqui caminhos relativos:
  app.get('/', listRequests);            // GET /requests
  app.get('/:id', getRequestById);       // GET /requests/:id
  app.post('/:id/approve', approveRequest); // POST /requests/:id/approve
  app.post('/:id/reject', rejectRequest);   // POST /requests/:id/reject
}
