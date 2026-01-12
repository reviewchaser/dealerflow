import { useEffect, useState } from "react";
import Head from "next/head";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "react-hot-toast";
import { showDummyNotification } from "@/utils/notifications";

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { fetchReviews(); }, []);

  const fetchReviews = async () => {
    try {
      const res = await fetch("/api/reviews");
      const data = await res.json();
      setReviews(data);
    } catch (error) {
      toast.error("Failed to load reviews");
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate stats
  const responses = reviews.filter(r => r.response);
  const avgRating = responses.length > 0 
    ? (responses.reduce((sum, r) => sum + r.response.rating, 0) / responses.length).toFixed(1) 
    : "N/A";
  const rating5 = responses.filter(r => r.response?.rating === 5).length;
  const rating4 = responses.filter(r => r.response?.rating === 4).length;
  const lowRatings = responses.filter(r => r.response?.rating <= 3).length;

  return (
    <DashboardLayout>
      <Head><title>Reviews | DealerFlow</title></Head>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Reviews & Reputation</h1>
        <p className="text-base-content/60 mt-2">Track customer feedback and review requests</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="card bg-base-200">
              <div className="card-body p-4 text-center">
                <p className="text-4xl font-bold text-primary">{avgRating}</p>
                <p className="text-sm text-base-content/60">Average Rating</p>
              </div>
            </div>
            <div className="card bg-base-200">
              <div className="card-body p-4 text-center">
                <p className="text-4xl font-bold text-success">{rating5}</p>
                <p className="text-sm text-base-content/60">5-Star Reviews</p>
              </div>
            </div>
            <div className="card bg-base-200">
              <div className="card-body p-4 text-center">
                <p className="text-4xl font-bold">{rating4}</p>
                <p className="text-sm text-base-content/60">4-Star Reviews</p>
              </div>
            </div>
            <div className="card bg-base-200">
              <div className="card-body p-4 text-center">
                <p className="text-4xl font-bold text-error">{lowRatings}</p>
                <p className="text-sm text-base-content/60">Low Ratings (≤3)</p>
              </div>
            </div>
          </div>

          {/* Info about how reviews work */}
          <div className="alert alert-info mb-6">
            <span>
              ⚠️ <strong>Demo Mode:</strong> Review requests are triggered when a vehicle is marked as "Delivered" or when a Delivery form is submitted. 
              Email/SMS sending is not configured yet.
            </span>
          </div>

          {/* Reviews Table */}
          {reviews.length === 0 ? (
            <div className="card bg-base-200">
              <div className="card-body text-center py-16">
                <p className="text-lg text-base-content/60">No review requests yet</p>
                <p className="text-sm text-base-content/40 mt-2">
                  Review requests are created when vehicles are delivered
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Vehicle</th>
                    <th>Channel</th>
                    <th>Status</th>
                    <th>Rating</th>
                    <th>Public Review</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((review) => (
                    <tr key={review.id} className="hover">
                      <td>{new Date(review.sentAt).toLocaleDateString()}</td>
                      <td>{review.contactId?.name || "—"}</td>
                      <td className="font-mono">{review.vehicleId?.regCurrent || "—"}</td>
                      <td>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">{review.channel}</span>
                      </td>
                      <td>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          review.status === "responded" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          review.status === "opened" ? "bg-blue-50 text-blue-700 border-blue-200" :
                          review.status === "expired" ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {review.status}
                        </span>
                      </td>
                      <td>
                        {review.response ? (
                          <div className="flex items-center gap-1">
                            <span className={review.response.rating >= 4 ? "text-emerald-600" : "text-red-500"}>
                              {"⭐".repeat(review.response.rating)}
                            </span>
                          </div>
                        ) : "—"}
                      </td>
                      <td>
                        {review.response?.publicReviewSubmitted ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">✓ Submitted</span>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
