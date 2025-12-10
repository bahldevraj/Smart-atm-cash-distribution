import React, { useState, useEffect, useMemo, useCallback } from "react";

const VehicleManagement = () => {
    console.log("VehicleManagement component rendering");
    const [vehicles, setVehicles] = useState([]);
    const [vaults, setVaults] = useState([]);
    const [selectedVaultFilter, setSelectedVaultFilter] = useState("all");
    const [formData, setFormData] = useState({
        name: "",
        capacity: "",
        fuel_cost_per_km: "2.0",
        assigned_vault_id: "",
        status: "available",
    });
    const [editingVehicle, setEditingVehicle] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchVehicles = useCallback(async () => {
        try {
            const response = await fetch("http://127.0.0.1:5000/api/vehicles");
            const data = await response.json();
            setVehicles(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching vehicles:", error);
            setVehicles([]);
        }
    }, []);

    const fetchVaults = useCallback(async () => {
        try {
            const response = await fetch("http://127.0.0.1:5000/api/vaults");
            const data = await response.json();
            setVaults(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching vaults:", error);
            setVaults([]);
        }
    }, []);

    useEffect(() => {
        fetchVehicles();
        fetchVaults();
    }, [fetchVehicles, fetchVaults]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = editingVehicle
                ? `http://127.0.0.1:5000/api/vehicles/${editingVehicle.id}`
                : "http://127.0.0.1:5000/api/vehicles";

            const method = editingVehicle ? "PUT" : "POST";

            const response = await fetch(url, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    capacity: parseFloat(formData.capacity),
                    fuel_cost_per_km: parseFloat(formData.fuel_cost_per_km),
                    assigned_vault_id: formData.assigned_vault_id
                        ? parseInt(formData.assigned_vault_id)
                        : null,
                }),
            });

            if (response.ok) {
                alert(
                    editingVehicle
                        ? "Vehicle updated successfully!"
                        : "Vehicle added successfully!"
                );
                resetForm();
                fetchVehicles();
            } else {
                alert("Failed to save vehicle");
            }
        } catch (error) {
            console.error("Error saving vehicle:", error);
            alert("Error saving vehicle");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (vehicle) => {
        setEditingVehicle(vehicle);
        setFormData({
            name: vehicle.name,
            capacity: vehicle.capacity.toString(),
            fuel_cost_per_km: vehicle.fuel_cost_per_km.toString(),
            assigned_vault_id: vehicle.assigned_vault_id
                ? vehicle.assigned_vault_id.toString()
                : "",
            status: vehicle.status,
        });
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this vehicle?")) {
            return;
        }

        try {
            const response = await fetch(
                `http://127.0.0.1:5000/api/vehicles/${id}`,
                {
                    method: "DELETE",
                }
            );

            if (response.ok) {
                alert("Vehicle deleted successfully!");
                fetchVehicles();
            } else {
                alert("Failed to delete vehicle");
            }
        } catch (error) {
            console.error("Error deleting vehicle:", error);
            alert("Error deleting vehicle");
        }
    };

    const resetForm = () => {
        setFormData({
            name: "",
            capacity: "",
            fuel_cost_per_km: "2.0",
            assigned_vault_id: "",
            status: "available",
        });
        setEditingVehicle(null);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const getVaultName = (vaultId) => {
        const vault = vaults.find((v) => v.id === vaultId);
        return vault ? vault.name : "Not Assigned";
    };

    return (
        <div className="vehicle-management">
            <h2 className="text-2xl font-bold mb-4">🚚 Vehicle Management</h2>

            {/* Add/Edit Vehicle Form */}
            <div className="bg-white p-6 rounded shadow mb-6">
                <h3 className="text-xl font-semibold mb-4">
                    {editingVehicle ? "Edit Vehicle" : "Add New Vehicle"}
                </h3>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Vehicle Name
                            </label>
                            <input
                                type="text"
                                required
                                className="w-full p-2 border rounded"
                                placeholder="e.g., Armored Truck - Alpha"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        name: e.target.value,
                                    })
                                }
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Capacity ($)
                            </label>
                            <input
                                type="number"
                                required
                                className="w-full p-2 border rounded"
                                placeholder="e.g., 5000000"
                                value={formData.capacity}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        capacity: e.target.value,
                                    })
                                }
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Fuel Cost per KM ($)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                required
                                className="w-full p-2 border rounded"
                                placeholder="e.g., 2.5"
                                value={formData.fuel_cost_per_km}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        fuel_cost_per_km: e.target.value,
                                    })
                                }
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Assigned Vault
                            </label>
                            <select
                                className="w-full p-2 border rounded"
                                value={formData.assigned_vault_id}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        assigned_vault_id: e.target.value,
                                    })
                                }
                            >
                                <option value="">Select Vault</option>
                                {vaults.map((vault) => (
                                    <option key={vault.id} value={vault.id}>
                                        {vault.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">
                                Status
                            </label>
                            <select
                                className="w-full p-2 border rounded"
                                value={formData.status}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        status: e.target.value,
                                    })
                                }
                            >
                                <option value="available">Available</option>
                                <option value="in_use">In Use</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
                        >
                            {loading
                                ? "Saving..."
                                : editingVehicle
                                ? "Update Vehicle"
                                : "Add Vehicle"}
                        </button>
                        {editingVehicle && (
                            <button
                                type="button"
                                onClick={resetForm}
                                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* Vehicle List */}
            <div className="bg-white p-6 rounded shadow">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">Vehicle Fleet</h3>
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">
                            Filter by Vault:
                        </label>
                        <select
                            className="p-2 border rounded"
                            value={selectedVaultFilter}
                            onChange={(e) =>
                                setSelectedVaultFilter(e.target.value)
                            }
                        >
                            <option value="all">All Vaults</option>
                            {vaults.map((vault) => (
                                <option key={vault.id} value={vault.id}>
                                    {vault.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {vehicles.filter(
                    (v) =>
                        selectedVaultFilter === "all" ||
                        v.assigned_vault_id === parseInt(selectedVaultFilter)
                ).length === 0 ? (
                    <p className="text-gray-500">
                        {selectedVaultFilter === "all"
                            ? "No vehicles added yet. Add your first vehicle above."
                            : "No vehicles assigned to this vault."}
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="p-2 text-left">Name</th>
                                    <th className="p-2 text-left">Capacity</th>
                                    <th className="p-2 text-left">
                                        Fuel Cost/KM
                                    </th>
                                    <th className="p-2 text-left">
                                        Assigned Vault
                                    </th>
                                    <th className="p-2 text-left">Status</th>
                                    <th className="p-2 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vehicles
                                    .filter(
                                        (v) =>
                                            selectedVaultFilter === "all" ||
                                            v.assigned_vault_id ===
                                                parseInt(selectedVaultFilter)
                                    )
                                    .map((vehicle) => (
                                        <tr
                                            key={vehicle.id}
                                            className="border-b hover:bg-gray-50"
                                        >
                                            <td className="p-2">
                                                {vehicle.name}
                                            </td>
                                            <td className="p-2">
                                                {formatCurrency(
                                                    vehicle.capacity
                                                )}
                                            </td>
                                            <td className="p-2">
                                                $
                                                {vehicle.fuel_cost_per_km.toFixed(
                                                    2
                                                )}
                                            </td>
                                            <td className="p-2">
                                                {getVaultName(
                                                    vehicle.assigned_vault_id
                                                )}
                                            </td>
                                            <td className="p-2">
                                                <span
                                                    className={`px-2 py-1 rounded text-xs font-semibold ${
                                                        vehicle.status ===
                                                        "available"
                                                            ? "bg-green-200 text-green-800"
                                                            : vehicle.status ===
                                                              "in_use"
                                                            ? "bg-blue-200 text-blue-800"
                                                            : vehicle.status ===
                                                              "active"
                                                            ? "bg-green-200 text-green-800"
                                                            : vehicle.status ===
                                                              "maintenance"
                                                            ? "bg-yellow-200 text-yellow-800"
                                                            : "bg-gray-200 text-gray-800"
                                                    }`}
                                                >
                                                    {vehicle.status === "in_use"
                                                        ? "In Use"
                                                        : vehicle.status
                                                              .charAt(0)
                                                              .toUpperCase() +
                                                          vehicle.status.slice(
                                                              1
                                                          )}
                                                </span>
                                            </td>
                                            <td className="p-2">
                                                <button
                                                    onClick={() =>
                                                        handleEdit(vehicle)
                                                    }
                                                    className="bg-yellow-500 text-white px-3 py-1 rounded mr-2 hover:bg-yellow-600 text-sm"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handleDelete(vehicle.id)
                                                    }
                                                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VehicleManagement;
