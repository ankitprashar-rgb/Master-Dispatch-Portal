import https from 'https';
const data = JSON.stringify({ chat_id: '-5206959976', text: "Test from IDE Quality Pulse" });

const options = {
  hostname: 'api.telegram.org',
  port: 443,
  path: '/bot8639080150:AAFeTDcawhgG7vd5kpWAKB1zuXOQMrwD_3Y/sendMessage',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, res => {
  let responseBody = '';
  res.on('data', chunk => responseBody += chunk);
  res.on('end', () => console.log('Response:', responseBody));
});

req.on('error', error => console.error(error));
req.write(data);
req.end();
