import { useState, useEffect, useRef } from "react";

/**
 * TeamMemberPicker - Multi-select team member picker
 *
 * Props:
 * - value: Array of selected user IDs
 * - onChange: (userIds, users) => void
 * - placeholder: Input placeholder text
 * - label: Optional label for the field
 * - disabled: Whether the picker is disabled
 * - excludeCurrentUser: Whether to exclude current user from list (default false)
 */
export default function TeamMemberPicker({
  value = [],
  onChange,
  placeholder = "Select team members...",
  label,
  disabled = false,
  excludeCurrentUser = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch team members on mount
  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/team/members");
      if (res.ok) {
        const data = await res.json();
        setMembers(data.filter(m => !excludeCurrentUser || !m.isCurrentUser));
      }
    } catch (error) {
      console.error("Failed to fetch team members:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter members based on search
  const filteredMembers = members.filter(member => {
    const query = searchQuery.toLowerCase();
    return (
      (member.name || "").toLowerCase().includes(query) ||
      (member.email || "").toLowerCase().includes(query)
    );
  });

  // Get selected member objects
  const selectedMembers = members.filter(m => value.includes(m.userId));

  const toggleMember = (userId) => {
    const newValue = value.includes(userId)
      ? value.filter(id => id !== userId)
      : [...value, userId];
    const newMembers = members.filter(m => newValue.includes(m.userId));
    onChange(newValue, newMembers);
  };

  const removeMember = (userId) => {
    const newValue = value.filter(id => id !== userId);
    const newMembers = members.filter(m => newValue.includes(m.userId));
    onChange(newValue, newMembers);
  };

  // Role badge colors
  const getRoleBadge = (role) => {
    const colors = {
      OWNER: "bg-purple-100 text-purple-700",
      ADMIN: "bg-blue-100 text-blue-700",
      SALES: "bg-green-100 text-green-700",
      STAFF: "bg-slate-100 text-slate-700",
      WORKSHOP: "bg-amber-100 text-amber-700",
      VIEWER: "bg-gray-100 text-gray-600",
    };
    return colors[role] || "bg-slate-100 text-slate-700";
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {label}
        </label>
      )}

      {/* Selected members chips */}
      {selectedMembers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedMembers.map(member => (
            <span
              key={member.userId}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-sm rounded-lg"
            >
              {member.name || member.email}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeMember(member.userId)}
                  className="hover:bg-blue-100 rounded p-0.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="input input-bordered w-full pr-8"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-slate-500">
              <span className="loading loading-spinner loading-sm"></span>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-sm">
              {searchQuery ? "No members found" : "No team members"}
            </div>
          ) : (
            <div className="py-1">
              {filteredMembers.map(member => {
                const isSelected = value.includes(member.userId);
                return (
                  <button
                    key={member.userId}
                    type="button"
                    onClick={() => toggleMember(member.userId)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors ${
                      isSelected ? "bg-blue-50" : ""
                    }`}
                  >
                    {/* Checkbox */}
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      isSelected ? "bg-blue-600 border-blue-600" : "border-slate-300"
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    {/* Member info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 truncate">
                          {member.name || "Unnamed"}
                        </span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${getRoleBadge(member.role)}`}>
                          {member.role}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 truncate">{member.email}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
