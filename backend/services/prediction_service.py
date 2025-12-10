"""
Prediction Service: ML-based demand forecasting for ATMs
Uses existing ARIMA/Ensemble models to predict cash requirements
"""

import sys
import os

# Add ml_models directory to path
ml_models_path = os.path.join(os.path.dirname(__file__), '..', '..', 'ml_models')
if ml_models_path not in sys.path:
    sys.path.append(ml_models_path)

import pickle
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Tuple

# Try to import Keras for LSTM models
LSTM_AVAILABLE = False
try:
    from keras.models import load_model
    LSTM_AVAILABLE = True
except ImportError:
    pass

class PredictionService:
    """Service for generating ML-based cash demand predictions"""
    
    def __init__(self, models_dir: str = None):
        if models_dir is None:
            self.models_dir = os.path.join(
                os.path.dirname(__file__), 
                '..', '..', 
                'ml_models', 
                'saved_models'
            )
        else:
            self.models_dir = models_dir
        
        self.models = {}  # ARIMA/Ensemble models
        self.lstm_models = {}  # LSTM models
        self.lstm_scalers = {}  # LSTM scalers
        self.load_models()
    
    def load_models(self):
        """Load all available ML models for ATMs (ARIMA and LSTM)"""
        try:
            # Load models for all ATMs (supports ensemble, arima, and lstm models)
            for atm_id in range(1, 30):  # Support up to 30 ATMs
                # Try ensemble model first (legacy models 1-6)
                ensemble_path = os.path.join(self.models_dir, f'ensemble_atm_{atm_id}.pkl')
                arima_path = os.path.join(self.models_dir, f'arima_model_atm_{atm_id}.pkl')
                lstm_path = os.path.join(self.models_dir, f'lstm_model_atm_{atm_id}.h5')
                scaler_path = os.path.join(self.models_dir, f'lstm_scaler_atm_{atm_id}.pkl')
                
                # Load ARIMA or Ensemble model
                if os.path.exists(ensemble_path):
                    with open(ensemble_path, 'rb') as f:
                        self.models[atm_id] = pickle.load(f)
                    print(f"✓ Loaded ensemble model for ATM {atm_id}")
                elif os.path.exists(arima_path):
                    with open(arima_path, 'rb') as f:
                        self.models[atm_id] = pickle.load(f)
                    print(f"✓ Loaded ARIMA model for ATM {atm_id}")
                
                # Load LSTM model if available
                if LSTM_AVAILABLE and os.path.exists(lstm_path) and os.path.exists(scaler_path):
                    try:
                        self.lstm_models[atm_id] = load_model(lstm_path)
                        with open(scaler_path, 'rb') as f:
                            self.lstm_scalers[atm_id] = pickle.load(f)
                        print(f"✓ Loaded LSTM model for ATM {atm_id}")
                    except Exception as lstm_err:
                        print(f"⚠ Could not load LSTM model for ATM {atm_id}: {lstm_err}")
            
            print(f"✓ Total ARIMA models loaded: {len(self.models)}")
            print(f"✓ Total LSTM models loaded: {len(self.lstm_models)}")
            
        except Exception as e:
            print(f"⚠ Warning: Could not load ML models: {e}")
            self.models = {}
            self.lstm_models = {}
            self.lstm_scalers = {}
    
    def predict_demand(self, atm_id: int, days_ahead: int = 1) -> float:
        """
        Predict cash demand for a specific ATM
        
        Args:
            atm_id: ATM identifier
            days_ahead: Number of days ahead to predict (default: 1 for tomorrow)
        
        Returns:
            Predicted demand amount
        """
        if atm_id not in self.models:
            print(f"⚠ No model found for ATM {atm_id}, using average demand")
            return 100000.0  # Default fallback
        
        try:
            model = self.models[atm_id]
            
            # Try different prediction methods based on model type
            prediction = None
            
            # Try forecast() first (statsmodels ARIMA)
            if hasattr(model, 'forecast'):
                try:
                    prediction = model.forecast(steps=days_ahead)
                except Exception as forecast_err:
                    print(f"⚠ forecast() failed for ATM {atm_id}: {forecast_err}")
            
            # Try predict() for ensemble models if forecast didn't work
            if prediction is None and hasattr(model, 'predict'):
                try:
                    prediction = model.predict(steps=days_ahead)
                except Exception as predict_err:
                    print(f"⚠ predict() failed for ATM {atm_id}: {predict_err}")
            
            if prediction is None:
                print(f"⚠ Model for ATM {atm_id} has no working predict/forecast method")
                return 100000.0
            
            # Return the last prediction (for the target day)
            if prediction is not None:
                predicted_value = float(prediction.iloc[-1]) if hasattr(prediction, 'iloc') else (float(prediction[-1]) if hasattr(prediction, '__iter__') else float(prediction))
                # Ensure non-negative prediction
                return max(0, predicted_value)
            else:
                return 100000.0
            
        except Exception as e:
            print(f"⚠ Prediction failed for ATM {atm_id}: {e}")
            import traceback
            traceback.print_exc()
            return 100000.0  # Fallback value
    
    def get_atms_needing_refill(
        self, 
        atm_list: List[Dict], 
        threshold_percentage: float = 0.5,
        prediction_date: datetime = None
    ) -> List[Dict]:
        """
        Identify ATMs that need cash refill based on predictions
        
        Args:
            atm_list: List of ATM dictionaries with id, current_balance, capacity
            threshold_percentage: Refill if predicted balance drops below this % of capacity
            prediction_date: Date to predict for (default: tomorrow)
        
        Returns:
            List of ATMs needing refill with predicted demand
        """
        if prediction_date is None:
            prediction_date = datetime.now() + timedelta(days=1)
        
        days_ahead = (prediction_date.date() - datetime.now().date()).days
        if days_ahead < 1:
            days_ahead = 1
        
        atms_to_refill = []
        
        for atm in atm_list:
            atm_id = atm['id']
            current_balance = atm.get('current_balance', 0)
            capacity = atm.get('capacity', 500000)
            
            # Get prediction
            predicted_demand = self.predict_demand(atm_id, days_ahead)
            
            # Calculate predicted balance after demand
            predicted_balance = current_balance - predicted_demand
            threshold = capacity * threshold_percentage
            
            # Check if refill needed
            if predicted_balance < threshold:
                required_amount = capacity - current_balance  # Refill to full capacity
                
                atms_to_refill.append({
                    'id': atm_id,
                    'name': atm.get('name', f'ATM {atm_id}'),
                    'location': atm.get('location', 'Unknown'),
                    'latitude': atm.get('latitude'),
                    'longitude': atm.get('longitude'),
                    'current_balance': current_balance,
                    'capacity': capacity,
                    'predicted_demand': round(predicted_demand, 2),
                    'predicted_balance': round(predicted_balance, 2),
                    'required_amount': round(required_amount, 2),
                    'priority': self._calculate_priority(predicted_balance, capacity, predicted_demand),
                    'threshold': threshold,
                    'refill_needed': True
                })
        
        # Sort by priority (highest first)
        atms_to_refill.sort(key=lambda x: x['priority'], reverse=True)
        
        return atms_to_refill
    
    def _calculate_priority(self, predicted_balance: float, capacity: float, predicted_demand: float) -> float:
        """
        Calculate priority score for ATM refill
        Higher score = more urgent
        
        Factors:
        - How close to empty (balance/capacity ratio)
        - Demand relative to capacity
        """
        if capacity <= 0:
            return 0
        
        # Balance ratio (0-1, lower is more urgent)
        balance_ratio = max(0, predicted_balance / capacity)
        
        # Demand ratio (0-1+, higher is more urgent)
        demand_ratio = predicted_demand / capacity
        
        # Priority formula: inverse of balance ratio + demand pressure
        priority = (1 - balance_ratio) * 100 + demand_ratio * 50
        
        return round(priority, 2)
    
    def get_predictions_summary(self, atm_list: List[Dict], days: int = 7) -> Dict:
        """
        Get prediction summary for multiple days
        
        Args:
            atm_list: List of ATMs
            days: Number of days to forecast
        
        Returns:
            Dictionary with predictions for each ATM
        """
        summary = {}
        
        for atm in atm_list:
            atm_id = atm['id']
            predictions = []
            
            for day in range(1, days + 1):
                pred = self.predict_demand(atm_id, day)
                predictions.append({
                    'day': day,
                    'date': (datetime.now() + timedelta(days=day)).strftime('%Y-%m-%d'),
                    'predicted_demand': round(pred, 2)
                })
            
            summary[atm_id] = {
                'atm_name': atm.get('name', f'ATM {atm_id}'),
                'predictions': predictions
            }
        
        return summary

# Singleton instance
_prediction_service = None

def get_prediction_service(models_dir: str = None) -> PredictionService:
    """Get or create prediction service instance"""
    global _prediction_service
    if _prediction_service is None:
        _prediction_service = PredictionService(models_dir)
    return _prediction_service
