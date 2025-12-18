"""
Fallback Prediction Service for New ATMs
Uses nearest neighbor or historical average when no trained model exists
"""
import pickle
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from pathlib import Path
import sys
import os

# Add backend to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from path_config import get_saved_models_dir


class FallbackPredictor:
    """Provides predictions for ATMs without trained models"""
    
    def __init__(self, atm_id: int, db_session=None):
        self.atm_id = atm_id
        self.db = db_session
        self.models_dir = get_saved_models_dir()
    
    def has_trained_model(self) -> bool:
        """Check if ATM has a trained model"""
        arima_path = self.models_dir / f'arima_model_atm_{self.atm_id}.pkl'
        lstm_path = self.models_dir / f'lstm_model_atm_{self.atm_id}.h5'
        return arima_path.exists() or lstm_path.exists()
    
    def find_nearest_atm_with_model(self, current_atm_data: Dict) -> Optional[int]:
        """
        Find geographically nearest ATM with a trained model
        
        Args:
            current_atm_data: Dict with 'latitude', 'longitude' of the new ATM
            
        Returns:
            ATM ID of nearest ATM with model, or None
        """
        if not self.db:
            # Return ATM 1 as default fallback
            return 1
        
        from app import ATM
        from geopy.distance import geodesic
        
        # Get all ATMs
        all_atms = self.db.query(ATM).filter(ATM.id != self.atm_id).all()
        
        if not all_atms:
            return None
        
        current_loc = (current_atm_data['latitude'], current_atm_data['longitude'])
        nearest_atm = None
        min_distance = float('inf')
        
        for atm in all_atms:
            # Check if this ATM has a model
            if not self._atm_has_model(atm.id):
                continue
            
            atm_loc = (atm.latitude, atm.longitude)
            distance = geodesic(current_loc, atm_loc).kilometers
            
            if distance < min_distance:
                min_distance = distance
                nearest_atm = atm.id
        
        return nearest_atm
    
    def _atm_has_model(self, atm_id: int) -> bool:
        """Check if specific ATM has trained model"""
        arima_path = self.models_dir / f'arima_model_atm_{atm_id}.pkl'
        lstm_path = self.models_dir / f'lstm_model_atm_{atm_id}.h5'
        return arima_path.exists() or lstm_path.exists()
    
    def get_historical_average(self, days_back: int = 30) -> float:
        """
        Calculate average demand from historical transactions
        
        Args:
            days_back: Number of days to look back
            
        Returns:
            Average daily withdrawal amount
        """
        if not self.db:
            return 50000.0  # Default safe value
        
        from app import Transaction
        
        cutoff_date = datetime.now() - timedelta(days=days_back)
        
        transactions = self.db.query(Transaction).filter(
            Transaction.atm_id == self.atm_id,
            Transaction.timestamp >= cutoff_date
        ).all()
        
        if not transactions:
            # No historical data - use system average or safe default
            return self._get_system_average() or 50000.0
        
        total = sum(t.amount for t in transactions)
        avg_per_transaction = total / len(transactions)
        
        # Estimate daily average (assume 50 transactions per day)
        daily_avg = avg_per_transaction * 50
        
        return daily_avg
    
    def _get_system_average(self) -> Optional[float]:
        """Get average demand across all ATMs in system"""
        if not self.db:
            return None
        
        from app import Transaction
        
        cutoff_date = datetime.now() - timedelta(days=30)
        all_transactions = self.db.query(Transaction).filter(
            Transaction.timestamp >= cutoff_date
        ).all()
        
        if not all_transactions:
            return None
        
        total = sum(t.amount for t in all_transactions)
        return (total / len(all_transactions)) * 50  # Daily estimate
    
    def predict(self, days: int = 7, method: str = 'auto') -> List[float]:
        """
        Generate predictions for new ATM
        
        Args:
            days: Number of days to predict
            method: 'auto', 'nearest', 'historical', or 'conservative'
            
        Returns:
            List of predicted daily demands
        """
        if method == 'auto':
            # Decide best method based on available data
            if self.db:
                from app import ATM, Transaction
                atm = self.db.query(ATM).get(self.atm_id)
                
                # Check if we have historical data
                transaction_count = self.db.query(Transaction).filter(
                    Transaction.atm_id == self.atm_id
                ).count()
                
                if transaction_count >= 30:
                    # Use historical average
                    method = 'historical'
                elif atm:
                    # Use nearest neighbor
                    method = 'nearest'
                else:
                    # Conservative estimate
                    method = 'conservative'
            else:
                method = 'conservative'
        
        if method == 'nearest':
            return self._predict_nearest_neighbor(days)
        elif method == 'historical':
            return self._predict_historical(days)
        else:  # conservative
            return self._predict_conservative(days)
    
    def _predict_nearest_neighbor(self, days: int) -> List[float]:
        """Use predictions from nearest ATM with model"""
        if not self.db:
            return [50000.0] * days
        
        from app import ATM
        atm = self.db.query(ATM).get(self.atm_id)
        
        if not atm:
            return [50000.0] * days
        
        nearest_atm_id = self.find_nearest_atm_with_model({
            'latitude': atm.latitude,
            'longitude': atm.longitude
        })
        
        if not nearest_atm_id:
            return [50000.0] * days
        
        # Try to load and use nearest ATM's model
        try:
            # Import here to avoid circular dependency
            sys.path.insert(0, os.path.dirname(__file__))
            from prediction_service import PredictionService
            
            service = PredictionService()
            predictions = service.predict_demand(nearest_atm_id, days)
            
            # Apply a scaling factor based on location similarity (optional)
            # For now, use as-is
            return predictions
        except Exception as e:
            print(f"Error using nearest neighbor prediction: {e}")
            return [50000.0] * days
    
    def _predict_historical(self, days: int) -> List[float]:
        """Use historical average with day-of-week patterns"""
        avg = self.get_historical_average()
        
        # Simple pattern: weekdays higher, weekends lower
        pattern = []
        for i in range(days):
            day_of_week = (datetime.now() + timedelta(days=i)).weekday()
            
            if day_of_week < 5:  # Weekday
                pattern.append(avg * 1.1)
            else:  # Weekend
                pattern.append(avg * 0.8)
        
        return pattern
    
    def _predict_conservative(self, days: int) -> List[float]:
        """Return conservative estimate to ensure sufficient cash"""
        # Use 60k as safe default with slight variation
        base = 60000.0
        return [base * (0.95 + 0.1 * np.random.random()) for _ in range(days)]
    
    def get_prediction_metadata(self) -> Dict:
        """Return information about which prediction method was used"""
        has_model = self.has_trained_model()
        
        if has_model:
            return {
                'method': 'trained_model',
                'confidence': 'high',
                'message': 'Using trained ML model'
            }
        
        if self.db:
            from app import Transaction
            tx_count = self.db.query(Transaction).filter(
                Transaction.atm_id == self.atm_id
            ).count()
            
            if tx_count >= 30:
                return {
                    'method': 'historical_average',
                    'confidence': 'medium',
                    'message': f'Using historical data ({tx_count} transactions)',
                    'data_points': tx_count
                }
            elif tx_count > 0:
                return {
                    'method': 'nearest_neighbor',
                    'confidence': 'medium',
                    'message': 'Using nearest ATM prediction (limited historical data)',
                    'data_points': tx_count
                }
        
        return {
            'method': 'conservative_estimate',
            'confidence': 'low',
            'message': 'Using conservative estimate (no trained model or historical data)',
            'recommendation': 'Train model after collecting 30+ days of data'
        }


def get_prediction_for_atm(atm_id: int, days: int = 7, db_session=None) -> Dict:
    """
    Unified function to get predictions for any ATM (new or existing)
    
    Args:
        atm_id: ATM identifier
        days: Number of days to predict
        db_session: Database session (optional)
        
    Returns:
        Dict with predictions and metadata
    """
    predictor = FallbackPredictor(atm_id, db_session)
    
    if predictor.has_trained_model():
        # Use trained model
        try:
            sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
            from services.prediction_service import PredictionService
            
            service = PredictionService()
            predictions = service.predict_demand(atm_id, days)
            
            return {
                'predictions': predictions,
                'metadata': predictor.get_prediction_metadata()
            }
        except Exception as e:
            print(f"Error loading trained model: {e}")
            # Fall through to fallback
    
    # Use fallback prediction
    predictions = predictor.predict(days, method='auto')
    
    return {
        'predictions': predictions,
        'metadata': predictor.get_prediction_metadata()
    }
