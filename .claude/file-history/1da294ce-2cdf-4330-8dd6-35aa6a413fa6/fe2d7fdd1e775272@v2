// Step 4: Create first vehicle
import connectMongo from "@/libs/mongoose";
import Vehicle from "@/models/Vehicle";
import VehicleTask from "@/models/VehicleTask";
import VehicleTaskTemplate from "@/models/VehicleTaskTemplate";
import { withDealerContext } from "@/libs/authContext";

async function handler(req, res, ctx) {
  // Always return JSON
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" });
  }

  const { dealerId, dealer } = ctx;

  if (!dealerId) {
    return res.status(401).json({ error: "Not authenticated", code: "NOT_AUTHENTICATED" });
  }

  try {
    await connectMongo();

    const { vrm, mileage, make, model, year, colour, fuelType, transmission } = req.body;

    // Debug logging (dev only)
    if (process.env.NODE_ENV !== "production") {
      console.log("[Onboarding Vehicle] Received:", { vrm, make, model, year, colour, dealerId });
    }

    // Validate required fields
    if (!vrm?.trim()) {
      return res.status(400).json({
        error: "Vehicle registration is required",
        code: "VRM_REQUIRED",
      });
    }

    const trimmedMake = make?.trim();
    const trimmedModel = model?.trim();

    if (!trimmedMake) {
      return res.status(400).json({
        error: "Make is required",
        code: "MAKE_REQUIRED",
      });
    }

    if (!trimmedModel) {
      return res.status(400).json({
        error: "Model is required",
        code: "MODEL_REQUIRED",
      });
    }

    // Normalize VRM
    const normalizedVrm = vrm.toUpperCase().replace(/\s/g, "");

    // Check if vehicle already exists (scoped to dealer)
    const existingVehicle = await Vehicle.findOne({
      dealerId,
      regCurrent: normalizedVrm,
    });

    if (existingVehicle) {
      return res.status(409).json({
        error: "Vehicle with this registration already exists",
        code: "VEHICLE_EXISTS",
      });
    }

    // Create the vehicle (scoped to dealer)
    const vehicle = await Vehicle.create({
      dealerId,
      regCurrent: normalizedVrm,
      make: trimmedMake.toUpperCase(),
      model: trimmedModel.toUpperCase(),
      year: year ? parseInt(year, 10) : null,
      colour: colour?.trim()?.toUpperCase() || null,
      fuelType: fuelType?.trim()?.toUpperCase() || null,
      transmission: transmission?.trim()?.toUpperCase() || null,
      mileageCurrent: mileage ? parseInt(mileage, 10) : null,
      status: "in_stock",
      type: "STOCK",
      saleType: "RETAIL",
    });

    console.log(`[Onboarding Vehicle] Created vehicle ${vehicle._id} for dealer ${dealerId}`);

    // Create default tasks from template group
    if (dealer?.defaultTaskTemplateGroupId) {
      const templates = await VehicleTaskTemplate.find({
        groupId: dealer.defaultTaskTemplateGroupId,
      }).sort({ order: 1 });

      for (const template of templates) {
        await VehicleTask.create({
          vehicleId: vehicle._id,
          name: template.name,
          status: "pending",
          source: "template",
          order: template.order,
        });
      }

      console.log(`[Onboarding Vehicle] Created ${templates.length} tasks for vehicle ${vehicle._id}`);
    }

    return res.status(201).json({
      success: true,
      vehicleId: vehicle._id,
      vehicle: {
        id: vehicle._id,
        regCurrent: vehicle.regCurrent,
        make: vehicle.make,
        model: vehicle.model,
      },
    });
  } catch (error) {
    console.error("[Onboarding Vehicle] Error:", error.message, error.stack);
    return res.status(500).json({
      error: "Failed to create vehicle",
      code: "CREATE_ERROR",
    });
  }
}

export default withDealerContext(handler);
