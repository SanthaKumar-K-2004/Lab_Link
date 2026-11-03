import * as React from "react";
import { toast as sonnerToast } from "sonner";

export interface ToastProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: "default" | "destructive" | null;
  action?: React.ReactNode;
  duration?: number;
  [key: string]: unknown;
}

export function toast(props: ToastProps | string) {
  if (typeof props === "string") {
    return sonnerToast(props);
  }

  const { title, description, variant, duration, ...rest } = props;

  const options: Record<string, unknown> = {
    description,
    duration,
    ...rest,
  };

  if (variant === "destructive") {
    return sonnerToast.error(title ?? "Error", options);
  }

  return sonnerToast(title ?? "", options);
}

// Attach Sonner methods directly for convenience
toast.error = sonnerToast.error;
toast.success = sonnerToast.success;
toast.info = sonnerToast.info;
toast.warning = sonnerToast.warning;
toast.dismiss = sonnerToast.dismiss;

export function useToast() {
  return {
    toast,
    dismiss: (toastId?: string | number) => sonnerToast.dismiss(toastId),
    toasts: [] as ToastProps[],
  };
}

export type ToastActionElement = React.ReactElement;
