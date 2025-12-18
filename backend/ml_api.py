"""
ML API Integration for ATM Cash Demand Forecasting
Provides REST API endpoints for ATM cash demand predictions
"""

from flask import Blueprint, request, jsonify
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import pickle
import os
import sys

# Use centralized path configuration
from path_config import (
    get_saved_models_dir,
    get_data_dir,
    get_model_path,
    get_lstm_scaler_path
)

from forecasting_models import ARIMAForecaster, LSTMForecaster, EnsembleForecaster

# Create blueprint for ML forecasting routes
ml_forecast_bp = Blueprint('ml_forecast', __name__, url_prefix='/api/ml')

# Global variables to store loaded models
loaded_models = {}
MODEL_DIR = str(get_saved_models_dir())
DATA_PATH = str(get_data_dir() / 'atm_demand_data.csv')


def load_model_for_atm(atm_id: int, model_type: str = 'ensemble'):
    """
    Load trained model for specific ATM
    Returns: (model, actual_model_type) tuple or (None, None) if not found
    """
    model_key = f"{model_type}_atm_{atm_id}"
    
    # Check cache first
    if model_key in loaded_models:
        cached = loaded_models[model_key]
        # Return model and the type it was cached with
        cached_type = model_type
        for key in loaded_models:
            if loaded_models[key] is cached and key.endswith(f"_atm_{atm_id}"):
                cached_type = key.split('_atm_')[0]
                break
        return cached, cached_type
    
    # Try to find any available model for this ATM if requested type doesn't exist
    model_path = None
    actual_model_type = model_type
    
    if model_type in ['arima', 'lstm', 'ensemble']:
        model_path = get_model_path(atm_id, model_type)
        model_path = str(model_path)
        
        # If requested model doesn't exist, try alternatives
        if not os.path.exists(model_path):
            print(f"🔍 {model_type} model not found for ATM {atm_id}, trying alternatives...")
            
            # Try order: arima -> lstm -> ensemble
            alternatives = ['arima', 'lstm', 'ensemble']
            if model_type in alternatives:
                alternatives.remove(model_type)
            
            for alt_type in alternatives:
                alt_path = str(get_model_path(atm_id, alt_type))
                if os.path.exists(alt_path):
                    print(f"✓ Found {alt_type} model instead")
                    model_path = alt_path
                    actual_model_type = alt_type
                    model_key = f"{alt_type}_atm_{atm_id}"
                    break
    else:
        # other types - construct path manually
        model_path = str(get_saved_models_dir() / f"{model_type}_atm_{atm_id}.pkl")
    
    if not model_path or not os.path.exists(model_path):
        print(f"✗ No model found for ATM {atm_id} (tried: {model_type})")
        return None, None
    
    print(f"🔍 Loading {actual_model_type} model for ATM {atm_id}")
    print(f"   Path: {model_path}")
    
    try:
        # Load LSTM models differently
        if model_type == 'lstm' and model_path.endswith('.h5'):
            try:
                from keras.models import load_model as keras_load_model
                
                # Compile with specific options for faster loading
                model = keras_load_model(model_path, compile=False)
                model.compile(optimizer='adam', loss='mse')  # Quick compile
                
                # Load scaler using centralized path config
                scaler_path = str(get_lstm_scaler_path(atm_id))
                if os.path.exists(scaler_path):
                    with open(scaler_path, 'rb') as f:
                        scaler = pickle.load(f)
                    
                    # Create a wrapper object that has predict method
                    class LSTMModelWrapper:
                        def __init__(self, model, scaler):
                            self.model = model
                            self.scaler = scaler
                            self.is_trained = True
                            # Warmup prediction for faster subsequent calls
                            dummy_input = np.zeros((1, 30, 1))
                            self.model.predict(dummy_input, verbose=0)
                        
                        def predict(self, steps=7, recent_data=None):
                            """Generate LSTM predictions"""
                            if recent_data is None or len(recent_data) < 30:
                                raise ValueError("LSTM requires at least 30 days of recent data")
                            
                            # Prepare data
                            scaled_data = self.scaler.transform(recent_data.reshape(-1, 1))
                            
                            predictions = []
                            current_data = scaled_data[-30:].reshape(1, 30, 1)
                            
                            for _ in range(steps):
                                pred = self.model.predict(current_data, verbose=0)
                                predictions.append(self.scaler.inverse_transform(pred)[0, 0])
                                # Update window
                                current_data = np.append(current_data[:, 1:, :], pred.reshape(1, 1, 1), axis=1)
                            
                            return np.array(predictions)
                    
                    forecaster = LSTMModelWrapper(model, scaler)
                else:
                    print(f"⚠ LSTM scaler not found for ATM {atm_id}")
                    return None
            except ImportError:
                print(f"⚠ Keras not available for loading LSTM model")
                return None
        else:
            # Load using pickle (ARIMA and ensemble models)
            with open(model_path, 'rb') as f:
                forecaster = pickle.load(f)
        
        # Verify the model object was loaded
        if forecaster is None:
            print(f"✗ Model file loaded but object is None: {model_path}")
            return None
        
        # Mark as trained if not already marked
        if not hasattr(forecaster, 'is_trained'):
            forecaster.is_trained = True
        
        print(f"✓ Successfully loaded {actual_model_type} model for ATM {atm_id}")
        loaded_models[model_key] = forecaster
        
        # Also cache under the actual model type if different
        if actual_model_type != model_type:
            actual_key = f"{actual_model_type}_atm_{atm_id}"
            loaded_models[actual_key] = forecaster
        
        return forecaster, actual_model_type
    except Exception as e:
        print(f"Error loading model: {e}")
        import traceback
        traceback.print_exc()
        return None, None


