"""
Quick Training Script for Individual ATM Models
Trains ARIMA and LSTM models for a specific ATM using existing transaction data
"""
import sys
import os
import argparse
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta

# Add paths
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
from path_config import get_saved_models_dir, get_data_dir

def prepare_atm_data(atm_id: int, min_transactions: int = 30) -> pd.DataFrame:
    """
    Prepare training data from database for specific ATM
    
    Args:
        atm_id: ATM identifier
        min_transactions: Minimum transactions required
        
    Returns:
        DataFrame with date and demand columns
    """
    # Import here to avoid circular dependencies
    from app import db, Transaction
    
    # Fetch transactions for this ATM
    transactions = Transaction.query.filter_by(atm_id=atm_id).order_by(Transaction.timestamp).all()
    
    if len(transactions) < min_transactions:
        raise ValueError(f"Insufficient data: {len(transactions)} transactions (need {min_transactions})")
    
    # Convert to DataFrame
    data = []
    for tx in transactions:
        data.append({
            'date': tx.timestamp.date(),
            'amount': tx.amount
        })
    
    df = pd.DataFrame(data)
    
    # Aggregate by date
    daily_demand = df.groupby('date')['amount'].sum().reset_index()
    daily_demand.columns = ['date', 'demand']
    
    # Fill missing dates with average
    date_range = pd.date_range(
        start=daily_demand['date'].min(),
        end=daily_demand['date'].max(),
        freq='D'
    )
    
    full_df = pd.DataFrame({'date': date_range})
    full_df = full_df.merge(daily_demand, on='date', how='left')
    full_df['demand'].fillna(full_df['demand'].mean(), inplace=True)
    
    return full_df

def train_arima_model(data: pd.DataFrame, atm_id: int):
    """Train ARIMA model for ATM"""
    import pickle
    from statsmodels.tsa.arima.model import ARIMA
    
    print(f"Training ARIMA model for ATM {atm_id}...")
    
    # Prepare data
    demand_series = data['demand'].values
    
    # Train ARIMA model (5,1,0) - simple but effective
    try:
        model = ARIMA(demand_series, order=(5, 1, 0))
        fitted_model = model.fit()
        
        # Save model
        models_dir = get_saved_models_dir()
        model_path = models_dir / f'arima_model_atm_{atm_id}.pkl'
        
        with open(model_path, 'wb') as f:
            pickle.dump(fitted_model, f)
        
        print(f"✓ ARIMA model saved: {model_path}")
        return True
    except Exception as e:
        print(f"✗ ARIMA training failed: {e}")
        return False

def train_lstm_model(data: pd.DataFrame, atm_id: int):
    """Train LSTM model for ATM"""
    try:
        import tensorflow as tf
        from tensorflow import keras
        from tensorflow.keras.models import Sequential
        from tensorflow.keras.layers import LSTM, Dense, Dropout
        from sklearn.preprocessing import MinMaxScaler
        import pickle
        
        print(f"Training LSTM model for ATM {atm_id}...")
        
        # Prepare data
        demand_values = data['demand'].values.reshape(-1, 1)
        
        # Scale data
        scaler = MinMaxScaler(feature_range=(0, 1))
        scaled_data = scaler.fit_transform(demand_values)
        
        # Create sequences
        sequence_length = 7  # Use past 7 days to predict next day
        X, y = [], []
        
        for i in range(sequence_length, len(scaled_data)):
            X.append(scaled_data[i-sequence_length:i, 0])
            y.append(scaled_data[i, 0])
        
        X, y = np.array(X), np.array(y)
        X = X.reshape((X.shape[0], X.shape[1], 1))
        
        # Build model
        model = Sequential([
            LSTM(50, return_sequences=True, input_shape=(sequence_length, 1)),
            Dropout(0.2),
            LSTM(50, return_sequences=False),
            Dropout(0.2),
            Dense(25),
            Dense(1)
        ])
        
        model.compile(optimizer='adam', loss='mean_squared_error')
        
        # Train
        model.fit(X, y, batch_size=1, epochs=20, verbose=0)
        
        # Save model and scaler
        models_dir = get_saved_models_dir()
        model_path = models_dir / f'lstm_model_atm_{atm_id}.h5'
        scaler_path = models_dir / f'lstm_scaler_atm_{atm_id}.pkl'
        
        model.save(str(model_path))
        
        with open(scaler_path, 'wb') as f:
            pickle.dump(scaler, f)
        
        print(f"✓ LSTM model saved: {model_path}")
        print(f"✓ LSTM scaler saved: {scaler_path}")
        return True
        
    except ImportError:
        print("✗ TensorFlow not available, skipping LSTM training")
        return False
    except Exception as e:
        print(f"✗ LSTM training failed: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Train ML models for a specific ATM')
    parser.add_argument('--atm-id', type=int, required=True, help='ATM ID to train model for')
    parser.add_argument('--min-transactions', type=int, default=30, help='Minimum transactions required')
    parser.add_argument('--models', nargs='+', choices=['arima', 'lstm', 'both'], default=['both'],
                       help='Which models to train')
    
    args = parser.parse_args()
    
    print("=" * 70)
    print(f"Training Models for ATM {args.atm_id}")
    print("=" * 70)
    
    # Prepare data
    try:
        data = prepare_atm_data(args.atm_id, args.min_transactions)
        print(f"✓ Data prepared: {len(data)} days of data")
    except Exception as e:
        print(f"✗ Error preparing data: {e}")
        sys.exit(1)
    
    # Train models
    success = {'arima': False, 'lstm': False}
    
    if 'both' in args.models or 'arima' in args.models:
        success['arima'] = train_arima_model(data, args.atm_id)
    
    if 'both' in args.models or 'lstm' in args.models:
        success['lstm'] = train_lstm_model(data, args.atm_id)
    
    # Summary
    print("\n" + "=" * 70)
    print("Training Summary")
    print("=" * 70)
    print(f"ARIMA Model: {'✓ Success' if success['arima'] else '✗ Failed'}")
    print(f"LSTM Model: {'✓ Success' if success['lstm'] else '✗ Failed'}")
    print("=" * 70)
    
    if any(success.values()):
        print("\n✓ Training completed! Restart the backend to use the new model.")
        sys.exit(0)
    else:
        print("\n✗ Training failed for all models")
        sys.exit(1)

if __name__ == '__main__':
    main()
