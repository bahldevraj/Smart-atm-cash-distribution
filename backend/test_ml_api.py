"""
Test script for ML API endpoints
Demonstrates all available ML forecasting features
"""

import requests
import json

BASE_URL = "http://127.0.0.1:5000"

def print_section(title):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)

def test_health_check():
    """Test ML API health check"""
    print_section("1. ML API Health Check")
    response = requests.get(f"{BASE_URL}/api/ml/health")
    data = response.json()
    print(f"Status: {data.get('status')}")
    print(f"Loaded Models: {data.get('models_loaded')}")
    print(f"Timestamp: {data.get('timestamp')}")
    return response.status_code == 200

def test_models_status():
    """Test models status endpoint"""
    print_section("2. Models Status")
    response = requests.get(f"{BASE_URL}/api/ml/models/status")
    data = response.json()
    print(f"Available Models: {data.get('available_models')}")
    print(f"Total Models: {data.get('total_models')}")
    print(f"Loaded Models: {data.get('loaded_models')}")
    return response.status_code == 200

def test_model_metrics():
    """Test model metrics endpoint"""
    print_section("3. Model Performance Metrics")
    atm_id = 1
    response = requests.get(f"{BASE_URL}/api/ml/models/metrics/{atm_id}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\nATM ID: {data.get('atm_id')}")
        print(f"Best Model: {data.get('best_model')} (MAPE: {data.get('best_mape'):.2f}%)")
        print("\nModel Performance:")
        for model_name, metrics in data.get('metrics', {}).items():
            print(f"\n{model_name}:")
            print(f"  MAE:  {metrics.get('MAE')}")
            print(f"  RMSE: {metrics.get('RMSE')}")
            print(f"  MAPE: {metrics.get('MAPE')}")
            print(f"  R²:   {metrics.get('R2')}")
        return True
    else:
        print(f"Error: {response.json()}")
        return False

def test_forecast():
    """Test basic forecasting"""
    print_section("4. Single Model Forecast (ARIMA)")
    atm_id = 1
    payload = {
        "days_ahead": 7,
        "model_type": "arima"
    }
    
    response = requests.post(f"{BASE_URL}/api/ml/forecast/{atm_id}", json=payload)
    
    if response.status_code == 200:
        data = response.json()
        print(f"\nATM ID: {data.get('atm_id')}")
        print(f"Model Used: {data.get('model_type').upper()}")
        print(f"Total Predicted Demand: {data.get('total_predicted_demand_formatted')}")
        print(f"Average Daily Demand: {data.get('avg_daily_demand_formatted')}")
        print(f"Max Demand: ${data.get('max_demand'):,.2f}")
        print(f"Min Demand: ${data.get('min_demand'):,.2f}")
        
        print("\nDaily Forecast:")
        for forecast in data.get('forecast', [])[:3]:  # Show first 3 days
            print(f"  {forecast['date']} ({forecast['day_of_week']}): {forecast['predicted_demand_formatted']}")
        if len(data.get('forecast', [])) > 3:
            print(f"  ... and {len(data.get('forecast', [])) - 3} more days")
        
        return True
    else:
        print(f"Error: {response.json()}")
        return False

def test_lstm_forecast():
    """Test LSTM forecasting"""
    print_section("5. LSTM Deep Learning Forecast")
    atm_id = 1
    payload = {
        "days_ahead": 7,
        "model_type": "lstm"
    }
    
    response = requests.post(f"{BASE_URL}/api/ml/forecast/{atm_id}", json=payload)
    
    if response.status_code == 200:
        data = response.json()
        print(f"\nATM ID: {data.get('atm_id')}")
        print(f"Model Used: {data.get('model_type').upper()} (Deep Learning)")
        print(f"Total Predicted Demand: {data.get('total_predicted_demand_formatted')}")
        print(f"Average Daily Demand: {data.get('avg_daily_demand_formatted')}")
        return True
    else:
        print(f"Error: {response.json()}")
        return False