def get_recent_data(atm_id: int, days: int = 30):
    """Get recent historical data for LSTM predictions"""
    try:
        df = pd.read_csv(DATA_PATH)
        df = df[df['atm_id'] == atm_id].copy()
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date')
        recent = df.tail(days)
        return recent['total_demand'].values  # Changed from 'demand' to 'total_demand'
    except Exception as e:
        print(f"Error loading recent data: {e}")
        return None


@ml_forecast_bp.route('/forecast/<int:atm_id>', methods=['POST'])
def ml_forecast(atm_id):
    """
    Make ML-based forecast for specific ATM
    
    Request body:
    {
        "days_ahead": 7,
        "model_type": "ensemble"  # or "arima", "lstm"
    }
    """
    data = request.get_json() or {}
    days_ahead = data.get('days_ahead', 7)
    model_type = data.get('model_type', 'arima')
    
    # Validate days
    if days_ahead < 1 or days_ahead > 90:
        return jsonify({
            'error': 'Invalid days_ahead',
            'message': 'Days must be between 1 and 90'
        }), 400
    
    # Load model
    model, actual_model_type = load_model_for_atm(atm_id, model_type)
    
    if model is None:
        # Try fallback to using the prediction service instead
        try:
            from services.prediction_service import get_prediction_service
            pred_service = get_prediction_service()
            
            # Generate predictions for each day
            predictions = []
            forecast_dates = []
            start_date = datetime.now().date() + timedelta(days=1)
            
            for day in range(days_ahead):
                pred_date = start_date + timedelta(days=day)
                forecast_dates.append(pred_date.isoformat())
                
                # Get prediction for this day
                pred_value = pred_service.predict_demand(atm_id, days_ahead=day+1)
                predictions.append(round(float(pred_value), 2))
            
            print(f"✓ Using fallback prediction service for ATM {atm_id}")
            return jsonify({
                'atm_id': atm_id,
                'model_type': 'fallback',
                'forecast_dates': forecast_dates,
                'predictions': predictions,
                'total_predicted': round(float(np.sum(predictions)), 2),
                'avg_daily': round(float(np.mean(predictions)), 2),
                'confidence': 'medium',
                'method': 'fallback_predictor',
                'message': 'Using intelligent fallback prediction. Train a model for better accuracy.'
            })
        except Exception as fallback_error:
            print(f"⚠ Fallback prediction also failed: {fallback_error}")
            import traceback
            traceback.print_exc()
        
        return jsonify({
            'error': f'Model not found for ATM {atm_id}',
            'message': 'Model not trained yet. Click "Train Model" button in ATM Management to train a model for better predictions.',
            'suggestion': 'Using conservative estimates until model is trained',
            'training_required': True
        }), 404
    
    try:
        # Get recent data for LSTM/ensemble (use actual_model_type)
        recent_data = None
        if actual_model_type in ['lstm', 'ensemble']:
            recent_data = get_recent_data(atm_id, days=30)
            if recent_data is None:
                return jsonify({
                    'error': 'Could not load historical data',
                    'message': 'Historical data required for LSTM predictions'
                }), 500
        
        # Make prediction based on actual model type loaded
        if actual_model_type == 'arima' or actual_model_type == 'ensemble':
            # ARIMA/Ensemble models use forecast() method (statsmodels)
            if hasattr(model, 'forecast'):
                predictions = model.forecast(steps=days_ahead)
            elif hasattr(model, 'predict'):
                predictions = model.predict(steps=days_ahead)
            else:
                raise ValueError("Model has no forecast or predict method")
        elif actual_model_type == 'lstm' and recent_data is not None:
            predictions = model.predict(steps=days_ahead, recent_data=recent_data)
        else:
            predictions = model.predict(steps=days_ahead)
        
        # Convert predictions to numpy array if needed
        if hasattr(predictions, 'values'):
            predictions = predictions.values
        elif not isinstance(predictions, np.ndarray):
            predictions = np.array(predictions)
        
        # Ensure non-negative predictions
        predictions = np.maximum(predictions, 0)
        
        # Generate dates
        start_date = datetime.now().date() + timedelta(days=1)
        forecast_dates = [(start_date + timedelta(days=i)).isoformat() 
                         for i in range(days_ahead)]
        
        # Prepare response
        forecast_data = []
        for date, pred in zip(forecast_dates, predictions):
            forecast_data.append({
                'date': date,
                'predicted_demand': round(float(pred), 2),
                'predicted_demand_formatted': f"${pred:,.2f}",
                'day_of_week': datetime.fromisoformat(date).strftime('%A')
            })
        
        return jsonify({
            'atm_id': atm_id,
            'model_type': actual_model_type,  # Return the actual model type used
            'requested_model_type': model_type,  # What was requested
            'forecast': forecast_data,
            'total_predicted_demand': round(float(np.sum(predictions)), 2),
            'total_predicted_demand_formatted': f"${np.sum(predictions):,.2f}",
            'avg_daily_demand': round(float(np.mean(predictions)), 2),
            'avg_daily_demand_formatted': f"${np.mean(predictions):,.2f}",
            'max_demand': round(float(np.max(predictions)), 2),
            'min_demand': round(float(np.min(predictions)), 2)
        })
        
    except Exception as e:
        return jsonify({
            'error': 'Prediction failed',
            'message': str(e)
        }), 500


