from flask import Flask, request, jsonify, make_response
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from sqlalchemy import text, Index
from datetime import datetime, timedelta
import numpy as np
from sklearn.linear_model import LinearRegression
from scipy.optimize import linprog
import pandas as pd
from typing import List, Dict, Tuple
import json
import io
from functools import lru_cache, wraps
import time
import jwt
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from werkzeug.security import generate_password_hash, check_password_hash
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URI', 'sqlite:///smart_atm.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ECHO'] = False  # Disable SQL logging for performance
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_size': 10,
    'pool_recycle': 3600,
    'pool_pre_ping': True
}

# Security configuration - Load from environment variables
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'dev-jwt-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

# Email configuration - Load from environment variables
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True') == 'True'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME', '')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD', '')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER', '')

db = SQLAlchemy(app)
CORS(app, supports_credentials=True)

# Simple in-memory cache for frequently accessed data
cache = {}
CACHE_TIMEOUT = 60  # 60 seconds

# Import and register ML API routes
try:
    from ml_api import register_ml_routes
    ML_API_AVAILABLE = True
except ImportError as e:
    print(f"⚠ Warning: ML API not available: {e}")
    ML_API_AVAILABLE = False

# Import and register AI Recommendations API routes
try:
    from ai_recommendations import register_ai_routes
    AI_API_AVAILABLE = True
except ImportError as e:
    print(f"⚠ Warning: AI Recommendations API not available: {e}")
    AI_API_AVAILABLE = False

# Cache helper functions
def get_cache(key):
    if key in cache:
        data, timestamp = cache[key]
        if time.time() - timestamp < CACHE_TIMEOUT:
            return data
    return None

def set_cache(key, value):
    cache[key] = (value, time.time())

def clear_cache():
    cache.clear()

# Authentication helper functions
def send_verification_email(email, token):
    """Send email verification link"""
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Verify Your Smart ATM System Email'
        msg['From'] = app.config['MAIL_DEFAULT_SENDER']
        msg['To'] = email
        
        verification_url = f"http://localhost:3000/verify-email?token={token}"
        
        html = f"""
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Welcome to Smart ATM Cash Optimizer!</h2>
            <p>Please verify your email address to activate your account.</p>
            <p>Click the button below to verify your email:</p>
            <a href="{verification_url}" style="display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
            <p>Or copy and paste this link into your browser:</p>
            <p>{verification_url}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account, please ignore this email.</p>
          </body>
        </html>
        """
        
        part = MIMEText(html, 'html')
        msg.attach(part)
        
        with smtplib.SMTP(app.config['MAIL_SERVER'], app.config['MAIL_PORT']) as server:
            server.starttls()
            server.login(app.config['MAIL_USERNAME'], app.config['MAIL_PASSWORD'])
            server.send_message(msg)
        
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False

def generate_token(user_id):
    """Generate JWT access token"""
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + app.config['JWT_ACCESS_TOKEN_EXPIRES'],
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, app.config['JWT_SECRET_KEY'], algorithm='HS256')

