import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type PdfThumbnailProps = {
  className?: string;
  itemId: string;
  title: string;
};

type PdfDocumentProxyLike = {
  destroy?: () => Promise<void> | void;
  getPage: (pageNumber: number) => Promise<PdfPageProxyLike>;
};

type PdfPageProxyLike = {
  cleanup?: () => void;
  getViewport: (input: { scale: number }) => { height: number; width: number };
  render: (input: {
    canvas: HTMLCanvasElement;
    canvasContext: CanvasRenderingContext2D;
    transform?: [number, number, number, number, number, number];
    viewport: { height: number; width: number };
  }) => {
    cancel?: () => void;
    promise: Promise<void>;
  };
};

type PdfLoadingTaskLike = {
  destroy?: () => Promise<void> | void;
  promise: Promise<PdfDocumentProxyLike>;
};

export function PdfThumbnail({ className, itemId, title }: PdfThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<"idle" | "ready" | "failed">("idle");

  useEffect(() => {
    let isDisposed = false;
    let loadingTask: PdfLoadingTaskLike | null = null;
    let pdfDocument: PdfDocumentProxyLike | null = null;
    let renderTask: ReturnType<PdfPageProxyLike["render"]> | null = null;

    async function renderThumbnail() {
      const canvas = canvasRef.current;

      if (!canvas) {
        return;
      }

      try {
        const [pdfjsLib, workerModule] = await Promise.all([
          import("pdfjs-dist/build/pdf.mjs"),
          import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
        ]);

        pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default;
        loadingTask = pdfjsLib.getDocument({
          disableAutoFetch: true,
          disableRange: true,
          enableXfa: false,
          url: `/api/documents/content?itemId=${encodeURIComponent(itemId)}`,
          withCredentials: true,
        }) as unknown as PdfLoadingTaskLike;

        pdfDocument = await loadingTask.promise;

        if (isDisposed) {
          return;
        }

        const page = await pdfDocument.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        const maxWidth = 360;
        const maxHeight = 270;
        const scale = Math.max(maxWidth / viewport.width, maxHeight / viewport.height);
        const scaledViewport = page.getViewport({ scale });
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Canvas rendering is unavailable.");
        }

        canvas.width = Math.floor(maxWidth * pixelRatio);
        canvas.height = Math.floor(maxHeight * pixelRatio);
        canvas.style.width = "100%";
        canvas.style.height = "100%";

        const offsetX = Math.floor((maxWidth - scaledViewport.width) / 2);
        const offsetY = Math.max(0, Math.floor((maxHeight - scaledViewport.height) / 2));

        context.setTransform(1, 0, 0, 1, 0, 0);
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);

        renderTask = page.render({
          canvas,
          canvasContext: context,
          transform: [
            pixelRatio,
            0,
            0,
            pixelRatio,
            offsetX * pixelRatio,
            offsetY * pixelRatio,
          ],
          viewport: scaledViewport,
        });
        await renderTask.promise;

        if (!isDisposed) {
          setStatus("ready");
        }

        page.cleanup?.();
      } catch {
        if (!isDisposed) {
          setStatus("failed");
        }
      }
    }

    setStatus("idle");
    void renderThumbnail();

    return () => {
      isDisposed = true;
      renderTask?.cancel?.();
      void loadingTask?.destroy?.();
      void pdfDocument?.destroy?.();
    };
  }, [itemId]);

  if (status === "failed") {
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
      <canvas
        className={cn(
          "h-full w-full bg-white object-cover",
          status !== "ready" && "absolute opacity-0",
        )}
        ref={canvasRef}
      />
    </div>
  );
}
