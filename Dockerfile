# Python base image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install Node.js for frontend build
RUN apt-get update && apt-get install -y nodejs npm && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy frontend package files
COPY frontend/package*.json frontend/

# Install frontend dependencies
WORKDIR /app/frontend
RUN npm install

# Copy rest of frontend
COPY frontend/ ./

# Build frontend
RUN npm run build

# Copy backend
WORKDIR /app
COPY backend/ .

# Expose port
EXPOSE 5000

# Start backend
CMD ["sh", "-c", "cd backend && python run.py"]
