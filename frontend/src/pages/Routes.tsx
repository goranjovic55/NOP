import React, { useState, useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { usePOV, getPOVHeaders } from "../context/POVContext";
import { CyberPageTitle } from "../components/CyberUI";

interface Route {
  dest: string;
  gateway: string;
  iface: string;
  proto: string;
  metric?: number;
  flags?: string;
}

interface CTRoutes {
  host: string;
  ip?: string;
  routes: Route[];
  default_gateway?: string;
  error?: string;
}

interface RouteForm {
  destination: string;
  gateway: string;
  ct: string;
  metric: string;
}

const Routes: React.FC = () => {
  const { token } = useAuthStore();
  const { activeAgent } = usePOV();
  
  const [ctRoutes, setCtRoutes] = useState<CTRoutes[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<RouteForm>({
    destination: "",
    gateway: "",
    ct: "",
    metric: "100"
  });
  const [formError, setFormError] = useState<string>("");
  const [formSuccess, setFormSuccess] = useState<string>("");
  const [defaultGwCT, setDefaultGwCT] = useState<string>("");
  const [defaultGwIP, setDefaultGwIP] = useState<string>("");

  const fetchRoutes = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/v1/routes", {
        headers: {
          "Authorization": `Bearer ${token}`,
          ...getPOVHeaders(activeAgent)
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCtRoutes(data);
      } else {
        const err = await response.json().catch(() => ({}));
        setError(err.detail || "Failed to fetch routes");
      }
    } catch (err) {
      setError("Network error fetching routes");
      console.error("Failed to fetch routes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchRoutes();
    }
  }, [token]);

  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!formData.destination || !formData.gateway || !formData.ct) {
      setFormError("Destination, gateway, and CT are required");
      return;
    }

    try {
      const response = await fetch("/api/v1/routes/add", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          ...getPOVHeaders(activeAgent)
        },
        body: JSON.stringify({
          ct: formData.ct,
          destination: formData.destination,
          gateway: formData.gateway,
          metric: parseInt(formData.metric) || 100
        })
      });

      if (response.ok) {
        setFormSuccess("Route added successfully");
        setFormData({ destination: "", gateway: "", ct: "", metric: "100" });
        fetchRoutes();
        setTimeout(() => setFormSuccess(""), 3000);
      } else {
        const err = await response.json().catch(() => ({}));
        setFormError(err.detail || "Failed to add route");
      }
    } catch (err) {
      setFormError("Network error adding route");
      console.error("Failed to add route:", err);
    }
  };

  const handleDeleteRoute = async (ct: string, destination: string, gateway: string) => {
    if (!window.confirm(`Delete route ${destination} via ${gateway} on ${ct}?`)) {
      return;
    }

    try {
      const response = await fetch("/api/v1/routes/delete", {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          ...getPOVHeaders(activeAgent)
        },
        body: JSON.stringify({
          ct,
          destination,
          gateway
        })
      });

      if (response.ok) {
        fetchRoutes();
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.detail || "Failed to delete route");
      }
    } catch (err) {
      alert("Network error deleting route");
      console.error("Failed to delete route:", err);
    }
  };

  const handleSetDefaultGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!defaultGwCT || !defaultGwIP) {
      alert("Both CT and gateway IP are required");
      return;
    }

    try {
      const response = await fetch("/api/v1/routes/default-gateway", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          ...getPOVHeaders(activeAgent)
        },
        body: JSON.stringify({
          ct: defaultGwCT,
          gateway: defaultGwIP
        })
      });

      if (response.ok) {
        alert("Default gateway set successfully");
        fetchRoutes();
        setDefaultGwIP("");
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.detail || "Failed to set default gateway");
      }
    } catch (err) {
      alert("Network error setting default gateway");
      console.error("Failed to set default gateway:", err);
    }
  };

  const availableCTs = ctRoutes.map(ct => ct.host);

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <CyberPageTitle color="red" className="flex items-center">
            <span className="mr-3 text-3xl">◆</span>
            Routes
          </CyberPageTitle>
          <p className="text-cyber-gray-light text-sm mt-1">CT routing tables and gateway management</p>
        </div>
        <button
          onClick={fetchRoutes}
          disabled={loading}
          className="btn-base btn-md btn-blue"
        >
          {loading ? "⟳ Refreshing..." : "↻ Refresh"}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-cyber-red/10 border border-cyber-red p-4">
          <p className="text-cyber-red text-sm">⚠ {error}</p>
        </div>
      )}

      {/* Add Route Form - Collapsible */}
      <div className="dashboard-card">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center justify-between w-full p-4 hover:bg-cyber-darker transition-colors"
        >
          <div className="flex items-center">
            <span className="text-cyber-red mr-2">{showAddForm ? "▼" : "▶"}</span>
            <span className="text-cyber-red font-bold">ADD ROUTE</span>
          </div>
          <span className="text-cyber-gray-light text-sm">Configure new routing entry</span>
        </button>

        {showAddForm && (
          <div className="p-4 border-t border-cyber-gray">
            {formError && (
              <div className="bg-cyber-red/10 border border-cyber-red p-3 mb-4">
                <p className="text-cyber-red text-sm">{formError}</p>
              </div>
            )}
            {formSuccess && (
              <div className="bg-cyber-green/10 border border-cyber-green p-3 mb-4">
                <p className="text-cyber-green text-sm">{formSuccess}</p>
              </div>
            )}
            <form onSubmit={handleAddRoute} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-cyber-blue font-bold uppercase mb-1">Destination CIDR</label>
                  <input
                    type="text"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    placeholder="e.g. 192.168.10.0/24"
                    className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-blue font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-cyber-green font-bold uppercase mb-1">Gateway</label>
                  <input
                    type="text"
                    value={formData.gateway}
                    onChange={(e) => setFormData({ ...formData, gateway: e.target.value })}
                    placeholder="e.g. 10.10.10.1"
                    className="w-full bg-cyber-darker border border-cyber-gray text-cyber-green text-sm p-2 outline-none focus:border-cyber-green font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-cyber-purple font-bold uppercase mb-1">Target CT</label>
                  <select
                    value={formData.ct}
                    onChange={(e) => setFormData({ ...formData, ct: e.target.value })}
                    className="w-full bg-cyber-darker border border-cyber-gray text-cyber-purple text-sm p-2 outline-none focus:border-cyber-purple font-mono"
                  >
                    <option value="">Select CT...</option>
                    {availableCTs.map(ct => (
                      <option key={ct} value={ct}>{ct}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-cyber-yellow font-bold uppercase mb-1">Metric</label>
                  <input
                    type="number"
                    value={formData.metric}
                    onChange={(e) => setFormData({ ...formData, metric: e.target.value })}
                    placeholder="100"
                    className="w-full bg-cyber-darker border border-cyber-gray text-cyber-yellow text-sm p-2 outline-none focus:border-cyber-yellow font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="btn-base btn-md btn-green"
                >
                  + Add Route
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Set Default Gateway Form */}
      <div className="dashboard-card">
        <div className="p-4 border-b border-cyber-gray">
          <span className="text-cyber-purple font-bold uppercase">Set Default Gateway</span>
        </div>
        <div className="p-4">
          <form onSubmit={handleSetDefaultGateway} className="flex flex-wrap items-end gap-4">
            <div className="w-48">
              <label className="block text-xs text-cyber-purple font-bold uppercase mb-1">Target CT</label>
              <select
                value={defaultGwCT}
                onChange={(e) => setDefaultGwCT(e.target.value)}
                className="w-full bg-cyber-darker border border-cyber-gray text-cyber-purple text-sm p-2 outline-none focus:border-cyber-purple font-mono"
              >
                <option value="">Select CT...</option>
                {availableCTs.map(ct => (
                  <option key={ct} value={ct}>{ct}</option>
                ))}
              </select>
            </div>
            <div className="w-48">
              <label className="block text-xs text-cyber-green font-bold uppercase mb-1">Gateway IP</label>
              <input
                type="text"
                value={defaultGwIP}
                onChange={(e) => setDefaultGwIP(e.target.value)}
                placeholder="e.g. 10.10.10.1"
                className="w-full bg-cyber-darker border border-cyber-gray text-cyber-green text-sm p-2 outline-none focus:border-cyber-green font-mono"
              />
            </div>
            <button
              type="submit"
              className="btn-base btn-md btn-purple"
            >
              Set Default Gateway
            </button>
          </form>
        </div>
      </div>

      {/* Routes Tables */}
      <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar">
        {ctRoutes.length === 0 && !loading && !error && (
          <div className="dashboard-card p-8 text-center">
            <p className="text-cyber-gray-light">No route data available. Click Refresh to load.</p>
          </div>
        )}

        {ctRoutes.map((ct) => (
          <div key={ct.host} className="dashboard-card">
            <div className="p-4 border-b border-cyber-gray flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-cyber-red font-bold">{ct.host}</span>
                {ct.ip && <span className="text-cyber-gray-light text-sm font-mono">({ct.ip})</span>}
                {ct.default_gateway && (
                  <span className="text-cyber-green text-xs bg-cyber-green/10 px-2 py-1">
                    GW: {ct.default_gateway}
                  </span>
                )}
              </div>
              {ct.error ? (
                <span className="text-cyber-red text-xs">⚠ {ct.error}</span>
              ) : (
                <span className="text-cyber-gray-light text-xs">{ct.routes?.length || 0} routes</span>
              )}
            </div>
            
            {ct.error ? (
              <div className="p-4">
                <p className="text-cyber-red text-sm">{ct.error}</p>
              </div>
            ) : ct.routes && ct.routes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-mono">
                  <thead>
                    <tr className="bg-cyber-darker text-cyber-gray-light uppercase text-xs">
                      <th className="text-left p-3">Destination</th>
                      <th className="text-left p-3">Gateway</th>
                      <th className="text-left p-3">Interface</th>
                      <th className="text-left p-3">Proto</th>
                      <th className="text-left p-3">Metric</th>
                      <th className="text-left p-3">Flags</th>
                      <th className="text-right p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cyber-gray/30">
                    {ct.routes.map((route, idx) => (
                      <tr key={idx} className="hover:bg-cyber-darker/50">
                        <td className="p-3 text-cyber-blue">{route.dest}</td>
                        <td className="p-3 text-cyber-green">{route.gateway || "-"}</td>
                        <td className="p-3 text-cyber-purple">{route.iface || "-"}</td>
                        <td className="p-3 text-cyber-gray-light">{route.proto}</td>
                        <td className="p-3 text-cyber-yellow">{route.metric ?? "-"}</td>
                        <td className="p-3 text-cyber-cyan">{route.flags || "-"}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteRoute(ct.host, route.dest, route.gateway)}
                            className="text-cyber-red hover:text-cyber-red-light text-xs uppercase tracking-wide"
                            title="Delete route"
                          >
                            ✕ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4">
                <p className="text-cyber-gray text-sm">No routes configured</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Routes;