def decode_token(token):
    """Decode and verify JWT token"""
    try:
        payload = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def token_required(f):
    """Decorator to protect routes with JWT authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]  # Bearer <token>
            except IndexError:
                return jsonify({'error': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'error': 'Authentication token is missing'}), 401
        
        user_id = decode_token(token)
        if user_id is None:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 401
        
        return f(user, *args, **kwargs)
    
    return decorated

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    is_verified = db.Column(db.Boolean, default=True)  # Auto-verified, no email verification needed
    is_approved = db.Column(db.Boolean, default=False)  # Requires root approval
    is_root = db.Column(db.Boolean, default=False)  # Root admin user
    verification_token = db.Column(db.String(100), unique=True, nullable=True)
    reset_token = db.Column(db.String(100), unique=True, nullable=True)
    reset_token_expires = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime, nullable=True)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def generate_verification_token(self):
        self.verification_token = secrets.token_urlsafe(32)
        return self.verification_token
    
    def generate_reset_token(self):
        self.reset_token = secrets.token_urlsafe(32)
        self.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
        return self.reset_token
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'is_verified': self.is_verified,
            'is_approved': self.is_approved,
            'is_root': self.is_root,
            'created_at': self.created_at.isoformat(),
            'last_login': self.last_login.isoformat() if self.last_login else None
        }

class Vault(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(200), nullable=False)
    capacity = db.Column(db.Float, nullable=False)
    current_balance = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'location': self.location,
            'capacity': self.capacity,
            'current_balance': self.current_balance,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class ATM(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(200), nullable=False)
    capacity = db.Column(db.Float, nullable=False)
    current_balance = db.Column(db.Float, nullable=False)
    daily_avg_demand = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'location': self.location,
            'capacity': self.capacity,
            'current_balance': self.current_balance,
            'daily_avg_demand': self.daily_avg_demand,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class TransactionSection(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(500))
    color = db.Column(db.String(20), default='blue')  # Color for UI
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_default = db.Column(db.Boolean, default=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'color': self.color,
            'created_at': self.created_at.isoformat(),
            'is_default': self.is_default,
            'transaction_count': Transaction.query.filter_by(section_id=self.id).count()
        }

class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    vault_id = db.Column(db.Integer, db.ForeignKey('vault.id'), nullable=False)
    atm_id = db.Column(db.Integer, db.ForeignKey('atm.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    transaction_type = db.Column(db.String(50), nullable=False)  # 'allocation', 'withdrawal'
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    section_id = db.Column(db.Integer, db.ForeignKey('transaction_section.id'), nullable=True)
    notes = db.Column(db.String(500))  # Optional notes for imported data
    
    vault = db.relationship('Vault', backref=db.backref('transactions', lazy=True))
    atm = db.relationship('ATM', backref=db.backref('transactions', lazy=True))
    section = db.relationship('TransactionSection', backref=db.backref('transactions', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'vault_id': self.vault_id,
            'atm_id': self.atm_id,
            'amount': self.amount,
            'transaction_type': self.transaction_type,
            'timestamp': self.timestamp.isoformat(),
            'vault_name': self.vault.name if self.vault else None,
            'atm_name': self.atm.name if self.atm else None,
            'section_id': self.section_id,
            'section_name': self.section.name if self.section else None,
            'notes': self.notes
        }

class DemandHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    atm_id = db.Column(db.Integer, db.ForeignKey('atm.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    demand = db.Column(db.Float, nullable=False)
    
    atm = db.relationship('ATM', backref=db.backref('demand_history', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'atm_id': self.atm_id,
            'date': self.date.isoformat(),
            'demand': self.demand
        }

# Optimization Engine
class OptimizationEngine:
    @staticmethod
    def greedy_allocation(vaults: List[Dict], atms: List[Dict]) -> Dict:
        """Greedy algorithm for cash allocation"""
        allocations = []
        total_shortage = 0
        
        # Sort ATMs by shortage (demand - current_balance) in descending order
        atm_shortages = []
        for atm in atms:
            shortage = max(0, atm['daily_avg_demand'] - atm['current_balance'])
            if shortage > 0:
                atm_shortages.append((atm, shortage))
        
        atm_shortages.sort(key=lambda x: x[1], reverse=True)
        
        # Sort vaults by current balance in descending order
        vault_balances = sorted(vaults, key=lambda x: x['current_balance'], reverse=True)
        
        for atm, shortage in atm_shortages:
            for vault in vault_balances:
                if vault['current_balance'] <= 0:
                    continue
                
                allocation_amount = min(shortage, vault['current_balance'])
                if allocation_amount > 0:
                    allocations.append({
                        'vault_id': vault['id'],
                        'vault_name': vault['name'],
                        'atm_id': atm['id'],
                        'atm_name': atm['name'],
                        'amount': allocation_amount,
                        'shortage_before': shortage
                    })
                    
                    vault['current_balance'] -= allocation_amount
                    shortage -= allocation_amount
                    
                    if shortage <= 0:
                        break
            
            if shortage > 0:
                total_shortage += shortage
        
        return {
            'allocations': allocations,
            'total_shortage': total_shortage,
            'algorithm': 'greedy'
        }
    
    @staticmethod
    def linear_programming_allocation(vaults: List[Dict], atms: List[Dict]) -> Dict:
        """Linear Programming optimization for cash allocation"""
        try:
            n_vaults = len(vaults)
            n_atms = len(atms)
            
            if n_vaults == 0 or n_atms == 0:
                return {'allocations': [], 'total_shortage': 0, 'algorithm': 'linear_programming'}
            
            # Decision variables: x[i][j] = amount from vault i to ATM j
            # Flattened: x[i*n_atms + j]
            n_vars = n_vaults * n_atms
            
            # Objective: minimize total unmet demand (maximize satisfaction)
            # We'll minimize negative satisfaction
            c = []
            for i in range(n_vaults):
                for j in range(n_atms):
                    c.append(-1)  # Maximize allocation
            
            # Constraints
            A_ub = []
            b_ub = []
            
            # Vault capacity constraints: sum of allocations from each vault <= vault balance
            for i in range(n_vaults):
                constraint = [0] * n_vars
                for j in range(n_atms):
                    constraint[i * n_atms + j] = 1
                A_ub.append(constraint)
                b_ub.append(vaults[i]['current_balance'])
            
            # ATM demand constraints: allocation to each ATM <= its shortage
            for j in range(n_atms):
                shortage = max(0, atms[j]['daily_avg_demand'] - atms[j]['current_balance'])
                constraint = [0] * n_vars
                for i in range(n_vaults):
                    constraint[i * n_atms + j] = 1
                A_ub.append(constraint)
                b_ub.append(shortage)
            
            # Bounds: all variables >= 0
            bounds = [(0, None) for _ in range(n_vars)]
            
            # Solve
            result = linprog(c, A_ub=A_ub, b_ub=b_ub, bounds=bounds, method='highs')
            
            allocations = []
            total_shortage = 0
            
            if result.success:
                x = result.x
                for i in range(n_vaults):
                    for j in range(n_atms):
                        amount = x[i * n_atms + j]
                        if amount > 0.01:  # Threshold to avoid tiny allocations
                            allocations.append({
                                'vault_id': vaults[i]['id'],
                                'vault_name': vaults[i]['name'],
                                'atm_id': atms[j]['id'],
                                'atm_name': atms[j]['name'],
                                'amount': round(amount, 2),
                                'shortage_before': max(0, atms[j]['daily_avg_demand'] - atms[j]['current_balance'])
                            })
                
                # Calculate remaining shortages
                for j in range(n_atms):
                    allocated = sum(x[i * n_atms + j] for i in range(n_vaults))
                    shortage = max(0, atms[j]['daily_avg_demand'] - atms[j]['current_balance'])
                    remaining_shortage = max(0, shortage - allocated)
                    total_shortage += remaining_shortage
            
            return {
                'allocations': allocations,
                'total_shortage': total_shortage,
                'algorithm': 'linear_programming',
                'optimization_success': result.success
            }
            
        except Exception as e:
            # Fallback to greedy if LP fails
            return OptimizationEngine.greedy_allocation(vaults, atms)

# ML Forecasting Engine
class ForecastingEngine:
    @staticmethod
    def predict_demand(atm_id: int, days_ahead: int = 1) -> float:
        """Simple ML-based demand forecasting"""
        try:
            # Get historical data
            history = DemandHistory.query.filter_by(atm_id=atm_id).order_by(DemandHistory.date.desc()).limit(30).all()
            
            if len(history) < 3:
                # Fallback to current average if insufficient data
                atm = ATM.query.get(atm_id)
                return atm.daily_avg_demand if atm else 5000.0
            
            # Prepare data for linear regression
            X = np.array(range(len(history))).reshape(-1, 1)
            y = np.array([h.demand for h in reversed(history)])
            
            # Simple linear regression
            model = LinearRegression()
            model.fit(X, y)
            
            # Predict future demand
            future_day = len(history) + days_ahead - 1
            prediction = model.predict([[future_day]])[0]
            
            # Ensure non-negative prediction
            return max(0, prediction)
            
        except Exception:
            # Fallback to average
            atm = ATM.query.get(atm_id)
            return atm.daily_avg_demand if atm else 5000.0

# Authentication API Routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.get_json()
    
    # Validate input
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password are required'}), 400
    
    email = data['email'].lower().strip()
    password = data['password']
    name = data.get('name', '').strip()
    
    # Check if user already exists
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 400
    
    # Create new user (is_approved=False by default, requires root approval)
    # is_verified is True by default (no email verification needed)
    user = User(email=email, name=name, is_approved=False, is_verified=True)
    user.set_password(password)
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({
        'message': 'Registration successful! Your account is pending approval by the administrator. You will be able to login once approved.',
        'email': email
    }), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login user"""
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password are required'}), 400
    
    email = data['email'].lower().strip()
    password = data['password']
    
    user = User.query.filter_by(email=email).first()
    
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401
    
    # Check if user is approved (root user bypasses this check)
    if not user.is_root and not user.is_approved:
        return jsonify({'error': 'Your account is pending approval by the administrator. Please wait for approval.'}), 403
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.session.commit()
    
    # Generate token
    token = generate_token(user.id)
    
    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user': user.to_dict()
    }), 200

