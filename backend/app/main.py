from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import search, risk

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(risk.router, prefix="/api/risk", tags=["risk"])

@app.get("/")
async def root():
    return {"message": "SecureVision API"} 