@ml_forecast_bp.route('/forecast/compare/<int:atm_id>', methods=['POST'])
def compare_models(atm_id):
    """
    Compare predictions from all available models
    
    Request body:
    {
        "days_ahead": 7
    }
    """
    data = request.get_json() or {}
    days_ahead = data.get('days_ahead', 7)
    
    # Get recent data for LSTM/ensemble
    recent_data = get_recent_data(atm_id, days=30)
    
    model_types = ['arima', 'lstm', 'ensemble']
    results = {}
    
    for model_type in model_types:
        model = load_model_for_atm(atm_id, model_type)
        
        if model is None:
            continue
        
        try:
            # Make prediction
            if model_type in ['lstm', 'ensemble'] and recent_data is not None:
                predictions = model.predict(steps=days_ahead, recent_data=recent_data)
            else:
                predictions = model.predict(steps=days_ahead)
            
            results[model_type] = {
                'predictions': [round(float(p), 2) for p in predictions],
                'total': round(float(np.sum(predictions)), 2),
                'total_formatted': f"${np.sum(predictions):,.2f}",
                'average': round(float(np.mean(predictions)), 2),
                'average_formatted': f"${np.mean(predictions):,.2f}",
                'max': round(float(np.max(predictions)), 2),
                'min': round(float(np.min(predictions)), 2)
            }
        except Exception as e:
            results[model_type] = {'error': str(e)}
    
    if not results:
        return jsonify({
            'error': 'No models found',
            'message': 'Train models first using the notebooks'
        }), 404
    
    # Generate dates
    start_date = datetime.now().date() + timedelta(days=1)
    forecast_dates = [(start_date + timedelta(days=i)).isoformat() 
                     for i in range(days_ahead)]
    
    return jsonify({
        'atm_id': atm_id,
        'days_ahead': days_ahead,
        'forecast_dates': forecast_dates,
        'models': results,
        'available_models': list(results.keys()),
        'models_count': len(results)
    })


@ml_forecast_bp.route('/models/status', methods=['GET'])
def models_status():
    """Get status of all trained models"""
    status = {
        'available_models': [],
        'models_directory': MODEL_DIR,
        'loaded_models': list(loaded_models.keys())
    }
    
    if os.path.exists(MODEL_DIR):
        model_files = [f for f in os.listdir(MODEL_DIR) if f.endswith('.pkl')]
        status['available_models'] = model_files
        status['total_models'] = len(model_files)
    else:
        status['error'] = 'Models directory not found'
    
    return jsonify(status)


