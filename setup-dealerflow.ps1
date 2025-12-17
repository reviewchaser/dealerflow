# DealerFlow Setup Script - CORRECTED VERSION
Write-Host "Starting DealerFlow Setup..." -ForegroundColor Green

# Create directory structure
Write-Host "Creating folders..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path "libs" | Out-Null
New-Item -ItemType Directory -Force -Path "models\plugins" | Out-Null
New-Item -ItemType Directory -Force -Path "pages\api\appraisals" | Out-Null
New-Item -ItemType Directory -Force -Path "pages\appraisals" | Out-Null

# Create .env.local
Write-Host "Creating .env.local..." -ForegroundColor Cyan
@'
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=temp-secret-replace-later

MONGODB_URI=mongodb+srv://accounts_db_user:NeSyY6B079@cluster0.lqoi4pv.mongodb.net/dealerflow?retryWrites=true&w=majority&appName=Cluster0

GOOGLE_ID=
GOOGLE_CLIENT_SECRET=
EMAIL_SERVER=
STRIPE_PUBLIC_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
'@ | Set-Content -Path ".env.local"

# Create libs/mongoose.js
Write-Host "Creating MongoDB connection..." -ForegroundColor Cyan
@'
import mongoose from "mongoose";

const connectMongo = async () => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  return mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/dealerflow", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
};

export default connectMongo;
'@ | Set-Content -Path "libs\mongoose.js"

# Create models/plugins/toJSON.js
Write-Host "Creating model plugins..." -ForegroundColor Cyan
@'
const toJSON = (schema) => {
  schema.options.toJSON = {
    virtuals: true,
    transform(doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
    },
  };
};

export default toJSON;
'@ | Set-Content -Path "models\plugins\toJSON.js"

# Create models/Contact.js
Write-Host "Creating Contact model..." -ForegroundColor Cyan
@'
import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

contactSchema.plugin(toJSON);

export default mongoose.models.Contact || mongoose.model("Contact", contactSchema);
'@ | Set-Content -Path "models\Contact.js"

# Create models/Appraisal.js
Write-Host "Creating Appraisal model..." -ForegroundColor Cyan
@'
import mongoose from "mongoose";
import toJSON from "./plugins/toJSON";

const appraisalSchema = new mongoose.Schema(
  {
    contactId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Contact", 
      required: true 
    },
    vehicleReg: { type: String, required: true, uppercase: true },
    vehicleMake: { type: String },
    vehicleModel: { type: String },
    mileage: { type: Number },
    conditionNotes: { type: String },
    proposedPurchasePrice: { type: Number },
    decision: { 
      type: String, 
      enum: ["pending", "purchased", "not_purchased"], 
      default: "pending" 
    },
    decidedAt: { type: Date },
  },
  { timestamps: true }
);

appraisalSchema.plugin(toJSON);

export default mongoose.models.Appraisal || mongoose.model("Appraisal", appraisalSchema);
'@ | Set-Content -Path "models\Appraisal.js"

# Create pages/api/appraisals/index.js
Write-Host "Creating API routes..." -ForegroundColor Cyan
@'
import connectMongo from "@/libs/mongoose";
import Appraisal from "@/models/Appraisal";
import Contact from "@/models/Contact";

