import https from 'node:https';
import Fastify from 'fastify';
import webpush from 'web-push';

const fastify = Fastify({
  // Set this to true for detailed logging:
  logger: false
});

fastify.post("/api/debug/headers", async function(request, reply) {
  reply.header('Access-Control-Allow-Origin', process.env['ACCESS_CONTROL_ALLOW_ORIGIN']);

  try {
    const apiBody = JSON.parse(request.body);
    const webpushRequest = webpush.generateRequestDetails(apiBody.subscription, apiBody.payload);
    reply.send(JSON.stringify(webpushRequest.headers));
  } catch (err) {
    console.error(err);
    reply.code(500);
    reply.send(`Internal server error.`);
  }
})

fastify.post("/api/debug/body", async function(request, reply) {
  reply.header('Access-Control-Allow-Origin', process.env['ACCESS_CONTROL_ALLOW_ORIGIN']);

  try {
    const apiBody = JSON.parse(request.body);
    const webpushRequest = webpush.generateRequestDetails(apiBody.subscription, apiBody.payload);
    reply.send(webpushRequest.body);
  } catch (err) {
    console.error(err);
    reply.code(500);
    reply.send(`Internal server error.`);
  }
})

fastify.post("/api/v3/sendpush", async function(request, reply) {
  const apiBody = JSON.parse(request.body);

  const payload = Buffer.from(apiBody.body, 'base64');
  apiBody.headers['Content-Type'] = 'application/octet-stream';
  apiBody.headers['Content-Length'] = payload.length;
  const pushRequest = https.request(apiBody.endpoint, {
    headers: apiBody.headers
  }, (pushResponse) => {
    let responseText = '';

    pushResponse.on('data', function(chunk) {
      responseText += chunk;
    });

    pushResponse.on('end', function() {
      console.log(`Request complete: `, pushResponse.statusCode, pushResponse.headers, responseText);
      reply.header('Access-Control-Allow-Origin', process.env['ACCESS_CONTROL_ALLOW_ORIGIN']);
      if (pushResponse.statusCode) {
        reply.code(pushResponse.statusCode);
      }
      reply.send(responseText);
    });
  });
  pushRequest.write(payload);
  pushRequest.end();
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
