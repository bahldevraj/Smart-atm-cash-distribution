"""
AI/ML Enhancements for Smart ATM Cash Optimization
Provides intelligent route recommendations, optimization metrics, and what-if analysis
"""

from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from typing import List, Dict, Tuple, Optional
import pickle
import os
import sys

# Use centralized path configuration
from path_config import get_saved_models_dir, get_model_path

# Create blueprint for AI recommendations
ai_recommendations_bp = Blueprint('ai_recommendations', __name__, url_prefix='/api/ai')

MODEL_DIR = str(get_saved_models_dir())


class SmartRecommendationEngine:
    """Engine for generating ML-based route recommendations"""
    
    @staticmethod
    def calculate_priority_score(predicted_demand: float, capacity: float, 
                                 days_since_last_refill: int, current_balance: float) -> float:
        """
        Calculate priority score for ATM refill
        Formula: (predicted_demand / capacity) × days_since_last_refill × urgency_factor
        
        Args:
            predicted_demand: ML predicted demand for next period
            capacity: ATM capacity
            days_since_last_refill: Days since last refill
            current_balance: Current cash balance in ATM
            
        Returns:
            Priority score (higher = more urgent)
        """
        if capacity <= 0:
            return 0.0
        
        # Base priority: demand to capacity ratio
        demand_ratio = predicted_demand / capacity
        
        # Time factor: more urgent if not refilled recently
        time_factor = min(days_since_last_refill / 7.0, 2.0)  # Cap at 2x after 7 days
        
        # Urgency factor: critical if current balance low
        balance_ratio = current_balance / capacity
        if balance_ratio < 0.2:  # Critical: < 20% capacity
            urgency_factor = 3.0
        elif balance_ratio < 0.4:  # High: < 40% capacity
            urgency_factor = 2.0
        elif balance_ratio < 0.6:  # Medium: < 60% capacity
            urgency_factor = 1.5
        else:  # Low: >= 60% capacity
            urgency_factor = 1.0
        
        # Calculate final priority score
        priority_score = demand_ratio * time_factor * urgency_factor
        
        return round(priority_score, 4)
    
    @staticmethod
    def get_optimal_refill_frequency(predicted_demands: List[float], 
                                     capacity: float,
                                     current_balance: float) -> Dict:
        """
        Calculate optimal refill frequency based on predicted demands
        
        Args:
            predicted_demands: List of predicted daily demands
            capacity: ATM capacity
            current_balance: Current balance
            
        Returns:
            Dict with recommended frequency and reasoning
        """
        if not predicted_demands or capacity <= 0:
            return {
                'recommended_days': 7,
                'confidence': 'low',
                'reason': 'Insufficient data for recommendation'
            }
        
        avg_daily_demand = np.mean(predicted_demands)
        max_daily_demand = np.max(predicted_demands)
        std_daily_demand = np.std(predicted_demands)
        
        # Calculate days until empty (conservative estimate)
        if avg_daily_demand > 0:
            days_until_empty = current_balance / avg_daily_demand
        else:
            days_until_empty = 30  # Default if no demand
        
        # Calculate safety buffer (based on variability)
        cv = std_daily_demand / avg_daily_demand if avg_daily_demand > 0 else 0
        if cv < 0.2:  # Low variability
            safety_buffer = 0.8
            confidence = 'high'
        elif cv < 0.4:  # Medium variability
            safety_buffer = 0.6
            confidence = 'medium'
        else:  # High variability
            safety_buffer = 0.4
            confidence = 'low'
        
        # Recommended frequency: refill before hitting safety buffer
        recommended_days = int(days_until_empty * safety_buffer)
        recommended_days = max(1, min(recommended_days, 14))  # Between 1-14 days
        
        # Determine refill frequency category
        if recommended_days <= 2:
            frequency = 'daily'
            reason = 'High demand requires frequent refills'
        elif recommended_days <= 4:
            frequency = 'every_2_days'
            reason = 'Moderate-high demand requires regular refills'
        elif recommended_days <= 7:
            frequency = 'weekly'
            reason = 'Moderate demand allows weekly refills'
        else:
            frequency = 'bi_weekly'
            reason = 'Low demand allows bi-weekly refills'
        
        return {
            'recommended_days': recommended_days,
            'frequency': frequency,
            'confidence': confidence,
            'reason': reason,
            'avg_daily_demand': round(avg_daily_demand, 2),
            'max_daily_demand': round(max_daily_demand, 2),
            'days_until_empty': round(days_until_empty, 2),
            'variability': round(cv, 2)
        }
    
    @staticmethod
    def identify_critical_atms(atms_data: List[Dict], 
                               ml_forecasts: Dict[int, List[float]],
                               threshold: float = 1.5) -> List[Dict]:
        """
        Identify critical ATMs that need immediate attention
        
        Args:
            atms_data: List of ATM data dictionaries
            ml_forecasts: Dict mapping ATM ID to predicted demands
            threshold: Priority score threshold for critical classification
            
        Returns:
            List of critical ATMs with priority scores and recommendations
        """
        critical_atms = []
        
        for atm in atms_data:
            atm_id = atm['id']
            
            # Get ML forecast for this ATM
            if atm_id not in ml_forecasts:
                continue
            
            predicted_demands = ml_forecasts[atm_id]
            if not predicted_demands:
                continue
            
            # Calculate next period demand (average of next 7 days)
            next_week_demand = np.sum(predicted_demands[:7])
            
            # Estimate days since last refill (mock for now - will be from DB)
            # In production, this should come from transaction history
            days_since_last_refill = atm.get('days_since_last_refill', 5)
            
            # Calculate priority score
            priority_score = SmartRecommendationEngine.calculate_priority_score(
                predicted_demand=next_week_demand,
                capacity=atm['capacity'],
                days_since_last_refill=days_since_last_refill,
                current_balance=atm['current_balance']
            )
            
            # Get optimal refill frequency
            refill_recommendation = SmartRecommendationEngine.get_optimal_refill_frequency(
                predicted_demands=predicted_demands,
                capacity=atm['capacity'],
                current_balance=atm['current_balance']
            )
            
            # Classify ATM based on priority score
            if priority_score >= 2.5:
                criticality = 'critical'
            elif priority_score >= threshold:
                criticality = 'high'
            elif priority_score >= 1.0:
                criticality = 'medium'
            else:
                criticality = 'low'
            
            atm_info = {
                'atm_id': atm_id,
                'atm_name': atm['name'],
                'location': atm['location'],
                'priority_score': priority_score,
                'criticality': criticality,
                'current_balance': atm['current_balance'],
                'capacity': atm['capacity'],
                'balance_percentage': round((atm['current_balance'] / atm['capacity']) * 100, 1),
                'predicted_7day_demand': round(next_week_demand, 2),
                'days_since_last_refill': days_since_last_refill,
                'refill_recommendation': refill_recommendation
            }
            
            # Only include if above threshold or critical
            if priority_score >= threshold or criticality == 'critical':
                critical_atms.append(atm_info)
        
        # Sort by priority score (descending)
        critical_atms.sort(key=lambda x: x['priority_score'], reverse=True)
        
        return critical_atms


