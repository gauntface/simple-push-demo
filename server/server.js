import Fastify from 'fastify';
import https from 'https';

// eslint-disable-next-line new-cap
const fastify = Fastify({
  // Set this to true for detailed logging:
  logger: false,
});

fastify.post('/api/v3/sendpush', async function(request, reply) {
  const body = JSON.parse(request.body);

  console.log(body);

  reply.header('Access-Control-Allow-Origin', process.env['ACCESS_CONTROL']);

  const httpsOptions = {
    headers: body.headers,
    method: 'POST',
  };
  const urlParts = new URL(body.endpoint);
  httpsOptions.hostname = urlParts.hostname;
  httpsOptions.port = urlParts.port;
  httpsOptions.path = urlParts.pathname;

  const pushRequest = https.request(httpsOptions, function(pushResponse) {
    let responseText = '';

    pushResponse.on('data', function(chunk) {
      responseText += chunk;
    });

    pushResponse.on('end', function() {
      reply.code(pushResponse.statusCode);
      reply.send(responseText);
      if (pushResponse.statusCode &&
        (pushResponse.statusCode < 200 || pushResponse.statusCode > 299)) {
        console.log(`Error: ${responseText}`);
      }
    });
  });

  pushRequest.on('error', function(e) {
    console.log(`Error: ${e}`);
    reply.code(500);
    reply.send(e);
  });

  if (body.body) {
    pushRequest.write(body.body);
  }

  pushRequest.end();
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
