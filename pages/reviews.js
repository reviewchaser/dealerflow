import { useEffect, useState } from "react";
import Head from "next/head";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "react-hot-toast";
import useDealerRedirect from "@/hooks/useDealerRedirect";

// Channel icons and labels
const CHANNELS = {
  email: { label: "Email", icon: "📧", color: "bg-blue-100 text-blue-700 border-blue-200" },
  sms: { label: "SMS", icon: "💬", color: "bg-green-100 text-green-700 border-green-200" },
  whatsapp: { label: "WhatsApp", icon: "📱", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

export default function Reviews() {
  const { isRedirecting } = useDealerRedirect();
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendForm, setSendForm] = useState({
    channel: "email",
    recipientName: "",
    recipientContact: "",
  });
  const [isSending, setIsSending] = useState(false);

  useEffect(() => { fetchReviews(); }, []);

  const fetchReviews = async () => {
    try {
      const res = await fetch("/api/reviews");
      const data = await res.json();
      setReviews(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Failed to load reviews");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendRequest = async (e) => {
    e.preventDefault();

    if (!sendForm.recipientName.trim()) {
      toast.error("Please enter a recipient name");
      return;
    }
    if (!sendForm.recipientContact.trim()) {
      toast.error(`Please enter ${sendForm.channel === "email" ? "an email address" : "a phone number"}`);
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch("/api/reviews/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sendForm),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send");
      }

      toast.success(`Review request sent via ${CHANNELS[sendForm.channel].label}!`);
      setShowSendModal(false);
      setSendForm({ channel: "email", recipientName: "", recipientContact: "" });
      fetchReviews(); // Refresh list
    } catch (error) {
      toast.error(error.message || "Failed to send review request");
    } finally {
      setIsSending(false);
    }
  };

  // Calculate stats
  const responses = reviews.filter(r => r.response);
  const avgRating = responses.length > 0
    ? (responses.reduce((sum, r) => sum + (r.response?.rating || 0), 0) / responses.length).toFixed(1)
    : "N/A";
  const rating5 = responses.filter(r => r.response?.rating === 5).length;
  const rating4 = responses.filter(r => r.response?.rating === 4).length;
  const lowRatings = responses.filter(r => r.response?.rating && r.response.rating <= 3).length;
  const pending = reviews.filter(r => r.status === "sent" || r.status === "opened").length;

  // Show loading while checking for dealer redirect
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <Head><title>Reviews | DealerHQ</title></Head>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Reviews & Reputation</h1>
          <p className="text-slate-500 mt-2">Send review requests and track customer feedback</p>
        </div>
        <button
          onClick={() => setShowSendModal(true)}
          className="px-5 py-2.5 bg-[#0066CC] text-white rounded-xl hover:bg-[#0055BB] transition-colors font-semibold shadow-sm flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Send Review Request
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-12 h-12 border-4 border-[#0066CC]/20 border-t-[#0066CC] rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-3xl font-bold text-[#0066CC]">{avgRating}</p>
              <p className="text-sm text-slate-500 mt-1">Average Rating</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-3xl font-bold text-emerald-600">{rating5}</p>
              <p className="text-sm text-slate-500 mt-1">5-Star Reviews</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-3xl font-bold text-slate-700">{rating4}</p>
              <p className="text-sm text-slate-500 mt-1">4-Star Reviews</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-3xl font-bold text-red-500">{lowRatings}</p>
              <p className="text-sm text-slate-500 mt-1">Low Ratings (≤3)</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-3xl font-bold text-amber-500">{pending}</p>
              <p className="text-sm text-slate-500 mt-1">Awaiting Response</p>
            </div>
          </div>

          {/* Reviews Table */}
          {reviews.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No review requests yet</h3>
              <p className="text-slate-500 mb-6">Send your first review request to start collecting customer feedback</p>
              <button
                onClick={() => setShowSendModal(true)}
                className="px-5 py-2.5 bg-[#0066CC] text-white rounded-xl hover:bg-[#0055BB] transition-colors font-semibold"
              >
                Send Review Request
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Vehicle</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Channel</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Rating</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Public Review</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reviews.map((review) => (
                      <tr key={review.id || review._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {new Date(review.sentAt || review.createdAt).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-slate-900">{review.contactId?.name || review.recipientName || "—"}</p>
                          <p className="text-xs text-slate-500">{review.contactId?.email || review.contactId?.phone || "—"}</p>
                        </td>
                        <td className="px-6 py-4">
                          {review.vehicleId?.regCurrent ? (
                            <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded">{review.vehicleId.regCurrent}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${CHANNELS[review.channel]?.color || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                            <span>{CHANNELS[review.channel]?.icon}</span>
                            {CHANNELS[review.channel]?.label || review.channel}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            review.status === "responded" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            review.status === "opened" ? "bg-blue-50 text-blue-700 border-blue-200" :
                            review.status === "expired" ? "bg-red-50 text-red-700 border-red-200" :
                            "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>
                            {review.status === "responded" ? "✓ Responded" :
                             review.status === "opened" ? "Opened" :
                             review.status === "expired" ? "Expired" : "Sent"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {review.response?.rating ? (
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <svg
                                  key={star}
                                  className={`w-4 h-4 ${star <= review.response.rating ? "text-yellow-400 fill-current" : "text-slate-200"}`}
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {review.response?.publicReviewSubmitted ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ✓ Submitted
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Send Review Request Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Send Review Request</h2>
                <button
                  onClick={() => setShowSendModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSendRequest} className="p-6 space-y-5">
              {/* Channel Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">Send via</label>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(CHANNELS).map(([key, { label, icon }]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSendForm({ ...sendForm, channel: key, recipientContact: "" })}
                      className={`p-3 rounded-xl border-2 transition-all text-center ${
                        sendForm.channel === key
                          ? "border-[#0066CC] bg-[#0066CC]/5"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <span className="text-2xl block mb-1">{icon}</span>
                      <span className={`text-sm font-medium ${sendForm.channel === key ? "text-[#0066CC]" : "text-slate-600"}`}>
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Recipient Name</label>
                <input
                  type="text"
                  value={sendForm.recipientName}
                  onChange={(e) => setSendForm({ ...sendForm, recipientName: e.target.value })}
                  placeholder="John Smith"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0066CC]/20 focus:border-[#0066CC] transition-all"
                />
              </div>

              {/* Recipient Contact */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {sendForm.channel === "email" ? "Email Address" : "Phone Number"}
                </label>
                <input
                  type={sendForm.channel === "email" ? "email" : "tel"}
                  value={sendForm.recipientContact}
                  onChange={(e) => setSendForm({ ...sendForm, recipientContact: e.target.value })}
                  placeholder={sendForm.channel === "email" ? "john@example.com" : "+44 7700 900123"}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0066CC]/20 focus:border-[#0066CC] transition-all"
                />
                {sendForm.channel !== "email" && (
                  <p className="text-xs text-slate-500 mt-2">Include country code (e.g., +44 for UK)</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="flex-1 px-4 py-3 bg-[#0066CC] text-white rounded-xl hover:bg-[#0055BB] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <span>{CHANNELS[sendForm.channel].icon}</span>
                      Send Request
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
