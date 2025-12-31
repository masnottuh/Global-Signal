/**
 * Global Signal - Backend Server
 * 
 * A Node.js/Express backend that:
 * - Serves the static frontend
 * - Provides API endpoints for signals data
 * - Periodically fetches and processes data from configured endpoints
 * - Stores processed signals in SQLite database
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * ========================
 * 
 * Local Development:
 *   1. npm install
 *   2. npm run dev (with nodemon) or npm start
 *   3. Visit http://localhost:3000
 * 
 * Heroku Deployment:
 *   1. heroku create global-signal
 *   2. git push heroku main
 *   3. heroku config:set NODE_ENV=production
 * 
 * Vercel Deployment:
 *   1. Install Vercel CLI: npm i -g vercel
 *   2. Run: vercel
 *   3. Follow prompts
 * 
 * Railway/Render:
 *   1. Connect GitHub repository
 *   2. Set build command: npm install
 *   3. Set start command: npm start
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ====================
// DATA SOURCE CONFIGURATION
// ====================
// Configure your data source endpoints here
// The system will ping these endpoints periodically to fetch live data

const DATA_ENDPOINTS = {
    // Primary market data endpoint
    marketData: process.env.MARKET_DATA_ENDPOINT || null,
    
    // Economic indicators endpoint
    economicIndicators: process.env.ECONOMIC_INDICATORS_ENDPOINT || null,
    
    // Alternative data sources
    alternativeData: process.env.ALTERNATIVE_DATA_ENDPOINT || null,
    
    // Social sentiment endpoint
    socialSentiment: process.env.SOCIAL_SENTIMENT_ENDPOINT || null,
};

// ====================
// DATABASE SETUP
// ====================
// Using in-memory storage for demo; switch to SQLite for persistence

let Database;
let db;

try {
    Database = require('better-sqlite3');
    db = new Database(':memory:'); // Use './signals.db' for persistence
    
    // Create signals table
    db.exec(`
        CREATE TABLE IF NOT EXISTS signals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            signal_type TEXT NOT NULL,
            asset TEXT NOT NULL,
            value REAL NOT NULL,
            timestamp INTEGER NOT NULL,
            metadata TEXT,
            created_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
    `);
    
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_signals_type ON signals(signal_type);
        CREATE INDEX IF NOT EXISTS idx_signals_asset ON signals(asset);
        CREATE INDEX IF NOT EXISTS idx_signals_timestamp ON signals(timestamp);
    `);
    
    console.log('Database initialized successfully');
} catch (err) {
    console.log('SQLite not available, using in-memory storage');
    db = null;
}

// In-memory signal storage (fallback)
let signalCache = {
    ema: [],
    volatility: [],
    momentum: [],
    rsi: []
};

// ====================
// MATHEMATICAL SIGNAL PROCESSING
// ====================
// These functions implement academically rigorous, reproducible calculations

/**
 * Exponential Moving Average (EMA)
 * Formula: EMA_t = α × Price_t + (1 - α) × EMA_{t-1}
 * where α = 2 / (period + 1)
 * 
 * @param {number[]} data - Array of price data
 * @param {number} period - EMA period
 * @returns {number[]} - Array of EMA values
 */
function calculateEMA(data, period = 20) {
    if (data.length < period) return [];
    
    const alpha = 2 / (period + 1);
    const ema = [];
    
    // Initialize with SMA for first value
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += data[i];
    }
    ema.push(sum / period);
    
    // Calculate EMA for remaining values
    for (let i = period; i < data.length; i++) {
        const current = alpha * data[i] + (1 - alpha) * ema[ema.length - 1];
        ema.push(current);
    }
    
    return ema;
}

/**
 * Historical Volatility (Standard Deviation of Returns)
 * Formula: σ = sqrt(Σ(r_i - μ)² / (n - 1))
 * where r_i = ln(P_i / P_{i-1}) are log returns
 * 
 * @param {number[]} data - Array of price data
 * @param {number} period - Lookback period
 * @returns {number[]} - Array of volatility values (annualized)
 */
function calculateVolatility(data, period = 20) {
    if (data.length < period + 1) return [];
    
    const volatility = [];
    
    for (let i = period; i < data.length; i++) {
        const returns = [];
        for (let j = i - period + 1; j <= i; j++) {
            if (data[j - 1] > 0) {
                returns.push(Math.log(data[j] / data[j - 1]));
            }
        }
        
        if (returns.length > 1) {
            const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
            const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
            // Annualize: multiply by sqrt(252 trading days)
            const annualizedVol = Math.sqrt(variance) * Math.sqrt(252) * 100;
            volatility.push(annualizedVol);
        }
    }
    
    return volatility;
}

/**
 * Momentum (Rate of Change)
 * Formula: ROC = (Price_t - Price_{t-n}) / Price_{t-n} × 100
 * 
 * @param {number[]} data - Array of price data
 * @param {number} period - Lookback period
 * @returns {number[]} - Array of momentum values (percentage)
 */
