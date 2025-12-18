import React, { useState, useEffect, useMemo, useCallback } from "react";

// Helper function to get route colors
const getRouteColor = (index) => {
    const colors = [
        "#3B82F6", // blue
        "#10B981", // green
        "#F59E0B", // amber
        "#EF4444", // red
        "#8B5CF6", // purple
        "#EC4899", // pink
        "#14B8A6", // teal
        "#F97316", // orange
    ];
    return colors[index % colors.length];
};

const RoutePlanning = () => {
    console.log("RoutePlanning component rendering");

    const [vaults, setVaults] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [atms, setAtms] = useState([]);
    const [predictions, setPredictions] = useState([]);
    const [routes, setRoutes] = useState([]);

    const [selectedVault, setSelectedVault] = useState("");
    const [selectedVehicles, setSelectedVehicles] = useState([]);
    const [selectedAtms, setSelectedAtms] = useState([]);
    const [usePredictions, setUsePredictions] = useState(true);
    const [threshold, setThreshold] = useState(0.5);

    const [loading, setLoading] = useState(false);

    const fetchVaults = useCallback(async () => {
        try {
            const response = await fetch("http://127.0.0.1:5000/api/vaults");
            const data = await response.json();
            setVaults(data);
            if (data.length > 0) {
                setSelectedVault(data[0].id.toString());
            }
        } catch (error) {
            console.error("Error fetching vaults:", error);
        }
    }, []);

    const fetchVehicles = useCallback(async () => {
        try {
            const response = await fetch("http://127.0.0.1:5000/api/vehicles");
            const data = await response.json();
            const vehiclesArray = Array.isArray(data) ? data : [];
            setVehicles(
                vehiclesArray.filter(
                    (v) => v.status === "available" || v.status === "active"
                )
            );
        } catch (error) {
            console.error("Error fetching vehicles:", error);
            setVehicles([]);
        }
    }, []);

    const fetchAtms = useCallback(async () => {
        try {
            const response = await fetch("http://127.0.0.1:5000/api/atms");
            const data = await response.json();
            setAtms(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching ATMs:", error);
            setAtms([]);
        }
    }, []);

    useEffect(() => {
        fetchVaults();
        fetchVehicles();
        fetchAtms();
    }, [fetchVaults, fetchVehicles, fetchAtms]);

    // Define fetchPredictions before using it in useEffect
    const fetchPredictions = useCallback(async () => {
        try {
            const response = await fetch(
                `http://127.0.0.1:5000/api/predictions/tomorrow?threshold=${threshold}`
            );
            const data = await response.json();
            const atmsArray = Array.isArray(data?.atms)
                ? data.atms
                : Array.isArray(data)
                ? data
                : [];
            setPredictions(atmsArray);

            // Auto-select ATMs based on predictions
            const urgentAtmIds = atmsArray
                .filter((p) => p.predicted_demand > threshold)
                .map((p) => p.atm_id);
            setSelectedAtms(urgentAtmIds);
        } catch (error) {
            console.error("Error fetching predictions:", error);
            setPredictions([]);
        }
    }, [threshold]);

    useEffect(() => {
        if (usePredictions) {
            fetchPredictions();
        }
    }, [threshold, usePredictions, fetchPredictions]);

    // Auto-select vehicles when vault changes
    useEffect(() => {
        if (selectedVault && vehicles.length > 0) {
            const vaultVehicles = vehicles
                .filter((v) => v.assigned_vault_id === parseInt(selectedVault))
                .map((v) => v.id.toString());
            setSelectedVehicles(vaultVehicles);
        }
    }, [selectedVault, vehicles]);

    const handleGenerateRoutes = async () => {
        if (!selectedVault) {
            alert("Please select a vault");
            return;
        }

        if (selectedVehicles.length === 0) {
            alert("Please select at least one vehicle");
            return;
        }

        if (!usePredictions && selectedAtms.length === 0) {
            alert("Please select ATMs to visit or enable ML predictions");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(
                "http://127.0.0.1:5000/api/routes/generate",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        vault_id: parseInt(selectedVault),
                        vehicle_ids: selectedVehicles.map((v) => parseInt(v)),
                        atm_ids: usePredictions
                            ? []
                            : selectedAtms.map((a) => parseInt(a)),
                        use_predictions: usePredictions,
                        threshold: threshold,
                    }),
                }
            );

            const data = await response.json();

            if (data.status === "success") {
                setRoutes(data.routes || []);
                alert(
                    `Routes generated successfully!\n\nTotal Routes: ${
                        data.total_routes
                    }\nTotal Distance: ${
                        data.total_distance
                    } km\nTotal Cost: $${data.total_cost.toFixed(2)}`
                );
            } else {
                alert(
                    `Route generation failed: ${
                        data.message || "Unknown error"
                    }`
                );
            }
        } catch (error) {
            console.error("Error generating routes:", error);
            alert("Error generating routes");
        } finally {
            setLoading(false);
        }
    };

    const toggleVehicle = (vehicleId) => {
        setSelectedVehicles((prev) =>
            prev.includes(vehicleId)
                ? prev.filter((id) => id !== vehicleId)
                : [...prev, vehicleId]
        );
    };

    const toggleAtm = (atmId) => {
        setSelectedAtms((prev) =>
            prev.includes(atmId)
                ? prev.filter((id) => id !== atmId)
                : [...prev, atmId]
        );
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
        }).format(amount);
    };

    // Prepare ATM data - ensure atmMarkers is always an array
    const predictionsArray = Array.isArray(predictions) ? predictions : [];
    const atmsArray = Array.isArray(atms) ? atms : [];
    const atmMarkers = usePredictions
        ? predictionsArray
        : atmsArray.filter((a) => selectedAtms.includes(a.id.toString()));

    return (
        <div className="route-planning">
            <h2 className="text-2xl font-bold mb-4">
                🗺️ AI-Powered Route Planning
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Control Panel */}
                <div className="lg:col-span-1 space-y-4">
                    {/* Vault Selection */}
                    <div className="bg-white p-4 rounded shadow">
                        <h3 className="font-semibold mb-2">
                            📍 Select Depot (Vault)
                        </h3>
                        <select
                            className="w-full p-2 border rounded"
                            value={selectedVault}
                            onChange={(e) => setSelectedVault(e.target.value)}
                        >
                            {vaults.map((vault) => (
                                <option key={vault.id} value={vault.id}>
                                    {vault.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Vehicle Selection */}
                    <div className="bg-white p-4 rounded shadow">
                        <h3 className="font-semibold mb-2">
                            🚚 Vehicles Assigned to Selected Vault
                        </h3>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {vehicles.filter(
                                (v) =>
                                    v.assigned_vault_id ===
                                    parseInt(selectedVault)
                            ).length === 0 ? (
                                <p className="text-sm text-gray-500">
                                    No vehicles assigned to this vault
                                </p>
                            ) : (
                                vehicles
                                    .filter(
                                        (v) =>
                                            v.assigned_vault_id ===
                                            parseInt(selectedVault)
                                    )
                                    .map((vehicle) => (
                                        <label
                                            key={vehicle.id}
                                            className="flex items-center cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedVehicles.includes(
                                                    vehicle.id.toString()
                                                )}
                                                onChange={() =>
                                                    toggleVehicle(
                                                        vehicle.id.toString()
                                                    )
                                                }
                                                className="mr-2"
                                            />
                                            <span className="text-sm">
                                                {vehicle.name} (
                                                {formatCurrency(
                                                    vehicle.capacity
                                                )}
                                                )
                                            </span>
                                        </label>
                                    ))
                            )}
                        </div>
                    </div>

                    {/* Prediction vs Manual Selection */}
                    <div className="bg-white p-4 rounded shadow">
                        <h3 className="font-semibold mb-2">
                            🎯 ATM Selection Mode
                        </h3>
                        <div className="space-y-3">
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="radio"
                                    checked={usePredictions}
                                    onChange={() => setUsePredictions(true)}
                                    className="mr-2"
                                />
                                <span className="text-sm">
                                    Use ML Predictions (Auto)
                                </span>
                            </label>

                            {usePredictions && (
                                <div className="ml-6">
                                    <label className="text-xs text-gray-600">
                                        Refill Threshold:
                                    </label>
                                    <input
                                        type="range"
                                        min="0.1"
                                        max="0.9"
                                        step="0.1"
                                        value={threshold}
                                        onChange={(e) =>
                                            setThreshold(
                                                parseFloat(e.target.value)
                                            )
                                        }
                                        className="w-full"
                                    />
                                    <div className="text-xs text-gray-600 text-center">
                                        {(threshold * 100).toFixed(0)}% of
                                        capacity
                                    </div>
                                    <div className="text-xs text-blue-600 mt-2">
                                        {predictions.length} ATMs predicted to
                                        need refill
                                    </div>
                                </div>
                            )}

                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="radio"
                                    checked={!usePredictions}
                                    onChange={() => setUsePredictions(false)}
                                    className="mr-2"
                                />
                                <span className="text-sm">
                                    Manual Selection
                                </span>
                            </label>

                            {!usePredictions && (
                                <div className="ml-6 max-h-40 overflow-y-auto space-y-2">
                                    {atms.map((atm) => (
                                        <label
                                            key={atm.id}
                                            className="flex items-center cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedAtms.includes(
                                                    atm.id.toString()
                                                )}
                                                onChange={() =>
                                                    toggleAtm(atm.id.toString())
                                                }
                                                className="mr-2"
                                            />
                                            <span className="text-xs">
                                                {atm.name}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerateRoutes}
                        disabled={loading}
                        className="w-full bg-green-500 text-white p-3 rounded font-semibold hover:bg-green-600 disabled:bg-gray-400"
                    >
                        {loading
                            ? "Generating..."
                            : "🚀 Generate Optimal Routes"}
                    </button>

                    {/* Route Summary */}
                    {routes.length > 0 && (
                        <div className="bg-white p-4 rounded shadow">
                            <h3 className="font-semibold mb-2">
                                📊 Route Summary
                            </h3>
                            {routes.map((route, index) => (
                                <div
                                    key={index}
                                    className="mb-3 p-2 border-l-4"
                                    style={{
                                        borderColor: getRouteColor(index),
                                    }}
                                >
                                    <div className="text-sm font-semibold">
                                        {route.vehicle_name}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                        • Stops: {route.total_stops}
                                        <br />• Distance: {
                                            route.total_distance
                                        }{" "}
                                        km
                                        <br />• Cost: $
                                        {route.estimated_cost.toFixed(2)}
                                        <br />• Time:{" "}
                                        {route.estimated_time.toFixed(1)} hrs
                                        <br />• Load:{" "}
                                        {route.capacity_utilization.toFixed(1)}%
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Route Visualization */}
                <div className="lg:col-span-2">
                    <div className="bg-white p-4 rounded shadow">
                        <h3 className="font-semibold mb-3">
                            📍 Network Overview
                        </h3>

                        {/* Vault and ATM Coordinate Summary */}
                        <div className="mb-4 p-3 bg-gray-50 rounded">
                            <div className="grid grid-cols-2 gap-4 mb-3">
                                <div>
                                    <h4 className="text-sm font-semibold mb-2 text-blue-700">
                                        🏦 Selected Vault
                                    </h4>
                                    {vaults.find(
                                        (v) => v.id.toString() === selectedVault
                                    ) && (
                                        <div className="text-xs space-y-1">
                                            <div className="font-medium">
                                                {
                                                    vaults.find(
                                                        (v) =>
                                                            v.id.toString() ===
                                                            selectedVault
                                                    ).name
                                                }
                                            </div>
                                            <div className="text-gray-600">
                                                📍 Lat:{" "}
                                                {vaults
                                                    .find(
                                                        (v) =>
                                                            v.id.toString() ===
                                                            selectedVault
                                                    )
                                                    .latitude?.toFixed(4)}
                                                , Lon:{" "}
                                                {vaults
                                                    .find(
                                                        (v) =>
                                                            v.id.toString() ===
                                                            selectedVault
                                                    )
                                                    .longitude?.toFixed(4)}
                                            </div>
                                            <div className="text-gray-600">
                                                💰 Balance:{" "}
                                                {formatCurrency(
                                                    vaults.find(
                                                        (v) =>
                                                            v.id.toString() ===
                                                            selectedVault
                                                    ).current_balance
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold mb-2 text-green-700">
                                        🚚 Assigned Vehicles
                                    </h4>
                                    <div className="text-xs space-y-1">
                                        {vehicles
                                            .filter(
                                                (v) =>
                                                    v.assigned_vault_id ===
                                                    parseInt(selectedVault)
                                            )
                                            .map((vehicle) => (
                                                <div
                                                    key={vehicle.id}
                                                    className="flex items-center gap-2"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedVehicles.includes(
                                                            vehicle.id.toString()
                                                        )}
                                                        readOnly
                                                        className="w-3 h-3"
                                                    />
                                                    <span className="truncate">
                                                        {vehicle.name}
                                                    </span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold mb-2 text-purple-700">
                                    🏧 ATM Network Coverage
                                </h4>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div className="p-2 bg-white rounded border">
                                        <div className="text-gray-500">
                                            Total ATMs
                                        </div>
                                        <div className="text-lg font-bold">
                                            {atms.length}
                                        </div>
                                    </div>
                                    <div className="p-2 bg-white rounded border">
                                        <div className="text-gray-500">
                                            Selected/Predicted
                                        </div>
                                        <div className="text-lg font-bold text-orange-600">
                                            {usePredictions
                                                ? predictions.length
                                                : selectedAtms.length}
                                        </div>
                                    </div>
                                    <div className="p-2 bg-white rounded border">
                                        <div className="text-gray-500">
                                            Coverage Area
                                        </div>
                                        <div className="text-sm font-bold">
                                            NYC Region
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Route Sequence Visualization */}
                        {routes.length > 0 ? (
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-indigo-700">
                                    🗺️ Generated Route Sequences
                                </h4>
                                {routes.map((route, routeIndex) => (
                                    <div
                                        key={routeIndex}
                                        className="border rounded p-3 bg-gradient-to-r from-blue-50 to-indigo-50"
                                    >
                                        <div className="flex justify-between items-center mb-3">
                                            <div>
                                                <span className="font-semibold text-indigo-700">
                                                    Route #{routeIndex + 1}
                                                </span>
                                                <span className="ml-2 text-sm text-gray-600">
                                                    {route.vehicle_name}
                                                </span>
                                            </div>
                                            <div className="text-xs space-x-3">
                                                <span className="text-gray-700">
                                                    📏{" "}
                                                    {route.total_distance.toFixed(
                                                        1
                                                    )}{" "}
                                                    km
                                                </span>
                                                <span className="text-gray-700">
                                                    💵 $
                                                    {route.estimated_cost.toFixed(
                                                        2
                                                    )}
                                                </span>
                                                <span className="text-gray-700">
                                                    ⏱️{" "}
                                                    {route.estimated_time.toFixed(
                                                        1
                                                    )}{" "}
                                                    hrs
                                                </span>
                                            </div>
                                        </div>

                                        {/* Route Flow Diagram */}
                                        <div className="flex items-center overflow-x-auto pb-2 space-x-2">
                                            {/* Start at Vault */}
                                            <div className="flex-shrink-0 text-center">
                                                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                                                    🏦
                                                </div>
                                                <div className="text-xs mt-1 text-gray-600">
                                                    Start
                                                </div>
                                            </div>

                                            {/* Route Stops */}
                                            {route.stops.map(
                                                (stop, stopIndex) => (
                                                    <React.Fragment
                                                        key={stopIndex}
                                                    >
                                                        <div className="flex-shrink-0 text-gray-400">
                                                            →
                                                        </div>
                                                        <div className="flex-shrink-0 text-center">
                                                            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                                                                {stopIndex + 1}
                                                            </div>
                                                            <div
                                                                className="text-xs mt-1 text-gray-600 max-w-[80px] truncate"
                                                                title={
                                                                    stop.atm_name
                                                                }
                                                            >
                                                                {stop.atm_name?.replace(
                                                                    "ATM ",
                                                                    ""
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {formatCurrency(
                                                                    stop.required_amount
                                                                )}
                                                            </div>
                                                        </div>
                                                    </React.Fragment>
                                                )
                                            )}

                                            {/* Return to Vault */}
                                            <div className="flex-shrink-0 text-gray-400">
                                                →
                                            </div>
                                            <div className="flex-shrink-0 text-center">
                                                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                                                    🏦
                                                </div>
                                                <div className="text-xs mt-1 text-gray-600">
                                                    Return
                                                </div>
                                            </div>
                                        </div>

                                        {/* Route Stats */}
                                        <div className="mt-3 pt-3 border-t grid grid-cols-4 gap-2 text-xs">
                                            <div>
                                                <span className="text-gray-500">
                                                    Stops:
                                                </span>
                                                <span className="ml-1 font-semibold">
                                                    {route.total_stops}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">
                                                    Load:
                                                </span>
                                                <span className="ml-1 font-semibold">
                                                    {formatCurrency(
                                                        route.total_load
                                                    )}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">
                                                    Capacity:
                                                </span>
                                                <span className="ml-1 font-semibold">
                                                    {route.capacity_utilization.toFixed(
                                                        1
                                                    )}
                                                    %
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">
                                                    Fuel Cost:
                                                </span>
                                                <span className="ml-1 font-semibold">
                                                    $
                                                    {route.estimated_cost.toFixed(
                                                        2
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-400">
                                <div className="text-4xl mb-2">🗺️</div>
                                <p className="text-sm">
                                    Generate routes to see the visualization
                                </p>
                                <p className="text-xs mt-1">
                                    Routes will show depot → ATM stops → depot
                                    sequence
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoutePlanning;
