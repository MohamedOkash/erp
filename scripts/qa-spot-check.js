const http = require('http');

async function loginAndCheck() {
  const loginData = JSON.stringify({ username: 'admin', password: 'password123' });
  // If not password123, try 123456
  let token = null;

  for (const pw of ['123456', 'password123', 'admin']) {
    const payload = JSON.stringify({ username: 'admin', password: pw });
    token = await new Promise((resolve) => {
      const req = http.request(
        'http://localhost:3000/api/v1/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              resolve(parsed.token || null);
            } catch {
              resolve(null);
            }
          });
        }
      );
      req.on('error', () => resolve(null));
      req.write(payload);
      req.end();
    });
    if (token) break;
  }

  if (!token) {
    console.error('Failed to get auth token from localhost:3000');
    return;
  }

  console.log('Logged in successfully, token retrieved.');

  const endpoints = [
    '/branches',
    '/projects',
    '/work-items',
    '/work-categories',
    '/work-areas',
    '/employees',
    '/production',
    '/transfers',
    '/control-cards',
    '/attendance',
    '/costs',
    '/alert-rules',
  ];

  for (const ep of endpoints) {
    await new Promise((resolve) => {
      const req = http.request(
        `http://localhost:3000/api/v1${ep}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => {
            console.log(`[${res.statusCode}] GET /api/v1${ep} (bytes: ${body.length})`);
            resolve();
          });
        }
      );
      req.on('error', (err) => {
        console.error(`[ERROR] GET /api/v1${ep}: ${err.message}`);
        resolve();
      });
      req.end();
    });
  }
}

loginAndCheck();
