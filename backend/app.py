from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime, timedelta
import numpy as np
from sklearn.linear_model import LinearRegression
from scipy.optimize import linprog
import pandas as pd
from typing import List, Dict, TupleGit
import json

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///smart_atm.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
CORS(app)

# Database Models
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
            'created_at': self.created_at.isoformat()
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
            'created_at': self.created_at.isoformat()
        }

class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    vault_id = db.Column(db.Integer, db.ForeignKey('vault.id'), nullable=False)
    atm_id = db.Column(db.Integer, db.ForeignKey('atm.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    transaction_type = db.Column(db.String(50), nullable=False)  # 'allocation', 'withdrawal'
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    vault = db.relationship('Vault', backref=db.backref('transactions', lazy=True))
    atm = db.relationship('ATM', backref=db.backref('transactions', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'vault_id': self.vault_id,
            'atm_id': self.atm_id,
            'amount': self.amount,
            'transaction_type': self.transaction_type,
            'timestamp': self.timestamp.isoformat(),
            'vault_name': self.vault.name if self.vault else None,
            'atm_name': self.atm.name if self.atm else None
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

# API Routes
@app.route('/api/vaults', methods=['GET'])
def get_vaults():
    vaults = Vault.query.all()
    return jsonify([vault.to_dict() for vault in vaults])

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
    return jsonify(vault.to_dict())

@app.route('/api/vaults/<int:vault_id>', methods=['DELETE'])
def delete_vault(vault_id):
    vault = Vault.query.get_or_404(vault_id)
    db.session.delete(vault)
    db.session.commit()
    return '', 204

@app.route('/api/atms', methods=['GET'])
def get_atms():
    atms = ATM.query.all()
    return jsonify([atm.to_dict() for atm in atms])

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
    return jsonify(atm.to_dict())

@app.route('/api/atms/<int:atm_id>', methods=['DELETE'])
def delete_atm(atm_id):
    atm = ATM.query.get_or_404(atm_id)
    db.session.delete(atm)
    db.session.commit()
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


if __name__ == '__main__':
    create_tables()   # Run DB setup when app starts
    app.run(debug=True, port=5000)