class RouteOptimizationMetrics:
    """Track and analyze route optimization performance"""
    
    @staticmethod
    def compare_predicted_vs_actual(atm_id: int, 
                                    predicted_demand: float,
                                    actual_demand: float,
                                    date: datetime) -> Dict:
        """
        Compare predicted vs actual demand and calculate error metrics
        
        Args:
            atm_id: ATM identifier
            predicted_demand: ML predicted demand
            actual_demand: Actual observed demand
            date: Date of observation
            
        Returns:
            Dict with comparison metrics
        """
        error = predicted_demand - actual_demand
        absolute_error = abs(error)
        percentage_error = (absolute_error / actual_demand * 100) if actual_demand > 0 else 0
        
        # Classification
        if percentage_error < 10:
            accuracy = 'excellent'
        elif percentage_error < 20:
            accuracy = 'good'
        elif percentage_error < 30:
            accuracy = 'acceptable'
        else:
            accuracy = 'needs_improvement'
        
        return {
            'atm_id': atm_id,
            'date': date.isoformat(),
            'predicted_demand': round(predicted_demand, 2),
            'actual_demand': round(actual_demand, 2),
            'error': round(error, 2),
            'absolute_error': round(absolute_error, 2),
            'percentage_error': round(percentage_error, 2),
            'accuracy': accuracy
        }
    
    @staticmethod
    def calculate_route_efficiency(route_data: Dict) -> Dict:
        """
        Calculate efficiency metrics for a completed route
        
        Args:
            route_data: Route execution data
            
        Returns:
            Dict with efficiency metrics
        """
        total_distance = route_data.get('total_distance', 0)
        total_time = route_data.get('total_time', 0)
        atms_visited = route_data.get('atms_visited', 0)
        fuel_cost = route_data.get('fuel_cost', 0)
        
        # Calculate efficiency metrics
        distance_per_atm = total_distance / atms_visited if atms_visited > 0 else 0
        time_per_atm = total_time / atms_visited if atms_visited > 0 else 0
        cost_per_atm = fuel_cost / atms_visited if atms_visited > 0 else 0
        
        # Efficiency score (lower is better)
        # Normalized: distance (km) + time (hours) * 10 + cost ($)
        efficiency_score = distance_per_atm + (time_per_atm * 10) + cost_per_atm
        
        return {
            'total_distance': round(total_distance, 2),
            'total_time': round(total_time, 2),
            'atms_visited': atms_visited,
            'fuel_cost': round(fuel_cost, 2),
            'distance_per_atm': round(distance_per_atm, 2),
            'time_per_atm': round(time_per_atm, 2),
            'cost_per_atm': round(cost_per_atm, 2),
            'efficiency_score': round(efficiency_score, 2)
        }
    
    @staticmethod
    def learning_recommendations(historical_metrics: List[Dict]) -> Dict:
        """
        Learn from historical data and provide recommendations
        
        Args:
            historical_metrics: List of historical performance metrics
            
        Returns:
            Dict with learning-based recommendations
        """
        if not historical_metrics:
            return {
                'recommendation': 'Insufficient historical data',
                'confidence': 'low'
            }
        
        # Calculate average metrics
        df = pd.DataFrame(historical_metrics)
        
        avg_error = df['percentage_error'].mean()
        error_trend = df['percentage_error'].iloc[-5:].mean() - df['percentage_error'].iloc[:5].mean()
        
        recommendations = []
        
        # Recommendation based on accuracy trend
        if avg_error < 15:
            recommendations.append({
                'type': 'model_performance',
                'message': 'Model performance is excellent. Continue current approach.',
                'confidence': 'high'
            })
        elif avg_error < 25:
            recommendations.append({
                'type': 'model_performance',
                'message': 'Model performance is good. Minor adjustments may improve accuracy.',
                'confidence': 'medium'
            })
        else:
            recommendations.append({
                'type': 'model_performance',
                'message': 'Model needs retraining with recent data to improve accuracy.',
                'confidence': 'high'
            })
        
        # Recommendation based on trend
        if error_trend > 5:
            recommendations.append({
                'type': 'trend_alert',
                'message': 'Prediction errors are increasing. Consider retraining models.',
                'confidence': 'high'
            })
        elif error_trend < -5:
            recommendations.append({
                'type': 'trend_positive',
                'message': 'Prediction accuracy is improving over time.',
                'confidence': 'high'
            })
        
        return {
            'recommendations': recommendations,
            'avg_error': round(avg_error, 2),
            'error_trend': round(error_trend, 2),
            'data_points': len(historical_metrics)
        }


