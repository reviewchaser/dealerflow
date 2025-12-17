/**
 * AI Suggestions Panel Component
 *
 * Displays AI-generated diagnostic suggestions in a collapsible panel.
 * Shows: suspected issues, checks to run, customer questions, parts, safety notes.
 * Includes "Copy to notes" functionality.
 */

import { useState } from "react";
import { toast } from "react-hot-toast";

// Urgency badge colors
const URGENCY_COLORS = {
  low: "badge-success",
  med: "badge-warning",
  high: "badge-error",
};

const URGENCY_LABELS = {
  low: "Low",
  med: "Medium",
  high: "High",
};

export default function AISuggestionsPanel({
  suggestions,
  isLoading,
  isDummy,
  onCopyToNotes,
  className = "",
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!suggestions && !isLoading) {
    return null;
  }

  const handleCopyToNotes = () => {
    if (!suggestions) return;

    // Format suggestions as text
    const lines = [];
    lines.push("=== AI SUGGESTIONS ===\n");

    if (suggestions.suspected_issues?.length > 0) {
      lines.push("SUSPECTED ISSUES:");
      suggestions.suspected_issues.forEach((issue, i) => {
        lines.push(`${i + 1}. ${issue.title} [${issue.urgency?.toUpperCase()}]`);
        if (issue.why) lines.push(`   Why: ${issue.why}`);
      });
      lines.push("");
    }

    if (suggestions.checks_to_run?.length > 0) {
      lines.push("CHECKS TO RUN:");
      suggestions.checks_to_run.forEach((check, i) => {
        lines.push(`${i + 1}. ${check.step}`);
        if (check.tools) lines.push(`   Tools: ${check.tools}`);
        if (check.time_estimate_mins) lines.push(`   Est. time: ${check.time_estimate_mins} mins`);
      });
      lines.push("");
    }

    if (suggestions.questions_for_customer?.length > 0) {
      lines.push("QUESTIONS FOR CUSTOMER:");
      suggestions.questions_for_customer.forEach((q, i) => {
        lines.push(`${i + 1}. ${q.question}`);
        if (q.why) lines.push(`   Reason: ${q.why}`);
      });
      lines.push("");
    }

    if (suggestions.parts_to_consider?.length > 0) {
      lines.push("PARTS TO CONSIDER:");
      suggestions.parts_to_consider.forEach((part, i) => {
        lines.push(`${i + 1}. ${part.part}`);
        if (part.notes) lines.push(`   Notes: ${part.notes}`);
      });
      lines.push("");
    }

    if (suggestions.safety_notes?.length > 0) {
      lines.push("SAFETY NOTES:");
      suggestions.safety_notes.forEach((note, i) => {
        lines.push(`- ${note.note}`);
      });
    }

    const text = lines.join("\n");

    // If callback provided, use it
    if (onCopyToNotes) {
      onCopyToNotes(text);
      toast.success("Added to notes");
    } else {
      // Otherwise copy to clipboard
      navigator.clipboard.writeText(text).then(() => {
        toast.success("Copied to clipboard");
      }).catch(() => {
        toast.error("Failed to copy");
      });
    }
  };

  return (
    <div className={`bg-base-200 rounded-lg border border-base-300 ${className}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-base-300/50 rounded-t-lg"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-primary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span className="font-medium">AI Suggestions</span>
          {isDummy && (
            <span className="badge badge-sm badge-ghost">Demo</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <span className="loading loading-spinner loading-sm"></span>
          )}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-3 pt-0 space-y-4">
          {isLoading ? (
            <div className="text-center py-4 text-base-content/60">
              <span className="loading loading-dots loading-md"></span>
              <p className="mt-2 text-sm">Analysing...</p>
            </div>
          ) : suggestions ? (
            <>
              {/* Suspected Issues */}
              {suggestions.suspected_issues?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                    <span className="text-warning">!</span> Suspected Issues
                  </h4>
                  <div className="space-y-2">
                    {suggestions.suspected_issues.map((issue, i) => (
                      <div key={i} className="bg-base-100 rounded p-2 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium">{issue.title}</span>
                          {issue.urgency && (
                            <span className={`badge badge-xs ${URGENCY_COLORS[issue.urgency] || "badge-ghost"}`}>
                              {URGENCY_LABELS[issue.urgency] || issue.urgency}
                            </span>
                          )}
                        </div>
                        {issue.why && (
                          <p className="text-base-content/70 mt-1">{issue.why}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Checks to Run */}
              {suggestions.checks_to_run?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                    <span className="text-info">&#10003;</span> Checks to Run
                  </h4>
                  <div className="space-y-2">
                    {suggestions.checks_to_run.map((check, i) => (
                      <div key={i} className="bg-base-100 rounded p-2 text-sm">
                        <p className="font-medium">{check.step}</p>
                        <div className="flex gap-4 mt-1 text-xs text-base-content/60">
                          {check.tools && <span>Tools: {check.tools}</span>}
                          {check.time_estimate_mins > 0 && (
                            <span>~{check.time_estimate_mins} mins</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Questions for Customer */}
              {suggestions.questions_for_customer?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                    <span className="text-secondary">?</span> Questions for Customer
                  </h4>
                  <div className="space-y-2">
                    {suggestions.questions_for_customer.map((q, i) => (
                      <div key={i} className="bg-base-100 rounded p-2 text-sm">
                        <p className="font-medium">{q.question}</p>
                        {q.why && (
                          <p className="text-base-content/60 text-xs mt-1">
                            Why: {q.why}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Parts to Consider */}
              {suggestions.parts_to_consider?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                    <span className="text-accent">&#9881;</span> Parts to Consider
                  </h4>
                  <div className="space-y-1">
                    {suggestions.parts_to_consider.map((part, i) => (
                      <div key={i} className="bg-base-100 rounded p-2 text-sm">
                        <span className="font-medium">{part.part}</span>
                        {part.notes && (
                          <span className="text-base-content/60"> - {part.notes}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Safety Notes */}
              {suggestions.safety_notes?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                    <span className="text-error">&#9888;</span> Safety Notes
                  </h4>
                  <div className="bg-error/10 border border-error/20 rounded p-2">
                    <ul className="text-sm space-y-1">
                      {suggestions.safety_notes.map((note, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-error">&#8226;</span>
                          <span>{note.note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Copy to Notes Button */}
              <div className="pt-2 border-t border-base-300">
                <button
                  type="button"
                  className="btn btn-sm btn-ghost gap-2"
                  onClick={handleCopyToNotes}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                    />
                  </svg>
                  Copy to notes
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-base-content/60 text-center py-4">
              No suggestions available
            </p>
          )}
        </div>
      )}
    </div>
  );
}
