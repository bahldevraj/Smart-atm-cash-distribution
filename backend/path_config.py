"""
Path Configuration Module
Centralized, cross-platform path resolution for the Smart ATM System
"""

import os
import sys
from pathlib import Path

# Get absolute paths using pathlib for cross-platform compatibility
BACKEND_DIR = Path(__file__).parent.resolve()
PROJECT_ROOT = BACKEND_DIR.parent.resolve()
ML_MODELS_DIR = PROJECT_ROOT / 'ml_models'
SAVED_MODELS_DIR = ML_MODELS_DIR / 'saved_models'
DATA_DIR = ML_MODELS_DIR / 'data'
INSTANCE_DIR = BACKEND_DIR / 'instance'

# Ensure critical directories exist
INSTANCE_DIR.mkdir(exist_ok=True)
SAVED_MODELS_DIR.mkdir(parents=True, exist_ok=True)

# Add ml_models to Python path if not already there
ml_models_str = str(ML_MODELS_DIR)
if ml_models_str not in sys.path:
    sys.path.insert(0, ml_models_str)


def get_project_root() -> Path:
    """Get project root directory"""
    return PROJECT_ROOT


def get_backend_dir() -> Path:
    """Get backend directory"""
    return BACKEND_DIR


def get_ml_models_dir() -> Path:
    """Get ml_models directory"""
    return ML_MODELS_DIR


def get_saved_models_dir() -> Path:
    """Get saved models directory"""
    return SAVED_MODELS_DIR


def get_data_dir() -> Path:
    """Get data directory"""
    return DATA_DIR


def get_instance_dir() -> Path:
    """Get instance directory (for database)"""
    return INSTANCE_DIR


def get_model_path(atm_id: int, model_type: str = 'arima') -> Path:
    """
    Get path for a specific model file
    
    Args:
        atm_id: ATM identifier (1-15)
        model_type: Type of model ('arima', 'lstm', 'ensemble')
        
    Returns:
        Path object for the model file
    """
    if model_type == 'lstm':
        return SAVED_MODELS_DIR / f'lstm_model_atm_{atm_id}.h5'
    elif model_type == 'arima':
        return SAVED_MODELS_DIR / f'arima_model_atm_{atm_id}.pkl'
    elif model_type == 'ensemble':
        return SAVED_MODELS_DIR / f'ensemble_atm_{atm_id}.pkl'
    else:
        raise ValueError(f"Unknown model type: {model_type}")


def get_lstm_scaler_path(atm_id: int) -> Path:
    """Get path for LSTM scaler file"""
    return SAVED_MODELS_DIR / f'lstm_scaler_atm_{atm_id}.pkl'


def get_model_metrics_path(atm_id: int) -> Path:
    """Get path for model metrics CSV file"""
    return SAVED_MODELS_DIR / f'model_metrics_atm_{atm_id}.csv'


def get_database_uri(database_name: str = 'smart_atm.db') -> str:
    """
    Get database URI with proper path
    
    Args:
        database_name: Name of the database file
        
    Returns:
        SQLAlchemy database URI
    """
    db_path = INSTANCE_DIR / database_name
    # Convert to URI format with forward slashes
    return f'sqlite:///{db_path.as_posix()}'


def ensure_directory_exists(directory: Path) -> None:
    """
    Ensure a directory exists, create if it doesn't
    
    Args:
        directory: Path object for the directory
    """
    directory.mkdir(parents=True, exist_ok=True)


# Print configuration on import (for debugging)
if __name__ == '__main__':
    print("=" * 60)
    print("Smart ATM System - Path Configuration")
    print("=" * 60)
    print(f"Project Root:    {PROJECT_ROOT}")
    print(f"Backend Dir:     {BACKEND_DIR}")
    print(f"ML Models Dir:   {ML_MODELS_DIR}")
    print(f"Saved Models:    {SAVED_MODELS_DIR}")
    print(f"Data Dir:        {DATA_DIR}")
    print(f"Instance Dir:    {INSTANCE_DIR}")
    print(f"Database URI:    {get_database_uri()}")
    print("=" * 60)
    print(f"ML Models in path: {ml_models_str in sys.path}")
    print("=" * 60)
