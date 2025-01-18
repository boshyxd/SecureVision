## The Stack

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