function calculateMomentum(data, period = 14) {
    if (data.length < period + 1) return [];
    
    const momentum = [];
    
    for (let i = period; i < data.length; i++) {
        if (data[i - period] > 0) {
            const roc = ((data[i] - data[i - period]) / data[i - period]) * 100;
            momentum.push(roc);
        }
    }
    
    return momentum;
}

/**
 * Relative Strength Index (RSI)
 * Formula: RSI = 100 - (100 / (1 + RS))
 * where RS = Average Gain / Average Loss over n periods
 * 
 * @param {number[]} data - Array of price data
 * @param {number} period - RSI period (typically 14)
 * @returns {number[]} - Array of RSI values (0-100)
 */
function calculateRSI(data, period = 14) {
    if (data.length < period + 1) return [];
    
    const rsi = [];
    const gains = [];
    const losses = [];
    
    // Calculate price changes
    for (let i = 1; i < data.length; i++) {
        const change = data[i] - data[i - 1];
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    // Calculate initial averages
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    if (avgLoss === 0) {
        rsi.push(100);
    } else {
        rsi.push(100 - (100 / (1 + avgGain / avgLoss)));
    }
    
    // Calculate subsequent RSI values using smoothed averages
    for (let i = period; i < gains.length; i++) {
        avgGain = (avgGain * (period - 1) + gains[i]) / period;
        avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
        
        if (avgLoss === 0) {
            rsi.push(100);
        } else {
            rsi.push(100 - (100 / (1 + avgGain / avgLoss)));
        }
    }
    
    return rsi;
}

// ====================
// DATA FETCHING SERVICE
// ====================

/**
 * Fetch data from configured endpoints
 * This function is called periodically by the scheduler
 */
async function fetchAndProcessData() {
    console.log(`[${new Date().toISOString()}] Starting data fetch cycle...`);
    
    for (const [source, endpoint] of Object.entries(DATA_ENDPOINTS)) {
        if (!endpoint) {
            console.log(`[${source}] No endpoint configured, skipping...`);
            continue;
        }
        
        try {
            console.log(`[${source}] Fetching from ${endpoint}...`);
            const response = await fetch(endpoint);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Process the fetched data
            await processDataSource(source, data);
            
            console.log(`[${source}] Successfully processed data`);
        } catch (error) {
            console.error(`[${source}] Error fetching data:`, error.message);
        }
    }
    
    console.log(`[${new Date().toISOString()}] Data fetch cycle complete`);
}

/**
 * Process data from a specific source and store signals
 */
async function processDataSource(source, data) {
    // This function should be customized based on the structure of your data sources
    // For now, it expects an array of price data with timestamps
    
    if (!Array.isArray(data) || data.length === 0) {
        console.log(`[${source}] No valid data to process`);
        return;
    }
    
    // Extract prices from data (customize based on your data structure)
    const prices = data.map(d => d.price || d.close || d.value).filter(p => typeof p === 'number');
    const timestamps = data.map(d => d.timestamp || d.time || Date.now());
    const asset = data[0]?.asset || data[0]?.symbol || 'UNKNOWN';
    
    if (prices.length < 20) {
        console.log(`[${source}] Insufficient data points: ${prices.length}`);
        return;
    }
    
    // Calculate signals
    const emaValues = calculateEMA(prices, 20);
    const volatilityValues = calculateVolatility(prices, 20);
    const momentumValues = calculateMomentum(prices, 14);
    const rsiValues = calculateRSI(prices, 14);
    
    // Store in database or cache
    const timestamp = Date.now();
    
    if (db) {
        const stmt = db.prepare('INSERT INTO signals (signal_type, asset, value, timestamp, metadata) VALUES (?, ?, ?, ?, ?)');
        
        if (emaValues.length > 0) {
            stmt.run('ema', asset, emaValues[emaValues.length - 1], timestamp, JSON.stringify({ period: 20 }));
        }
        if (volatilityValues.length > 0) {
            stmt.run('volatility', asset, volatilityValues[volatilityValues.length - 1], timestamp, JSON.stringify({ period: 20 }));
        }
        if (momentumValues.length > 0) {
            stmt.run('momentum', asset, momentumValues[momentumValues.length - 1], timestamp, JSON.stringify({ period: 14 }));
        }
        if (rsiValues.length > 0) {
            stmt.run('rsi', asset, rsiValues[rsiValues.length - 1], timestamp, JSON.stringify({ period: 14 }));
        }
    }
}

// ====================
// SCHEDULER SETUP
// ====================

let cron;
try {
    cron = require('node-cron');
    
    // Run data fetch every hour
    cron.schedule('0 * * * *', () => {
        fetchAndProcessData();
    });
    
    console.log('Scheduler initialized: Data fetch runs every hour');
} catch (err) {
    console.log('Scheduler not available, manual triggering only');
}

// ====================
// MIDDLEWARE
// ====================

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    }
}));

// CORS
app.use(cors());

// Compression
app.use(compression());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// ====================
// API ROUTES
// ====================

/**
 * GET /api/signals
 * Retrieve latest signals data
 */
