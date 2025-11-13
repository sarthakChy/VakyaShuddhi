import requests
import re
API_URL = "http://localhost:8000/grammar_check"
TOKEN = "your_access_token_here"

test_cases = [
    "लड़का स्कूल गई।",      # Gender agreement
    "मैं घर जा है।",         # Verb agreement
    "टेबल पर किताब हैं।",    # Number agreement
    "मुजे आप का किताब चाहिए", # Multiple errors
]

for text in test_cases:
    response = requests.post(
        API_URL,
        json={"message": text, "language": "hindi"},
        # headers={"Authorization": f"Bearer {TOKEN}"}
    )
    
    data = response.json()
    print(f"\n{'='*50}")
    print(f"Original: {text}")
    print(f"Errors found: {len(data['errors'])}")
    
    for error in data['errors']:
        print(f"  • {error['type']}: '{error['original']}' → '{error['suggestion']}'")
    
    print(f"Grammar Score: {data['stats']['grammar']}")