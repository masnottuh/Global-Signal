# Global Signal Website

Separating Signal from Noise — A modern, responsive website for Global Signal's financial analysis services.

## Overview

This website showcases Global Signal's mission to provide high-quality financial analysis using mathematically rigorous, academically sound models. The site features:

- **Official Brand Design**: Implements Global Signal Brand Guide v2.0 (Designer: Madison Paiement)
- **Interactive Signal Charts**: Chart.js-powered visualizations of EMA, Volatility, Momentum, and RSI signals
- **Responsive Layout**: Optimized for desktop and mobile devices
- **Backend API**: Node.js/Express server with signal processing capabilities
- **Contact Form**: Validated form with rate limiting and input sanitization

## Brand Guide Implementation

Based on **Global Signal Brand Guide v2.0** (November 14, 2025)

### Primary Color Palette
| Color | Hex | RGB | Usage |
|-------|-----|-----|-------|
| **Neon Green** | `#CCFF00` | 204, 255, 0 | Primary accent, buttons, highlights |
| **Dark Emerald** | `#182825` | 24, 40, 37 | Primary background |
| **Billiard** | `#2F5951` | 47, 89, 81 | Secondary backgrounds, hover states |
| **Champagne** | `#EAEDB0` | 234, 237, 176 | Primary text |

### Secondary Color Palette (Use Sparingly for Emphasis)
| Color | Hex | RGB | Usage |
|-------|-----|-----|-------|
| **Copper** | `#FD7735` | 253, 119, 53 | Urgency, errors, accent |
| **Gold** | `#FFE4B3` | 255, 228, 179 | Warmth, highlights |
| **Amethyst** | `#D5CCFF` | 213, 204, 255 | Chart accents |
| **Lavender** | `#B2A1FD` | 178, 161, 253 | Chart accents |

### Brand Personality
- **Confident**: Bold clarity in communication
- **Modern**: Ahead of the curve with relevance & innovation
- **Strategic**: Grounded in insight and long-term thinking
- **Reliable**: Consistency and trust at every touchpoint
- **Minimalist**: Clean, professional presentation

## Tech Stack

- **Frontend**: HTML5, CSS3 (Flexbox/Grid), Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Database**: SQLite (via better-sqlite3) or in-memory storage
- **Charts**: Chart.js
- **Security**: Helmet.js, express-rate-limit, express-validator

## Project Structure

```
website/
├── server.js                 # Express server with API endpoints
├── package.json              # Dependencies and scripts
├── .env.example              # Environment variables template
├── README.md                 # This file
└── public/
    ├── index.html            # Main SPA page
    ├── privacy.html          # Privacy policy
    ├── terms.html            # Terms of service
    ├── css/
    │   └── styles.css        # Brand-compliant styles
    ├── js/
    │   └── app.js            # Frontend JavaScript
    └── assets/
        └── images/           # Logo and brand assets
```

## Installation

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Local Development

1. **Clone and navigate to the project:**
   ```bash
   cd website
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables (optional):**
   ```bash
   cp .env.example .env
   # Edit .env with your data endpoints
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open in browser:**
   ```
   http://localhost:3000
   ```

### Production

```bash
npm start
```

## Configuration

### Data Endpoints

Configure your live data sources in `.env` or directly in `server.js`:

```env
MARKET_DATA_ENDPOINT=https://your-api.com/market-data
ECONOMIC_INDICATORS_ENDPOINT=https://your-api.com/indicators
ALTERNATIVE_DATA_ENDPOINT=https://your-api.com/alt-data
SOCIAL_SENTIMENT_ENDPOINT=https://your-api.com/sentiment
```

The server will automatically fetch data from these endpoints every hour and process them into signals.

### Signal Processing

The backend implements the following mathematically rigorous signals:

1. **Exponential Moving Average (EMA)**
   - Formula: `EMA_t = α × Price_t + (1 - α) × EMA_{t-1}`
   - Alpha: `α = 2 / (period + 1)`

2. **Historical Volatility**
   - Standard deviation of log returns, annualized by √252
   - Formula: `σ = sqrt(Σ(r_i - μ)² / (n-1)) × √252`

3. **Momentum (Rate of Change)**
   - Formula: `ROC = (Price_t - Price_{t-n}) / Price_{t-n} × 100`

4. **Relative Strength Index (RSI)**
   - Formula: `RSI = 100 - (100 / (1 + RS))`
   - RS = Average Gain / Average Loss

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/signals` | GET | Retrieve processed signals |
| `/api/signals/demo` | GET | Get signal structure information |
| `/api/contact` | POST | Submit contact form |
| `/api/fetch-data` | POST | Manually trigger data fetch |
| `/api/health` | GET | Health check endpoint |

## Deployment

### Vercel

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Set environment variables in Vercel dashboard.

### Heroku

1. Create Heroku app:
   ```bash
   heroku create global-signal
   ```

2. Deploy:
   ```bash
   git push heroku main
   ```

3. Set environment variables:
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set MARKET_DATA_ENDPOINT=https://...
   ```

### Railway / Render

1. Connect your GitHub repository
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Configure environment variables in dashboard

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Security Features

- **Helmet.js**: Security headers including CSP
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: express-validator for form sanitization
- **CORS**: Configured for cross-origin requests
- **No Tracking**: Minimal cookies, no third-party analytics

## Brand Assets

Logo files are sourced from the `GS Logos` folder:
- Primary Logo: Hero section and main branding
- Secondary Logo: Navigation and footer
- Watermark: Favicon and app icons

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

This is a proprietary project. Please contact info@globalsignal.org for inquiries.

## License

Proprietary - All rights reserved.

---

**Global Signal** — Separating Signal from Noise
