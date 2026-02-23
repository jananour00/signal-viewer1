# Signal Viewer - Stock Market LSTM Prediction

## Quick Start (Local)

### First Time Setup
Run `setup.bat` to install all dependencies:
```
setup.bat
```

### Start the Application

**Option 1: Start Everything (Recommended)**
```
start_all.bat
```
This opens both backend and frontend automatically.

**Option 2: Start Separately**
```
start_backend.bat   # Backend at http://localhost:5000
start_frontend.bat  # Frontend at http://localhost:3000
```

---

## Deploy to Vercel (Frontend + Backend)

Both frontend and backend can be deployed to Vercel.

### Steps:

1. **Install Vercel CLI**:
```
npm i -g vercel
```

2. **Deploy from Root Directory**:
```
vercel
```

3. **Follow Prompts**:
   - Which scope? → Your Vercel username
   - Link to existing project? → No (or create new)
   - Project name? → signal-viewer
   - Directory? → ./
   - Want to modify settings? → No

4. **Configure API URL** (if needed):
   - Edit `frontend/src/services/api.js`
   - Change `API_BASE_URL` to your Vercel backend URL:
   
```
javascript
const API_BASE_URL = 'https://signal-viewer.vercel.app/api';
```

---

## Alternative: Deploy Backend to Heroku

### Steps:

1. **Create Heroku App**:
```
heroku create your-app-name
```

2. **Add Buildpacks**:
```
heroku buildpacks:add heroku/python
```

3. **Deploy**:
```
git push heroku main
```

4. **Set Environment**:
```
heroku config:set FLASK_ENV=production
```

---

## Features

- **LSTM AI Predictions** for stock prices
- **Prediction Periods**: 7 Days, 1 Month, 6 Months
- **Confidence Intervals**: 95% with upper/lower bounds
- **Technical Indicators**: RSI, MACD, SMA, Bollinger Bands

## Usage

1. Open http://localhost:3000 in your browser
2. Go to Stock Market page (📈 tab)
3. Select a stock symbol (e.g., AAPL)
4. Click "Predict" tab
5. Select "LSTM AI" as prediction method
6. Choose prediction period (7 Days, 1 Month, 6 Months)
7. Click Predict button

## Deployment Files

| File | Description |
|------|-------------|
| `vercel.json` | Vercel deployment config |
| `Dockerfile` | Docker container build |
| `docker-compose.yml` | Docker Compose orchestration |
| `Procfile` | Heroku deployment |
| `deploy.sh` | Docker deployment script |

## Local Scripts

| File | Description |
|------|-------------|
| `setup.bat` | First-time setup (create venv, install deps) |
| `start_all.bat` | Start both frontend and backend |
| `start_backend.bat` | Start backend only |
| `start_frontend.bat` | Start frontend only |

## Deploy with Docker

```
bash
# Build and run
docker-compose up --build -d

# Or use deploy script
chmod +x deploy.sh
./deploy.sh
```

## Deploy to Vercel

```
bash
vercel
```

## Deploy to Heroku

```
bash
heroku create your-app-name
git push heroku main
```

## LSTM Speed Optimizations

- Reduced epochs: 10 → 5
- Larger batch: 32 → 64
- Simplified model: 16→8 LSTM units
- Faster lookback: 20 days
