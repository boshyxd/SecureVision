# SecureVision - Multimodal Breach Analysis Platform

SecureVision is a comprehensive platform for analyzing and visualizing breach data using advanced AI techniques and real-time processing capabilities.

## Features

- Large-scale breach data processing and analysis
- AI-powered pattern recognition and risk assessment using Groq
- Real-time data enrichment and visualization
- Advanced search capabilities with multiple filtering options
- Interactive dashboard with data visualization
- WebSocket-based real-time updates

## Tech Stack

- Backend: FastAPI, SQLAlchemy, MySQL
- AI/ML: Groq AI (mixtral-8x7b-32768)
- Frontend: React with Nivo/D3.js for visualizations
- Real-time: WebSocket for live updates
- Data Processing: Async background tasks

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set up environment variables in `.env`:
   ```
   DATABASE_URL=mysql://user:password@localhost/securevision
   GROQ_API_KEY=your_groq_api_key
   ```
4. Initialize the database:
   ```bash
   python scripts/init_db.py
   ```
5. Start the application:
   ```bash
   uvicorn app.main:app --reload
   ```

## Project Structure

```
securevision/
├── app/
│   ├── api/            # API endpoints
│   ├── core/           # Core functionality
│   ├── models/         # Database models
│   ├── services/       # Business logic
│   └── utils/          # Utility functions
├── frontend/           # React frontend
├── scripts/            # Setup and utility scripts
└── tests/             # Test suite
```

## Features

- Password pattern recognition (keyboard_walk, date_based, common_word, repeated_chars)
- Risk scoring (0.0-1.0)
- Domain analysis and tagging
- Login form detection
- CAPTCHA and MFA detection
- Breach history tracking

## API Documentation

API documentation is available at `/docs` when running the application.
