import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

// Format date
const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export default function PublicSubmissionView() {
  const router = useRouter();
  const { id } = router.query;
  const [submission, setSubmission] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    const fetchSubmission = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/public/submission/${id}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Submission not found");
        }
        const data = await res.json();
        setSubmission(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmission();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="loading loading-spinner loading-lg text-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Not Found</h1>
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  const { formName, formType, answers, submittedAt, dealer } = submission;

  // Render a field value based on its type
  const renderValue = (value, type) => {
    if (value === null || value === undefined || value === "") return "—";

    if (type === "BOOLEAN") {
      return value ? "Yes" : "No";
    }

    if (type === "DATE") {
      return formatDate(value);
    }

    if (type === "SIGNATURE" && value) {
      return (
        <img src={value} alt="Signature" className="max-h-16 border border-slate-200 rounded bg-white" />
      );
    }

    if (type === "FILE" && value) {
      return (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          View File
        </a>
      );
    }

    if (type === "FILE_MULTI" && Array.isArray(value)) {
      return (
        <div className="flex gap-2 flex-wrap">
          {value.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              File {i + 1}
            </a>
          ))}
        </div>
      );
    }

    if (Array.isArray(value)) {
      return value.join(", ");
    }

    return String(value);
  };

  return (
    <>
      <Head>
        <title>{formName} | DealerHQ</title>
      </Head>

      {/* Print controls */}
      <div className="print:hidden bg-slate-100 p-4 sticky top-0 z-10 border-b border-slate-200">
        <div className="max-w-[800px] mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-900">{formName}</h1>
          <button
            onClick={() => window.print()}
            className="btn bg-blue-600 hover:bg-blue-700 text-white border-none"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
        </div>
      </div>

      {/* Document */}
      <div className="min-h-screen bg-slate-100 print:bg-white p-4 print:p-0">
        <div className="max-w-[800px] mx-auto bg-white shadow-xl print:shadow-none rounded-2xl print:rounded-none overflow-hidden">
          {/* Header */}
          <div className="bg-white p-6 print:p-4 border-b border-slate-200">
            <div className="flex items-start justify-between">
              <div>
                {dealer?.logoUrl && (
                  <img
                    src={dealer.logoUrl}
                    alt={dealer.name}
                    className="h-10 max-w-[120px] object-contain mb-2"
                  />
                )}
                <p className="font-bold text-lg text-slate-900">{dealer?.name}</p>
              </div>
              <div className="text-right">
                <h1 className="text-xl font-bold text-slate-900">{formName}</h1>
                <p className="text-slate-500 text-sm mt-1">{formatDate(submittedAt)}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 print:p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {answers?.map((answer, idx) => (
                <div
                  key={idx}
                  className={`${
                    answer.type === "TEXTAREA" || answer.type === "SIGNATURE" || answer.type === "FILE_MULTI"
                      ? "md:col-span-2"
                      : ""
                  }`}
                >
                  <p className="text-sm text-slate-500 font-medium mb-1">{answer.label}</p>
                  <div className="text-slate-900">{renderValue(answer.value, answer.type)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm 10mm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </>
  );
}