def test_ensemble_forecast():
    """Test ensemble forecasting"""
    print_section("6. Ensemble Forecast (ARIMA + LSTM)")
    atm_id = 1
    payload = {
        "days_ahead": 7,
        "model_type": "ensemble"
    }
    
    response = requests.post(f"{BASE_URL}/api/ml/forecast/{atm_id}", json=payload)
    
    if response.status_code == 200:
        data = response.json()
        print(f"\nATM ID: {data.get('atm_id')}")
        print(f"Model Used: {data.get('model_type').upper()} (Best of Both)")
        print(f"Total Predicted Demand: {data.get('total_predicted_demand_formatted')}")
        print(f"Average Daily Demand: {data.get('avg_daily_demand_formatted')}")
        return True
    else:
        print(f"Error: {response.json()}")
        return False

def test_compare_models():
    """Test model comparison"""
    print_section("7. Compare All Models")
    atm_id = 1
    payload = {
        "days_ahead": 7
    }
    
    response = requests.post(f"{BASE_URL}/api/ml/forecast/compare/{atm_id}", json=payload)
    
    if response.status_code == 200:
        data = response.json()
        print(f"\nATM ID: {data.get('atm_id')}")
        print(f"Available Models: {data.get('available_models')}")
        print(f"\nModel Comparison (7-day forecast):")
        
        for model_name, model_data in data.get('models', {}).items():
            if 'error' not in model_data:
                print(f"\n{model_name.upper()}:")
                print(f"  Total: {model_data.get('total_formatted')}")
                print(f"  Average: {model_data.get('average_formatted')}")
                print(f"  Max: ${model_data.get('max'):,.2f}")
                print(f"  Min: ${model_data.get('min'):,.2f}")
        
        return True
    else:
        print(f"Error: {response.json()}")
        return False

def test_batch_forecast():
    """Test batch forecasting for multiple ATMs"""
    print_section("8. Batch Forecast (Multiple ATMs)")
    payload = {
        "atm_ids": [1, 2, 3, 4],
        "days_ahead": 7,
        "model_type": "arima"
    }
    
    response = requests.post(f"{BASE_URL}/api/ml/forecast/batch", json=payload)
    
    if response.status_code == 200:
        data = response.json()
        print(f"\nTotal ATMs: {data.get('total_atms')}")
        print(f"Successful Forecasts: {data.get('successful_forecasts')}")
        print(f"Model Type: {data.get('model_type').upper()}")
        
        print("\nForecasts by ATM:")
        for atm_id, forecast_data in data.get('forecasts', {}).items():
            if 'error' not in forecast_data:
                print(f"\nATM {atm_id}:")
                print(f"  Total 7-day Demand: ${forecast_data.get('total_predicted'):,.2f}")
                print(f"  Average Daily: ${forecast_data.get('avg_daily'):,.2f}")
            else:
                print(f"\nATM {atm_id}: {forecast_data.get('error')}")
        
        return True
    else:
        print(f"Error: {response.json()}")
        return False

def main():
    """Run all ML API tests"""
    print("\n" + "=" * 70)
    print("  🤖 ML API TEST SUITE - Smart ATM Cash Forecasting")
    print("=" * 70)
    print("Testing ML-powered cash demand prediction endpoints...")
    
    tests = [
        ("Health Check", test_health_check),
        ("Models Status", test_models_status),
        ("Model Metrics", test_model_metrics),
        ("ARIMA Forecast", test_forecast),
        ("LSTM Forecast", test_lstm_forecast),
        ("Ensemble Forecast", test_ensemble_forecast),
        ("Model Comparison", test_compare_models),
        ("Batch Forecast", test_batch_forecast),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            success = test_func()
            results.append((test_name, success))
        except Exception as e:
            print(f"\n❌ Test failed: {e}")
            results.append((test_name, False))
    
    # Summary
    print_section("TEST SUMMARY")
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for test_name, success in results:
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} - {test_name}")
    
    print(f"\n{passed}/{total} tests passed ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("\n🎉 All tests passed! ML API is fully operational!")
    else:
        print(f"\n⚠ {total - passed} test(s) failed. Check the errors above.")

if __name__ == "__main__":
    main()
