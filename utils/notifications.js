import { toast } from "react-hot-toast";

export const showDummyNotification = (feature) => {
  toast((t) => (
    <div className="flex items-center gap-3">
      <span className="text-2xl">⚠️</span>
      <div>
        <p className="font-semibold">Demo Mode</p>
        <p className="text-sm text-gray-500">{feature} is not configured yet</p>
      </div>
    </div>
  ), {
    duration: 4000,
    style: { background: '#fef3c7', color: '#92400e' },
  });
};

export const showSuccess = (message) => toast.success(message);
export const showError = (message) => toast.error(message);
