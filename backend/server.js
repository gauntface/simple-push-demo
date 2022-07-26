import fetch from 'node-fetch';
import Fastify from 'fastify';

const fastify = Fastify({
  // Set this to true for detailed logging:
  logger: false
});

fastify.post("/api/v3/sendpush", async function(request, reply) {
  const body = JSON.parse(request.body);

  await fetch(body.endpoint, {
      headers: body.headers,
  });

  reply.header('Access-Control-Allow-Origin', process.env['ACCESS_CONTROL_ALLOW_ORIGIN']);
  reply.code(200);
  reply.send("ok");
});

const start = async () => {
  try {
    const address = await fastify.listen({
      port: process.env.PORT ? parseInt(process.env.PORT, 10) : undefined,
    });
    console.log(`Your app is listening on ${address}`);
  } catch (err) {
    process.exit(1)
  }
}
start();
