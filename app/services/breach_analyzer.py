from groq import Groq
from app.core.config import settings
from app.models.database import SessionLocal, BreachEntry
from rapidfuzz import fuzz, process
import requests

client = Groq(api_key=settings.GROQ_API_KEY)

async def analyze_password_with_groq(password: str) -> dict:
    """Analyze password using Groq AI"""
    # TODO: Implement password analysis with Groq
    return {
        "risk_score": 0.5,
        "analysis": "Not implemented"
    }

async def analyze_breach_data(entry_id: int):
    """Analyze breach data entry"""
    # TODO: Implement breach analysis and update breach_metadata
    pass

def ransomware_history(search_term):
    base_url = "https://api.ransomware.live/v2/searchvictims"
    url = f"{base_url}/{search_term}"

    print(url)

    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
    else:
        print(f"Error: {response.status_code}")
        data = []

    def fuzzy_filter(data, search_term, threshold=70):
        results = []
        for entry in data:
            victim_name = entry.get("victim", "")
            similarity = fuzz.ratio(victim_name.lower(), search_term.lower())
            if similarity >= threshold:
                results.append({**entry, "similarity": similarity})
        return results

    threshold = 30
    filtered_results = fuzzy_filter(data, search_term, threshold)

    # Print filtered results
    if filtered_results:
        for result in filtered_results:
            print(f"Victim: {result['victim']}, Similarity: {result['similarity']}")
            print(f"Description: {result.get('description', 'N/A')}")
            print(f"URL: {result.get('url', 'N/A')}\n")
    else:
        print("No matches found.")
