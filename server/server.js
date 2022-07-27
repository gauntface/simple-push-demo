import Fastify from 'fastify';
import https from 'https';

// eslint-disable-next-line new-cap
const fastify = Fastify({
  // Set this to true for detailed logging:
  logger: false,
});

fastify.post('/api/v3/sendpush', async function(request, reply) {
  reply.header('Access-Control-Allow-Origin', process.env['ACCESS_CONTROL']);

  const requestData = JSON.parse(request.body);

  const httpsOptions = {
    headers: requestData.headers,
    method: 'POST',
  };
  const urlParts = new URL(requestData.endpoint);
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

  if (requestData.body) {
    pushRequest.write(Buffer.from(requestData.body, 'base64'));
  }

  pushRequest.end();
});

// Run the server and report out to the logs
(async function() {
  const address = await fastify.listen({port: process.env.PORT});
  console.log(`Your app is listening on ${address}`);
})();