@app.route('/api/auth/verify-email', methods=['POST'])
def verify_email():
    """Verify email with token"""
    data = request.get_json()
    
    if not data or not data.get('token'):
        return jsonify({'error': 'Verification token is required'}), 400
    
    token = data['token']
    user = User.query.filter_by(verification_token=token).first()
    
    if not user:
        return jsonify({'error': 'Invalid or expired verification token'}), 400
    
    if user.is_verified:
        return jsonify({'message': 'Email already verified'}), 200
    
    user.is_verified = True
    user.verification_token = None
    db.session.commit()
    
    return jsonify({
        'message': 'Email verified successfully. You can now log in.',
        'user': user.to_dict()
    }), 200

@app.route('/api/auth/resend-verification', methods=['POST'])
def resend_verification():
    """Resend verification email"""
    data = request.get_json()
    
    if not data or not data.get('email'):
        return jsonify({'error': 'Email is required'}), 400
    
    email = data['email'].lower().strip()
    user = User.query.filter_by(email=email).first()
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if user.is_verified:
        return jsonify({'message': 'Email already verified'}), 200
    
    token = user.generate_verification_token()
    db.session.commit()
    
    if send_verification_email(email, token):
        return jsonify({'message': 'Verification email sent successfully'}), 200
    else:
        return jsonify({'error': 'Failed to send verification email'}), 500

@app.route('/api/auth/me', methods=['GET'])
@token_required
def get_current_user(user):
    """Get current user info"""
    return jsonify(user.to_dict()), 200

@app.route('/api/auth/logout', methods=['POST'])
@token_required
def logout(user):
    """Logout user (client-side token removal)"""
    return jsonify({'message': 'Logged out successfully'}), 200

# Access Control Routes (Root Admin Only)
@app.route('/api/admin/users', methods=['GET'])
@token_required
def get_all_users(user):
    """Get all users (root only)"""
    if not user.is_root:
        return jsonify({'error': 'Access denied. Root privileges required.'}), 403
    
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify({
        'users': [u.to_dict() for u in users],
        'total': len(users)
    }), 200

@app.route('/api/admin/users/<int:user_id>/approve', methods=['POST'])
@token_required
def approve_user(user, user_id):
    """Approve a user (root only)"""
    if not user.is_root:
        return jsonify({'error': 'Access denied. Root privileges required.'}), 403
    
    target_user = User.query.get(user_id)
    if not target_user:
        return jsonify({'error': 'User not found'}), 404
    
    if target_user.is_root:
        return jsonify({'error': 'Cannot modify root user'}), 400
    
    target_user.is_approved = True
    db.session.commit()
    
    return jsonify({
        'message': f'User {target_user.email} approved successfully',
        'user': target_user.to_dict()
    }), 200

@app.route('/api/admin/users/<int:user_id>/revoke', methods=['POST'])
@token_required
def revoke_user(user, user_id):
    """Revoke user access (root only)"""
    if not user.is_root:
        return jsonify({'error': 'Access denied. Root privileges required.'}), 403
    
    target_user = User.query.get(user_id)
    if not target_user:
        return jsonify({'error': 'User not found'}), 404
    
    if target_user.is_root:
        return jsonify({'error': 'Cannot modify root user'}), 400
    
    target_user.is_approved = False
    db.session.commit()
    
    return jsonify({
        'message': f'Access revoked for user {target_user.email}',
        'user': target_user.to_dict()
    }), 200

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@token_required
def delete_user(user, user_id):
    """Delete a user (root only)"""
    if not user.is_root:
        return jsonify({'error': 'Access denied. Root privileges required.'}), 403
    
    target_user = User.query.get(user_id)
    if not target_user:
        return jsonify({'error': 'User not found'}), 404
    
    if target_user.is_root:
        return jsonify({'error': 'Cannot delete root user'}), 400
    
    email = target_user.email
    db.session.delete(target_user)
    db.session.commit()
    
    return jsonify({
        'message': f'User {email} deleted successfully'
    }), 200

# API Routes
@app.route('/api/vaults', methods=['GET'])
def get_vaults():
    cached = get_cache('vaults')
    if cached:
        return jsonify(cached)
    
    vaults = Vault.query.all()
    result = [vault.to_dict() for vault in vaults]
    set_cache('vaults', result)
    return jsonify(result)

@app.route('/api/vaults', methods=['POST'])
def create_vault():
    data = request.get_json()
    vault = Vault(
        name=data['name'],
        location=data['location'],
        capacity=float(data['capacity']),
        current_balance=float(data['current_balance'])
    )
    db.session.add(vault)
    db.session.commit()
    clear_cache()
    return jsonify(vault.to_dict()), 201

@app.route('/api/vaults/<int:vault_id>', methods=['PUT'])
def update_vault(vault_id):
    vault = Vault.query.get_or_404(vault_id)
    data = request.get_json()
    
    vault.name = data.get('name', vault.name)
    vault.location = data.get('location', vault.location)
    vault.capacity = float(data.get('capacity', vault.capacity))
    vault.current_balance = float(data.get('current_balance', vault.current_balance))
    
    db.session.commit()
    clear_cache()
    return jsonify(vault.to_dict())

@app.route('/api/vaults/<int:vault_id>', methods=['DELETE'])
def delete_vault(vault_id):
    vault = Vault.query.get_or_404(vault_id)
    db.session.delete(vault)
    db.session.commit()
    clear_cache()
    return '', 204

@app.route('/api/atms', methods=['GET'])
def get_atms():
    cached = get_cache('atms')
    if cached:
        return jsonify(cached)
    
    atms = ATM.query.all()
    result = [atm.to_dict() for atm in atms]
    set_cache('atms', result)
    return jsonify(result)

@app.route('/api/atms', methods=['POST'])
def create_atm():
    data = request.get_json()
    atm = ATM(
        name=data['name'],
        location=data['location'],
        capacity=float(data['capacity']),
        current_balance=float(data['current_balance']),
        daily_avg_demand=float(data.get('daily_avg_demand', 0))
    )
    db.session.add(atm)
    db.session.commit()
    clear_cache()
    return jsonify(atm.to_dict()), 201

