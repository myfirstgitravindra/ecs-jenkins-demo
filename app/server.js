const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>ECS Blue/Green Demo</title></head>
      <body style="font-family: Arial; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
        <h1>🚀 ECS Blue/Green Deployment Success!</h1>
        <p>Container ID: ${require('os').hostname()}</p>
        <p>Version: 1.0.0</p>
        <p>Deployed: ${new Date().toLocaleString()}</p>
        <p style="font-size: 12px; margin-top: 50px;">Blue/Green Deployment with Public IP</p>
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
