import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "react-hot-toast";
import { showDummyNotification } from "@/utils/notifications";

export default function VehicleDetail() {
  const router = useRouter();
  const { id } = router.query;
  
  const [vehicle, setVehicle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    if (id) {
      fetchVehicle();
    }
  }, [id]);

  const fetchVehicle = async () => {
    try {
      const response = await fetch(`/api/vehicles/${id}`);
      if (!response.ok) throw new Error("Failed to fetch vehicle");
      const data = await response.json();
      setVehicle(data);
      setEditData(data);
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/vehicles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      
      if (!response.ok) throw new Error("Failed to update");
      
      toast.success("Vehicle updated");
      setIsEditing(false);
      fetchVehicle();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleTaskToggle = async (taskIndex) => {
    const updatedTasks = [...(vehicle.prepTasks || [])];
    updatedTasks[taskIndex] = {
      ...updatedTasks[taskIndex],
      completed: !updatedTasks[taskIndex].completed,
      completedAt: !updatedTasks[taskIndex].completed ? new Date() : null,
    };

    try {
      const response = await fetch(`/api/vehicles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prepTasks: updatedTasks }),
      });
      
      if (!response.ok) throw new Error("Failed to update");
      
      fetchVehicle();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const response = await fetch(`/api/vehicles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) throw new Error("Failed to update");
      
      toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
      fetchVehicle();
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </DashboardLayout>
    );
  }

  if (!vehicle) {
    return (
      <DashboardLayout>
        <div className="alert alert-error">
          <span>Vehicle not found</span>
        </div>
      </DashboardLayout>
    );
  }

  const completedTasks = vehicle.prepTasks?.filter(t => t.completed).length || 0;
  const totalTasks = vehicle.prepTasks?.length || 0;

  return (
    <DashboardLayout>
      <Head>
        <title>{vehicle.make} {vehicle.model} | DealerFlow</title>
      </Head>

      <div className="mb-8">
        <Link href="/vehicles" className="btn btn-ghost btn-sm mb-4">
          ← Back to Vehicles
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">{vehicle.make} {vehicle.model}</h1>
            <p className="font-mono text-base-content/60 text-lg">{vehicle.vehicleReg}</p>
          </div>
          <select
            className="select select-bordered"
            value={vehicle.status}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="in_stock">In Stock</option>
            <option value="in_prep">In Prep</option>
            <option value="live">Live</option>
            <option value="reserved">Reserved</option>
            <option value="sold">Sold</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vehicle Details */}
          <div className="card bg-base-200">
            <div className="card-body">
              <div className="flex justify-between items-center">
                <h2 className="card-title">Vehicle Details</h2>
                <button 
                  className="btn btn-ghost btn-sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? "Cancel" : "Edit"}
                </button>
              </div>

              {isEditing ? (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="form-control">
                    <label className="label"><span className="label-text">Make</span></label>
                    <input
                      type="text"
                      value={editData.make || ""}
                      onChange={(e) => setEditData({...editData, make: e.target.value})}
                      className="input input-bordered input-sm"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text">Model</span></label>
                    <input
                      type="text"
                      value={editData.model || ""}
                      onChange={(e) => setEditData({...editData, model: e.target.value})}
                      className="input input-bordered input-sm"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text">Year</span></label>
                    <input
                      type="number"
                      value={editData.year || ""}
                      onChange={(e) => setEditData({...editData, year: e.target.value})}
                      className="input input-bordered input-sm"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text">Mileage</span></label>
                    <input
                      type="number"
                      value={editData.mileage || ""}
                      onChange={(e) => setEditData({...editData, mileage: e.target.value})}
                      className="input input-bordered input-sm"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text">Sale Price (£)</span></label>
                    <input
                      type="number"
                      value={editData.salePrice || ""}
                      onChange={(e) => setEditData({...editData, salePrice: e.target.value})}
                      className="input input-bordered input-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <button className="btn btn-primary btn-sm" onClick={handleSave}>
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-base-content/60">Year</p>
                    <p className="font-semibold">{vehicle.year || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-base-content/60">Colour</p>
                    <p className="font-semibold">{vehicle.colour || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-base-content/60">Mileage</p>
                    <p className="font-semibold">{vehicle.mileage?.toLocaleString() || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-base-content/60">Fuel Type</p>
                    <p className="font-semibold">{vehicle.fuelType || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-base-content/60">Transmission</p>
                    <p className="font-semibold">{vehicle.transmission || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-base-content/60">Engine</p>
                    <p className="font-semibold">{vehicle.engineSize || "—"}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pricing */}
          <div className="card bg-base-200">
            <div className="card-body">
              <h2 className="card-title">Pricing</h2>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <p className="text-sm text-base-content/60">Purchase Price</p>
                  <p className="font-semibold text-lg">
                    {vehicle.purchasePrice ? `£${vehicle.purchasePrice.toLocaleString()}` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">Sale Price</p>
                  <p className="font-semibold text-lg text-success">
                    {vehicle.salePrice ? `£${vehicle.salePrice.toLocaleString()}` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-base-content/60">Profit</p>
                  <p className="font-semibold text-lg">
                    {vehicle.purchasePrice && vehicle.salePrice 
                      ? `£${(vehicle.salePrice - vehicle.purchasePrice).toLocaleString()}`
                      : "—"
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="card bg-base-200">
            <div className="card-body">
              <h2 className="card-title">Notes</h2>
              <p className="whitespace-pre-wrap">{vehicle.notes || "No notes"}</p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Prep Tasks */}
          <div className="card bg-base-200">
            <div className="card-body">
              <h3 className="card-title">Prep Checklist</h3>
              <div className="mb-4">
                <progress 
                  className="progress progress-primary w-full" 
                  value={completedTasks} 
                  max={totalTasks}
                ></progress>
                <p className="text-sm text-base-content/60 mt-1">
                  {completedTasks} of {totalTasks} tasks complete
                </p>
              </div>
              
              <div className="space-y-2">
                {vehicle.prepTasks?.map((task, index) => (
                  <label key={index} className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-base-300">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary"
                      checked={task.completed}
                      onChange={() => handleTaskToggle(index)}
                    />
                    <span className={task.completed ? "line-through text-base-content/50" : ""}>
                      {task.task}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="card bg-base-200">
            <div className="card-body">
              <h3 className="card-title">Actions</h3>
              
              <div className="space-y-2">
                <button 
                  className="btn btn-primary w-full"
                  onClick={() => {
                    showDummyNotification("Listing export");
                    toast("📤 Export to AutoTrader - Coming soon!");
                  }}
                >
                  📤 Export Listing
                </button>
                
                <button 
                  className="btn btn-secondary w-full"
                  onClick={() => router.push(`/sales/new?vehicleId=${vehicle.id}`)}
                >
                  💰 Create Sale
                </button>
                
                <button 
                  className="btn btn-ghost w-full"
                  onClick={() => {
                    showDummyNotification("Print feature");
                  }}
                >
                  🖨️ Print Details
                </button>
              </div>

              <div className="divider"></div>

              <button 
                className="btn btn-ghost btn-sm text-error w-full"
                onClick={async () => {
                  if (confirm("Delete this vehicle?")) {
                    await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
                    router.push("/vehicles");
                  }
                }}
              >
                🗑️ Delete Vehicle
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
