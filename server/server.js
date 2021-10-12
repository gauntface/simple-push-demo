import fetch from 'node-fetch';
import Fastify from "fastify";

const fastify = Fastify({
  // Set this to true for detailed logging:
  logger: false
});

fastify.post("/api/v3/sendpush", async function(request, reply) {
  const body = JSON.parse(request.body);

  await fetch(body.endpoint, {
      headers: body.headers,
  });

  reply.header('Access-Control-Allow-Origin', process.env['ACCESS_CONTROL']);
  reply.code(200);
  reply.send("ok");
});

// Run the server and report out to the logs
fastify.listen(process.env.PORT, function(err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`Your app is listening on ${address}`);
  fastify.log.info(`server listening on ${address}`);
});
