const express = require('express');
const app = express();
const port = 3000;
const buildVersion = process.env.BUILD_NUMBER || '1.0.0';

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>ECS CI/CD Demo</title></head>
      <body style="font-family: Arial; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
        <h1>🚀 ECS CI/CD Pipeline Success!</h1>
        <p>Container ID: ${require('os').hostname()}</p>
        <p style="font-size: 24px; font-weight: bold;">Version: ${buildVersion}</p>
        <p>Deployed: ${new Date().toLocaleString()}</p>
        <p style="font-size: 12px; margin-top: 50px;">Auto-deployed with Jenkins</p>
      </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
