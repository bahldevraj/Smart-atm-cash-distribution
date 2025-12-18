import React, { useState, useEffect } from "react";
import {
    Users,
    CheckCircle,
    XCircle,
    Trash2,
    Shield,
    Clock,
    UserCheck,
    UserX,
    AlertCircle,
} from "lucide-react";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const AccessControl = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const getAuthHeaders = () => {
        const token = localStorage.getItem("token");
        return {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
        };
    };

    const fetchUsers = async () => {
        setLoading(true);
        setError("");
        try {
            const response = await fetch(`${API_BASE}/admin/users`, {
                headers: getAuthHeaders(),
            });

            if (!response.ok) {
                throw new Error("Failed to fetch users");
            }

            const data = await response.json();
            setUsers(data.users);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleApprove = async (userId) => {
        try {
            const response = await fetch(
                `${API_BASE}/admin/users/${userId}/approve`,
                {
                    method: "POST",
                    headers: getAuthHeaders(),
                }
            );

            if (!response.ok) {
                throw new Error("Failed to approve user");
            }

            setSuccessMessage("User approved successfully!");
            setTimeout(() => setSuccessMessage(""), 3000);
            fetchUsers();
        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(""), 3000);
        }
    };

    const handleRevoke = async (userId) => {
        if (
            !window.confirm(
                "Are you sure you want to revoke access for this user?"
            )
        ) {
            return;
        }

        try {
            const response = await fetch(
                `${API_BASE}/admin/users/${userId}/revoke`,
                {
                    method: "POST",
                    headers: getAuthHeaders(),
                }
            );

            if (!response.ok) {
                throw new Error("Failed to revoke access");
            }

            setSuccessMessage("Access revoked successfully!");
            setTimeout(() => setSuccessMessage(""), 3000);
            fetchUsers();
        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(""), 3000);
        }
    };

    const handleDelete = async (userId) => {
        if (
            !window.confirm(
                "Are you sure you want to permanently delete this user? This action cannot be undone."
            )
        ) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
                method: "DELETE",
                headers: getAuthHeaders(),
            });

            if (!response.ok) {
                throw new Error("Failed to delete user");
            }

            setSuccessMessage("User deleted successfully!");
            setTimeout(() => setSuccessMessage(""), 3000);
            fetchUsers();
        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(""), 3000);
        }
    };

    const getStatusBadge = (user) => {
        if (user.is_root) {
            return (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                    <Shield className="h-3 w-3 mr-1" />
                    ROOT ADMIN
                </span>
            );
        }

        if (user.is_approved) {
            return (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                    <UserCheck className="h-3 w-3 mr-1" />
                    Approved
                </span>
            );
        }

        return (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                <Clock className="h-3 w-3 mr-1" />
                Pending Approval
            </span>
        );
    };

    const pendingUsers = users.filter((u) => !u.is_root && !u.is_approved);
    const approvedUsers = users.filter((u) => !u.is_root && u.is_approved);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading users...</div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                            <Shield className="h-7 w-7 text-purple-600 mr-3" />
                            Access Control Center
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Manage user access and permissions
                        </p>
                    </div>
                    <button
                        onClick={fetchUsers}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        Refresh
                    </button>
                </div>

                {/* Success/Error Messages */}
                {successMessage && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                        <span className="text-green-800">{successMessage}</span>
                    </div>
                )}

                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
                        <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                        <span className="text-red-800">{error}</span>
                    </div>
                )}

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">
                                    Total Users
                                </p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {users.length}
                                </p>
                            </div>
                            <Users className="h-8 w-8 text-purple-500" />
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">
                                    Pending Approval
                                </p>
                                <p className="text-2xl font-bold text-yellow-600">
                                    {pendingUsers.length}
                                </p>
                            </div>
                            <Clock className="h-8 w-8 text-yellow-500" />
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">
                                    Approved
                                </p>
                                <p className="text-2xl font-bold text-green-600">
                                    {approvedUsers.length}
                                </p>
                            </div>
                            <UserCheck className="h-8 w-8 text-green-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* All Users Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                        All Users
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Email
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Registered
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Last Login
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user) => (
                                <tr
                                    key={user.id}
                                    className={
                                        user.is_root ? "bg-purple-50" : ""
                                    }
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            {user.is_root && (
                                                <Shield className="h-4 w-4 text-purple-600 mr-2" />
                                            )}
                                            <span className="text-sm font-medium text-gray-900">
                                                {user.name || "N/A"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {user.email}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(user)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {new Date(
                                            user.created_at
                                        ).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {user.last_login
                                            ? new Date(
                                                  user.last_login
                                              ).toLocaleDateString()
                                            : "Never"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {!user.is_root && (
                                            <div className="flex gap-3 flex-wrap">
                                                {!user.is_approved && (
                                                    <button
                                                        onClick={() =>
                                                            handleApprove(
                                                                user.id
                                                            )
                                                        }
                                                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 hover:bg-green-200 transition"
                                                        title="Approve User"
                                                    >
                                                        <CheckCircle className="h-4 w-4 mr-1" />
                                                        Approve
                                                    </button>
                                                )}
                                                {user.is_approved && (
                                                    <button
                                                        onClick={() =>
                                                            handleRevoke(
                                                                user.id
                                                            )
                                                        }
                                                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition"
                                                        title="Revoke Access"
                                                    >
                                                        <UserX className="h-4 w-4 mr-1" />
                                                        Revoke
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() =>
                                                        handleDelete(user.id)
                                                    }
                                                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition"
                                                    title="Delete User"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-1" />
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                        {user.is_root && (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                                                <Shield className="h-4 w-4 mr-1" />
                                                Protected
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AccessControl;
