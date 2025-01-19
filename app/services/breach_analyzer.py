from groq import Groq
# from app.core.config import settings
# from app.models.database import SessionLocal, BreachEntry
from rapidfuzz import fuzz, process
import requests

# client = Groq(api_key=settings.GROQ_API_KEY)

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

    print(f"Fetching data from: {url}")

    try:
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
        else:
            print(f"Error: {response.status_code}")
            return []
    except Exception as e:
        print(f"An error occurred: {e}")
        return []

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

    if filtered_results:
        results_list = []
        for result in filtered_results:
            extracted_info = {
                "attackdate": result.get("attackdate"),
                "description": result.get("description"),
                "discovered": result.get("discovered"),
                "domain": result.get("domain"),
                "victim": result.get("victim"),
                "similarity": result.get("similarity"),
            }
            results_list.append(extracted_info)
        return results_list
    else:
        print("No matches found.")
        return []