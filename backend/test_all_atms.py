"""Test forecasting for all ATMs"""
import requests
import json

API_BASE = 'http://127.0.0.1:5000/api/ml'

# Test all ATMs (1-6)
for atm_id in [1, 2, 3, 4, 5, 6]:
    print(f"\n{'='*60}")
    print(f"Testing ATM {atm_id}")
    print('='*60)
    
    # Test ensemble forecast
    response = requests.post(
        f'{API_BASE}/forecast/{atm_id}',
        json={'model_type': 'ensemble', 'days_ahead': 7}
    )
    
    print(f"Status: {response.status_code}")
    
    if response.ok:
        result = response.json()
        print(f"✓ Forecast successful!")
        print(f"  Model: {result['model_type'].upper()}")
        print(f"  Total 7-day demand: {result['total_predicted_demand_formatted']}")
        print(f"  Average daily: {result['avg_daily_demand_formatted']}")
        print(f"  Peak: ${result['max_demand']:,.2f}")
    else:
        print(f"✗ Error: {response.json()}")
    
    # Test metrics
    metrics_response = requests.get(f'{API_BASE}/models/metrics/{atm_id}')
    if metrics_response.ok:
        metrics = metrics_response.json()
        print(f"\n  Best Model: {metrics['best_model']} (MAPE: {metrics['best_mape']:.2f}%)")
    else:
        print(f"\n  ✗ Metrics error: {metrics_response.json()}")

print(f"\n{'='*60}")
print("✓ ALL ATMs TESTED!")
print('='*60)
