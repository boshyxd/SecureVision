# SecureVision - Breach Data Analysis Platform

A multimodal breach analysis platform that combines data processing, Groq AI analysis, and visualization to help identify and analyze breached credentials.

## Features

- **Data Processing**

  - Parse large breach data files (7K-25M lines)
  - Enrich data with domain, IP, and security information
  - Identify login forms, CAPTCHAs, and MFA requirements
  - Tag URLs based on security features and status

- **AI-Powered Analysis**

  - Groq AI integration (llama 3.3)
  - Pattern recognition in passwords
  - Risk scoring (0.0-1.0)
  - Security insights generation

- **Search & Analytics**

  - Find accounts by domain/IP
  - Filter by application type (WordPress, Citrix, etc.)
  - Search by port or URL path
  - Exclude non-routable IP ranges
  - Tag-based filtering

- **Real-time Updates**
  - WebSocket connections for live data
  - Background processing for large datasets
  - Instant notification of high-risk findings

## Tech Stack

- **Backend**

  - FastAPI for REST and WebSocket endpoints
  - SQLAlchemy with MySQL for data storage
  - Async processing for scalability
  - Groq AI for analysis

- **Frontend**
  - React with modern UI components
  - Nivo/D3.js for data visualization
  - Real-time updates via WebSocket
  - Responsive dashboard design

## Setup

1. **Clone the Repository**

   ```bash
   git clone https://github.com/yourusername/securevision.git
   cd securevision
   ```

2. **Install Dependencies**

   ```bash
   # Backend
   pip install -r requirements.txt

   # Frontend
   cd frontend/secure-vision
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:

   ```env
   MYSQL_HOST=localhost
   MYSQL_USER=root
   MYSQL_PASSWORD=your_password
   MYSQL_DB=securevision
   MYSQL_URL=mysql+pymysql://root:your_password@localhost/securevision

   GROQ_API_KEY=your_groq_api_key
   SHODAN_API_KEY=your_shodan_api_key

   APP_ENV=development
   DEBUG=true
   HOST=0.0.0.0
   PORT=8000
   ```

4. **Initialize Database**

   ```bash
   python scripts/init_db.py
   ```

5. **Start the Services**

   ```bash
   # Backend
   uvicorn app.main:app --reload

   # Frontend
   cd frontend/secure-vision
   npm run dev
   ```

## Project Structure

```
securevision/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── models/
│   │   ├── __init__.py
│   │   └── database.py
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       └── search.py
│   └── services/
│       ├── __init__.py
│       └── data_enrichment.py
├── frontend/
│   └── secure-vision/
│       ├── src/
│       │   ├── components/
│       │   └── pages/
│       └── package.json
├── tests/
│   ├── conftest.py
│   └── test_data_ingestion.py
├── scripts/
│   └── init_db.py
├── requirements.txt
└── README.md
```

## API Endpoints

- `GET /api/v1/search` - Search breach data with filters
- `GET /api/v1/stats` - Get breach statistics
- `GET /api/v1/domains/{domain}` - Get domain-specific data
- `WS /api/v1/ws` - WebSocket for real-time updates

## Development

1. **Running Tests**

   ```bash
   pytest tests/ -v
   ```

2. **Code Style**

   ```bash
   # Install development dependencies
   pip install black isort flake8

   # Format code
   black .
   isort .
   flake8
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
