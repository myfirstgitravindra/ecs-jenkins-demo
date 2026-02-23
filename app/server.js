const express = require('express');
const mysql = require('mysql2');
const app = express();
const port = 3000;
const buildVersion = process.env.BUILD_NUMBER || '1.0.0';

// Database connection - USING YOUR ACTUAL ENDPOINT
const pool = mysql.createPool({
    host: 'myapp-db.cel08uq0q9eg.us-east-1.rds.amazonaws.com',
    user: 'admin',
    password: 'admin12345',
    database: 'appdb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const promisePool = pool.promise();

// Initialize database
async function initDB() {
    try {
        await promisePool.query(`CREATE DATABASE IF NOT EXISTS appdb`);
        await promisePool.query(`USE appdb`);
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS visits (
                id INT AUTO_INCREMENT PRIMARY KEY,
                container_id VARCHAR(255),
                visit_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                version VARCHAR(50)
            )
        `);
        console.log('✅ Database initialized');
    } catch (err) {
        console.error('Database init error:', err);
    }
}

initDB();

app.get('/', async (req, res) => {
    try {
        const containerId = require('os').hostname();
        
        // Record visit
        await promisePool.query(
            'INSERT INTO visits (container_id, version) VALUES (?, ?)',
            [containerId, buildVersion]
        );
        
        // Get visit count
        const [rows] = await promisePool.query('SELECT COUNT(*) as count FROM visits');
        const visitCount = rows[0].count;
        
        // Get recent visits
        const [recent] = await promisePool.query(
            'SELECT * FROM visits ORDER BY visit_time DESC LIMIT 5'
        );
        
        const recentList = recent.map(v => 
            `<li>${v.visit_time} - Container: ${v.container_id.substring(0,8)} - v${v.version}</li>`
        ).join('');

        res.send(`
            <html>
                <head><title>ECS App with RDS MySQL</title></head>
                <body style="font-family: Arial; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                    <h1>🚀 ECS + RDS MySQL</h1>
                    <p>Container ID: ${containerId}</p>
                    <p>Version: ${buildVersion}</p>
                    <p>Total Visits: ${visitCount}</p>
                    <p>Database: Connected ✅</p>
                    <p>Endpoint: myapp-db.cel08uq0q9eg.us-east-1.rds.amazonaws.com</p>
                    <p>Deployed: ${new Date().toLocaleString()}</p>
                    
                    <h3>Recent Visits:</h3>
                    <ul style="list-style: none; padding: 0;">
                        ${recentList}
                    </ul>
                    
                    <p style="font-size: 12px; margin-top: 50px;">
                        Data persists across restarts! 🗄️
                    </p>
                </body>
            </html>
        `);
    } catch (err) {
        console.error(err);
        res.status(500).send('Database error: ' + err.message);
    }
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.listen(port, () => {
    console.log(`App running on port ${port}`);
});