@app.route('/api/atms/<int:atm_id>', methods=['PUT'])
def update_atm(atm_id):
    atm = ATM.query.get_or_404(atm_id)
    data = request.get_json()
    
    atm.name = data.get('name', atm.name)
    atm.location = data.get('location', atm.location)
    atm.capacity = float(data.get('capacity', atm.capacity))
    atm.current_balance = float(data.get('current_balance', atm.current_balance))
    atm.daily_avg_demand = float(data.get('daily_avg_demand', atm.daily_avg_demand))
    
    db.session.commit()
    clear_cache()
    return jsonify(atm.to_dict())

@app.route('/api/atms/<int:atm_id>', methods=['DELETE'])
def delete_atm(atm_id):
    atm = ATM.query.get_or_404(atm_id)
    db.session.delete(atm)
    db.session.commit()
    clear_cache()
    return '', 204

@app.route('/api/optimize', methods=['POST'])
def optimize_allocation():
    data = request.get_json()
    algorithm = data.get('algorithm', 'greedy')
    
    vaults = [vault.to_dict() for vault in Vault.query.all()]
    atms = [atm.to_dict() for atm in ATM.query.all()]
    
    if algorithm == 'linear_programming':
        result = OptimizationEngine.linear_programming_allocation(vaults, atms)
    else:
        result = OptimizationEngine.greedy_allocation(vaults, atms)
    
    return jsonify(result)

@app.route('/api/execute-allocation', methods=['POST'])
def execute_allocation():
    data = request.get_json()
    allocations = data.get('allocations', [])
    
    try:
        for allocation in allocations:
            # Create transaction record
            transaction = Transaction(
                vault_id=allocation['vault_id'],
                atm_id=allocation['atm_id'],
                amount=allocation['amount'],
                transaction_type='allocation'
            )
            db.session.add(transaction)
            
            # Update vault balance
            vault = Vault.query.get(allocation['vault_id'])
            if vault and vault.current_balance >= allocation['amount']:
                vault.current_balance -= allocation['amount']
            else:
                db.session.rollback()
                return jsonify({'error': f'Insufficient funds in vault {vault.name}'}), 400
            
            # Update ATM balance
            atm = ATM.query.get(allocation['atm_id'])
            if atm:
                atm.current_balance += allocation['amount']
        
        db.session.commit()
        clear_cache()
        return jsonify({'message': 'Allocation executed successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    transactions = Transaction.query.order_by(Transaction.timestamp.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'transactions': [t.to_dict() for t in transactions.items],
        'total': transactions.total,
        'pages': transactions.pages,
        'current_page': page
    })

@app.route('/api/transactions/history', methods=['GET'])
def get_transaction_history():
    """Advanced transaction history with filtering, sorting, and pagination"""
    # Pagination parameters
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    # Sorting parameters
    sort_by = request.args.get('sort_by', 'timestamp')  # timestamp, amount, atm_name, type
    sort_order = request.args.get('sort_order', 'desc')  # asc or desc
    
    # Filter parameters
    filter_type = request.args.get('filter_type', None)  # withdrawal, deposit, allocation, balance_check
    filter_atm_id = request.args.get('filter_atm_id', None, type=int)
    filter_vault_id = request.args.get('filter_vault_id', None, type=int)
    filter_section_id = request.args.get('filter_section_id', None, type=int)
    date_from = request.args.get('date_from', None)
    date_to = request.args.get('date_to', None)
    search = request.args.get('search', None)
    min_amount = request.args.get('min_amount', None, type=float)
    max_amount = request.args.get('max_amount', None, type=float)
    time_period = request.args.get('time_period', None)  # morning, afternoon, evening, night
    
    # Build query
    query = Transaction.query
    
    # Apply filters
    if filter_type:
        query = query.filter(Transaction.transaction_type == filter_type)
    
    if filter_atm_id:
        query = query.filter(Transaction.atm_id == filter_atm_id)
    
    if filter_vault_id:
        query = query.filter(Transaction.vault_id == filter_vault_id)
    
    if filter_section_id:
        query = query.filter(Transaction.section_id == filter_section_id)
    
    if min_amount is not None:
        query = query.filter(Transaction.amount >= min_amount)
    
    if max_amount is not None:
        query = query.filter(Transaction.amount <= max_amount)
    
    if time_period:
        if time_period == 'morning':  # 6 AM - 12 PM
            query = query.filter(db.extract('hour', Transaction.timestamp) >= 6)
            query = query.filter(db.extract('hour', Transaction.timestamp) < 12)
        elif time_period == 'afternoon':  # 12 PM - 6 PM
            query = query.filter(db.extract('hour', Transaction.timestamp) >= 12)
            query = query.filter(db.extract('hour', Transaction.timestamp) < 18)
        elif time_period == 'evening':  # 6 PM - 12 AM
            query = query.filter(db.extract('hour', Transaction.timestamp) >= 18)
            query = query.filter(db.extract('hour', Transaction.timestamp) < 24)
        elif time_period == 'night':  # 12 AM - 6 AM
            query = query.filter(db.extract('hour', Transaction.timestamp) >= 0)
            query = query.filter(db.extract('hour', Transaction.timestamp) < 6)
    
    if date_from:
        try:
            date_from_obj = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            query = query.filter(Transaction.timestamp >= date_from_obj)
        except:
            pass
    
    if date_to:
        try:
            date_to_obj = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            # Add one day to include the entire end date
            date_to_obj = date_to_obj + timedelta(days=1)
            query = query.filter(Transaction.timestamp < date_to_obj)
        except:
            pass
    
    # Apply search (search in ATM name)
    if search:
        query = query.join(ATM).filter(ATM.name.ilike(f'%{search}%'))
    
    # Apply sorting
    if sort_by == 'amount':
        order_col = Transaction.amount
    elif sort_by == 'type':
        order_col = Transaction.transaction_type
    elif sort_by == 'atm_name':
        query = query.join(ATM)
        order_col = ATM.name
    else:  # Default to timestamp
        order_col = Transaction.timestamp
    
    if sort_order == 'asc':
        query = query.order_by(order_col.asc())
    else:
        query = query.order_by(order_col.desc())
    
    # Get total count before pagination
    total_count = query.count()
    
    # Apply pagination
    transactions = query.paginate(page=page, per_page=per_page, error_out=False)
    
    # Calculate summary statistics for filtered results
    summary_query = Transaction.query
    if filter_type:
        summary_query = summary_query.filter(Transaction.transaction_type == filter_type)
    if filter_atm_id:
        summary_query = summary_query.filter(Transaction.atm_id == filter_atm_id)
    if filter_vault_id:
        summary_query = summary_query.filter(Transaction.vault_id == filter_vault_id)
    if filter_section_id:
        summary_query = summary_query.filter(Transaction.section_id == filter_section_id)
    if min_amount is not None:
        summary_query = summary_query.filter(Transaction.amount >= min_amount)
    if max_amount is not None:
        summary_query = summary_query.filter(Transaction.amount <= max_amount)
    if time_period:
        if time_period == 'morning':
            summary_query = summary_query.filter(db.extract('hour', Transaction.timestamp) >= 6)
            summary_query = summary_query.filter(db.extract('hour', Transaction.timestamp) < 12)
        elif time_period == 'afternoon':
            summary_query = summary_query.filter(db.extract('hour', Transaction.timestamp) >= 12)
            summary_query = summary_query.filter(db.extract('hour', Transaction.timestamp) < 18)
        elif time_period == 'evening':
            summary_query = summary_query.filter(db.extract('hour', Transaction.timestamp) >= 18)
            summary_query = summary_query.filter(db.extract('hour', Transaction.timestamp) < 24)
        elif time_period == 'night':
            summary_query = summary_query.filter(db.extract('hour', Transaction.timestamp) >= 0)
            summary_query = summary_query.filter(db.extract('hour', Transaction.timestamp) < 6)
    if date_from:
        try:
            date_from_obj = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            summary_query = summary_query.filter(Transaction.timestamp >= date_from_obj)
        except:
            pass
    if date_to:
        try:
            date_to_obj = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            date_to_obj = date_to_obj + timedelta(days=1)
            summary_query = summary_query.filter(Transaction.timestamp < date_to_obj)
        except:
            pass
    if search:
        summary_query = summary_query.join(ATM).filter(ATM.name.ilike(f'%{search}%'))
    
    # Calculate totals
    all_filtered = summary_query.all()
    total_amount = sum(t.amount for t in all_filtered)
    
    # Count by type
    withdrawals = [t for t in all_filtered if t.transaction_type == 'withdrawal']
    deposits = [t for t in all_filtered if t.transaction_type == 'deposit']
    allocations = [t for t in all_filtered if t.transaction_type == 'allocation']
    balance_checks = [t for t in all_filtered if t.transaction_type == 'balance_check']
    
    withdrawal_total = sum(t.amount for t in withdrawals)
    deposit_total = sum(t.amount for t in deposits)
    allocation_total = sum(t.amount for t in allocations)
    
    avg_transaction = total_amount / len(all_filtered) if all_filtered else 0
    
    # Get date range
    if all_filtered:
        dates = [t.timestamp for t in all_filtered]
        date_range = f"{min(dates).strftime('%b %d, %Y')} to {max(dates).strftime('%b %d, %Y')}"
    else:
        date_range = "No data"
    
    return jsonify({
        'transactions': [t.to_dict() for t in transactions.items],
        'total': total_count,
        'pages': transactions.pages,
        'current_page': page,
        'per_page': per_page,
        'summary': {
            'total_transactions': len(all_filtered),
            'total_amount': round(total_amount, 2),
            'total_withdrawals': len(withdrawals),
            'total_deposits': len(deposits),
            'total_allocations': len(allocations),
            'total_balance_checks': len(balance_checks),
            'withdrawal_amount': round(withdrawal_total, 2),
            'deposit_amount': round(deposit_total, 2),
            'allocation_amount': round(allocation_total, 2),
            'avg_transaction': round(avg_transaction, 2),
            'date_range': date_range
        }
    })

