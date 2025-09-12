import type { FastifyInstance } from 'fastify';
import {
  listRequests,
  getRequestById,
  approveRequest,
  rejectRequest,
} from '../controllers/requests.controller';

export async function requestsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate);

  app.get('/', listRequests);
  app.get('/:id', getRequestById);
  app.post('/:id/approve', approveRequest);
  app.post('/:id/reject', rejectRequest);
}
