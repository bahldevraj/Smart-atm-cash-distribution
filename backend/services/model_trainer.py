"""
Background Model Training Service
Handles asynchronous model training for individual ATMs
"""
import threading
import time
from datetime import datetime
from typing import Dict, Optional
import sys
import os

# Add paths for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from path_config import get_saved_models_dir, get_data_dir


class TrainingJob:
    """Represents a single model training job"""
    
    def __init__(self, atm_id: int, models: list = None):
        self.atm_id = atm_id
        self.models = models or ['arima', 'lstm']
        self.status = 'queued'  # queued, running, completed, failed
        self.progress = 0  # 0-100
        self.message = 'Waiting to start...'
        self.started_at = None
        self.completed_at = None
        self.error = None
        self.results = {}
    
    def to_dict(self):
        """Convert to JSON-serializable dict"""
        # Convert results to ensure JSON serialization
        serializable_results = {}
        if self.results:
            for model_name, metrics in self.results.items():
                if isinstance(metrics, dict):
                    # Convert numpy types to Python native types
                    serializable_results[model_name] = {
                        k: float(v) if hasattr(v, 'item') else v 
                        for k, v in metrics.items()
                    }
                else:
                    serializable_results[model_name] = metrics
        
        return {
            'atm_id': self.atm_id,
            'models': self.models,
            'status': self.status,
            'progress': self.progress,
            'message': self.message,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'error': self.error,
            'results': serializable_results,
            'duration_seconds': (
                (self.completed_at - self.started_at).total_seconds() 
                if self.started_at and self.completed_at 
                else None
            )
        }


