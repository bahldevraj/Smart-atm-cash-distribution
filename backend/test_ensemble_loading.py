"""
Test ensemble model loading
"""
import joblib
import sys
import os
import numpy as np

# Add ml_models to path
project_root = r'C:\Users\bdevr\Project\smart-atm-system'
ml_models_path = os.path.join(project_root, 'ml_models')
sys.path.insert(0, ml_models_path)

from forecasting_models import ARIMAForecaster, LSTMForecaster, EnsembleForecaster

print("="*60)
print("Testing Ensemble Model Loading")
print("="*60)

# Load ARIMA
print("\n1. Loading ARIMA...")
arima_path = os.path.join(project_root, 'ml_models', 'saved_models', 'arima_atm_1.pkl')
arima = ARIMAForecaster()
arima.fitted_model = joblib.load(arima_path)
arima.is_trained = True
print(f"   ✓ ARIMA loaded, is_trained={arima.is_trained}")

# Load LSTM
print("\n2. Loading LSTM...")
lstm_path = os.path.join(project_root, 'ml_models', 'saved_models', 'lstm_atm_1.pkl')
lstm_package = joblib.load(lstm_path)
lstm = LSTMForecaster(lookback=lstm_package['lookback'], units=lstm_package['units'])
lstm.model = lstm_package['model']
lstm.scaler = lstm_package['scaler']
lstm.is_trained = True
print(f"   ✓ LSTM loaded, is_trained={lstm.is_trained}")

# Create ensemble
print("\n3. Creating Ensemble...")
ensemble = EnsembleForecaster([arima, lstm])
print(f"   ✓ Ensemble created with {len(ensemble.models)} models")

# Load recent data for LSTM
print("\n4. Loading recent data...")
import pandas as pd
data_path = os.path.join(project_root, 'ml_models', 'data', 'atm_demand_data.csv')
df = pd.read_csv(data_path)
df = df[df['atm_id'] == 1].copy()
df['date'] = pd.to_datetime(df['date'])
df = df.sort_values('date')
recent_data = df.tail(30)['total_demand'].values
print(f"   ✓ Loaded {len(recent_data)} days of recent data")

# Test ensemble prediction
print("\n5. Testing Ensemble Prediction...")
try:
    predictions = ensemble.predict(steps=7, recent_data=recent_data)
    print(f"   ✓ Ensemble prediction successful!")
    print(f"     7-day predictions: ${predictions.sum():,.2f}")
    print(f"     Daily average: ${predictions.mean():,.2f}")
except Exception as e:
    print(f"   ✗ Ensemble prediction failed: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "="*60)
print("✅ Ensemble test complete!")
