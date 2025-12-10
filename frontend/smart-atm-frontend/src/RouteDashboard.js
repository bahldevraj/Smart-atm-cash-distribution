import React, { useState, useEffect } from "react";

const RouteDashboard = () => {
    console.log("RouteDashboard component rendering");
    const [routes, setRoutes] = useState([]);
    const [filter, setFilter] = useState("all"); // all, planned, executed
    const [loading, setLoading] = useState(false);
    const [selectedRoute, setSelectedRoute] = useState(null);

    useEffect(() => {
        fetchRoutes();
    }, []);

    const fetchRoutes = async () => {
        setLoading(true);
        try {
            const response = await fetch("http://127.0.0.1:5000/api/routes");
            const data = await response.json();
            setRoutes(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching routes:", error);
            setRoutes([]);
        } finally {
            setLoading(false);
        }
    };

    const handleExecuteRoute = async (routeId) => {
        if (!window.confirm("Mark this route as executed?")) {
            return;
        }

        try {
            const response = await fetch(
                `http://127.0.0.1:5000/api/routes/${routeId}/execute`,
                {
                    method: "POST",
                }
            );

            if (response.ok) {
                alert("Route marked as executed!");
                fetchRoutes();
            } else {
                alert("Failed to execute route");
            }
        } catch (error) {
            console.error("Error executing route:", error);
            alert("Error executing route");
        }
    };

    const viewRouteDetails = async (routeId) => {
        try {
            const response = await fetch(
                `http://127.0.0.1:5000/api/routes/${routeId}`
            );
            const data = await response.json();
            setSelectedRoute(data);
        } catch (error) {
            console.error("Error fetching route details:", error);
        }
    };

    const filteredRoutes = routes.filter((route) => {
        if (filter === "all") return true;
        return route.status === filter;
    });

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
        }).format(amount);
    };

    // Calculate statistics
    const stats = {
        total: routes.length,
        planned: routes.filter((r) => r.status === "planned").length,
        executed: routes.filter((r) => r.status === "executed").length,
        totalDistance: routes.reduce(
            (sum, r) => sum + (r.total_distance || 0),
            0
        ),
        totalCost: routes.reduce((sum, r) => sum + (r.total_cost || 0), 0),
        totalAtms: routes.reduce((sum, r) => sum + (r.stops?.length || 0), 0),
    };

    return (
        <div className="route-dashboard">
            <h2 className="text-2xl font-bold mb-4">📋 Route Dashboard</h2>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                <div className="bg-blue-100 p-4 rounded shadow">
                    <div className="text-2xl font-bold text-blue-700">
                        {stats.total}
                    </div>
                    <div className="text-sm text-blue-600">Total Routes</div>
                </div>
                <div className="bg-yellow-100 p-4 rounded shadow">
                    <div className="text-2xl font-bold text-yellow-700">
                        {stats.planned}
                    </div>
                    <div className="text-sm text-yellow-600">Planned</div>
                </div>
                <div className="bg-green-100 p-4 rounded shadow">
                    <div className="text-2xl font-bold text-green-700">
                        {stats.executed}
                    </div>
                    <div className="text-sm text-green-600">Executed</div>
                </div>
                <div className="bg-purple-100 p-4 rounded shadow">
                    <div className="text-2xl font-bold text-purple-700">
                        {stats.totalDistance.toFixed(0)}
                    </div>
                    <div className="text-sm text-purple-600">Total KM</div>
                </div>
                <div className="bg-red-100 p-4 rounded shadow">
                    <div className="text-2xl font-bold text-red-700">
                        {formatCurrency(stats.totalCost)}
                    </div>
                    <div className="text-sm text-red-600">Total Cost</div>
                </div>
                <div className="bg-indigo-100 p-4 rounded shadow">
                    <div className="text-2xl font-bold text-indigo-700">
                        {stats.totalAtms}
                    </div>
                    <div className="text-sm text-indigo-600">ATMs Served</div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="bg-white rounded shadow mb-6">
                <div className="flex border-b">
                    <button
                        onClick={() => setFilter("all")}
                        className={`px-6 py-3 font-semibold ${
                            filter === "all"
                                ? "border-b-2 border-blue-500 text-blue-600"
                                : "text-gray-600"
                        }`}
                    >
                        All Routes ({routes.length})
                    </button>
                    <button
                        onClick={() => setFilter("planned")}
                        className={`px-6 py-3 font-semibold ${
                            filter === "planned"
                                ? "border-b-2 border-yellow-500 text-yellow-600"
                                : "text-gray-600"
                        }`}
                    >
                        Planned ({stats.planned})
                    </button>
                    <button
                        onClick={() => setFilter("executed")}
                        className={`px-6 py-3 font-semibold ${
                            filter === "executed"
                                ? "border-b-2 border-green-500 text-green-600"
                                : "text-gray-600"
                        }`}
                    >
                        Executed ({stats.executed})
                    </button>
                </div>
            </div>

            {/* Routes List */}
            <div className="bg-white rounded shadow p-6">
                {loading ? (
                    <div className="text-center py-8 text-gray-500">
                        Loading routes...
                    </div>
                ) : filteredRoutes.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        No {filter !== "all" ? filter : ""} routes found.
                        Generate routes from the Route Planning tab.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredRoutes.map((route) => (
                            <div
                                key={route.id}
                                className="border rounded p-4 hover:shadow-md transition-shadow"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="text-lg font-semibold">
                                            {route.vehicle_name ||
                                                `Vehicle ${route.vehicle_id}`}
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            Route Date:{" "}
                                            {new Date(
                                                route.date
                                            ).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <span
                                        className={`px-3 py-1 rounded text-sm font-semibold ${
                                            route.status === "executed"
                                                ? "bg-green-200 text-green-800"
                                                : "bg-yellow-200 text-yellow-800"
                                        }`}
                                    >
                                        {route.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                                    <div>
                                        <div className="text-xs text-gray-500">
                                            Stops
                                        </div>
                                        <div className="font-semibold">
                                            {route.stops?.length || 0} ATMs
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500">
                                            Distance
                                        </div>
                                        <div className="font-semibold">
                                            {route.total_distance?.toFixed(2) ||
                                                0}{" "}
                                            km
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500">
                                            Time
                                        </div>
                                        <div className="font-semibold">
                                            {route.total_time?.toFixed(1) || 0}{" "}
                                            hrs
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500">
                                            Cost
                                        </div>
                                        <div className="font-semibold">
                                            {formatCurrency(
                                                route.total_cost || 0
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {route.stops && route.stops.length > 0 && (
                                    <div className="mb-3">
                                        <div className="text-xs text-gray-500 mb-1">
                                            Route Stops:
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {route.stops
                                                .slice(0, 5)
                                                .map((stop, index) => (
                                                    <span
                                                        key={index}
                                                        className="text-xs bg-gray-100 px-2 py-1 rounded"
                                                    >
                                                        {index + 1}.{" "}
                                                        {stop.atm_name}
                                                    </span>
                                                ))}
                                            {route.stops.length > 5 && (
                                                <span className="text-xs text-gray-500">
                                                    +{route.stops.length - 5}{" "}
                                                    more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <button
                                        onClick={() =>
                                            viewRouteDetails(route.id)
                                        }
                                        className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600"
                                    >
                                        View Details
                                    </button>
                                    {route.status === "planned" && (
                                        <button
                                            onClick={() =>
                                                handleExecuteRoute(route.id)
                                            }
                                            className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600"
                                        >
                                            Mark as Executed
                                        </button>
                                    )}
                                </div>

                                {route.executed_at && (
                                    <div className="mt-2 text-xs text-gray-500">
                                        Executed at:{" "}
                                        {formatDate(route.executed_at)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Route Details Modal */}
            {selectedRoute && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-2xl font-bold">
                                    Route Details
                                </h3>
                                <button
                                    onClick={() => setSelectedRoute(null)}
                                    className="text-gray-500 hover:text-gray-700 text-2xl"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Route Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-sm text-gray-500">
                                            Vehicle
                                        </div>
                                        <div className="font-semibold">
                                            {selectedRoute.vehicle_name}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-500">
                                            Status
                                        </div>
                                        <div className="font-semibold">
                                            {selectedRoute.status}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-500">
                                            Date
                                        </div>
                                        <div className="font-semibold">
                                            {new Date(
                                                selectedRoute.date
                                            ).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-500">
                                            Total Distance
                                        </div>
                                        <div className="font-semibold">
                                            {selectedRoute.total_distance} km
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-500">
                                            Estimated Time
                                        </div>
                                        <div className="font-semibold">
                                            {selectedRoute.total_time} hours
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-500">
                                            Total Cost
                                        </div>
                                        <div className="font-semibold">
                                            {formatCurrency(
                                                selectedRoute.total_cost
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Stops */}
                                <div>
                                    <h4 className="font-semibold mb-2">
                                        Stops (
                                        {selectedRoute.stops?.length || 0})
                                    </h4>
                                    <div className="space-y-2">
                                        {selectedRoute.stops?.map(
                                            (stop, index) => (
                                                <div
                                                    key={index}
                                                    className="border-l-4 border-blue-500 pl-4 py-2 bg-gray-50"
                                                >
                                                    <div className="font-semibold">
                                                        Stop {stop.sequence}:{" "}
                                                        {stop.atm_name}
                                                    </div>
                                                    <div className="text-sm text-gray-600">
                                                        {stop.location}
                                                    </div>
                                                    <div className="text-sm text-gray-600">
                                                        Predicted Demand:{" "}
                                                        {formatCurrency(
                                                            stop.predicted_demand
                                                        )}{" "}
                                                        | Loaded:{" "}
                                                        {formatCurrency(
                                                            stop.actual_loaded
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RouteDashboard;
