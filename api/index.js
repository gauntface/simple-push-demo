import express from 'express';
import https from 'https';

const app = express();

// Parse body as json when content-type: application/json
app.use(express.json());

// Set-up for CORs
app.use(function(req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', process.env['ACCESS_CONTROL']);
	res.setHeader('Access-Control-Allow-Methods',
		'GET, POST, OPTIONS, PUT, PATCH, DELETE');
	res.setHeader('Access-Control-Allow-Headers', 'content-type');
	next();
});

app.post('/api/v3/sendpush', async function(request, res) {
	try {
		const requestData = request.body;
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
				res.status(pushResponse.statusCode);
				res.send(responseText);
				if (pushResponse.statusCode &&
          (pushResponse.statusCode < 200 || pushResponse.statusCode > 299)) {
					console.log(`Error: ${responseText}`);
				}
			});
		});

		pushRequest.on('error', function(e) {
			console.log(`Error: ${e}`);
			res.status(500);
			res.send(e);
		});

		if (requestData.body) {
			pushRequest.write(Buffer.from(requestData.body, 'base64'));
		}

		pushRequest.end();
	} catch (err) {
		console.error('Failed to process request', err);
		res.status(500);
		res.send('Failed to process request');
	}
});

export default app;
