import "pdfjs-dist/web/pdf_viewer.css";
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import {
  IconArrowLeft,
  IconChevronLeft,
  IconChevronRight,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconReload,
  IconSearch,
  IconZoomIn,
  IconZoomOut,
} from "@tabler/icons-react";
import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const zoomOptions = [
  { label: "Automatic Zoom", value: "auto" },
  { label: "Page Fit", value: "page-fit" },
  { label: "Page Width", value: "page-width" },
  { label: "50%", value: "0.5" },
  { label: "75%", value: "0.75" },
  { label: "100%", value: "1" },
  { label: "125%", value: "1.25" },
  { label: "150%", value: "1.50" },
  { label: "200%", value: "2" },
];

type ViewerRuntime = {
  eventBus: {
    dispatch: (eventName: string, data: Record<string, unknown>) => void;
  };
  pdfViewer: {
    currentPageNumber: number;
    currentScaleValue: string;
    decreaseScale: () => void;
    increaseScale: () => void;
    nextPage: () => boolean;
    previousPage: () => boolean;
    setDocument: (document: unknown) => void;
  };
  loadingTask: {
    destroy?: () => Promise<void> | void;
  } | null;
  pdfDocument: {
    destroy?: () => Promise<void> | void;
  } | null;
};

function formatScaleLabel(scale: number) {
  return `${Math.round(scale * 100)}%`;
}

function getZoomOptionLabel(value: string, customLabel: string) {
  if (value === "custom") {
    return customLabel;
  }

  return zoomOptions.find((option) => option.value === value)?.label ?? customLabel;
}

function getFindMessage(state: number, previous: boolean) {
  switch (state) {
    case 1:
      return "Phrase not found.";
    case 2:
      return previous
        ? "Reached the top of the document and continued from the bottom."
        : "Reached the end of the document and continued from the top.";
    case 3:
      return "Searching document text…";
    default:
      return null;
  }
}