@ml_forecast_bp.route('/models/metrics/<int:atm_id>', methods=['GET'])
def get_model_metrics(atm_id):
    """Get performance metrics for all models of specific ATM"""
    metrics_file = os.path.join(MODEL_DIR, f"model_metrics_atm_{atm_id}.csv")
    
    if not os.path.exists(metrics_file):
        return jsonify({
            'error': f'Metrics not found for ATM {atm_id}',
            'message': 'Train and evaluate models first'
        }), 404
    
    try:
        # Read CSV with correct column names: atm_id, model_type, mae, rmse, mape, training_days, trained_date
        metrics_df = pd.read_csv(metrics_file)
        
        # Convert to dict with model_type as key
        metrics_dict = {}
        for _, row in metrics_df.iterrows():
            model_name = row['model_type']
            metrics_dict[model_name] = {
                'mae': float(row['mae']),
                'rmse': float(row['rmse']),
                'mape': float(row['mape']),
                'training_days': int(row.get('training_days', 365)),
                'trained_date': row.get('trained_date', 'N/A')
            }
        
        # Find best model (lowest MAPE)
        best_model = None
        best_mape = float('inf')
        for model_name, metrics in metrics_dict.items():
            if metrics['mape'] < best_mape:
                best_mape = metrics['mape']
                best_model = model_name
        
        # Format metrics for better readability
        formatted_metrics = []
        for model_name, metrics in metrics_dict.items():
            formatted_metrics.append({
                'model': model_name,
                'mae': round(metrics['mae'], 2),
                'mae_formatted': f"${metrics['mae']:,.2f}",
                'rmse': round(metrics['rmse'], 2),
                'rmse_formatted': f"${metrics['rmse']:,.2f}",
                'mape': round(metrics['mape'], 2),
                'mape_formatted': f"{metrics['mape']:.2f}%",
                'training_days': metrics['training_days'],
                'trained_date': metrics['trained_date'],
                'is_best': model_name == best_model
            })
        
        return jsonify({
            'atm_id': atm_id,
            'metrics': formatted_metrics,
            'best_model': best_model,
            'best_mape': round(best_mape, 2) if best_model else None,
            'interpretation': {
                'MAE': 'Mean Absolute Error - Average prediction error in dollars',
                'RMSE': 'Root Mean Square Error - Penalizes large errors more',
                'MAPE': 'Mean Absolute Percentage Error - Lower is better (< 20% is good)'
            }
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': 'Failed to read metrics',
            'message': str(e)
        }), 500


@ml_forecast_bp.route('/forecast/batch', methods=['POST'])
def batch_forecast():
    """
    Get forecasts for multiple ATMs at once
    
    Request body:
    {
        "atm_ids": [1, 2, 3, 4],
        "days_ahead": 7,
        "model_type": "ensemble"
    }
    """
    data = request.get_json()
    atm_ids = data.get('atm_ids', [])
    days_ahead = data.get('days_ahead', 7)
    model_type = data.get('model_type', 'ensemble')
    
    if not atm_ids:
        return jsonify({'error': 'No ATM IDs provided'}), 400
    
    results = {}
    
    for atm_id in atm_ids:
        model = load_model_for_atm(atm_id, model_type)
        
        if model is None:
            results[atm_id] = {'error': 'Model not found'}
            continue
        
        try:
            predictions = model.predict(steps=days_ahead)
            results[atm_id] = {
                'predictions': [round(float(p), 2) for p in predictions],
                'total_predicted': round(float(np.sum(predictions)), 2),
                'avg_daily': round(float(np.mean(predictions)), 2)
            }
        except Exception as e:
            results[atm_id] = {'error': str(e)}
    
    # Generate dates
    start_date = datetime.now().date() + timedelta(days=1)
    forecast_dates = [(start_date + timedelta(days=i)).isoformat() 
                     for i in range(days_ahead)]
    
    return jsonify({
        'forecast_dates': forecast_dates,
        'model_type': model_type,
        'forecasts': results,
        'total_atms': len(atm_ids),
        'successful_forecasts': sum(1 for r in results.values() if 'error' not in r)
    })


def register_ml_routes(app):
    """Register ML forecast routes with Flask app"""
    app.register_blueprint(ml_forecast_bp)
    print("✓ ML Forecasting API routes registered")


# Health check endpoint
@ml_forecast_bp.route('/health', methods=['GET'])
def health_check():
    """Health check for ML API"""
    return jsonify({
        'status': 'healthy',
        'service': 'ML Forecasting API',
        'version': '1.0.0',
        'models_loaded': len(loaded_models),
        'timestamp': datetime.now().isoformat()
    })
