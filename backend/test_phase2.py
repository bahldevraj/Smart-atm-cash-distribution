"""
Test script for Phase 2 Transaction History features
"""

import requests
from datetime import datetime, timedelta

API_BASE = 'http://localhost:5000/api'

def test_transaction_history():
    """Test the enhanced transaction history endpoint"""
    print("🧪 Testing Transaction History Endpoint...")
    print("=" * 60)
    
    # Test 1: Basic query
    print("\n✅ Test 1: Basic query")
    response = requests.get(f'{API_BASE}/transactions/history')
    if response.status_code == 200:
        data = response.json()
        print(f"   Total transactions: {data['total']}")
        print(f"   Current page: {data['current_page']}")
        print(f"   Summary: {data['summary']['total_transactions']} transactions, ${data['summary']['total_amount']:,.2f}")
    else:
        print(f"   ❌ Failed: {response.status_code}")
    
    # Test 2: Filter by amount range
    print("\n✅ Test 2: Filter by amount range (>= $1000)")
    response = requests.get(f'{API_BASE}/transactions/history?min_amount=1000')
    if response.status_code == 200:
        data = response.json()
        print(f"   Transactions >= $1000: {data['summary']['total_transactions']}")
        if data['transactions']:
            print(f"   First result: {data['transactions'][0]['atm_name']} - ${data['transactions'][0]['amount']}")
    else:
        print(f"   ❌ Failed: {response.status_code}")
    
    # Test 3: Filter by time period
    print("\n✅ Test 3: Filter by time period (Morning)")
    response = requests.get(f'{API_BASE}/transactions/history?time_period=morning')
    if response.status_code == 200:
        data = response.json()
        print(f"   Morning transactions: {data['summary']['total_transactions']}")
        print(f"   Date range: {data['summary']['date_range']}")
    else:
        print(f"   ❌ Failed: {response.status_code}")
    
    # Test 4: Combined filters
    print("\n✅ Test 4: Combined filters (Withdrawals + Amount > $100)")
    response = requests.get(f'{API_BASE}/transactions/history?filter_type=withdrawal&min_amount=100')
    if response.status_code == 200:
        data = response.json()
        print(f"   Withdrawals >= $100: {data['summary']['total_transactions']}")
        print(f"   Total amount: ${data['summary']['total_amount']:,.2f}")
    else:
        print(f"   ❌ Failed: {response.status_code}")
    
    # Test 5: CSV Export endpoint
    print("\n✅ Test 5: CSV Export endpoint")
    response = requests.get(f'{API_BASE}/transactions/export-csv?filter_type=allocation')
    if response.status_code == 200:
        lines = response.text.split('\n')
        print(f"   CSV generated with {len(lines)} lines")
        print(f"   Headers: {lines[0]}")
        print(f"   Content-Type: {response.headers.get('Content-Type')}")
    else:
        print(f"   ❌ Failed: {response.status_code}")
    
    print("\n" + "=" * 60)
    print("✅ All Phase 2 endpoint tests completed!")

if __name__ == '__main__':
    test_transaction_history()