class ModelTrainer:
    """Manages background model training jobs"""
    
    def __init__(self):
        self.jobs: Dict[int, TrainingJob] = {}  # atm_id -> TrainingJob
        self.lock = threading.Lock()
    
    def start_training(self, atm_id: int, models: list = None) -> TrainingJob:
        """
        Start training job for an ATM
        
        Args:
            atm_id: ATM ID to train
            models: List of models to train ['arima', 'lstm'] or None for both
            
        Returns:
            TrainingJob object
        """
        with self.lock:
            # Check if already training
            if atm_id in self.jobs and self.jobs[atm_id].status in ['queued', 'running']:
                return self.jobs[atm_id]
            
            # Create new job
            job = TrainingJob(atm_id, models)
            self.jobs[atm_id] = job
            
            # Start training in background thread
            thread = threading.Thread(target=self._train_worker, args=(job,))
            thread.daemon = True
            thread.start()
            
            return job
    
    def get_job_status(self, atm_id: int) -> Optional[TrainingJob]:
        """Get status of training job for an ATM"""
        return self.jobs.get(atm_id)
    
    def _train_worker(self, job: TrainingJob):
        """Background worker that performs actual training"""
        from app import app, db
        
        # Run within Flask application context
        with app.app_context():
            try:
                job.status = 'running'
                job.started_at = datetime.now()
                job.message = 'Preparing training environment...'
                job.progress = 5
                
                print(f"[TRAINING] Starting training for ATM {job.atm_id}")
                
                # Import training modules
                from ml_models.forecasting_models import train_models_for_atm
                
                job.message = 'Loading training data from CSV...'
                job.progress = 10
                
                print(f"[TRAINING] Loading CSV data for ATM {job.atm_id}")
                
                # Load training data from CSV file (original approach)
                import pandas as pd
                csv_path = str(get_data_dir() / 'atm_demand_clean.csv')
                
                if not os.path.exists(csv_path):
                    raise ValueError(f'Training data file not found: {csv_path}')
                
                # Load and filter data for this ATM
                df = pd.read_csv(csv_path)
                df = df[df['atm_id'] == job.atm_id].copy()
                
                if len(df) < 7:  # Need at least a week of data
                    raise ValueError(f'Insufficient training data: {len(df)} days (need 7+)')
                
                # Prepare data in expected format
                daily_demand = df[['date', 'total_demand']].copy()
                daily_demand.columns = ['date', 'demand']
                daily_demand['date'] = pd.to_datetime(daily_demand['date'])
                daily_demand = daily_demand.sort_values('date')
                
                print(f"[TRAINING] Dataset loaded from CSV: {len(daily_demand)} days of data for ATM {job.atm_id}")
                
                job.message = f'Training dataset loaded: {len(daily_demand)} days of data'
                job.progress = 30
                
                results = {}
                
                # Train ARIMA if requested
                if 'arima' in job.models:
                    job.message = 'Training ARIMA model...'
                    job.progress = 40
                    print(f"[TRAINING] Starting ARIMA training for ATM {job.atm_id}")
                    time.sleep(1)  # Simulate training time
                    
                    try:
                        from ml_models.forecasting_models import train_arima_model
                        arima_metrics = train_arima_model(job.atm_id, daily_demand)
                        results['arima'] = arima_metrics
                        job.message = 'ARIMA model trained successfully'
                        job.progress = 60
                        print(f"[TRAINING] ARIMA training completed for ATM {job.atm_id}")
                    except Exception as e:
                        import traceback
                        error_msg = f'{str(e)}\n{traceback.format_exc()}'
                        print(f"[TRAINING ERROR] ARIMA training failed for ATM {job.atm_id}: {error_msg}")
                        job.message = f'ARIMA training failed: {str(e)}'
                        results['arima'] = {'error': str(e)}
                
                # Train LSTM if requested
                if 'lstm' in job.models:
                    job.message = 'Training LSTM model...'
                    job.progress = 70
                    print(f"[TRAINING] Starting LSTM training for ATM {job.atm_id}")
                    time.sleep(2)  # Simulate training time
                    
                    try:
                        from ml_models.forecasting_models import train_lstm_model
                        lstm_metrics = train_lstm_model(job.atm_id, daily_demand)
                        results['lstm'] = lstm_metrics
                        job.message = 'LSTM model trained successfully'
                        job.progress = 90
                        print(f"[TRAINING] LSTM training completed for ATM {job.atm_id}")
                    except Exception as e:
                        import traceback
                        error_msg = f'{str(e)}\n{traceback.format_exc()}'
                        job.message = f'LSTM training failed: {str(e)}'
                        results['lstm'] = {'error': str(e)}
                        print(f"[TRAINING ERROR] LSTM training failed for ATM {job.atm_id}: {error_msg}")
                
                # Check if at least one model trained successfully
                successful_models = [
                    model_name for model_name, metrics in results.items()
                    if isinstance(metrics, dict) and 'error' not in metrics
                ]
                
                if not successful_models:
                    # All models failed - mark as failed
                    raise Exception("All model training attempts failed. Check logs for details.")
                
                job.message = 'Training completed! Models saved.'
                job.progress = 100
                job.status = 'completed'
                job.completed_at = datetime.now()
                job.results = results
                
                print(f"[TRAINING] Training completed successfully for ATM {job.atm_id}. Successful models: {successful_models}")
                
                # Update ATM's last_trained_profile to track when it was trained
                # ONLY update if training actually succeeded
                print(f"[TRAINING] Importing dependencies for profile detection (ATM {job.atm_id})...")
                from app import ATM, _detect_atm_profile
                from services.synthetic_data_generator import SyntheticTransactionGenerator
                import sqlalchemy.exc
                
                print(f"[TRAINING] Querying database for ATM {job.atm_id}...")
                atm = ATM.query.get(job.atm_id)
                if atm:
                    print(f"[TRAINING] ATM {job.atm_id} found in database, detecting profile...")
                    # Get profile detection dependencies
                    manual_overrides = SyntheticTransactionGenerator.MANUAL_PROFILE_OVERRIDES
                    location_profiles = SyntheticTransactionGenerator.LOCATION_PROFILES
                    detected_profile = _detect_atm_profile(atm, manual_overrides, location_profiles)
                    
                    print(f"[TRAINING] Detected profile '{detected_profile}' for ATM {job.atm_id}")
                    atm.last_trained_profile = detected_profile
                    atm.last_trained_at = datetime.now()
                    
                    print(f"[TRAINING] Updated last_trained_at for ATM {job.atm_id} to {atm.last_trained_at}")
                    
                    # Retry logic for database lock
                    max_retries = 3
                    for attempt in range(max_retries):
                        try:
                            print(f"[TRAINING] Attempting to commit database changes (attempt {attempt + 1}/{max_retries})...")
                            db.session.commit()
                            print(f"[TRAINING] Successfully committed last_trained_at update for ATM {job.atm_id}")
                            break
                        except sqlalchemy.exc.OperationalError as e:
                            if 'database is locked' in str(e) and attempt < max_retries - 1:
                                time.sleep(0.5 * (attempt + 1))  # Exponential backoff
                                db.session.rollback()
                                print(f"[TRAINING] Database locked, retrying... (attempt {attempt + 1}/{max_retries})")
                            else:
                                print(f"[TRAINING ERROR] Database commit failed after {max_retries} attempts: {e}")
                                raise
                else:
                    print(f"[TRAINING WARNING] ATM {job.atm_id} not found in database, skipping last_trained_at update")
                
            except Exception as e:
                import traceback
                error_details = traceback.format_exc()
                print(f"[TRAINING ERROR] Fatal error training ATM {job.atm_id}:")
                print(error_details)
                
                job.status = 'failed'
                job.error = str(e)
                job.message = f'Training failed: {str(e)}'
                job.completed_at = datetime.now()
                job.progress = 0  # Reset progress on failure
    
    def clear_completed_jobs(self, max_age_hours: int = 24):
        """Remove completed jobs older than max_age_hours"""
        with self.lock:
            now = datetime.now()
            to_remove = []
            
            for atm_id, job in self.jobs.items():
                if job.status in ['completed', 'failed'] and job.completed_at:
                    age = (now - job.completed_at).total_seconds() / 3600
                    if age > max_age_hours:
                        to_remove.append(atm_id)
            
            for atm_id in to_remove:
                del self.jobs[atm_id]


# Global trainer instance
_trainer_instance = None

def get_trainer() -> ModelTrainer:
    """Get singleton trainer instance"""
    global _trainer_instance
    if _trainer_instance is None:
        _trainer_instance = ModelTrainer()
    return _trainer_instance
