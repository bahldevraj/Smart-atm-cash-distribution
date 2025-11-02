"""
Quick test to verify model loading works
"""
import joblib
import sys
import os

# Add ml_models to path
project_root = r'C:\Users\bdevr\Project\smart-atm-system'
ml_models_path = os.path.join(project_root, 'ml_models')
sys.path.insert(0, ml_models_path)

from forecasting_models import ARIMAForecaster, LSTMForecaster

# Test ARIMA model loading
print("Testing ARIMA model loading...")
arima_path = os.path.join(project_root, 'ml_models', 'saved_models', 'arima_atm_1.pkl')
print(f"Loading from: {arima_path}")
print(f"File exists: {os.path.exists(arima_path)}")

try:
    fitted_model = joblib.load(arima_path)
    print(f"✓ Loaded object type: {type(fitted_model)}")
    
    # Wrap in forecaster
    forecaster = ARIMAForecaster()
    forecaster.fitted_model = fitted_model
    forecaster.is_trained = True
    
    print("✓ Forecaster created")
    
    # Try prediction
    predictions = forecaster.predict(steps=7)
    print(f"✓ Prediction successful!")
    print(f"  7-day predictions: ${predictions.sum():,.2f}")
    print(f"  Daily average: ${predictions.mean():,.2f}")
    
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "="*60)
print("Testing LSTM model loading...")
lstm_path = os.path.join(project_root, 'ml_models', 'saved_models', 'lstm_atm_1.pkl')
print(f"Loading from: {lstm_path}")
print(f"File exists: {os.path.exists(lstm_path)}")

try:
    import pandas as pd
    import numpy as np
    
    lstm_package = joblib.load(lstm_path)
    print(f"✓ Loaded LSTM package with keys: {lstm_package.keys()}")
    print(f"  - Model type: {type(lstm_package['model'])}")
    print(f"  - Scaler type: {type(lstm_package['scaler'])}")
    print(f"  - Lookback: {lstm_package['lookback']}")
    print(f"  - Units: {lstm_package['units']}")
    
    # Wrap in forecaster
    forecaster = LSTMForecaster(
        lookback=lstm_package['lookback'],
        units=lstm_package['units']
    )
    forecaster.model = lstm_package['model']
    forecaster.scaler = lstm_package['scaler']
    forecaster.is_trained = True
    
    print("✓ Forecaster created")
    
    # Load recent data for LSTM
    data_path = os.path.join(project_root, 'ml_models', 'data', 'atm_demand_data.csv')
    df = pd.read_csv(data_path)
    df = df[df['atm_id'] == 1].copy()
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date')
    recent_data = df.tail(30)['total_demand'].values  # Fixed column name
    
    print(f"✓ Loaded {len(recent_data)} days of recent data")
    
    # Try prediction
    predictions = forecaster.predict(steps=7, recent_data=recent_data)
    print(f"✓ Prediction successful!")
    print(f"  7-day predictions: ${predictions.sum():,.2f}")
    print(f"  Daily average: ${predictions.mean():,.2f}")
    
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "="*60)
print("✅ Model loading test complete!")