app.get('/api/signals', (req, res) => {
    try {
        const { type, asset, limit = 100 } = req.query;
        
        if (db) {
            let query = 'SELECT * FROM signals';
            const params = [];
            const conditions = [];
            
            if (type) {
                conditions.push('signal_type = ?');
                params.push(type);
            }
            if (asset) {
                conditions.push('asset = ?');
                params.push(asset);
            }
            
            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }
            
            query += ' ORDER BY timestamp DESC LIMIT ?';
            params.push(parseInt(limit));
            
            const signals = db.prepare(query).all(...params);
            res.json({ success: true, data: signals });
        } else {
            // Return cached signals
            res.json({ success: true, data: signalCache });
        }
    } catch (error) {
        console.error('Error fetching signals:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * GET /api/signals/demo
 * Get demo signal data for the signals showcase page
 * Note: This returns example data structure - connect to real endpoints for live data
 */
app.get('/api/signals/demo', (req, res) => {
    try {
        // Generate demo structure showing what the API will return
        // when connected to live data sources
        const demoStructure = {
            info: "Connect data endpoints in server.js DATA_ENDPOINTS to receive live signals",
            availableSignals: [
                {
                    type: "ema",
                    name: "Exponential Moving Average",
                    description: "EMA_t = α × Price_t + (1 - α) × EMA_{t-1}, where α = 2/(period+1)",
                    parameters: { period: 20, alpha: 0.095 }
                },
                {
                    type: "volatility",
                    name: "Historical Volatility",
                    description: "σ = sqrt(Σ(r_i - μ)² / (n-1)) annualized by √252",
                    parameters: { period: 20 }
                },
                {
                    type: "momentum",
                    name: "Rate of Change",
                    description: "ROC = (Price_t - Price_{t-n}) / Price_{t-n} × 100",
                    parameters: { period: 14 }
                },
                {
                    type: "rsi",
                    name: "Relative Strength Index",
                    description: "RSI = 100 - (100 / (1 + RS)), where RS = AvgGain/AvgLoss",
                    parameters: { period: 14 }
                }
            ],
            endpoints: DATA_ENDPOINTS,
            lastFetch: null
        };
        
        res.json({ success: true, data: demoStructure });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

/**
 * POST /api/contact
 * Handle contact form submissions
 */
app.post('/api/contact',
    [
        body('name').trim().isLength({ min: 1, max: 100 }).escape(),
        body('email').isEmail().normalizeEmail(),
        body('message').trim().isLength({ min: 1, max: 2000 }).escape()
    ],
    (req, res) => {
        const errors = validationResult(req);
        
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        
        const { name, email, message } = req.body;
        
        // Log the contact submission (in production, send email or store in database)
        console.log('Contact form submission:', { name, email, message: message.substring(0, 50) + '...' });
        
        // TODO: Integrate with email service (SendGrid, Mailgun, etc.)
        // await sendEmail({ to: 'info@globalsignal.com', from: email, subject: `Contact from ${name}`, body: message });
        
        res.json({ success: true, message: 'Thank you for your message. We will respond shortly.' });
    }
);

/**
 * POST /api/fetch-data
 * Manually trigger data fetch (admin use)
 */
app.post('/api/fetch-data', async (req, res) => {
    try {
        await fetchAndProcessData();
        res.json({ success: true, message: 'Data fetch initiated' });
    } catch (error) {
        console.error('Error triggering data fetch:', error);
        res.status(500).json({ success: false, error: 'Failed to initiate data fetch' });
    }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: db ? 'connected' : 'in-memory',
        endpoints: Object.fromEntries(
            Object.entries(DATA_ENDPOINTS).map(([k, v]) => [k, v ? 'configured' : 'not configured'])
        )
    });
});

// ====================
// CATCH-ALL ROUTE
// ====================

// Serve index.html for all non-API routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ====================
// ERROR HANDLING
// ====================

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
});

// ====================
// START SERVER
// ====================

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ██████╗ ██╗      ██████╗ ██████╗  █████╗ ██╗                ║
║  ██╔════╝ ██║     ██╔═══██╗██╔══██╗██╔══██╗██║                ║
║  ██║  ███╗██║     ██║   ██║██████╔╝███████║██║                ║
║  ██║   ██║██║     ██║   ██║██╔══██╗██╔══██║██║                ║
║  ╚██████╔╝███████╗╚██████╔╝██████╔╝██║  ██║███████╗           ║
║   ╚═════╝ ╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝           ║
║                                                               ║
║  ███████╗██╗ ██████╗ ███╗   ██╗ █████╗ ██╗                    ║
║  ██╔════╝██║██╔════╝ ████╗  ██║██╔══██╗██║                    ║
║  ███████╗██║██║  ███╗██╔██╗ ██║███████║██║                    ║
║  ╚════██║██║██║   ██║██║╚██╗██║██╔══██║██║                    ║
║  ███████║██║╚██████╔╝██║ ╚████║██║  ██║███████╗               ║
║  ╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝               ║
║                                                               ║
║         Separating Signal from Noise                          ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

Server running on port ${PORT}
Environment: ${process.env.NODE_ENV || 'development'}
Health check: http://localhost:${PORT}/api/health
    `);
});

module.exports = app;