export default async function handler(req, res) {
  try {
    await connectMongo();

    if (req.method === "GET") {
      const appraisals = await Appraisal.find()
        .populate("contactId")
        .sort({ createdAt: -1 })
        .lean();
      
      return res.status(200).json(appraisals);
    }

    if (req.method === "POST") {
      const {
        sellerName,
        sellerEmail,
        sellerPhone,
        vehicleReg,
        mileage,
        conditionNotes,
        proposedPurchasePrice,
      } = req.body;

      if (!sellerName || !vehicleReg) {
        return res.status(400).json({ error: "Name and registration required" });
      }

      let contact = await Contact.findOne({
        $or: [
          { email: sellerEmail },
          { phone: sellerPhone }
        ].filter(Boolean),
      });

      if (!contact) {
        contact = await Contact.create({
          name: sellerName,
          email: sellerEmail,
          phone: sellerPhone,
        });
      }

      const appraisal = await Appraisal.create({
        contactId: contact._id,
        vehicleReg: vehicleReg.toUpperCase().replace(/\s/g, ""),
        mileage,
        conditionNotes,
        proposedPurchasePrice,
      });

      const populated = await Appraisal.findById(appraisal._id)
        .populate("contactId")
        .lean();

      return res.status(201).json(populated);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
'@ | Set-Content -Path "pages\api\appraisals\index.js"

# Create pages/appraisals/index.js
Write-Host "Creating appraisals list page..." -ForegroundColor Cyan
@'
import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Header from "@/components/Header";

export default function Appraisals() {
  const [appraisals, setAppraisals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAppraisals();
  }, []);

  const fetchAppraisals = async () => {
    try {
      const response = await fetch("/api/appraisals");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setAppraisals(data);
    } catch (error) {
      console.error(error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Appraisals | Dealer Operations</title>
      </Head>

      <Header />

      <main className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Buying Appraisals</h1>
            <p className="text-base-content/60 mt-2">Track vehicle purchase assessments</p>
          </div>
          <Link href="/appraisals/new" className="btn btn-primary">
            + New Appraisal
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : error ? (
          <div className="alert alert-error">
            <span>Error: {error}</span>
          </div>
        ) : appraisals.length === 0 ? (
          <div className="card bg-base-200">
            <div className="card-body text-center py-16">
              <p className="text-lg text-base-content/60">No appraisals yet</p>
              <p className="text-sm text-base-content/40 mt-2">
                Create your first buying appraisal to get started
              </p>
              <div className="mt-6">
                <Link href="/appraisals/new" className="btn btn-primary">
                  Create First Appraisal
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Registration</th>
                  <th>Seller</th>
                  <th>Mileage</th>
                  <th>Proposed Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {appraisals.map((appraisal) => (
                  <tr key={appraisal.id} className="hover">
                    <td>{new Date(appraisal.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span className="font-mono font-semibold">
                        {appraisal.vehicleReg}
                      </span>
                    </td>
                    <td>{appraisal.contactId?.name || "N/A"}</td>
                    <td>{appraisal.mileage?.toLocaleString() || "—"}</td>
                    <td>
                      {appraisal.proposedPurchasePrice
                        ? `£${appraisal.proposedPurchasePrice.toLocaleString()}`
                        : "—"}
                    </td>
                    <td>
                      <div className={`badge ${
                        appraisal.decision === "purchased"
                          ? "badge-success"
                          : appraisal.decision === "not_purchased"
                          ? "badge-error"
                          : "badge-warning"
                      }`}>
                        {appraisal.decision}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
'@ | Set-Content -Path "pages\appraisals\index.js"

# Create pages/appraisals/new.js (PART 1 - will continue in next section due to length)
Write-Host "Creating new appraisal form..." -ForegroundColor Cyan
$newAppraisalPart1 = @'
import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import Header from "@/components/Header";

export default function NewAppraisal() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    sellerName: "",
    sellerEmail: "",
    sellerPhone: "",
    vehicleReg: "",
    mileage: "",
    conditionNotes: "",
    proposedPurchasePrice: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/appraisals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create appraisal");
      }

      router.push("/appraisals");
    } catch (error) {
      console.error(error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>New Appraisal | Dealer Operations</title>
      </Head>

      <Header />

      <main className="min-h-screen max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/appraisals" className="btn btn-ghost btn-sm mb-4">
            Back to Appraisals
          </Link>
          <h1 className="text-3xl font-bold">New Buying Appraisal</h1>
          <p className="text-base-content/60 mt-2">
            Capture vehicle details for purchase assessment
          </p>
        </div>

        {error && (
          <div className="alert alert-error mb-6">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card bg-base-200">
          <div className="card-body">
            <h2 className="text-xl font-semibold mb-4">Seller Information</h2>
            
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Seller Name *</span>
              </label>
              <input
                type="text"
                name="sellerName"
                value={formData.sellerName}
                onChange={handleChange}
                className="input input-bordered"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Email</span>
                </label>
                <input
                  type="email"
                  name="sellerEmail"
                  value={formData.sellerEmail}
                  onChange={handleChange}
                  className="input input-bordered"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Phone</span>
                </label>
                <input
                  type="tel"
                  name="sellerPhone"
                  value={formData.sellerPhone}
                  onChange={handleChange}
                  className="input input-bordered"
                />
              </div>
            </div>

            <h2 className="text-xl font-semibold mb-4">Vehicle Information</h2>
            
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Registration (VRM) *</span>
              </label>
              <input
                type="text"
                name="vehicleReg"
                value={formData.vehicleReg}
                onChange={handleChange}
                className="input input-bordered uppercase"
                placeholder="AB12 CDE"
                required
              />
            </div>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Mileage</span>
              </label>
              <input
                type="number"
                name="mileage"
                value={formData.mileage}
                onChange={handleChange}
                className="input input-bordered"
                placeholder="50000"
              />
            </div>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Condition & Notes</span>
              </label>
              <textarea
                name="conditionNotes"
                value={formData.conditionNotes}
                onChange={handleChange}
                className="textarea textarea-bordered h-32"
                placeholder="Visible damage, issues, service history..."
              ></textarea>
            </div>

            <div className="form-control mb-6">
              <label className="label">
                <span className="label-text">Proposed Purchase Price (£)</span>
              </label>
              <input
                type="number"
                name="proposedPurchasePrice"
                value={formData.proposedPurchasePrice}
                onChange={handleChange}
                className="input input-bordered"
                placeholder="5000"
              />
            </div>

            <div className="flex gap-4 mt-6">
              <Link href="/appraisals" className="btn btn-ghost">
                Cancel
              </Link>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="loading loading-spinner"></span>
                    Saving...
                  </>
                ) : (
                  "Save Appraisal"
                )}
              </button>
            </div>
          </div>
        </form>
      </main>
    </>
  );
}
'@
$newAppraisalPart1 | Set-Content -Path "pages\appraisals\new.js"

# Update Header component
Write-Host "Updating Header component..." -ForegroundColor Cyan
@'
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";
import logo from "@/public/logo.png";
import config from "@/config";

const links = [
  { href: "/appraisals", label: "Appraisals" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

const Header = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [router.asPath]);

  return (
    <header className="bg-base-200">
      <nav className="container flex items-center justify-between px-8 py-4 mx-auto">
        <div className="flex lg:flex-1">
          <Link className="flex items-center gap-2 shrink-0" href="/">
            <Image src={logo} alt={config.appName} className="w-8" placeholder="blur" priority />
            <span className="font-extrabold text-lg">{config.appName}</span>
          </Link>
        </div>

        <div className="flex lg:hidden">
          <button type="button" className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5" onClick={() => setIsOpen(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        </div>

        <div className="hidden lg:flex lg:justify-center lg:gap-12 lg:items-center">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="link link-hover">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex lg:justify-end lg:flex-1">
          <button className="btn btn-primary btn-sm">Get Started</button>
        </div>
      </nav>

      <div className={`relative z-50 ${isOpen ? "" : "hidden"}`}>
        <div className="fixed inset-y-0 right-0 z-10 w-full px-8 py-4 overflow-y-auto bg-base-200 sm:max-w-sm">
          <div className="flex items-center justify-between">
            <Link className="flex items-center gap-2" href="/">
              <Image src={logo} alt={config.appName} className="w-8" placeholder="blur" priority />
              <span className="font-extrabold text-lg">{config.appName}</span>
            </Link>
            <button type="button" onClick={() => setIsOpen(false)}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flow-root mt-6">
            <div className="py-4 flex flex-col gap-y-4">
              {links.map((link) => (
                <Link key={link.href} href={link.href} className="link link-hover">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
'@ | Set-Content -Path "components\Header.js"

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Stop your dev server (Ctrl+C)"
Write-Host "  2. Run: npm run dev"
Write-Host "  3. Open: http://localhost:3000/appraisals"
Write-Host ""
Write-Host "Your app is ready!" -ForegroundColor Magenta