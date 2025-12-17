import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { toast, Toaster } from "react-hot-toast";

export default function ReviewResponseForm() {
  const router = useRouter();
  const { token } = router.query;
  const [rating, setRating] = useState(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [showGooglePrompt, setShowGooglePrompt] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [feedback, setFeedback] = useState("");

  const handleRatingClick = (selectedRating) => {
    setRating(selectedRating);
    
    if (selectedRating >= 4) {
      // 4-5 stars: Ask to leave Google review
      setShowGooglePrompt(true);
      setShowFeedbackForm(false);
    } else {
      // 1-3 stars: Show private feedback form
      setShowFeedbackForm(true);
      setShowGooglePrompt(false);
    }
  };

  const handleGoogleReview = async (willPost) => {
    setIsSubmitting(true);
    try {
      // In real implementation, this would update the review response
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      if (willPost) {
        // Open Google review page in new tab
        // This URL would come from dealer settings
        window.open("https://g.page/review/...", "_blank");
      }
      setIsComplete(true);
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedback.trim()) return toast.error("Please provide your feedback");
    
    setIsSubmitting(true);
    try {
      // In real implementation, this would submit the feedback
      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsComplete(true);
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isComplete) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
        <Head><title>Thank You</title></Head>
        <Toaster position="top-center" />
        <div className="card bg-base-100 max-w-md w-full shadow-xl">
          <div className="card-body text-center">
            <div className="text-6xl mb-4">🙏</div>
            <h1 className="text-2xl font-bold">Thank You!</h1>
            <p className="text-base-content/60 mt-2">
              We really appreciate you taking the time to share your experience with us.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <Head><title>Share Your Experience</title></Head>
      <Toaster position="top-center" />

      <div className="max-w-md w-full">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center">
            <h1 className="text-2xl font-bold">How was your experience?</h1>
            <p className="text-base-content/60 mt-2 mb-6">
              Your feedback helps us improve
            </p>

            {/* Star Rating Selection */}
            {!showFeedbackForm && !showGooglePrompt && (
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRatingClick(star)}
                    className="text-4xl hover:scale-110 transition-transform cursor-pointer"
                  >
                    {rating && star <= rating ? "⭐" : "☆"}
                  </button>
                ))}
              </div>
            )}

            {/* Google Review Prompt (4-5 stars) */}
            {showGooglePrompt && (
              <div className="space-y-4 mt-4">
                <div className="flex justify-center gap-1 text-3xl">
                  {"⭐".repeat(rating)}
                </div>
                <p className="text-lg font-semibold text-success">We're so glad you had a great experience!</p>
                <p className="text-base-content/70">
                  Would you mind sharing your experience on Google? It really helps other customers find us.
                </p>
                <div className="flex flex-col gap-2 mt-4">
                  <button 
                    className="btn btn-primary"
                    onClick={() => handleGoogleReview(true)}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <span className="loading loading-spinner"></span> : "Leave Google Review"}
                  </button>
                  <button 
                    className="btn btn-ghost"
                    onClick={() => handleGoogleReview(false)}
                    disabled={isSubmitting}
                  >
                    No thanks
                  </button>
                </div>
              </div>
            )}

            {/* Private Feedback Form (1-3 stars) */}
            {showFeedbackForm && (
              <div className="space-y-4 mt-4">
                <div className="flex justify-center gap-1 text-3xl">
                  {"⭐".repeat(rating)}{"☆".repeat(5 - rating)}
                </div>
                <p className="text-base-content/70">
                  We're sorry to hear your experience wasn't perfect. Please let us know what went wrong so we can make it right.
                </p>
                <form onSubmit={handleFeedbackSubmit}>
                  <div className="form-control">
                    <textarea
                      className="textarea textarea-bordered h-32"
                      placeholder="Tell us what we could have done better..."
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2 mt-4">
                    <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                      {isSubmitting ? <span className="loading loading-spinner"></span> : "Submit Feedback"}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-ghost"
                      onClick={() => {
                        setRating(null);
                        setShowFeedbackForm(false);
                      }}
                    >
                      Change Rating
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-center text-base-content/50 mt-4">
          Your feedback is private and will only be shared with our team.
        </p>
      </div>
    </div>
  );
}
