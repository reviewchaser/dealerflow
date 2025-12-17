// Step 4: Create first vehicle
import connectMongo from "@/libs/mongoose";
import Dealer from "@/models/Dealer";
import Vehicle from "@/models/Vehicle";
import VehicleTask from "@/models/VehicleTask";
import VehicleTaskTemplate from "@/models/VehicleTaskTemplate";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectMongo();

    const { vrm, mileage, make, model, year, colour, fuelType, transmission } = req.body;

    // Validate required fields
    if (!vrm?.trim()) {
      return res.status(400).json({ error: "Vehicle registration is required" });
    }

    if (!make?.trim() || !model?.trim()) {
      return res.status(400).json({ error: "Make and model are required" });
    }

    // Find the dealer
    // TODO: In multi-tenant setup, get dealer from session
    const dealer = await Dealer.findOne();

    if (!dealer) {
      return res.status(404).json({ error: "Dealer not found" });
    }

    // Normalize VRM
    const normalizedVrm = vrm.toUpperCase().replace(/\s/g, "");

    // Check if vehicle already exists
    const existingVehicle = await Vehicle.findOne({
      dealerId: dealer._id,
      regCurrent: normalizedVrm,
    });

    if (existingVehicle) {
      return res.status(400).json({ error: "Vehicle with this registration already exists" });
    }

    // Create the vehicle
    const vehicle = await Vehicle.create({
      dealerId: dealer._id,
      regCurrent: normalizedVrm,
      make: make.toUpperCase(),
      model: model.toUpperCase(),
      year: year ? parseInt(year, 10) : null,
      colour: colour?.toUpperCase() || null,
      fuelType: fuelType?.toUpperCase() || null,
      transmission: transmission?.toUpperCase() || null,
      mileageCurrent: mileage ? parseInt(mileage, 10) : null,
      status: "in_stock",
      type: "STOCK",
      saleType: "RETAIL",
    });

    // Create default tasks from template group
    if (dealer.defaultTaskTemplateGroupId) {
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
    console.error("[Onboarding Vehicle] Error:", error);
    return res.status(500).json({ error: "Failed to create vehicle" });
  }
}
