const app = require('./app');
const http = require('http');
const { prisma } = require('./config/prismaClient');

let server;

async function runTest() {
  await prisma.$connect();
  
  server = app.listen(5001);
  console.log('Server started on port 5001');

  // Login SuperAdmin
  const superAdmin = await prisma.user.findFirst({
    where: { role: 'SuperAdmin' }
  });

  if (!superAdmin) {
    console.log('SuperAdmin not found in DB!');
    server.close();
    process.exit(1);
  }

  console.log('SuperAdmin found:', superAdmin.email);

  // Login request
  const loginRes = await makeRequest('/api/auth/login', 'POST', {
    email: superAdmin.email,
    password: process.env.SUPER_ADMIN_PASSWORD || 'SuperAdminPassword123!'
  });

  console.log('Login status:', loginRes.status, 'Duration:', loginRes.duration, 'ms');
  const cookie = loginRes.cookies ? loginRes.cookies[0] : null;

  // Now measure PUT /api/auth/change-password
  for (let i = 1; i <= 3; i++) {
    console.log(`\n--- Run ${i} ---`);
    const tStart = Date.now();
    const passRes = await makeRequest('/api/auth/change-password', 'PUT', {
      currentPassword: process.env.SUPER_ADMIN_PASSWORD || 'SuperAdminPassword123!',
      newPassword: process.env.SUPER_ADMIN_PASSWORD || 'SuperAdminPassword123!'
    }, cookie);
    console.log(`PUT /api/auth/change-password status: ${passRes.status}, duration: ${passRes.duration} ms`);
    console.log('Body:', passRes.body);
  }

  server.close();
  await prisma.$disconnect();
}

function makeRequest(path, method, body, cookie = null) {
  return new Promise((resolve) => {
    const start = Date.now();
    const postData = JSON.stringify(body);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    };
    if (cookie) {
      headers['Cookie'] = cookie;
    }

    const req = http.request({
      hostname: 'localhost',
      port: 5001,
      path,
      method,
      headers
    }, (res) => {
      let data = '';
      const cookies = res.headers['set-cookie'];
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - start;
        try {
          resolve({ status: res.statusCode, duration, cookies, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, duration, cookies, body: data });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ status: 500, duration: Date.now() - start, error: e.message });
    });

    req.write(postData);
    req.end();
  });
}

runTest().catch(console.error);
