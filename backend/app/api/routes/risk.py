from fastapi import APIRouter, HTTPException
from groq import Groq
from pydantic import BaseModel
from typing import Optional, List
import os
import json

router = APIRouter()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

class RiskAssessmentRequest(BaseModel):
    url: str
    username: str
    password: str
    breach_info: Optional[dict] = None
    security_features: Optional[List[str]] = None

class RiskAssessmentResponse(BaseModel):
    risk_level: str
    risk_score: float
    analysis: str
    recommendations: Optional[List[str]] = None
    factors: Optional[List[dict]] = None

@router.post("/assess", response_model=RiskAssessmentResponse)
async def assess_risk(request: RiskAssessmentRequest):
    try:
        security_features = []
        if request.security_features:
            security_features = request.security_features
        elif request.breach_info:
            if request.breach_info.get("hasCaptcha"):
                security_features.append("CAPTCHA")
            if request.breach_info.get("hasMfa"):
                security_features.append("MFA")
            if request.breach_info.get("isSecure"):
                security_features.append("HTTPS")

        # Construct the prompt for risk assessment
        prompt = f"""Analyze the security risk for the following login credentials and provide a detailed risk assessment:

URL: {request.url}
Username: {request.username}
Password: {request.password}
Security Features: {', '.join(security_features) if security_features else 'None'}
Breach History: {'Previously breached' if request.breach_info and request.breach_info.get('is_breached') else 'No known breaches'}
{f"Total Breaches: {request.breach_info.get('total_breaches')}" if request.breach_info and request.breach_info.get('is_breached') else ''}
{f"Compromised Passwords: {request.breach_info.get('total_pwned')}" if request.breach_info and request.breach_info.get('is_breached') else ''}

Analyze the following aspects and provide a risk assessment:
1. Password strength and complexity
2. Security features present/absent
3. Breach history impact
4. URL/domain security
5. Overall vulnerability assessment

Provide a JSON response with:
1. risk_level: "low", "medium", or "high"
2. risk_score: A number between 0 and 100 (0 being most secure, 100 being highest risk)
3. analysis: A brief analysis of the security implications
4. recommendations: List of specific security recommendations
5. factors: List of objects containing:
   - name: Factor name
   - impact: "positive" or "negative"
   - weight: Impact weight (1-5)
   - description: Brief description of the factor's impact

Format the response as a JSON object with these exact keys."""

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{
                "role": "system",
                "content": "You are a cybersecurity expert analyzing login credential risks. Provide detailed, quantitative risk assessments."
            }, {
                "role": "user",
                "content": prompt
            }],
            temperature=0.7,
            max_completion_tokens=1024,
            response_format={"type": "json_object"},
        )

        response = json.loads(completion.choices[0].message.content)
        
        # Update database with risk score if needed
        # await update_risk_score(request.url, response["risk_score"])
        
        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 