class WhatIfAnalysis:
    """Perform what-if scenario analysis for route planning"""
    
    @staticmethod
    def emergency_rerouting(current_route: Dict, 
                           emergency_atm_id: int,
                           atm_location: Tuple[float, float],
                           vehicle_current_location: Tuple[float, float]) -> Dict:
        """
        Simulate emergency rerouting when ATM runs out of cash
        
        Args:
            current_route: Current planned route
            emergency_atm_id: ATM that needs emergency refill
            atm_location: Location of emergency ATM
            vehicle_current_location: Current vehicle location
            
        Returns:
            Dict with emergency route modification
        """
        # Calculate distance to emergency ATM
        import math
        
        def haversine_distance(loc1: Tuple[float, float], loc2: Tuple[float, float]) -> float:
            """Calculate distance between two points using Haversine formula"""
            lat1, lon1 = loc1
            lat2, lon2 = loc2
            
            R = 6371  # Earth's radius in km
            
            lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            
            a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
            c = 2 * math.asin(math.sqrt(a))
            
            return R * c
        
        distance_to_emergency = haversine_distance(vehicle_current_location, atm_location)
        
        # Estimate additional time and cost
        avg_speed_kmh = 40  # Average speed in city
        additional_time_hours = distance_to_emergency / avg_speed_kmh
        fuel_cost_per_km = 0.15  # $ per km
        additional_fuel_cost = distance_to_emergency * fuel_cost_per_km
        
        # Determine insertion point in route
        original_route = current_route.get('route', [])
        
        # Find best insertion point (minimize additional distance)
        best_insertion_index = 0
        min_additional_distance = float('inf')
        
        for i in range(len(original_route) + 1):
            # Calculate additional distance if inserted at position i
            if i == 0:
                dist = distance_to_emergency
                if original_route:
                    dist += haversine_distance(atm_location, original_route[0]['location'])
            elif i == len(original_route):
                dist = haversine_distance(original_route[-1]['location'], atm_location)
            else:
                # Distance from previous to emergency + emergency to next
                # minus distance from previous to next
                prev_loc = original_route[i-1]['location']
                next_loc = original_route[i]['location']
                
                dist = (haversine_distance(prev_loc, atm_location) +
                       haversine_distance(atm_location, next_loc) -
                       haversine_distance(prev_loc, next_loc))
            
            if dist < min_additional_distance:
                min_additional_distance = dist
                best_insertion_index = i
        
        # Create modified route
        modified_route = original_route[:best_insertion_index]
        modified_route.append({
            'atm_id': emergency_atm_id,
            'location': atm_location,
            'type': 'emergency',
            'priority': 'critical'
        })
        modified_route.extend(original_route[best_insertion_index:])
        
        return {
            'scenario': 'emergency_rerouting',
            'emergency_atm_id': emergency_atm_id,
            'distance_to_emergency': round(distance_to_emergency, 2),
            'additional_time_hours': round(additional_time_hours, 2),
            'additional_fuel_cost': round(additional_fuel_cost, 2),
            'insertion_index': best_insertion_index,
            'original_route_length': len(original_route),
            'modified_route_length': len(modified_route),
            'modified_route': modified_route,
            'total_additional_distance': round(min_additional_distance, 2),
            'recommendation': f'Insert emergency ATM at position {best_insertion_index + 1}'
        }
    
    @staticmethod
    def vehicle_breakdown_simulation(current_route: Dict,
                                    available_vehicles: List[Dict],
                                    broken_vehicle_id: int) -> Dict:
        """
        Simulate vehicle breakdown and find alternative vehicle
        
        Args:
            current_route: Current planned route
            available_vehicles: List of available vehicles
            broken_vehicle_id: Vehicle that broke down
            
        Returns:
            Dict with alternative routing options
        """
        # Find alternative vehicles
        alternatives = []
        
        for vehicle in available_vehicles:
            if vehicle['id'] == broken_vehicle_id:
                continue
            
            if vehicle['status'] != 'available':
                continue
            
            # Check if vehicle has sufficient capacity
            route_total_cash_needed = current_route.get('total_cash_needed', 0)
            
            if vehicle['capacity'] >= route_total_cash_needed:
                # Calculate additional cost based on vehicle efficiency
                fuel_efficiency = vehicle.get('fuel_efficiency', 10)  # km per liter
                fuel_price = 1.5  # $ per liter
                total_distance = current_route.get('total_distance', 0)
                
                fuel_cost = (total_distance / fuel_efficiency) * fuel_price
                
                # Calculate priority score (lower is better)
                distance_factor = abs(vehicle.get('current_location', [0, 0])[0] - 
                                    current_route.get('start_location', [0, 0])[0])
                
                priority_score = fuel_cost + distance_factor
                
                alternatives.append({
                    'vehicle_id': vehicle['id'],
                    'vehicle_name': vehicle['name'],
                    'capacity': vehicle['capacity'],
                    'fuel_efficiency': fuel_efficiency,
                    'estimated_fuel_cost': round(fuel_cost, 2),
                    'priority_score': round(priority_score, 2),
                    'recommendation': 'suitable'
                })
        
        # Sort by priority score
        alternatives.sort(key=lambda x: x['priority_score'])
        
        if not alternatives:
            return {
                'scenario': 'vehicle_breakdown',
                'broken_vehicle_id': broken_vehicle_id,
                'alternatives_found': 0,
                'recommendation': 'No suitable alternative vehicles available. Consider rescheduling route.',
                'status': 'critical'
            }
        
        return {
            'scenario': 'vehicle_breakdown',
            'broken_vehicle_id': broken_vehicle_id,
            'alternatives_found': len(alternatives),
            'recommended_vehicle': alternatives[0],
            'all_alternatives': alternatives,
            'recommendation': f"Use vehicle {alternatives[0]['vehicle_name']} as replacement",
            'status': 'resolved'
        }
    
    @staticmethod
    def cost_comparison(current_route: Dict, 
                       alternative_route: Dict) -> Dict:
        """
        Compare costs between current and alternative routes
        
        Args:
            current_route: Current route data
            alternative_route: Alternative route data
            
        Returns:
            Dict with cost comparison
        """
        # Extract metrics from both routes
        current_distance = current_route.get('total_distance', 0)
        current_time = current_route.get('total_time', 0)
        current_fuel_cost = current_route.get('fuel_cost', 0)
        current_atms = len(current_route.get('route', []))
        
        alt_distance = alternative_route.get('total_distance', 0)
        alt_time = alternative_route.get('total_time', 0)
        alt_fuel_cost = alternative_route.get('fuel_cost', 0)
        alt_atms = len(alternative_route.get('route', []))
        
        # Calculate differences
        distance_diff = alt_distance - current_distance
        time_diff = alt_time - current_time
        fuel_cost_diff = alt_fuel_cost - current_fuel_cost
        
        # Calculate savings/additional costs
        distance_saving_pct = (distance_diff / current_distance * 100) if current_distance > 0 else 0
        time_saving_pct = (time_diff / current_time * 100) if current_time > 0 else 0
        cost_saving_pct = (fuel_cost_diff / current_fuel_cost * 100) if current_fuel_cost > 0 else 0
        
        # Determine recommendation
        if fuel_cost_diff < -5:  # Save more than $5
            recommendation = 'alternative_recommended'
            reason = f'Alternative route saves ${abs(fuel_cost_diff):.2f} in fuel costs'
        elif fuel_cost_diff > 5:  # Costs more than $5 extra
            recommendation = 'current_recommended'
            reason = f'Current route is ${abs(fuel_cost_diff):.2f} cheaper'
        else:
            recommendation = 'similar'
            reason = 'Both routes have similar costs'
        
        return {
            'scenario': 'cost_comparison',
            'current_route': {
                'distance_km': round(current_distance, 2),
                'time_hours': round(current_time, 2),
                'fuel_cost': round(current_fuel_cost, 2),
                'atms_visited': current_atms
            },
            'alternative_route': {
                'distance_km': round(alt_distance, 2),
                'time_hours': round(alt_time, 2),
                'fuel_cost': round(alt_fuel_cost, 2),
                'atms_visited': alt_atms
            },
            'differences': {
                'distance_diff_km': round(distance_diff, 2),
                'time_diff_hours': round(time_diff, 2),
                'fuel_cost_diff': round(fuel_cost_diff, 2),
                'distance_saving_pct': round(distance_saving_pct, 1),
                'time_saving_pct': round(time_saving_pct, 1),
                'cost_saving_pct': round(cost_saving_pct, 1)
            },
            'recommendation': recommendation,
            'reason': reason
        }