export const Route = createFileRoute("/reader")({
  validateSearch: (search: Record<string, unknown>) => ({
    itemId: typeof search.itemId === "string" ? search.itemId : "",
    name: typeof search.name === "string" ? search.name : "",
  }),
  beforeLoad: async ({ search }) => {
    const { getSession } = await import("@/lib/auth.function");
    const session = await getSession();

    if (!session) {
      const redirectTo = `/reader?itemId=${encodeURIComponent(search.itemId)}&name=${encodeURIComponent(search.name)}`;
      throw redirect({ search: { redirectTo }, to: "/login" });
    }

    if (!search.itemId) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: ReaderPage,
});

function ReaderPage() {
  const { itemId, name } = Route.useSearch();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<ViewerRuntime | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [pageInput, setPageInput] = useState("1");
  const [zoomSelectValue, setZoomSelectValue] = useState("page-fit");
  const [zoomLabel, setZoomLabel] = useState("100%");
  const [findMessage, setFindMessage] = useState<string | null>(null);
  const [findQuery, setFindQuery] = useState("");
  const [findSummary, setFindSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const deferredFindQuery = useDeferredValue(findQuery);
  const displayName = name || "Protected document";
  const documentUrl = `/api/documents/content?itemId=${encodeURIComponent(itemId)}`;

  useEffect(() => {
    let isDisposed = false;
    let runtime: ViewerRuntime | null = null;

    async function initializeViewer() {
      const container = containerRef.current;
      const viewer = viewerRef.current;

      if (!container || !viewer) {
        return;
      }

      setCurrentPage(1);
      setPageInput("1");
      setPageCount(0);
      setZoomLabel("100%");
      setZoomSelectValue("page-fit");
      setFindMessage(null);
      setFindSummary(null);
      setErrorMessage(null);
      setIsLoading(true);
      viewer.replaceChildren();

      try {
        const pdfjsLib = await import("pdfjs-dist/build/pdf.mjs");

        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;
        globalThis.pdfjsLib = pdfjsLib;

        const pdfjsViewer = await import("pdfjs-dist/web/pdf_viewer.mjs");

        if (isDisposed) {
          return;
        }

        const eventBus = new pdfjsViewer.EventBus();
        const linkService = new pdfjsViewer.PDFLinkService({ eventBus });
        const findController = new pdfjsViewer.PDFFindController({
          eventBus,
          linkService,
        });
        const pdfViewer = new pdfjsViewer.PDFViewer({
          annotationMode: pdfjsLib.AnnotationMode.ENABLE_FORMS,
          container,
          enablePermissions: true,
          eventBus,
          findController,
          linkService,
          removePageBorders: false,
          textLayerMode: 1,
          viewer,
        });

        linkService.setViewer(pdfViewer);

        eventBus.on("pagechanging", (event: { pageNumber: number }) => {
          setCurrentPage(event.pageNumber);
          setPageInput(String(event.pageNumber));
        });

        eventBus.on(
          "scalechanging",
          (event: { presetValue?: string; scale: number }) => {
            setZoomLabel(formatScaleLabel(event.scale));
            setZoomSelectValue(event.presetValue ?? "custom");
          },
        );

        eventBus.on("pagesloaded", (event: { pagesCount: number }) => {
          setPageCount(event.pagesCount);
        });

        eventBus.on("pagesinit", () => {
          pdfViewer.currentScaleValue = "page-fit";
          setZoomSelectValue("page-fit");
          setIsLoading(false);
        });

        eventBus.on(
          "updatefindcontrolstate",
          (event: { previous: boolean; rawQuery: string | null; state: number }) => {
            if (!event.rawQuery) {
              setFindMessage(null);
              return;
            }

            setFindMessage(getFindMessage(event.state, event.previous));
          },
        );

        eventBus.on(
          "updatefindmatchescount",
          (event: { matchesCount: { current: number; total: number } }) => {
            const { current, total } = event.matchesCount;

            if (!total) {
              setFindSummary(null);
              return;
            }

            setFindSummary(`${current || 1} of ${total} matches`);
          },
        );

        const loadingTask = pdfjsLib.getDocument({
          disableAutoFetch: false,
          disableRange: true,
          enableXfa: false,
          url: documentUrl,
          withCredentials: true,
        });
        const pdfDocument = await loadingTask.promise;

        if (isDisposed) {
          await loadingTask.destroy?.();
          await pdfDocument.destroy?.();
          return;
        }

        setPageCount(pdfDocument.numPages);
        findController.setDocument(pdfDocument);
        linkService.setDocument(pdfDocument);
        pdfViewer.setDocument(pdfDocument);

        runtime = {
          eventBus,
          loadingTask,
          pdfDocument,
          pdfViewer,
        };
        runtimeRef.current = runtime;
      } catch (error) {
        if (!isDisposed) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to open this PDF in the Pilot360 LMS reader.",
          );
          setIsLoading(false);
        }
      }
    }

    void initializeViewer();

    return () => {
      isDisposed = true;
      runtimeRef.current = null;
      viewerRef.current?.replaceChildren();
      void runtime?.loadingTask?.destroy?.();
      void runtime?.pdfDocument?.destroy?.();
    };
  }, [documentUrl]);

  useEffect(() => {
    const pdfViewer = runtimeRef.current?.pdfViewer;

    if (!pdfViewer) {
      return;
    }

    if (!["auto", "page-fit", "page-width"].includes(zoomSelectValue)) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      pdfViewer.currentScaleValue = zoomSelectValue;
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [isSidebarOpen, zoomSelectValue]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    const query = deferredFindQuery.trim();

    if (!runtime || !pageCount) {
      return;
    }

    if (!query) {
      runtime.eventBus.dispatch("findbarclose", {
        source: runtime.pdfViewer,
      });
      setFindMessage(null);
      setFindSummary(null);
      return;
    }

    runtime.eventBus.dispatch("find", {
      caseSensitive: false,
      entireWord: false,
      findPrevious: false,
      highlightAll: true,
      matchDiacritics: false,
      phraseSearch: true,
      query,
      source: runtime.pdfViewer,
    });
  }, [deferredFindQuery, pageCount]);

  function goToPage(nextPage: number) {
    const runtime = runtimeRef.current;

    if (!runtime || nextPage < 1 || nextPage > pageCount) {
      return;
    }

    runtime.pdfViewer.currentPageNumber = nextPage;
  }

  function submitPageNumber() {
    const nextPage = Number.parseInt(pageInput, 10);

    if (!Number.isFinite(nextPage)) {
      setPageInput(String(currentPage));
      return;
    }

    goToPage(nextPage);
  }

  function changeZoom(nextValue: string) {
    const runtime = runtimeRef.current;

    if (!runtime || nextValue === "custom") {
      return;
    }

    runtime.pdfViewer.currentScaleValue = nextValue;
    setZoomSelectValue(nextValue);
  }

  function stepFind(findPrevious: boolean) {
    const runtime = runtimeRef.current;
    const query = findQuery.trim();

    if (!runtime || !query) {
      return;
    }

    runtime.eventBus.dispatch("find", {
      caseSensitive: false,
      entireWord: false,
      findPrevious,
      highlightAll: true,
      matchDiacritics: false,
      phraseSearch: true,
      query,
      source: runtime.pdfViewer,
      type: "again",
    });
  }

  return (
    <main aria-label={`${displayName} reader`} className="h-screen">
      <div className="h-full">
        <Card className="nalanda-pdf-shell flex h-full flex-col overflow-hidden rounded-none border-0 p-0">
          <div className="border-b border-border bg-background/95 px-3 py-3 backdrop-blur-sm sm:px-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                aria-label={isSidebarOpen ? "Hide page list" : "Show page list"}
                onClick={() => {
                  setIsSidebarOpen((currentValue) => !currentValue);
                }}
                size="icon-sm"
                title={isSidebarOpen ? "Hide page list" : "Show page list"}
                type="button"
                variant={isSidebarOpen ? "secondary" : "outline"}
              >
                {isSidebarOpen ? (
                  <IconLayoutSidebarLeftCollapse className="size-4" />
                ) : (
                  <IconLayoutSidebarLeftExpand className="size-4" />
                )}
              </Button>

              <Button
                aria-label="Previous page"
                disabled={!runtimeRef.current || currentPage <= 1}
                onClick={() => {
                  runtimeRef.current?.pdfViewer.previousPage();
                }}
                size="icon-sm"
                title="Previous page"
                type="button"
                variant="outline"
              >
                <IconChevronLeft className="size-4" />
              </Button>

              <div className="flex items-center gap-2 rounded-xs border border-border bg-input/60 px-2 py-1">
                <Input
                  className="h-7 w-16 border-0 bg-transparent px-2 py-1 text-center focus-visible:ring-0"
                  inputMode="numeric"
                  max={pageCount || undefined}
                  min={1}
                  onBlur={submitPageNumber}
                  onChange={(event) => setPageInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      submitPageNumber();
                    }
                  }}
                  type="number"
                  value={pageInput}
                />
                <span className="text-sm text-muted-foreground">/ {pageCount || "--"}</span>
              </div>

              <Button
                aria-label="Next page"
                disabled={!runtimeRef.current || currentPage >= pageCount}
                onClick={() => {
                  runtimeRef.current?.pdfViewer.nextPage();
                }}
                size="icon-sm"
                title="Next page"
                type="button"
                variant="outline"
              >
                <IconChevronRight className="size-4" />
              </Button>

              <Button
                aria-label={isSearchOpen ? "Hide search" : "Show search"}
                onClick={() => {
                  setIsSearchOpen((currentValue) => {
                    if (currentValue) {
                      setFindQuery("");
                    }

                    return !currentValue;
                  });
                }}
                size="icon-sm"
                title={isSearchOpen ? "Hide search" : "Show search"}
                type="button"
                variant={isSearchOpen ? "secondary" : "outline"}
              >
                <IconSearch className="size-4" />
              </Button>

              <div className="ml-auto flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{zoomLabel}</span>

                <Button
                  aria-label="Zoom out"
                  disabled={!runtimeRef.current}
                  onClick={() => {
                    runtimeRef.current?.pdfViewer.decreaseScale();
                  }}
                  size="icon-sm"
                  title="Zoom out"
                  type="button"
                  variant="outline"
                >
                  <IconZoomOut className="size-4" />
                </Button>

                <Select
                  modal={false}
                  onValueChange={(value) => {
                    if (typeof value === "string") {
                      changeZoom(value);
                    }
                  }}
                  value={zoomSelectValue}
                >
                  <SelectTrigger className="min-w-44">
                    <SelectValue>
                      {(value) =>
                        getZoomOptionLabel(
                          typeof value === "string" ? value : zoomSelectValue,
                          zoomLabel,
                        )
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent align="end">
                    {zoomSelectValue === "custom" ? (
                      <SelectItem disabled value="custom">
                        {zoomLabel}
                      </SelectItem>
                    ) : null}
                    {zoomOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  aria-label="Zoom in"
                  disabled={!runtimeRef.current}
                  onClick={() => {
                    runtimeRef.current?.pdfViewer.increaseScale();
                  }}
                  size="icon-sm"
                  title="Zoom in"
                  type="button"
                  variant="outline"
                >
                  <IconZoomIn className="size-4" />
                </Button>

                <Link
                  aria-label="Back to dashboard"
                  className={cn(buttonVariants({ size: "icon-sm", variant: "outline" }))}
                  title="Back to dashboard"
                  to="/dashboard"
                >
                  <IconArrowLeft className="size-4" />
                </Link>

                <Link
                  aria-label="Reload reader"
                  className={cn(buttonVariants({ size: "icon-sm", variant: "ghost" }))}
                  search={{ itemId, name }}
                  title="Reload reader"
                  to="/reader"
                >
                  <IconReload className="size-4" />
                </Link>
              </div>
            </div>

            {isSearchOpen ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Input
                  className="h-9 min-w-[16rem] flex-1 px-3 py-2"
                  onChange={(event) => setFindQuery(event.target.value)}
                  placeholder="Find in document..."
                  type="search"
                  value={findQuery}
                />
                <Button
                  aria-label="Previous search match"
                  disabled={!findQuery.trim()}
                  onClick={() => {
                    stepFind(true);
                  }}
                  size="icon-sm"
                  title="Previous search match"
                  type="button"
                  variant="outline"
                >
                  <IconChevronLeft className="size-4" />
                </Button>
                <Button
                  aria-label="Next search match"
                  disabled={!findQuery.trim()}
                  onClick={() => {
                    stepFind(false);
                  }}
                  size="icon-sm"
                  title="Next search match"
                  type="button"
                  variant="outline"
                >
                  <IconChevronRight className="size-4" />
                </Button>

                {findSummary ? <Badge>{findSummary}</Badge> : null}
                {findMessage ? (
                  <Badge variant={findMessage === "Phrase not found." ? "destructive" : "outline"}>
                    {findMessage}
                  </Badge>
                ) : null}
              </div>
            ) : null}
          </div>

          {errorMessage ? (
            <div className="border-b border-border px-4 py-3 sm:px-6">
              <Alert variant="destructive">
                <AlertTitle>Viewer failed to load</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            </div>
          ) : null}

          {isLoading ? (
            <div className="border-b border-border px-4 py-3 sm:px-6">
              <Alert>
                <AlertTitle>Loading PDF viewer</AlertTitle>
                <AlertDescription>
                  Pilot360 LMS is streaming the PDF through the app server and initializing the viewer.
                </AlertDescription>
              </Alert>
            </div>
          ) : null}

          <div
            className={cn(
              "grid min-h-0 flex-1",
              isSidebarOpen
                ? "lg:grid-cols-[15rem_minmax(0,1fr)]"
                : "lg:grid-cols-[minmax(0,1fr)]",
            )}
          >
            {isSidebarOpen ? (
              <aside className="min-h-0 overflow-hidden border-b border-r border-border bg-muted/45 lg:border-b-0">
                <div className="flex h-full min-h-0 flex-col">
                  <div className="border-b border-border px-4 py-3">
                    <p className="font-mono text-[0.68rem] uppercase tracking-[0.32em] text-primary">
                      Pages
                    </p>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                    <div className="space-y-2">
                      {Array.from({ length: pageCount }, (_, index) => {
                        const pageNumber = index + 1;
                        const isActive = pageNumber === currentPage;

                        return (
                          <Button
                            className="h-auto w-full justify-start px-3 py-3 text-left"
                            key={pageNumber}
                            onClick={() => {
                              goToPage(pageNumber);
                            }}
                            size="sm"
                            type="button"
                            variant={isActive ? "secondary" : "ghost"}
                          >
                            <span className="flex flex-col items-start gap-1">
                              <span className="font-medium">Page {pageNumber}</span>
                              <span className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-muted-foreground">
                                {isActive ? "Current" : "Navigate"}
                              </span>
                            </span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </aside>
            ) : null}

            <div className="min-h-0 bg-[#dbe6f7]">
              <div className="relative h-full min-h-0">
                <div className="viewerContainer absolute inset-0 overflow-auto" ref={containerRef}>
                  <div className="pdfViewer" ref={viewerRef} />
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
