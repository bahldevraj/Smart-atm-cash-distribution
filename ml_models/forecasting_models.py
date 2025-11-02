"""
ML Forecasting Models for ATM Cash Demand Prediction
Implements ARIMA, LSTM, and Prophet models with ensemble capability
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import pickle
import json
import warnings
warnings.filterwarnings('ignore')

# Model imports
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import statsmodels.api as sm
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.stattools import adfuller

# For LSTM
try:
    import tensorflow as tf
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False
    print("Warning: TensorFlow not available. LSTM model will not be available.")

# For Prophet
try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False
    print("Warning: Prophet not available. Install with: pip install prophet")


class ForecastingModel:
    """Base class for forecasting models"""
    
    def __init__(self, name):
        self.name = name
        self.model = None
        self.scaler = None
        self.is_trained = False
        self.metrics = {}
    
    def calculate_metrics(self, y_true, y_pred):
        """Calculate forecasting metrics"""
        mae = mean_absolute_error(y_true, y_pred)
        rmse = np.sqrt(mean_squared_error(y_true, y_pred))
        mape = np.mean(np.abs((y_true - y_pred) / y_true)) * 100
        r2 = r2_score(y_true, y_pred)
        
        self.metrics = {
            'MAE': round(mae, 2),
            'RMSE': round(rmse, 2),
            'MAPE': round(mape, 2),
            'R2': round(r2, 4)
        }
        return self.metrics
    
    def save_model(self, filepath):
        """Save trained model"""
        with open(filepath, 'wb') as f:
            pickle.dump(self, f)
        print(f"✓ Model saved to {filepath}")
    
    @staticmethod
    def load_model(filepath):
        """Load trained model"""
        with open(filepath, 'rb') as f:
            return pickle.load(f)


class ARIMAForecaster(ForecastingModel):
    """ARIMA model for time series forecasting"""
    
    def __init__(self, order=(5, 1, 2)):
        super().__init__("ARIMA")
        self.order = order
    
    def check_stationarity(self, data):
        """Check if series is stationary using ADF test"""
        result = adfuller(data)
        print(f"ADF Statistic: {result[0]:.4f}")
        print(f"p-value: {result[1]:.4f}")
        is_stationary = result[1] < 0.05
        print(f"Series is {'stationary' if is_stationary else 'non-stationary'}")
        return is_stationary
    
    def train(self, train_data, verbose=True):
        """Train ARIMA model"""
        if verbose:
            print(f"\n=== Training {self.name} Model ===")
            self.check_stationarity(train_data)
        
        try:
            self.model = ARIMA(train_data, order=self.order)
            self.fitted_model = self.model.fit()
            self.is_trained = True
            
            if verbose:
                print(f"✓ {self.name} model trained successfully")
                print(self.fitted_model.summary())
            
            return self.fitted_model
        except Exception as e:
            print(f"✗ Error training {self.name}: {e}")
            return None
    
    def predict(self, steps=7):
        """Make predictions"""
        if not self.is_trained:
            raise ValueError("Model must be trained before prediction")
        
        forecast = self.fitted_model.forecast(steps=steps)
        return np.maximum(forecast, 0)  # Ensure non-negative predictions
    
    def evaluate(self, test_data, steps=None):
        """Evaluate model on test data"""
        if steps is None:
            steps = len(test_data)
        
        predictions = self.predict(steps)
        predictions = predictions[:len(test_data)]
        
        return self.calculate_metrics(test_data, predictions)


class LSTMForecaster(ForecastingModel):
    """LSTM model for time series forecasting"""
    
    def __init__(self, lookback=30, units=50):
        super().__init__("LSTM")
        self.lookback = lookback
        self.units = units
        self.scaler = MinMaxScaler(feature_range=(0, 1))
        
        if not TENSORFLOW_AVAILABLE:
            raise ImportError("TensorFlow is required for LSTM model")
    
    def prepare_data(self, data, train=True):
        """Prepare data for LSTM"""
        if train:
            scaled_data = self.scaler.fit_transform(data.reshape(-1, 1))
        else:
            scaled_data = self.scaler.transform(data.reshape(-1, 1))
        
        X, y = [], []
        for i in range(self.lookback, len(scaled_data)):
            X.append(scaled_data[i-self.lookback:i, 0])
            y.append(scaled_data[i, 0])
        
        return np.array(X), np.array(y)
    
    def build_model(self):
        """Build LSTM architecture"""
        model = Sequential([
            LSTM(self.units, return_sequences=True, input_shape=(self.lookback, 1)),
            Dropout(0.2),
            LSTM(self.units, return_sequences=False),
            Dropout(0.2),
            Dense(25),
            Dense(1)
        ])
        
        model.compile(optimizer='adam', loss='mean_squared_error')
        return model
    
    def train(self, train_data, epochs=50, batch_size=32, verbose=True):
        """Train LSTM model"""
        if verbose:
            print(f"\n=== Training {self.name} Model ===")
        
        X_train, y_train = self.prepare_data(train_data, train=True)
        X_train = X_train.reshape((X_train.shape[0], X_train.shape[1], 1))
        
        self.model = self.build_model()
        
        history = self.model.fit(
            X_train, y_train,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=0.1,
            verbose=1 if verbose else 0
        )
        
        self.is_trained = True
        if verbose:
            print(f"✓ {self.name} model trained successfully")
        
        return history
    
    def predict(self, recent_data, steps=7):
        """Make predictions"""
        if not self.is_trained:
            raise ValueError("Model must be trained before prediction")
        
        predictions = []
        current_sequence = self.scaler.transform(recent_data[-self.lookback:].reshape(-1, 1))
        
        for _ in range(steps):
            X_pred = current_sequence[-self.lookback:].reshape(1, self.lookback, 1)
            next_pred = self.model.predict(X_pred, verbose=0)[0, 0]
            predictions.append(next_pred)
            current_sequence = np.append(current_sequence, [[next_pred]], axis=0)
        
        predictions = self.scaler.inverse_transform(np.array(predictions).reshape(-1, 1))
        return np.maximum(predictions.flatten(), 0)
    
    def evaluate(self, test_data, full_data):
        """Evaluate model on test data"""
        steps = len(test_data)
        recent_data = full_data[-(self.lookback + len(test_data)):-len(test_data)]
        
        predictions = self.predict(recent_data, steps)
        return self.calculate_metrics(test_data, predictions)


class ProphetForecaster(ForecastingModel):
    """Facebook Prophet model for time series forecasting"""
    
    def __init__(self):
        super().__init__("Prophet")
        
        if not PROPHET_AVAILABLE:
            raise ImportError("Prophet is required. Install with: pip install prophet")
    
    def train(self, train_df, verbose=True):
        """Train Prophet model
        
        Args:
            train_df: DataFrame with 'ds' (date) and 'y' (value) columns
        """
        if verbose:
            print(f"\n=== Training {self.name} Model ===")
        
        self.model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            changepoint_prior_scale=0.05
        )
        
        # Add custom seasonalities
        self.model.add_seasonality(name='monthly', period=30.5, fourier_order=5)
        
        self.model.fit(train_df)
        self.is_trained = True
        
        if verbose:
            print(f"✓ {self.name} model trained successfully")
        
        return self.model
    
    def predict(self, periods=7):
        """Make predictions"""
        if not self.is_trained:
            raise ValueError("Model must be trained before prediction")
        
        future = self.model.make_future_dataframe(periods=periods)
        forecast = self.model.predict(future)
        
        predictions = forecast.tail(periods)['yhat'].values
        return np.maximum(predictions, 0)
    
    def evaluate(self, test_df):
        """Evaluate model on test data"""
        periods = len(test_df)
        predictions = self.predict(periods)
        
        return self.calculate_metrics(test_df['y'].values, predictions)


class EnsembleForecaster:
    """Ensemble model combining multiple forecasters"""
    
    def __init__(self, models, weights=None):
        """
        Initialize ensemble
        
        Args:
            models: List of trained forecasting models
            weights: List of weights for each model (default: equal weights)
        """
        self.models = models
        self.weights = weights if weights else [1/len(models)] * len(models)
        self.name = "Ensemble"
        self.metrics = {}
    
    def predict(self, steps=7, **kwargs):
        """Make ensemble predictions"""
        predictions = []
        
        for model, weight in zip(self.models, self.weights):
            try:
                if isinstance(model, LSTMForecaster) and 'recent_data' in kwargs:
                    pred = model.predict(kwargs['recent_data'], steps)
                else:
                    pred = model.predict(steps)
                
                predictions.append(pred * weight)
            except Exception as e:
                print(f"Warning: {model.name} prediction failed: {e}")
        
        if not predictions:
            raise ValueError("All model predictions failed")
        
        ensemble_pred = np.sum(predictions, axis=0)
        return np.maximum(ensemble_pred, 0)
    
    def evaluate(self, test_data, **kwargs):
        """Evaluate ensemble on test data"""
        steps = len(test_data)
        predictions = self.predict(steps, **kwargs)
        
        mae = mean_absolute_error(test_data, predictions)
        rmse = np.sqrt(mean_squared_error(test_data, predictions))
        mape = np.mean(np.abs((test_data - predictions) / test_data)) * 100
        r2 = r2_score(test_data, predictions)
        
        self.metrics = {
            'MAE': round(mae, 2),
            'RMSE': round(rmse, 2),
            'MAPE': round(mape, 2),
            'R2': round(r2, 4)
        }
        return self.metrics


def train_all_models(train_data, test_data, atm_name="ATM", verbose=True):
    """
    Train all available models and return results
    
    Args:
        train_data: Training data (numpy array)
        test_data: Test data (numpy array)
        atm_name: Name of the ATM
        verbose: Print training progress
    
    Returns:
        Dictionary with trained models and their metrics
    """
    results = {
        'atm_name': atm_name,
        'models': {},
        'metrics': {},
        'best_model': None
    }
    
    # 1. Train ARIMA
    try:
        arima = ARIMAForecaster(order=(5, 1, 2))
        arima.train(train_data, verbose=verbose)
        arima_metrics = arima.evaluate(test_data)
        
        results['models']['ARIMA'] = arima
        results['metrics']['ARIMA'] = arima_metrics
        
        if verbose:
            print(f"\nARIMA Metrics: {arima_metrics}")
    except Exception as e:
        print(f"ARIMA training failed: {e}")
    
    # 2. Train LSTM (if available)
    if TENSORFLOW_AVAILABLE:
        try:
            lstm = LSTMForecaster(lookback=30, units=50)
            full_data = np.concatenate([train_data, test_data])
            lstm.train(train_data, epochs=50, verbose=verbose)
            lstm_metrics = lstm.evaluate(test_data, full_data)
            
            results['models']['LSTM'] = lstm
            results['metrics']['LSTM'] = lstm_metrics
            
            if verbose:
                print(f"\nLSTM Metrics: {lstm_metrics}")
        except Exception as e:
            print(f"LSTM training failed: {e}")
    
    # 3. Train Prophet (if available)
    if PROPHET_AVAILABLE:
        try:
            prophet = ProphetForecaster()
            
            # Prepare data for Prophet
            dates = pd.date_range(end=datetime.now(), periods=len(train_data), freq='D')
            train_df = pd.DataFrame({
                'ds': dates,
                'y': train_data
            })
            
            test_dates = pd.date_range(start=dates[-1] + timedelta(days=1), periods=len(test_data), freq='D')
            test_df = pd.DataFrame({
                'ds': test_dates,
                'y': test_data
            })
            
            prophet.train(train_df, verbose=verbose)
            prophet_metrics = prophet.evaluate(test_df)
            
            results['models']['Prophet'] = prophet
            results['metrics']['Prophet'] = prophet_metrics
            
            if verbose:
                print(f"\nProphet Metrics: {prophet_metrics}")
        except Exception as e:
            print(f"Prophet training failed: {e}")
    
    # Determine best model based on MAPE
    if results['metrics']:
        best_model_name = min(results['metrics'], key=lambda x: results['metrics'][x]['MAPE'])
        results['best_model'] = best_model_name
        
        if verbose:
            print(f"\n{'='*50}")
            print(f"Best Model: {best_model_name} (MAPE: {results['metrics'][best_model_name]['MAPE']:.2f}%)")
            print(f"{'='*50}")
    
    return results


if __name__ == "__main__":
    print("ML Forecasting Models Module")
    print("Available models:")
    print(f"  - ARIMA: ✓")
    print(f"  - LSTM: {'✓' if TENSORFLOW_AVAILABLE else '✗ (TensorFlow not installed)'}")
    print(f"  - Prophet: {'✓' if PROPHET_AVAILABLE else '✗ (Prophet not installed)'}")