@app.route('/api/transactions/export-csv', methods=['GET'])
def export_transactions_csv():
    """Export filtered transactions to CSV"""
    # Get all filter parameters (same as history endpoint)
    filter_type = request.args.get('filter_type', None)
    filter_atm_id = request.args.get('filter_atm_id', None, type=int)
    filter_vault_id = request.args.get('filter_vault_id', None, type=int)
    date_from = request.args.get('date_from', None)
    date_to = request.args.get('date_to', None)
    search = request.args.get('search', None)
    min_amount = request.args.get('min_amount', None, type=float)
    max_amount = request.args.get('max_amount', None, type=float)
    time_period = request.args.get('time_period', None)
    
    # Build query with same filters
    query = Transaction.query
    
    if filter_type:
        query = query.filter(Transaction.transaction_type == filter_type)
    if filter_atm_id:
        query = query.filter(Transaction.atm_id == filter_atm_id)
    if filter_vault_id:
        query = query.filter(Transaction.vault_id == filter_vault_id)
    if min_amount is not None:
        query = query.filter(Transaction.amount >= min_amount)
    if max_amount is not None:
        query = query.filter(Transaction.amount <= max_amount)
    if time_period:
        if time_period == 'morning':
            query = query.filter(db.extract('hour', Transaction.timestamp) >= 6)
            query = query.filter(db.extract('hour', Transaction.timestamp) < 12)
        elif time_period == 'afternoon':
            query = query.filter(db.extract('hour', Transaction.timestamp) >= 12)
            query = query.filter(db.extract('hour', Transaction.timestamp) < 18)
        elif time_period == 'evening':
            query = query.filter(db.extract('hour', Transaction.timestamp) >= 18)
            query = query.filter(db.extract('hour', Transaction.timestamp) < 24)
        elif time_period == 'night':
            query = query.filter(db.extract('hour', Transaction.timestamp) >= 0)
            query = query.filter(db.extract('hour', Transaction.timestamp) < 6)
    if date_from:
        try:
            date_from_obj = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            query = query.filter(Transaction.timestamp >= date_from_obj)
        except:
            pass
    if date_to:
        try:
            date_to_obj = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            date_to_obj = date_to_obj + timedelta(days=1)
            query = query.filter(Transaction.timestamp < date_to_obj)
        except:
            pass
    if search:
        query = query.join(ATM).filter(ATM.name.ilike(f'%{search}%'))
    
    # Get all matching transactions
    transactions = query.order_by(Transaction.timestamp.desc()).all()
    
    # Convert to DataFrame with import-compatible format
    data = []
    for txn in transactions:
        data.append({
            'atm_id': txn.atm_id,
            'vault_id': txn.vault_id,
            'amount': txn.amount,
            'transaction_type': txn.transaction_type,
            'timestamp': txn.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
            'notes': txn.notes if txn.notes else ''
        })
    
    df = pd.DataFrame(data)
    
    # Create CSV in memory
    output = io.StringIO()
    df.to_csv(output, index=False)
    csv_data = output.getvalue()
    
    # Create response
    response = make_response(csv_data)
    response.headers['Content-Type'] = 'text/csv'
    response.headers['Content-Disposition'] = f'attachment; filename=transactions_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
    
    return response

