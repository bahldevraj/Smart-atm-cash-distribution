"""
Quick ML Model Training Script
Trains ARIMA, LSTM, and Ensemble models for all 6 ATMs
Run this before accessing ML Forecast tab in the UI
"""

import sys
import os
import pandas as pd
import numpy as np
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

# Add ml_models to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'ml_models'))

from forecasting_models import (
    ARIMAForecaster, 
    LSTMForecaster, 
    EnsembleForecaster,
    train_all_models
)

# Configuration
DATA_FILE = os.path.join(os.path.dirname(__file__), '..', 'ml_models', 'data', 'atm_demand_data.csv')
MODELS_DIR = os.path.join(os.path.dirname(__file__), '..', 'ml_models', 'saved_models')

# Ensure models directory exists
os.makedirs(MODELS_DIR, exist_ok=True)

# ATM configuration
ATMS = {
    1: 'ATM Mall Plaza',
    2: 'ATM University',
    3: 'ATM Airport',
    4: 'ATM Hospital',
    5: 'ATM Railway',
    6: 'ATM DownTOwn'
}


def load_and_prepare_data(atm_id):
    """Load and prepare data for specific ATM"""
    print(f"\n{'='*60}")
    print(f"Loading data for ATM {atm_id}: {ATMS[atm_id]}")
    print(f"{'='*60}")
    
    # Read data
    df = pd.read_csv(DATA_FILE)
    df['date'] = pd.to_datetime(df['date'])
    
    # Filter for specific ATM
    atm_data = df[df['atm_id'] == atm_id].sort_values('date')
    
    print(f"Total records: {len(atm_data)}")
    print(f"Date range: {atm_data['date'].min()} to {atm_data['date'].max()}")
    
    # Use total_demand as target
    demand = atm_data['total_demand'].values
    
    # Train/test split (80/20)
    split_idx = int(len(demand) * 0.8)
    train_data = demand[:split_idx]
    test_data = demand[split_idx:]
    
    print(f"Training samples: {len(train_data)}")
    print(f"Testing samples: {len(test_data)}")
    
    return train_data, test_data, demand


def train_and_save_models(atm_id):
    """Train and save all models for an ATM"""
    train_data, test_data, full_data = load_and_prepare_data(atm_id)
    
    # Train all models
    results = train_all_models(
        train_data, 
        test_data, 
        atm_name=ATMS[atm_id],
        verbose=True
    )
    
    # Save individual models
    print(f"\n{'='*60}")
    print("Saving Models...")
    print(f"{'='*60}")
    
    for model_name, model in results['models'].items():
        filepath = os.path.join(MODELS_DIR, f'{model_name.lower()}_atm_{atm_id}.pkl')
        model.save_model(filepath)
    
    # Create and save ensemble
    if len(results['models']) > 0:
        print("\nCreating Ensemble Model...")
        models_list = list(results['models'].values())
        
        # Equal weights for simplicity
        ensemble = EnsembleForecaster(models_list)
        
        # Evaluate ensemble
        if 'LSTM' in results['models']:
            ensemble_metrics = ensemble.evaluate(test_data, recent_data=full_data[-(30 + len(test_data)):-len(test_data)])
        else:
            ensemble_metrics = ensemble.evaluate(test_data)
        
        print(f"Ensemble Metrics: {ensemble_metrics}")
        
        # Save ensemble
        ensemble_filepath = os.path.join(MODELS_DIR, f'ensemble_atm_{atm_id}.pkl')
        import pickle
        with open(ensemble_filepath, 'wb') as f:
            pickle.dump(ensemble, f)
        print(f"✓ Ensemble model saved to {ensemble_filepath}")
        
        results['models']['Ensemble'] = ensemble
        results['metrics']['Ensemble'] = ensemble_metrics
    
    # Save metrics to CSV
    metrics_df = pd.DataFrame(results['metrics']).T
    metrics_df.index.name = 'Model'
    metrics_filepath = os.path.join(MODELS_DIR, f'model_metrics_atm_{atm_id}.csv')
    metrics_df.to_csv(metrics_filepath)
    print(f"✓ Metrics saved to {metrics_filepath}")
    
    return results


def main():
    """Train models for all ATMs"""
    print("\n" + "="*60)
    print("SMART ATM CASH OPTIMIZER - ML MODEL TRAINING")
    print("="*60)
    print(f"Training models for {len(ATMS)} ATMs")
    print(f"Models: ARIMA, LSTM, Ensemble")
    print(f"Data source: {DATA_FILE}")
    print(f"Output directory: {MODELS_DIR}")
    print("="*60)
    
    # Check if data file exists
    if not os.path.exists(DATA_FILE):
        print(f"\n✗ ERROR: Data file not found: {DATA_FILE}")
        print("Please ensure atm_demand_data.csv exists in ml_models/data/")
        return
    
    all_results = {}
    
    # Train models for each ATM
    for atm_id in ATMS.keys():
        try:
            results = train_and_save_models(atm_id)
            all_results[atm_id] = results
            
            print(f"\n{'='*60}")
            print(f"✓ Successfully trained models for ATM {atm_id}")
            print(f"{'='*60}")
            
        except Exception as e:
            print(f"\n✗ ERROR training models for ATM {atm_id}: {e}")
            import traceback
            traceback.print_exc()
            continue
    
    # Summary
    print("\n" + "="*60)
    print("TRAINING SUMMARY")
    print("="*60)
    
    for atm_id, results in all_results.items():
        print(f"\nATM {atm_id} ({ATMS[atm_id]}):")
        if 'metrics' in results:
            best_model = min(results['metrics'], key=lambda x: results['metrics'][x]['MAPE'])
            print(f"  Best Model: {best_model} (MAPE: {results['metrics'][best_model]['MAPE']:.2f}%)")
            print(f"  Models trained: {', '.join(results['models'].keys())}")
        else:
            print("  No models trained")
    
    print("\n" + "="*60)
    print("✓ Model training complete!")
    print("You can now use the ML Forecast tab in the UI")
    print("="*60)


if __name__ == "__main__":
    main()
