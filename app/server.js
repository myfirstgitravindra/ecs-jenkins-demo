const express = require('express');
const mysql = require('mysql2');
const app = express();
const port = 3000;
const buildVersion = process.env.BUILD_NUMBER || '1.0.0';

// Database connection
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
        
        // Get stats
        const [totalRows] = await promisePool.query('SELECT COUNT(*) as count FROM visits');
        const totalVisits = totalRows[0].count;
        
        const [todayRows] = await promisePool.query(
            'SELECT COUNT(*) as count FROM visits WHERE DATE(visit_time) = CURDATE()'
        );
        const todayVisits = todayRows[0].count;
        
        const [uniqueRows] = await promisePool.query(
            'SELECT COUNT(DISTINCT container_id) as count FROM visits'
        );
        const uniqueContainers = uniqueRows[0].count;
        
        const [recentRows] = await promisePool.query(
            'SELECT * FROM visits ORDER BY visit_time DESC LIMIT 5'
        );

        // Generate beautiful HTML
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>DevOps Dashboard | ECS CI/CD Pipeline</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        min-height: 100vh;
                        padding: 20px;
                    }
                    
                    .container {
                        max-width: 1200px;
                        margin: 0 auto;
                    }
                    
                    .header {
                        text-align: center;
                        padding: 40px 0;
                        color: white;
                    }
                    
                    .header h1 {
                        font-size: 3em;
                        margin-bottom: 10px;
                        animation: fadeInDown 1s;
                    }
                    
                    .header p {
                        font-size: 1.2em;
                        opacity: 0.9;
                        animation: fadeInUp 1s;
                    }
                    
                    .stats-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                        gap: 20px;
                        margin-bottom: 30px;
                    }
                    
                    .stat-card {
                        background: rgba(255, 255, 255, 0.95);
                        border-radius: 15px;
                        padding: 25px;
                        text-align: center;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                        transition: transform 0.3s, box-shadow 0.3s;
                        animation: fadeIn 1s;
                    }
                    
                    .stat-card:hover {
                        transform: translateY(-5px);
                        box-shadow: 0 15px 40px rgba(0,0,0,0.3);
                    }
                    
                    .stat-icon {
                        font-size: 3em;
                        margin-bottom: 15px;
                    }
                    
                    .stat-value {
                        font-size: 2.5em;
                        font-weight: bold;
                        color: #667eea;
                        margin-bottom: 5px;
                    }
                    
                    .stat-label {
                        color: #666;
                        font-size: 1em;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    
                    .info-panel {
                        background: rgba(255, 255, 255, 0.95);
                        border-radius: 15px;
                        padding: 30px;
                        margin-bottom: 30px;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                        animation: fadeIn 1s;
                    }
                    
                    .info-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                        gap: 20px;
                    }
                    
                    .info-item {
                        padding: 15px;
                        border-bottom: 1px solid #eee;
                    }
                    
                    .info-label {
                        font-weight: bold;
                        color: #667eea;
                        margin-bottom: 5px;
                    }
                    
                    .info-value {
                        color: #333;
                        font-family: monospace;
                        font-size: 1.1em;
                    }
                    
                    .recent-visits {
                        background: rgba(255, 255, 255, 0.95);
                        border-radius: 15px;
                        padding: 30px;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                        animation: fadeIn 1s;
                    }
                    
                    .recent-visits h3 {
                        color: #333;
                        margin-bottom: 20px;
                        font-size: 1.5em;
                    }
                    
                    table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    
                    th {
                        text-align: left;
                        padding: 12px;
                        background: #667eea;
                        color: white;
                        font-weight: 600;
                    }
                    
                    td {
                        padding: 12px;
                        border-bottom: 1px solid #eee;
                        color: #555;
                    }
                    
                    tr:hover {
                        background: #f5f5f5;
                    }
                    
                    .badge {
                        display: inline-block;
                        padding: 5px 10px;
                        border-radius: 20px;
                        font-size: 0.8em;
                        font-weight: bold;
                    }
                    
                    .badge-success {
                        background: #48bb78;
                        color: white;
                    }
                    
                    .footer {
                        text-align: center;
                        padding: 30px 0;
                        color: white;
                        opacity: 0.8;
                    }
                    
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    
                    @keyframes fadeInDown {
                        from {
                            opacity: 0;
                            transform: translateY(-20px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    
                    @keyframes fadeInUp {
                        from {
                            opacity: 0;
                            transform: translateY(20px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    
                    @media (max-width: 768px) {
                        .header h1 {
                            font-size: 2em;
                        }
                        
                        .stat-value {
                            font-size: 2em;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🚀 DevOps Pipeline Dashboard</h1>
                        <p>ECS Fargate + RDS MySQL + Jenkins CI/CD</p>
                    </div>
                    
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-icon">👥</div>
                            <div class="stat-value">${totalVisits}</div>
                            <div class="stat-label">Total Visits</div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-icon">📅</div>
                            <div class="stat-value">${todayVisits}</div>
                            <div class="stat-label">Today's Visits</div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-icon">🖥️</div>
                            <div class="stat-value">${uniqueContainers}</div>
                            <div class="stat-label">Active Containers</div>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-icon">🔖</div>
                            <div class="stat-value">v${buildVersion}</div>
                            <div class="stat-label">Current Version</div>
                        </div>
                    </div>
                    
                    <div class="info-panel">
                        <div class="info-grid">
                            <div class="info-item">
                                <div class="info-label">🆔 Container ID</div>
                                <div class="info-value">${containerId}</div>
                            </div>
                            
                            <div class="info-item">
                                <div class="info-label">💾 Database</div>
                                <div class="info-value">
                                    <span class="badge badge-success">Connected ✅</span>
                                </div>
                            </div>
                            
                            <div class="info-item">
                                <div class="info-label">📅 Deployed</div>
                                <div class="info-value">${new Date().toLocaleString()}</div>
                            </div>
                            
                            <div class="info-item">
                                <div class="info-label">🌐 CloudFront</div>
                                <div class="info-value">d1n3cb1k5g57b6.cloudfront.net</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="recent-visits">
                        <h3>📋 Recent Visits</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>Container</th>
                                    <th>Version</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${recentRows.map(v => `
                                    <tr>
                                        <td>${new Date(v.visit_time).toLocaleString()}</td>
                                        <td>${v.container_id.split('.')[0]}</td>
                                        <td><span class="badge badge-success">v${v.version}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="footer">
                        <p>🚀 Deployed via Jenkins CI/CD | 🗄️ RDS MySQL | ⚡ ECS Fargate | 🌐 CloudFront</p>
                        <p style="margin-top: 10px; font-size: 0.9em;">Version v${buildVersion} | Auto-deployed on every git push</p>
                    </div>
                </div>
            </body>
            </html>
        `);
    } catch (err) {
        res.status(500).send(`Error: ${err.message}`);
    }
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.get('/api/visits', async (req, res) => {
    try {
        const [rows] = await promisePool.query('SELECT * FROM visits ORDER BY visit_time DESC LIMIT 10');
        res.json({
            success: true,
            data: rows,
            version: buildVersion
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`🚀 App running on port ${port}`);
    console.log(`📊 Version: v${buildVersion}`);
    console.log(`💾 Database: Connected`);
});
