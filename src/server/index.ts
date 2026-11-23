import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createServer, getServerPort } from '@devvit/web/server';
import { api } from './routes/api';
import { game } from './routes/game';
import { menu } from './routes/menu';

const app = new Hono();
const internal = new Hono();

internal.route('/menu', menu);

app.route('/api', api);
app.route('/api/game', game);
app.route('/internal', internal);

serve({
  fetch: app.fetch,
  createServer,
  port: getServerPort(),
});