# Transaction Sections Management
@app.route('/api/transaction-sections', methods=['GET'])
def get_transaction_sections():
    """Get all transaction sections"""
    sections = TransactionSection.query.order_by(TransactionSection.created_at.desc()).all()
    return jsonify([section.to_dict() for section in sections])

@app.route('/api/transaction-sections', methods=['POST'])
def create_transaction_section():
    """Create a new transaction section"""
    data = request.json
    
    # Validate required fields
    if not data.get('name'):
        return jsonify({'error': 'Section name is required'}), 400
    
    # Check if name already exists
    existing = TransactionSection.query.filter_by(name=data['name']).first()
    if existing:
        return jsonify({'error': 'Section name already exists'}), 400
    
    section = TransactionSection(
        name=data['name'],
        description=data.get('description', ''),
        color=data.get('color', 'blue'),
        is_default=data.get('is_default', False)
    )
    
    db.session.add(section)
    db.session.commit()
    
    return jsonify(section.to_dict()), 201

@app.route('/api/transaction-sections/<int:section_id>', methods=['PUT'])
def update_transaction_section(section_id):
    """Update a transaction section"""
    section = TransactionSection.query.get_or_404(section_id)
    data = request.json
    
    if data.get('name'):
        section.name = data['name']
    if data.get('description') is not None:
        section.description = data['description']
    if data.get('color'):
        section.color = data['color']
    if data.get('is_default') is not None:
        section.is_default = data['is_default']
    
    db.session.commit()
    return jsonify(section.to_dict())

@app.route('/api/transaction-sections/<int:section_id>', methods=['DELETE'])
def delete_transaction_section(section_id):
    """Delete a transaction section"""
    section = TransactionSection.query.get_or_404(section_id)
    
    # Check if section has transactions
    txn_count = Transaction.query.filter_by(section_id=section_id).count()
    if txn_count > 0:
        return jsonify({'error': f'Cannot delete section with {txn_count} transactions'}), 400
    
    db.session.delete(section)
    db.session.commit()
    
    return jsonify({'message': 'Section deleted successfully'})

