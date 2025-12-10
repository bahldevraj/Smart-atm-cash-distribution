"""
Route Optimizer Service: AI-Powered Vehicle Routing
Uses Google OR-Tools for multi-vehicle routing optimization with capacity constraints
"""

from geopy.distance import geodesic
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp
import numpy as np
from typing import List, Dict, Tuple
from datetime import datetime, timedelta

class RouteOptimizer:
    """Service for optimizing vehicle routes using OR-Tools VRP solver"""
    
    def __init__(self):
        self.distance_matrix = None
        self.locations = []
        self.location_names = []
    
    def calculate_distance(self, coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
        """
        Calculate distance between two coordinates using Haversine formula
        
        Args:
            coord1: (latitude, longitude) tuple
            coord2: (latitude, longitude) tuple
        
        Returns:
            Distance in kilometers
        """
        return geodesic(coord1, coord2).kilometers
    
    def create_distance_matrix(self, locations: List[Dict]) -> np.ndarray:
        """
        Create distance matrix for all locations (vaults + ATMs)
        
        Args:
            locations: List of location dictionaries with 'latitude' and 'longitude'
        
        Returns:
            2D numpy array of distances
        """
        n = len(locations)
        matrix = np.zeros((n, n))
        
        for i in range(n):
            for j in range(n):
                if i != j:
                    coord1 = (locations[i]['latitude'], locations[i]['longitude'])
                    coord2 = (locations[j]['latitude'], locations[j]['longitude'])
                    matrix[i][j] = self.calculate_distance(coord1, coord2)
        
        self.locations = locations
        self.distance_matrix = matrix
        return matrix
    
    def optimize_routes(
        self,
        depot: Dict,
        atms_to_visit: List[Dict],
        vehicles: List[Dict],
        time_limit_seconds: int = 30
    ) -> Dict:
        """
        Optimize routes for multiple vehicles with capacity constraints
        
        Args:
            depot: Vault/depot location dictionary
            atms_to_visit: List of ATMs needing refill
            vehicles: List of vehicle dictionaries with capacity
            time_limit_seconds: Maximum time for optimization
        
        Returns:
            Dictionary with optimized routes for each vehicle
        """
        if not atms_to_visit:
            return {'routes': [], 'total_distance': 0, 'total_cost': 0, 'message': 'No ATMs to visit'}
        
        # Prepare locations: depot first, then ATMs
        all_locations = [depot] + atms_to_visit
        
        # Create distance matrix
        distance_matrix = self.create_distance_matrix(all_locations)
        
        # Convert to integer for OR-Tools (multiply by 1000 to preserve precision)
        distance_matrix_int = (distance_matrix * 1000).astype(int)
        
        # Prepare demands (depot has 0 demand)
        demands = [0] + [int(atm.get('required_amount', 100000)) for atm in atms_to_visit]
        
        # Vehicle capacities
        vehicle_capacities = [int(v['capacity']) for v in vehicles]
        
        # Create routing model
        manager = pywrapcp.RoutingIndexManager(
            len(all_locations),
            len(vehicles),
            0  # Depot index
        )
        
        routing = pywrapcp.RoutingModel(manager)
        
        # Define distance callback
        def distance_callback(from_index, to_index):
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return distance_matrix_int[from_node][to_node]
        
        transit_callback_index = routing.RegisterTransitCallback(distance_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)
        
        # Add capacity constraint
        def demand_callback(from_index):
            from_node = manager.IndexToNode(from_index)
            return demands[from_node]
        
        demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
        
        routing.AddDimensionWithVehicleCapacity(
            demand_callback_index,
            0,  # null capacity slack
            vehicle_capacities,
            True,  # start cumul to zero
            'Capacity'
        )
        
        # Set search parameters
        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
        )
        search_parameters.local_search_metaheuristic = (
            routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
        )
        search_parameters.time_limit.seconds = time_limit_seconds
        
        # Solve
        solution = routing.SolveWithParameters(search_parameters)
        
        if solution:
            return self._extract_solution(
                manager, routing, solution, all_locations, vehicles, distance_matrix
            )
        else:
            return {
                'routes': [],
                'total_distance': 0,
                'total_cost': 0,
                'status': 'failed',
                'message': 'No solution found. Try reducing ATMs or increasing vehicle capacity.'
            }
    
    def _extract_solution(
        self,
        manager,
        routing,
        solution,
        locations: List[Dict],
        vehicles: List[Dict],
        distance_matrix: np.ndarray
    ) -> Dict:
        """Extract and format the solution from OR-Tools"""
        routes = []
        total_distance = 0
        total_cost = 0
        
        for vehicle_id in range(len(vehicles)):
            vehicle = vehicles[vehicle_id]
            route_distance = 0
            route_load = 0
            route_stops = []
            
            index = routing.Start(vehicle_id)
            route_nodes = []
            
            while not routing.IsEnd(index):
                node = manager.IndexToNode(index)
                route_nodes.append(node)
                
                if node > 0:  # Not depot
                    atm = locations[node]
                    route_stops.append({
                        'sequence': len(route_stops) + 1,
                        'atm_id': atm['id'],
                        'atm_name': atm['name'],
                        'location': atm['location'],
                        'latitude': atm['latitude'],
                        'longitude': atm['longitude'],
                        'required_amount': atm['required_amount'],
                        'predicted_demand': atm.get('predicted_demand', 0)
                    })
                    route_load += atm['required_amount']
                
                previous_index = index
                index = solution.Value(routing.NextVar(index))
                route_distance += routing.GetArcCostForVehicle(previous_index, index, vehicle_id) / 1000.0
            
            # Add return to depot distance
            if len(route_nodes) > 1:
                last_node = route_nodes[-1]
                route_distance += distance_matrix[last_node][0]
            
            if route_stops:  # Only add routes with stops
                route_cost = route_distance * vehicle.get('fuel_cost_per_km', 2.0)
                
                routes.append({
                    'vehicle_id': vehicle['id'],
                    'vehicle_name': vehicle['name'],
                    'vehicle_capacity': vehicle['capacity'],
                    'stops': route_stops,
                    'total_stops': len(route_stops),
                    'total_distance': round(route_distance, 2),
                    'total_load': round(route_load, 2),
                    'capacity_utilization': round((route_load / vehicle['capacity']) * 100, 2),
                    'estimated_cost': round(route_cost, 2),
                    'estimated_time': round(route_distance / 40, 2)  # Assuming 40 km/h average speed
                })
                
                total_distance += route_distance
                total_cost += route_cost
        
        return {
            'status': 'success',
            'routes': routes,
            'total_routes': len(routes),
            'total_distance': round(total_distance, 2),
            'total_cost': round(total_cost, 2),
            'total_atms': sum(r['total_stops'] for r in routes),
            'optimization_date': datetime.now().isoformat()
        }
    
    def optimize_single_route(
        self,
        depot: Dict,
        atms_to_visit: List[Dict]
    ) -> Dict:
        """
        Optimize route for single vehicle (TSP - Traveling Salesman Problem)
        
        Args:
            depot: Starting location
            atms_to_visit: List of ATMs to visit
        
        Returns:
            Optimized route dictionary
        """
        if not atms_to_visit:
            return {'stops': [], 'total_distance': 0}
        
        # Simple nearest neighbor algorithm for single route
        all_locations = [depot] + atms_to_visit
        distance_matrix = self.create_distance_matrix(all_locations)
        
        # Nearest neighbor TSP
        unvisited = set(range(1, len(all_locations)))
        current = 0
        route = [current]
        total_distance = 0
        
        while unvisited:
            nearest = min(unvisited, key=lambda x: distance_matrix[current][x])
            total_distance += distance_matrix[current][nearest]
            route.append(nearest)
            current = nearest
            unvisited.remove(nearest)
        
        # Return to depot
        total_distance += distance_matrix[current][0]
        
        # Format result
        stops = []
        for seq, idx in enumerate(route[1:], 1):
            atm = all_locations[idx]
            stops.append({
                'sequence': seq,
                'atm_id': atm['id'],
                'atm_name': atm['name'],
                'location': atm['location'],
                'latitude': atm['latitude'],
                'longitude': atm['longitude'],
                'required_amount': atm.get('required_amount', 0),
                'distance_from_previous': round(distance_matrix[route[seq-1]][idx], 2)
            })
        
        return {
            'stops': stops,
            'total_distance': round(total_distance, 2),
            'total_stops': len(stops)
        }

# Singleton instance
_route_optimizer = None

def get_route_optimizer() -> RouteOptimizer:
    """Get or create route optimizer instance"""
    global _route_optimizer
    if _route_optimizer is None:
        _route_optimizer = RouteOptimizer()
    return _route_optimizer
