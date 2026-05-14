"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type ToastVariant = "error" | "info" | "success";

type ToastInput = {
  description?: string;
  title: string;
  variant: ToastVariant;
};

type ToastRecord = ToastInput & {
  id: number;
};

let publishToast: (toast: ToastInput) => void = () => undefined;

function notify(variant: ToastVariant, title: string, description?: string) {
  publishToast({ description, title, variant });
}

export const toast = {
  error: (title: string, description?: string) => notify("error", title, description),
  info: (title: string, description?: string) => notify("info", title, description),
  success: (title: string, description?: string) => notify("success", title, description),
};

export function Toaster() {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  useEffect(() => {
    publishToast = (input) => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { ...input, id }].slice(-4));
      window.setTimeout(() => {
        setToasts((current) => current.filter((toastItem) => toastItem.id !== id));
      }, 4500);
    };

    return () => {
      publishToast = () => undefined;
    };
  }, []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="fixed right-4 top-5 z-120 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
    >
      {toasts.map((toastItem) => (
        <div
          className={cn(
            "rounded-[6px] border bg-popover p-4 text-popover-foreground shadow-xl ring-1 ring-foreground/10",
            toastItem.variant === "error" && "border-destructive bg-destructive text-white ring-destructive/20",
            toastItem.variant === "success" && "border-primary bg-primary text-primary-foreground ring-primary/20",
          )}
          key={toastItem.id}
          role={toastItem.variant === "error" ? "alert" : "status"}
        >
          <p className="text-sm font-semibold">{toastItem.title}</p>
          {toastItem.description ? (
            <p
              className={cn(
                "mt-1 text-sm text-muted-foreground",
                toastItem.variant !== "info" && "text-white/90",
              )}
            >
              {toastItem.description}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
