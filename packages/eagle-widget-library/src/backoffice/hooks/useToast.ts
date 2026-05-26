import { toast as toastify } from "react-toastify";

interface ToastOptions {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: "default" | "destructive" | "success";
}

function toast({ title, description, variant }: ToastOptions) {
  const msg = String(description ?? title ?? "");
  const titleStr = title ? String(title) : undefined;
  const full = titleStr && titleStr !== msg ? `${titleStr}: ${msg}` : msg;
  if (variant === "destructive") toastify.error(full);
  else toastify(full);
  return { id: String(Date.now()), dismiss: () => {}, update: () => {} };
}

export function useToast() {
  return { toast };
}

export { toast };
