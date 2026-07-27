const http = require('http');

const req = http.request('http://localhost:3002/api/qa/productivity/settings', { method: 'GET' }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(res.statusCode, data));
});
req.on('error', console.error);
req.end();
