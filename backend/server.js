const fastify = require('fastify')({ logger: true, bodyLimit: 52428800 });
const cors = require('@fastify/cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

fastify.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

const routes = require('./routes');
routes(fastify);

const start = async () => {
  try {
    const port = process.env.PORT || 3001;
    await fastify.listen({ port: port, host: '0.0.0.0' });
    console.log(`Backend server running at http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
