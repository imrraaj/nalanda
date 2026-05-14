import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type PdfThumbnailProps = {
  className?: string;
  thumbnailUrl: string | null;
  title: string;
};

export function PdfThumbnail({ className, thumbnailUrl, title }: PdfThumbnailProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "ready" | "failed">(
    thumbnailUrl ? "idle" : "failed",
  );

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;

    setStatus(thumbnailUrl ? "idle" : "failed");
    setImageUrl(null);

    async function loadThumbnail() {
      if (!thumbnailUrl) {
        return;
      }

      try {
        const response = await fetch(thumbnailUrl, {
          credentials: "same-origin",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Thumbnail request failed.");
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      } catch (error) {
        if (!controller.signal.aborted) {
          setStatus("failed");
        }
      }
    }

    void loadThumbnail();

    return () => {
      controller.abort();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [thumbnailUrl]);

  if (!thumbnailUrl || status === "failed") {
    return null;
  }

  return (
    <div
      aria-label={`${title} thumbnail`}
      className={cn("flex items-center justify-center bg-white", className)}
    >
      {status === "idle" ? (
        <div className="absolute inset-0 overflow-hidden bg-muted">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.25s_infinite] bg-linear-to-r from-transparent via-white/60 to-transparent" />
        </div>
      ) : null}
      {imageUrl ? (
        <img
          alt=""
          className="relative z-10 h-full w-full bg-white object-cover"
          decoding="async"
          onError={() => setStatus("failed")}
          onLoad={() => setStatus("ready")}
          src={imageUrl}
        />
      ) : null}
    </div>
  );
}