# CSV Import for Transactions
@app.route('/api/transactions/import-csv', methods=['POST'])
def import_transactions_csv():
    """Import transactions from CSV file"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not file.filename.endswith('.csv'):
        return jsonify({'error': 'File must be a CSV'}), 400
    
    try:
        # Read CSV file
        df = pd.read_csv(file)
        
        # Validate required columns
        required_columns = ['atm_id', 'vault_id', 'amount', 'transaction_type', 'timestamp']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            return jsonify({'error': f'Missing required columns: {", ".join(missing_columns)}'}), 400
        
        # Get optional section_id from form data
        section_id = request.form.get('section_id', None, type=int)
        
        # Import transactions
        imported_count = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                # Validate ATM and Vault exist
                atm = ATM.query.get(int(row['atm_id']))
                vault = Vault.query.get(int(row['vault_id']))
                
                if not atm:
                    errors.append(f"Row {index+1}: ATM ID {row['atm_id']} not found")
                    continue
                
                if not vault:
                    errors.append(f"Row {index+1}: Vault ID {row['vault_id']} not found")
                    continue
                
                # Parse timestamp
                try:
                    timestamp = pd.to_datetime(row['timestamp'])
                except:
                    errors.append(f"Row {index+1}: Invalid timestamp format")
                    continue
                
                # Create transaction
                transaction = Transaction(
                    atm_id=int(row['atm_id']),
                    vault_id=int(row['vault_id']),
                    amount=float(row['amount']),
                    transaction_type=str(row['transaction_type']),
                    timestamp=timestamp,
                    section_id=section_id,
                    notes=row.get('notes', None)
                )
                
                db.session.add(transaction)
                imported_count += 1
                
            except Exception as e:
                errors.append(f"Row {index+1}: {str(e)}")
        
        # Commit all transactions
        db.session.commit()
        
        return jsonify({
            'message': f'Successfully imported {imported_count} transactions',
            'imported_count': imported_count,
            'total_rows': len(df),
            'errors': errors[:10]  # Return first 10 errors
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to import CSV: {str(e)}'}), 500

@app.route('/api/forecast/<int:atm_id>', methods=['GET'])
def forecast_demand(atm_id):
    days_ahead = request.args.get('days_ahead', 1, type=int)
    prediction = ForecastingEngine.predict_demand(atm_id, days_ahead)
    return jsonify({'predicted_demand': prediction})

@app.route('/api/analytics/dashboard', methods=['GET'])
def dashboard_analytics():
    # Summary statistics
    total_vaults = Vault.query.count()
    total_atms = ATM.query.count()
    total_vault_balance = db.session.query(db.func.sum(Vault.current_balance)).scalar() or 0
    total_atm_balance = db.session.query(db.func.sum(ATM.current_balance)).scalar() or 0
    
    # Recent transactions
    recent_transactions = Transaction.query.order_by(Transaction.timestamp.desc()).limit(10).all()
    
    # ATM utilization (current_balance / capacity)
    atms = ATM.query.all()
    atm_utilization = [
        {
            'name': atm.name,
            'utilization': (atm.current_balance / atm.capacity * 100) if atm.capacity > 0 else 0,
            'current_balance': atm.current_balance,
            'capacity': atm.capacity,
            'daily_demand': atm.daily_avg_demand
        }
        for atm in atms
    ]
    
    return jsonify({
        'summary': {
            'total_vaults': total_vaults,
            'total_atms': total_atms,
            'total_vault_balance': total_vault_balance,
            'total_atm_balance': total_atm_balance
        },
        'recent_transactions': [t.to_dict() for t in recent_transactions],
        'atm_utilization': atm_utilization
    })

# Initialize database
def create_tables():
    with app.app_context():
        db.create_all()
        
        # Add sample data if tables are empty
        if Vault.query.count() == 0:
            sample_vaults = [
                Vault(name="Central Vault A", location="Downtown", capacity=5000000, current_balance=3500000),
                Vault(name="Central Vault B", location="Business District", capacity=3000000, current_balance=2100000),
            ]

            sample_atms = [
                ATM(name="ATM Mall Plaza", location="Shopping Mall", capacity=200000, current_balance=45000, daily_avg_demand=85000),
                ATM(name="ATM University", location="University Campus", capacity=150000, current_balance=32000, daily_avg_demand=65000),
                ATM(name="ATM Airport", location="International Airport", capacity=300000, current_balance=120000, daily_avg_demand=150000),
                ATM(name="ATM Hospital", location="General Hospital", capacity=100000, current_balance=25000, daily_avg_demand=45000),
            ]

            for vault in sample_vaults:
                db.session.add(vault)
            for atm in sample_atms:
                db.session.add(atm)

            db.session.commit()


# ==================== VEHICLE MANAGEMENT APIs ====================

@app.route('/api/vehicles', methods=['GET'])
def get_vehicles():
    """Get all vehicles"""
    try:
        vehicles = db.session.execute(text("SELECT * FROM vehicle")).fetchall()
        return jsonify([{
            'id': v[0],
            'name': v[1],
            'capacity': v[2],
            'fuel_cost_per_km': v[3],
            'assigned_vault_id': v[4],
            'status': v[5],
            'created_at': v[6]
        } for v in vehicles])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/vehicles', methods=['POST'])
def create_vehicle():
    """Create new vehicle"""
    try:
        data = request.json
        db.session.execute(text("""
            INSERT INTO vehicle (name, capacity, fuel_cost_per_km, assigned_vault_id, status)
            VALUES (:name, :capacity, :fuel_cost, :vault_id, :status)
        """), {
            'name': data['name'],
            'capacity': data['capacity'],
            'fuel_cost': data.get('fuel_cost_per_km', 2.0),
            'vault_id': data.get('assigned_vault_id'),
            'status': data.get('status', 'active')
        })
        db.session.commit()
        return jsonify({'message': 'Vehicle created successfully'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/vehicles/<int:vehicle_id>', methods=['PUT'])
def update_vehicle(vehicle_id):
    """Update vehicle"""
    try:
        data = request.json
        db.session.execute(text("""
            UPDATE vehicle
            SET name = :name, capacity = :capacity, fuel_cost_per_km = :fuel_cost,
                assigned_vault_id = :vault_id, status = :status
            WHERE id = :id
        """), {
            'id': vehicle_id,
            'name': data['name'],
            'capacity': data['capacity'],
            'fuel_cost': data.get('fuel_cost_per_km', 2.0),
            'vault_id': data.get('assigned_vault_id'),
            'status': data.get('status', 'active')
        })
        db.session.commit()
        return jsonify({'message': 'Vehicle updated successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/vehicles/<int:vehicle_id>', methods=['DELETE'])
def delete_vehicle(vehicle_id):
    """Delete vehicle"""
    try:
        db.session.execute(text("DELETE FROM vehicle WHERE id = :id"), {'id': vehicle_id})
        db.session.commit()
        return jsonify({'message': 'Vehicle deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ==================== ROUTE PLANNING APIs ====================

@app.route('/api/predictions/tomorrow', methods=['GET'])
def get_tomorrow_predictions():
    """Get demand predictions for tomorrow"""
    try:
        from services.prediction_service import get_prediction_service
        
        # Get all ATMs
        atms = ATM.query.all()
        atms_data = [atm.to_dict() for atm in atms]
        
        # Get predictions
        prediction_service = get_prediction_service()
        threshold = float(request.args.get('threshold', 0.5))
        
        atms_needing_refill = prediction_service.get_atms_needing_refill(
            atms_data, 
            threshold_percentage=threshold
        )
        
        return jsonify({
            'prediction_date': (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d'),
            'total_atms': len(atms_data),
            'atms_needing_refill': len(atms_needing_refill),
            'threshold_percentage': threshold,
            'atms': atms_needing_refill
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/routes/generate', methods=['POST'])
def generate_routes():
    """Generate optimized routes for vehicles"""
    try:
        from services.route_optimizer import get_route_optimizer
        from services.prediction_service import get_prediction_service
        
        data = request.json
        vault_id = data.get('vault_id')
        vehicle_ids = data.get('vehicle_ids', [])
        atm_ids = data.get('atm_ids', [])
        use_predictions = data.get('use_predictions', True)
        threshold = data.get('threshold', 0.5)
        
        # Get vault (depot)
        vault = Vault.query.get(vault_id)
        if not vault:
            return jsonify({'error': 'Vault not found'}), 404
        
        vault_data = vault.to_dict()
        vault_result = db.session.execute(text("""
            SELECT latitude, longitude, address FROM vault WHERE id = :id
        """), {'id': vault_id}).fetchone()
        
        if vault_result and vault_result[0]:
            vault_data['latitude'] = vault_result[0]
            vault_data['longitude'] = vault_result[1]
            vault_data['address'] = vault_result[2]
        else:
            return jsonify({'error': 'Vault coordinates not found'}), 400
        
        # Get vehicles
        vehicles = []
        for v_id in vehicle_ids:
            v = db.session.execute(text("""
                SELECT id, name, capacity, fuel_cost_per_km FROM vehicle WHERE id = :id
            """), {'id': v_id}).fetchone()
            if v:
                vehicles.append({
                    'id': v[0],
                    'name': v[1],
                    'capacity': v[2],
                    'fuel_cost_per_km': v[3]
                })
        
        if not vehicles:
            return jsonify({'error': 'No vehicles selected'}), 400
        
        # Get ATMs to visit
        if use_predictions and not atm_ids:
            # Use ML predictions to determine ATMs
            prediction_service = get_prediction_service()
            all_atms = ATM.query.all()
            all_atms_data = [atm.to_dict() for atm in all_atms]
            
            # Add coordinates
            for atm_data in all_atms_data:
                atm_coords = db.session.execute(text("""
                    SELECT latitude, longitude FROM atm WHERE id = :id
                """), {'id': atm_data['id']}).fetchone()
                if atm_coords:
                    atm_data['latitude'] = atm_coords[0]
                    atm_data['longitude'] = atm_coords[1]
            
            atms_to_visit = prediction_service.get_atms_needing_refill(
                all_atms_data, 
                threshold_percentage=threshold
            )
        else:
            # Use manually selected ATMs
            atms_to_visit = []
            for atm_id in atm_ids:
                atm = ATM.query.get(atm_id)
                if atm:
                    atm_data = atm.to_dict()
                    atm_coords = db.session.execute(text("""
                        SELECT latitude, longitude FROM atm WHERE id = :id
                    """), {'id': atm_id}).fetchone()
                    
                    if atm_coords and atm_coords[0]:
                        atm_data['latitude'] = atm_coords[0]
                        atm_data['longitude'] = atm_coords[1]
                        atm_data['required_amount'] = atm_data['capacity'] - atm_data['current_balance']
                        atms_to_visit.append(atm_data)
        
        if not atms_to_visit:
            return jsonify({
                'status': 'success',
                'message': 'No ATMs need refill',
                'routes': []
            })
        
        # Optimize routes
        optimizer = get_route_optimizer()
        result = optimizer.optimize_routes(
            depot=vault_data,
            atms_to_visit=atms_to_visit,
            vehicles=vehicles,
            time_limit_seconds=30
        )
        
        # Save routes to database
        if result.get('status') == 'success':
            route_date = datetime.now().date()
            for route_info in result['routes']:
                # Insert route
                route_result = db.session.execute(text("""
                    INSERT INTO route (date, vehicle_id, total_distance, total_time, total_cost, status)
                    VALUES (:date, :vehicle_id, :distance, :time, :cost, 'planned')
                """), {
                    'date': route_date,
                    'vehicle_id': route_info['vehicle_id'],
                    'distance': route_info['total_distance'],
                    'time': route_info['estimated_time'],
                    'cost': route_info['estimated_cost']
                })
                db.session.commit()
                
                # Get the inserted route ID
                route_id = route_result.lastrowid
                
                # Insert route stops
                for stop in route_info['stops']:
                    db.session.execute(text("""
                        INSERT INTO route_stop (route_id, atm_id, sequence, predicted_demand, actual_loaded)
                        VALUES (:route_id, :atm_id, :sequence, :predicted_demand, :actual_loaded)
                    """), {
                        'route_id': route_id,
                        'atm_id': stop['atm_id'],
                        'sequence': stop['sequence'],
                        'predicted_demand': stop.get('predicted_demand', 0),
                        'actual_loaded': stop.get('required_amount', 0)
                    })
                db.session.commit()
                
                route_info['route_id'] = route_id
        
        return jsonify(result)
        
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/routes', methods=['GET'])
def get_routes():
    """Get all routes"""
    try:
        routes = db.session.execute(text("""
            SELECT r.*, v.name as vehicle_name 
            FROM route r
            LEFT JOIN vehicle v ON r.vehicle_id = v.id
            ORDER BY r.date DESC, r.id DESC
        """)).fetchall()
        
        routes_list = []
        for r in routes:
            # Get route stops
            stops = db.session.execute(text("""
                SELECT rs.*, a.name as atm_name, a.location
                FROM route_stop rs
                LEFT JOIN atm a ON rs.atm_id = a.id
                WHERE rs.route_id = :route_id
                ORDER BY rs.sequence
            """), {'route_id': r[0]}).fetchall()
            
            routes_list.append({
                'id': r[0],
                'date': r[1],
                'vehicle_id': r[2],
                'vehicle_name': r[9] if len(r) > 9 else 'Unknown',
                'total_distance': r[3],
                'total_time': r[4],
                'total_cost': r[5],
                'status': r[6],
                'created_at': r[7],
                'executed_at': r[8],
                'stops': [{
                    'id': s[0],
                    'atm_id': s[2],
                    'atm_name': s[8] if len(s) > 8 else 'Unknown',
                    'location': s[9] if len(s) > 9 else 'Unknown',
                    'sequence': s[3],
                    'predicted_demand': s[4],
                    'actual_loaded': s[5]
                } for s in stops]
            })
        
        return jsonify(routes_list)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/routes/<int:route_id>', methods=['GET'])
def get_route(route_id):
    """Get route details"""
    try:
        route = db.session.execute(text("""
            SELECT r.*, v.name as vehicle_name 
            FROM route r
            LEFT JOIN vehicle v ON r.vehicle_id = v.id
            WHERE r.id = :id
        """), {'id': route_id}).fetchone()
        
        if not route:
            return jsonify({'error': 'Route not found'}), 404
        
        stops = db.session.execute(text("""
            SELECT rs.*, a.name as atm_name, a.location, a.latitude, a.longitude
            FROM route_stop rs
            LEFT JOIN atm a ON rs.atm_id = a.id
            WHERE rs.route_id = :route_id
            ORDER BY rs.sequence
        """), {'route_id': route_id}).fetchall()
        
        return jsonify({
            'id': route[0],
            'date': route[1],
            'vehicle_id': route[2],
            'vehicle_name': route[9] if len(route) > 9 else 'Unknown',
            'total_distance': route[3],
            'total_time': route[4],
            'total_cost': route[5],
            'status': route[6],
            'created_at': route[7],
            'executed_at': route[8],
            'stops': [{
                'id': s[0],
                'atm_id': s[2],
                'atm_name': s[8],
                'location': s[9],
                'latitude': s[10],
                'longitude': s[11],
                'sequence': s[3],
                'predicted_demand': s[4],
                'actual_loaded': s[5]
            } for s in stops]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/routes/<int:route_id>/execute', methods=['POST'])
def execute_route(route_id):
    """Mark route as executed"""
    try:
        db.session.execute(text("""
            UPDATE route
            SET status = 'executed', executed_at = :executed_at
            WHERE id = :id
        """), {
            'id': route_id,
            'executed_at': datetime.now()
        })
        db.session.commit()
        return jsonify({'message': 'Route marked as executed'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    create_tables()   # Run DB setup when app starts
    
    # Register ML API routes if available
    if ML_API_AVAILABLE:
        try:
            register_ml_routes(app)
        except Exception as e:
            print(f"⚠ Warning: Could not register ML API routes: {e}")
    else:
        print("⚠ ML API not loaded - advanced forecasting features unavailable")
    
    # Register AI Recommendations API routes if available
    if AI_API_AVAILABLE:
        try:
            register_ai_routes(app)
        except Exception as e:
            print(f"⚠ Warning: Could not register AI Recommendations API routes: {e}")
    else:
        print("⚠ AI Recommendations API not loaded - advanced AI features unavailable")
    
    print("\n🚀 Starting Smart ATM System Backend...")
    print("📍 Backend running on: http://127.0.0.1:5000")
    print("📊 ML API endpoints available at: /api/ml/*")
    print("🤖 AI Recommendations API available at: /api/ai/*")
    print("🚚 Vehicle Routing endpoints available at: /api/vehicles/* and /api/routes/*")
    print("\n")
    
    app.run(debug=True, port=5000)