/**
 * Choose Dealer Page
 *
 * Displayed when a user has memberships at multiple dealerships.
 * Allows selecting which dealership to access.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Head from "next/head";

export default function ChooseDealer() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [dealers, setDealers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated") {
      fetchDealers();
    }
  }, [status, router]);

  const fetchDealers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/dealers/memberships");
      if (!res.ok) {
        throw new Error("Failed to load dealerships");
      }
      const data = await res.json();
      setDealers(data);

      // If only one dealer, redirect directly
      if (data.length === 1) {
        router.push(`/app/${data[0].slug}/dashboard`);
        return;
      }

      // If no dealers, redirect to create dealer
      if (data.length === 0) {
        router.push("/onboarding/create-dealer");
        return;
      }
    } catch (err) {
      console.error("Error fetching dealers:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDealer = async (dealer) => {
    try {
      // Set as default dealer
      await fetch("/api/user/default-dealer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealerId: dealer.id }),
      });

      // Navigate to dealer dashboard
      router.push(`/app/${dealer.slug}/dashboard`);
    } catch (err) {
      console.error("Error selecting dealer:", err);
      router.push(`/app/${dealer.slug}/dashboard`);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={fetchDealers} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Choose Dealership | DealerHQ</title>
      </Head>

      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Choose Dealership</h1>
            <p className="text-slate-600 mt-2">
              Select which dealership you want to access
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {dealers.map((dealer) => (
              <button
                key={dealer.id}
                onClick={() => handleSelectDealer(dealer)}
                className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 text-left"
              >
                {/* Dealer Logo */}
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                  {dealer.logoUrl ? (
                    <img
                      src={dealer.logoUrl}
                      alt={dealer.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-bold text-slate-400">
                      {dealer.name.charAt(0)}
                    </span>
                  )}
                </div>

                {/* Dealer Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{dealer.name}</p>
                  <p className="text-sm text-slate-500 capitalize">{dealer.role}</p>
                </div>

                {/* Arrow */}
                <svg
                  className="w-5 h-5 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            ))}
          </div>

          <p className="text-center text-sm text-slate-500 mt-6">
            You have access to {dealers.length} dealerships
          </p>
        </div>
      </div>
    </>
  );
}
