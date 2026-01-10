import { useState } from "react";
import Head from "next/head";
import toast from "react-hot-toast";

export default function AdminSetup() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [result, setResult] = useState(null);
  const [dealerInfo, setDealerInfo] = useState(null);

  const seedForms = async () => {
    setIsSeeding(true);
    setResult(null);

    try {
      // First, ensure dealer exists
      const dealerRes = await fetch("/api/setup-dealer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Demo Dealership" }),
      });

      const dealerData = await dealerRes.json();

      if (!dealerRes.ok) {
        throw new Error(dealerData.error || "Failed to setup dealer");
      }

      setDealerInfo(dealerData.dealer);
      toast.success(`Using dealer: ${dealerData.dealer.name}`);

      // Now seed the forms
      const res = await fetch("/api/seed-forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealerId: dealerData.dealer.id }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ success: true, data });
        toast.success(`${data.message || "Forms seeded successfully!"}`);
      } else {
        setResult({ success: false, error: data.error });
        toast.error(data.error || "Failed to seed forms");
      }
    } catch (error) {
      console.error("Error seeding forms:", error);
      setResult({ success: false, error: error.message });
      toast.error("Failed to seed forms");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <>
      <Head>
        <title>Admin Setup | DealerHQ</title>
      </Head>

      <div className="min-h-screen bg-base-200 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h1 className="text-3xl font-bold mb-6">Admin Setup</h1>

              <div className="alert alert-warning mb-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="stroke-current shrink-0 h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <h3 className="font-bold">Important!</h3>
                  <div className="text-sm">
                    This page is for initial setup only. Make sure you have a valid
                    dealer ID configured. This will create 9 standard form templates.
                  </div>
                </div>
              </div>

              <div className="divider"></div>

              <h2 className="text-xl font-semibold mb-4">Seed Standard Forms</h2>
              <p className="text-base-content/70 mb-4">
                This will create 9 pre-configured form templates:
              </p>

              <ul className="list-disc list-inside space-y-2 mb-6 text-base-content/80">
                <li>PDI (Pre-Delivery Inspection)</li>
                <li>Warranty Claim</li>
                <li>Test Drive</li>
                <li>Delivery Checklist</li>
                <li>Courtesy Car Out</li>
                <li>Courtesy Car In</li>
                <li>Service Receipt</li>
                <li>Customer PX Appraisal</li>
                <li>Review & Feedback</li>
              </ul>

              <button
                className="btn btn-primary btn-lg"
                onClick={seedForms}
                disabled={isSeeding}
              >
                {isSeeding ? (
                  <>
                    <span className="loading loading-spinner"></span>
                    Seeding Forms...
                  </>
                ) : (
                  "Seed Forms"
                )}
              </button>

              {dealerInfo && (
                <div className="alert alert-info mt-6">
                  <div>
                    <h3 className="font-bold">Dealer Setup</h3>
                    <div className="text-sm">
                      Dealer: <strong>{dealerInfo.name}</strong>
                      <br />
                      Dealer ID: <code className="text-xs">{dealerInfo.id}</code>
                    </div>
                  </div>
                </div>
              )}

              {result && (
                <div className={`alert ${result.success ? "alert-success" : "alert-error"} mt-6`}>
                  <div>
                    {result.success ? (
                      <>
                        <h3 className="font-bold">Success!</h3>
                        <div className="text-sm">{result.data.message}</div>
                        {result.data.forms && result.data.forms.length > 0 && (
                          <div className="mt-2">
                            <p className="font-semibold">Forms created:</p>
                            <ul className="list-disc list-inside text-sm">
                              {result.data.forms.map((form) => (
                                <li key={form._id}>
                                  {form.name} → <code className="text-xs">/public/forms/{form.publicSlug}</code>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <h3 className="font-bold">Error</h3>
                        <div className="text-sm">{result.error}</div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="divider"></div>

              <div className="bg-base-200 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Next Steps:</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Click "Seed Forms" above</li>
                  <li>
                    Visit{" "}
                    <a href="/forms" className="link link-primary">
                      /forms
                    </a>{" "}
                    to see your templates
                  </li>
                  <li>Test a public form: /public/forms/warranty-claim</li>
                  <li>Share forms with customers using QR codes</li>
                </ol>
              </div>

              <div className="bg-base-300 p-4 rounded-lg mt-4">
                <h3 className="font-semibold mb-2">Test Public Forms:</h3>
                <div className="space-y-2 text-sm">
                  <a
                    href="/public/forms/warranty-claim"
                    target="_blank"
                    className="link link-primary block"
                  >
                    → Warranty Claim Form
                  </a>
                  <a
                    href="/public/forms/test-drive"
                    target="_blank"
                    className="link link-primary block"
                  >
                    → Test Drive Form
                  </a>
                  <a
                    href="/public/forms/courtesy-out"
                    target="_blank"
                    className="link link-primary block"
                  >
                    → Courtesy Car Out Form
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
