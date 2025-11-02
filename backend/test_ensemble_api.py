"""
Test ensemble via ML API
"""
import requests
import json

BASE_URL = "http://127.0.0.1:5000"

print("Testing Ensemble Model via ML API\n" + "="*60)

# Test 1: Check models status
print("\n1. Checking models status...")
response = requests.get(f"{BASE_URL}/api/ml/models/status")
print(f"   Status code: {response.status_code}")
if response.ok:
    data = response.json()
    print(f"   Available models: {data.get('available_models')}")

# Test 2: Try ensemble forecast
print("\n2. Testing Ensemble forecast...")
payload = {
    "days_ahead": 7,
    "model_type": "ensemble"
}

response = requests.post(f"{BASE_URL}/api/ml/forecast/1", json=payload)
print(f"   Status code: {response.status_code}")

if response.ok:
    data = response.json()
    print(f"   ✓ SUCCESS!")
    print(f"   Model used: {data.get('model_type')}")
    print(f"   Total predicted demand: {data.get('total_predicted_demand_formatted')}")
    print(f"   Average daily demand: {data.get('avg_daily_demand_formatted')}")
else:
    error_data = response.json()
    print(f"   ✗ ERROR!")
    print(f"   Error: {error_data.get('error')}")
    print(f"   Message: {error_data.get('message')}")

print("\n" + "="*60)
