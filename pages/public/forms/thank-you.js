import Head from "next/head";

export default function ThankYou() {
  return (
    <>
      <Head>
        <title>Thank You | DealerFlow</title>
      </Head>

      <div className="min-h-screen bg-base-200 flex items-center justify-center px-4">
        <div className="card bg-base-100 shadow-xl max-w-lg w-full">
          <div className="card-body text-center">
            <div className="text-6xl mb-4">✓</div>
            <h1 className="text-3xl font-bold mb-4">Thank You!</h1>
            <p className="text-lg text-base-content/80 mb-6">
              Your submission was successful.
            </p>
            <div className="card-actions justify-center">
              <button
                onClick={() => window.close()}
                className="btn btn-ghost"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
