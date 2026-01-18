import connectMongo from "@/libs/mongoose";
import Vehicle from "@/models/Vehicle";
import VehicleTask from "@/models/VehicleTask";
import VehicleLabel from "@/models/VehicleLabel";
import VehicleIssue from "@/models/VehicleIssue";
import VehicleLocation from "@/models/VehicleLocation";
import VehicleDocument from "@/models/VehicleDocument";
import VehicleActivity from "@/models/VehicleActivity";
import Deal from "@/models/Deal";
import Dealer from "@/models/Dealer";
import User from "@/models/User";
import FormSubmission from "@/models/FormSubmission";
import Form from "@/models/Form";
import { withDealerContext } from "@/libs/authContext";

const DEFAULT_TASKS = ["PDI", "Valet", "Oil Service Check", "Photos", "Advert"];

// Helper to safely transform MongoDB _id to id
const transformId = (obj) => {
  if (!obj) return null;
  const result = { ...obj };
  if (result._id) {
    result.id = result._id.toString();
    delete result._id;
  }
  delete result.__v;
  return result;
};

async function handler(req, res, ctx) {
  await connectMongo();
  const { dealerId } = ctx;

  if (req.method === "GET") {
    const { status, forSale, type, salesStatus, excludeOldDelivered } = req.query;
    let query = { dealerId };

    // Performance optimization: exclude delivered vehicles older than 90 days by default
    // This prevents the prep board from loading thousands of old delivered vehicles
    if (excludeOldDelivered === "true") {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      // Exclude vehicles that are delivered AND were sold more than 90 days ago
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { status: { $ne: "delivered" } },
          { soldAt: { $gte: ninetyDaysAgo } },
          { soldAt: { $exists: false } } // Include delivered vehicles without soldAt
        ]
      });
    }

    // Filter by vehicle type (STOCK, COURTESY, FLEET_OTHER)
    if (type && type !== "all") {
      query.type = type;
    }

    // Filter by salesStatus for stock book
    // Note: Vehicles without salesStatus are treated as "AVAILABLE"
    if (salesStatus && salesStatus !== "all") {
      if (salesStatus === "SOLD") {
        query.salesStatus = { $in: ["DELIVERED", "COMPLETED"] };
      } else if (salesStatus === "IN_DEAL") {
        query.salesStatus = { $in: ["IN_DEAL", "SOLD_IN_PROGRESS"] };
      } else if (salesStatus === "AVAILABLE") {
        // Match AVAILABLE or vehicles without salesStatus set
        query.$or = [
          { salesStatus: "AVAILABLE" },
          { salesStatus: { $exists: false } },
          { salesStatus: null }
        ];
      } else {
        query.salesStatus = salesStatus;
      }
    }

    // For sale filter: get vehicles available for sale (but show all, including those with deals)
    // This allows the UI to show "Has active sale" and open the existing deal
    if (forSale === "true") {
      // Exclude sold/delivered/archived vehicles - these can't be sold again
      query.status = { $nin: ["sold", "delivered", "archived"] };
    } else if (status && status !== "all") {
      query.status = status;
    }

    const vehicles = await Vehicle.find(query)
      .sort({ createdAt: -1 })
      .lean();

    if (!vehicles || vehicles.length === 0) {
      return res.status(200).json([]);
    }

    // Get all vehicle IDs
    const vehicleIds = vehicles.map(v => v._id);

    // Fetch all related data in parallel - scoped by dealerId
    const [allTasks, allIssues, allDocuments, allLocations, allLabels, allActiveDeals, allDealsWithDelivery, allPdiSubmissions] = await Promise.all([
      VehicleTask.find({ vehicleId: { $in: vehicleIds } }).lean(),
      VehicleIssue.find({ vehicleId: { $in: vehicleIds } }).lean(),
      VehicleDocument.find({ vehicleId: { $in: vehicleIds } }).lean(),
      VehicleLocation.find({ dealerId }).lean(),
      VehicleLabel.find({ dealerId }).lean(),
      // Only fetch active deals if forSale filter is used
      forSale === "true"
        ? Deal.find({
            dealerId,
            vehicleId: { $in: vehicleIds },
            status: { $nin: ["CANCELLED", "COMPLETED"] },
          }).lean()
        : Promise.resolve([]),
      // Fetch deals with delivery for prep board badge
      Deal.find({
        dealerId,
        vehicleId: { $in: vehicleIds },
        status: { $nin: ["CANCELLED"] },
        $or: [
          { "delivery.amount": { $gt: 0 } },
          { "delivery.amountGross": { $gt: 0 } },
          { "delivery.isFree": true },
        ],
      }).select("vehicleId delivery").lean(),
      // Fetch PDI submissions for prep board badge - need to first get PDI form IDs
      (async () => {
        const pdiForms = await Form.find({ dealerId, type: "PDI" }).select("_id").lean();
        if (pdiForms.length === 0) return [];
        const pdiFormIds = pdiForms.map(f => f._id);
        return FormSubmission.find({
          dealerId,
          formId: { $in: pdiFormIds },
          linkedVehicleId: { $in: vehicleIds },
        }).select("linkedVehicleId pdiIssues submittedAt status").lean();
      })(),
    ]);

    // Create lookup maps
    const tasksByVehicle = {};
    const issuesByVehicle = {};
    const documentsByVehicle = {};
    const locationsById = {};
    const labelsById = {};
    const activeDealByVehicle = {};

    // Build location lookup
    for (const loc of allLocations) {
      locationsById[loc._id.toString()] = {
        id: loc._id.toString(),
        name: loc.name,
      };
    }

    // Build labels lookup
    for (const label of allLabels) {
      labelsById[label._id.toString()] = {
        id: label._id.toString(),
        name: label.name,
        colour: label.colour,
      };
    }

    // Build active deals lookup
    for (const deal of allActiveDeals) {
      const vid = deal.vehicleId.toString();
      activeDealByVehicle[vid] = {
        id: deal._id.toString(),
        status: deal.status,
        dealNumber: deal.dealNumber,
      };
    }

    // Build deals with delivery lookup (for prep board badge)
    const deliveryByVehicle = {};
    for (const deal of allDealsWithDelivery) {
      const vid = deal.vehicleId.toString();
      if (deal.delivery?.amount > 0 || deal.delivery?.amountGross > 0 || deal.delivery?.isFree) {
        deliveryByVehicle[vid] = true;
      }
    }

    // Build PDI submissions lookup (for prep board badge and drawer)
    const pdiByVehicle = {};
    for (const submission of allPdiSubmissions) {
      if (!submission.linkedVehicleId) continue;
      const vid = submission.linkedVehicleId.toString();
      // Calculate outstanding issues count
      const outstandingIssues = (submission.pdiIssues || []).filter(
        i => i.status !== "Complete"
      ).length;
      pdiByVehicle[vid] = {
        id: submission._id.toString(),
        submittedAt: submission.submittedAt,
        status: submission.status,
        issueCount: (submission.pdiIssues || []).length,
        outstandingIssues,
      };
    }

    // Build tasks lookup
    for (const task of allTasks) {
      const vid = task.vehicleId.toString();
      if (!tasksByVehicle[vid]) tasksByVehicle[vid] = [];
      tasksByVehicle[vid].push(transformId(task));
    }

    // Build issues lookup
    for (const issue of allIssues) {
      const vid = issue.vehicleId.toString();
      if (!issuesByVehicle[vid]) issuesByVehicle[vid] = [];
      issuesByVehicle[vid].push(transformId(issue));
    }

    // Build documents lookup
    for (const doc of allDocuments) {
      const vid = doc.vehicleId.toString();
      if (!documentsByVehicle[vid]) documentsByVehicle[vid] = [];
      documentsByVehicle[vid].push(transformId(doc));
    }

    // Transform vehicles
    const result = vehicles.map(vehicle => {
      const vid = vehicle._id.toString();

      // Get location data
      let locationData = null;
      if (vehicle.locationId) {
        const locId = vehicle.locationId.toString();
        locationData = locationsById[locId] || null;
      }

      return {
        id: vid,
        dealerId: vehicle.dealerId,
        type: vehicle.type,
        saleType: vehicle.saleType,
        regCurrent: vehicle.regCurrent,
        vin: vehicle.vin,
        make: vehicle.make,
        model: vehicle.model,
        derivative: vehicle.derivative,
        year: vehicle.year,
        mileageCurrent: vehicle.mileageCurrent,
        bodyType: vehicle.bodyType,
        fuelType: vehicle.fuelType,
        transmission: vehicle.transmission,
        colour: vehicle.colour,
        status: vehicle.status,
        salesStatus: vehicle.salesStatus || "AVAILABLE", // Default to AVAILABLE if not set
        soldAt: vehicle.soldAt, // For "Sold X days" display
        locationId: locationData,
        motExpiryDate: vehicle.motExpiryDate,
        motStatus: vehicle.motStatus,
        motHistory: vehicle.motHistory || [],
        motHistoryFetchedAt: vehicle.motHistoryFetchedAt,
        dvlaDetails: vehicle.dvlaDetails || null,
        taxExpiryDate: vehicle.taxExpiryDate,
        serviceDueDate: vehicle.serviceDueDate,
        v5Url: vehicle.v5Url,
        serviceHistoryUrl: vehicle.serviceHistoryUrl,
        faultCodesUrl: vehicle.faultCodesUrl,
        websiteUrl: vehicle.websiteUrl,
        notes: vehicle.notes,
        createdAt: vehicle.createdAt,
        updatedAt: vehicle.updatedAt,
        tasks: tasksByVehicle[vid] || [],
        issues: issuesByVehicle[vid] || [],
        documents: documentsByVehicle[vid] || [],
        labels: (vehicle.labels || []).map(labelId => labelsById[labelId.toString()]).filter(Boolean),
        // Include active deal info if available (for sales vehicle picker)
        activeDeal: activeDealByVehicle[vid] || null,
        // Purchase info for SIV display
        purchase: vehicle.purchase || null,
        vatScheme: vehicle.vatScheme || null,
        // Delivery badge for prep board
        hasDelivery: deliveryByVehicle[vid] || false,
        // PDI submission info for prep board badge and drawer
        pdiSubmission: pdiByVehicle[vid] || null,
      };
    });

    return res.status(200).json(result);
  }

  if (req.method === "POST") {
    const { userId, user } = ctx;
    const {
      regCurrent, vin, make, model, derivative, year,
      mileageCurrent, bodyType, fuelType, transmission, colour,
      status = "in_stock", notes, locationId, skipDefaultTasks,
      type = "STOCK", // STOCK, COURTESY, FLEET_OTHER
      saleType = "RETAIL", // RETAIL, TRADE - only for STOCK vehicles
      motExpiryDate,
      motHistory, // MOT history from DVSA API
      motHistoryFetchedAt,
      firstRegisteredDate, // Date of first registration from DVSA
      dvlaDetails, // DVLA VES data
      lastDvlaFetchAt,
      showOnPrepBoard, // Whether to show on prep board
    } = req.body;

    if (!regCurrent || !make || !model) {
      return res.status(400).json({ error: "Reg, make and model required" });
    }

    // Check for duplicate VRM within this dealer
    const normalizedReg = regCurrent.toUpperCase().replace(/\s/g, "");
    const existingVehicle = await Vehicle.findOne({
      dealerId,
      regCurrent: normalizedReg,
    }).lean();

    if (existingVehicle) {
      return res.status(409).json({
        error: "Vehicle already in stock",
        message: `A vehicle with registration ${normalizedReg} already exists in your inventory`,
        existingVehicleId: existingVehicle._id,
      });
    }

    const vehicleData = {
      dealerId, // Add dealer context
      regCurrent: regCurrent.toUpperCase().replace(/\s/g, ""),
      vin, make, model, derivative, year,
      mileageCurrent, bodyType, fuelType, transmission, colour,
      status, notes, type,
      createdByUserId: userId,
      // Only set saleType for STOCK vehicles
      ...(type === "STOCK" && { saleType }),
      // MOT expiry from DVSA lookup
      ...(motExpiryDate && { motExpiryDate: new Date(motExpiryDate) }),
      // MOT history from DVSA API
      ...(motHistory && { motHistory }),
      ...(motHistoryFetchedAt && { motHistoryFetchedAt: new Date(motHistoryFetchedAt) }),
      // Date of first registration from DVSA
      ...(firstRegisteredDate && { firstRegisteredDate: new Date(firstRegisteredDate) }),
      // DVLA VES details
      ...(dvlaDetails && { dvlaDetails }),
      ...(lastDvlaFetchAt && { lastDvlaFetchAt: new Date(lastDvlaFetchAt) }),
      // Prep board visibility
      ...(showOnPrepBoard !== undefined && { showOnPrepBoard }),
    };

    // Only add locationId if it's not empty
    if (locationId) {
      vehicleData.locationId = locationId;
    }

    const vehicle = await Vehicle.create(vehicleData);

    // Auto-assign stock number for STOCK vehicles
    if (type === "STOCK") {
      const dealer = await Dealer.findById(dealerId);
      const nextNumber = dealer?.salesSettings?.nextStockNumber || 1;
      const prefix = dealer?.salesSettings?.stockNumberPrefix || "";
      const stockNumber = `${prefix}${String(nextNumber).padStart(4, "0")}`;

      vehicle.stockNumber = stockNumber;
      await vehicle.save();

      // Increment dealer's next stock number
      await Dealer.findByIdAndUpdate(dealerId, {
        $inc: { "salesSettings.nextStockNumber": 1 },
      });
    }

    // Create default tasks only if not skipped (for backwards compatibility)
    if (!skipDefaultTasks) {
      for (const taskName of DEFAULT_TASKS) {
        await VehicleTask.create({
          vehicleId: vehicle._id,
          name: taskName,
          status: "pending",
          source: "system_default",
        });
      }
    }

    // Log VEHICLE_CREATED activity
    const actor = await User.findById(userId).lean();
    const actorName = actor?.name || user?.name || user?.email || "System";
    const typeLabel = { STOCK: "Stock", COURTESY: "Courtesy", FLEET_OTHER: "Fleet" }[type] || type;

    await VehicleActivity.log({
      dealerId,
      vehicleId: vehicle._id,
      actorId: userId,
      actorName,
      type: "VEHICLE_CREATED",
      message: `Added ${typeLabel} vehicle: ${make} ${model} (${regCurrent.toUpperCase()})`,
      meta: { type, make, model, regCurrent: regCurrent.toUpperCase() },
    });

    // Transform to include id field
    const vehicleJson = vehicle.toJSON();
    return res.status(201).json(vehicleJson);
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withDealerContext(handler);
