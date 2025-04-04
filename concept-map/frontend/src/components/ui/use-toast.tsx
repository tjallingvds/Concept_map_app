import { toast as sonnerToast, ToastT } from "sonner";

export interface Toast {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
}

export interface ToastActionElement {
  altText?: string;
  action?: React.ReactNode;
}

// Create a wrapper around sonner toast for consistent API
export const toast = {
  error: (message: string) => {
    sonnerToast.error(message);
  },
  success: (message: string) => {
    sonnerToast.success(message);
  },
  info: (message: string) => {
    sonnerToast(message);
  },
  // Match the sonnerToast API
  toast: (args: Toast) => {
    sonnerToast(args.title || "", {
      description: args.description,
      duration: args.duration,
    });
  }
};

export const useToast = () => {
  return { toast };
}; 