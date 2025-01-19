import asyncio
import sys
import os
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.database import SessionLocal, BreachEntry
from app.services.data_enrichment import DataEnrichmentService

async def update_breach_status():
    """Update breach status for all existing entries"""
    db = SessionLocal()
    enrichment_service = DataEnrichmentService()
    
    try:
        # Get all entries
        entries = db.query(BreachEntry).all()
        print(f"Found {len(entries)} entries to update")
        
        for entry in entries:
            try:
                # Get breach status
                breach_data = await enrichment_service._check_breach_status(entry.domain)
                
                if breach_data:
                    # Update breach status fields
                    entry.had_breach = 1 if breach_data.get('breaches') else 0
                    entry.breach_count = len(breach_data.get('breaches', []))
                    entry.total_pwned = breach_data.get('total_pwned', 0)
                    
                    if breach_data.get('latest_breach'):
                        try:
                            entry.latest_breach = datetime.strptime(breach_data['latest_breach'], '%Y-%m-%d')
                        except ValueError:
                            print(f"Invalid breach date format: {breach_data['latest_breach']}")
                    
                    entry.data_classes = breach_data.get('data_classes', [])
                    entry.breach_details = breach_data.get('breaches', [])
                    
                    # Update tags
                    if 'breached' not in (entry.tags or []):
                        entry.tags = list(set((entry.tags or []) + ['breached']))
                    
                    # Update extra metadata
                    entry.extra_metadata = {
                        **(entry.extra_metadata or {}),
                        'breach_summary': {
                            'total_breaches': entry.breach_count,
                            'total_pwned': entry.total_pwned,
                            'latest_breach': breach_data.get('latest_breach'),
                            'data_classes': entry.data_classes
                        }
                    }
                    
                    db.commit()
                    print(f"Updated breach status for entry {entry.id}")
                
            except Exception as e:
                print(f"Error updating entry {entry.id}: {str(e)}")
                continue
        
    except Exception as e:
        print(f"Error: {str(e)}")
    finally:
        db.close()
        await enrichment_service.__aexit__(None, None, None)

if __name__ == "__main__":
    asyncio.run(update_breach_status()) 