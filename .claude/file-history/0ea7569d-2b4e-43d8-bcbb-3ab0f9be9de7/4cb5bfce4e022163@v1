import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession, signIn } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import toast from "react-hot-toast";

export default function AcceptInvite() {
  const router = useRouter();
  const { token } = router.query;
  const { data: session, status: sessionStatus } = useSession();

  const [inviteData, setInviteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);

  // Validate token on load
  useEffect(() => {
    if (!token) return;

    const validateToken = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/team/accept-invite?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (res.ok) {
          setInviteData(data);
        } else {
          setError(data.error || "Invalid invite");
        }
      } catch (err) {
        setError("Failed to validate invite");
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  // Auto-accept if logged in and invite is valid
  useEffect(() => {
    if (
      sessionStatus === "authenticated" &&
      inviteData?.valid &&
      !accepting &&
      !error
    ) {
      handleAccept();
    }
  }, [sessionStatus, inviteData]);

  const handleAccept = async () => {
    if (accepting) return;

    setAccepting(true);
    try {
      const res = await fetch("/api/team/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || "Invite accepted!");
        router.push("/dashboard");
      } else {
        // Check for email mismatch
        if (data.expectedEmail) {
          setError(data.error);
        } else {
          toast.error(data.error || "Failed to accept invite");
          setError(data.error);
        }
      }
    } catch (err) {
      toast.error("Failed to accept invite");
      setError("An error occurred");
    } finally {
      setAccepting(false);
    }
  };

  const handleSignIn = (provider) => {
    // Redirect back here after auth
    signIn(provider, {
      callbackUrl: `/invite/accept?token=${encodeURIComponent(token)}`,
    });
  };

  if (loading || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Accept Invitation | DealerHQ</title>
      </Head>

      <div className="min-h-screen bg-base-200 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2">
              <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
              <span className="text-2xl font-bold">DealerHQ</span>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              {error ? (
                // Error state
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold mb-2">Invitation Problem</h2>
                  <p className="text-base-content/60 mb-6">{error}</p>
                  <Link href="/" className="btn btn-primary">
                    Go to Homepage
                  </Link>
                </div>
              ) : accepting ? (
                // Accepting state
                <div className="text-center py-8">
                  <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
                  <p className="text-base-content/60">Joining team...</p>
                </div>
              ) : sessionStatus === "authenticated" ? (
                // Logged in - will auto-accept
                <div className="text-center py-8">
                  <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
                  <p className="text-base-content/60">Processing invitation...</p>
                </div>
              ) : (
                // Not logged in - show invite details and auth options
                <>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                      <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold">You're Invited!</h2>
                    <p className="text-base-content/60 mt-2">
                      Join <span className="font-semibold text-base-content">{inviteData?.dealerName}</span>
                    </p>
                  </div>

                  <div className="bg-base-200 rounded-lg p-4 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-base-content/60">Email</span>
                      <span className="font-medium">{inviteData?.email}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-base-content/60">Role</span>
                      <span className="badge badge-primary">{inviteData?.role}</span>
                    </div>
                  </div>

                  <p className="text-sm text-base-content/60 text-center mb-6">
                    Sign in with <span className="font-medium">{inviteData?.email}</span> to accept this invitation
                  </p>

                  <div className="space-y-3">
                    <button
                      className="btn btn-primary btn-block"
                      onClick={() => handleSignIn("google")}
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Continue with Google
                    </button>

                    <button
                      className="btn btn-outline btn-block"
                      onClick={() => handleSignIn("email")}
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Continue with Email
                    </button>
                  </div>

                  <p className="text-xs text-base-content/50 text-center mt-6">
                    This invitation expires on{" "}
                    {new Date(inviteData?.expiresAt).toLocaleDateString()}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