# ===== API ENDPOINTS =====

@ai_recommendations_bp.route('/recommendations/critical-atms', methods=['POST'])
def get_critical_atms():
    """Get list of critical ATMs that need immediate attention"""
    try:
        data = request.json
        atms_data = data.get('atms', [])
        ml_forecasts = data.get('ml_forecasts', {})
        threshold = data.get('threshold', 1.5)
        
        # Convert string keys to int
        ml_forecasts = {int(k): v for k, v in ml_forecasts.items()}
        
        critical_atms = SmartRecommendationEngine.identify_critical_atms(
            atms_data=atms_data,
            ml_forecasts=ml_forecasts,
            threshold=threshold
        )
        
        return jsonify({
            'success': True,
            'critical_atms': critical_atms,
            'total_critical': len(critical_atms),
            'threshold': threshold
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@ai_recommendations_bp.route('/recommendations/refill-frequency/<int:atm_id>', methods=['POST'])
def get_refill_frequency(atm_id):
    """Get optimal refill frequency for specific ATM"""
    try:
        data = request.json
        predicted_demands = data.get('predicted_demands', [])
        capacity = data.get('capacity', 0)
        current_balance = data.get('current_balance', 0)
        
        recommendation = SmartRecommendationEngine.get_optimal_refill_frequency(
            predicted_demands=predicted_demands,
            capacity=capacity,
            current_balance=current_balance
        )
        
        return jsonify({
            'success': True,
            'atm_id': atm_id,
            'recommendation': recommendation
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@ai_recommendations_bp.route('/metrics/compare-prediction', methods=['POST'])
def compare_prediction():
    """Compare predicted vs actual demand"""
    try:
        data = request.json
        atm_id = data.get('atm_id')
        predicted_demand = data.get('predicted_demand')
        actual_demand = data.get('actual_demand')
        date = datetime.fromisoformat(data.get('date', datetime.now().isoformat()))
        
        comparison = RouteOptimizationMetrics.compare_predicted_vs_actual(
            atm_id=atm_id,
            predicted_demand=predicted_demand,
            actual_demand=actual_demand,
            date=date
        )
        
        return jsonify({
            'success': True,
            'comparison': comparison
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@ai_recommendations_bp.route('/metrics/route-efficiency', methods=['POST'])
def calculate_route_efficiency():
    """Calculate efficiency metrics for a route"""
    try:
        data = request.json
        route_data = data.get('route_data', {})
        
        efficiency = RouteOptimizationMetrics.calculate_route_efficiency(route_data)
        
        return jsonify({
            'success': True,
            'efficiency': efficiency
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@ai_recommendations_bp.route('/metrics/learning-recommendations', methods=['POST'])
def get_learning_recommendations():
    """Get learning-based recommendations from historical data"""
    try:
        data = request.json
        historical_metrics = data.get('historical_metrics', [])
        
        recommendations = RouteOptimizationMetrics.learning_recommendations(historical_metrics)
        
        return jsonify({
            'success': True,
            'learning': recommendations
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@ai_recommendations_bp.route('/whatif/emergency-rerouting', methods=['POST'])
def simulate_emergency_rerouting():
    """Simulate emergency rerouting scenario"""
    try:
        data = request.json
        current_route = data.get('current_route', {})
        emergency_atm_id = data.get('emergency_atm_id')
        atm_location = tuple(data.get('atm_location', [0, 0]))
        vehicle_location = tuple(data.get('vehicle_location', [0, 0]))
        
        result = WhatIfAnalysis.emergency_rerouting(
            current_route=current_route,
            emergency_atm_id=emergency_atm_id,
            atm_location=atm_location,
            vehicle_current_location=vehicle_location
        )
        
        return jsonify({
            'success': True,
            'analysis': result
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@ai_recommendations_bp.route('/whatif/vehicle-breakdown', methods=['POST'])
def simulate_vehicle_breakdown():
    """Simulate vehicle breakdown scenario"""
    try:
        data = request.json
        current_route = data.get('current_route', {})
        available_vehicles = data.get('available_vehicles', [])
        broken_vehicle_id = data.get('broken_vehicle_id')
        
        result = WhatIfAnalysis.vehicle_breakdown_simulation(
            current_route=current_route,
            available_vehicles=available_vehicles,
            broken_vehicle_id=broken_vehicle_id
        )
        
        return jsonify({
            'success': True,
            'analysis': result
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@ai_recommendations_bp.route('/whatif/cost-comparison', methods=['POST'])
def compare_route_costs():
    """Compare costs between two routes"""
    try:
        data = request.json
        current_route = data.get('current_route', {})
        alternative_route = data.get('alternative_route', {})
        
        result = WhatIfAnalysis.cost_comparison(
            current_route=current_route,
            alternative_route=alternative_route
        )
        
        return jsonify({
            'success': True,
            'comparison': result
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


def register_ai_routes(app):
    """Register AI recommendations blueprint with Flask app"""
    app.register_blueprint(ai_recommendations_bp)
    print("✅ AI Recommendations API registered")
