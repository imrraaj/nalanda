declare module "pdfjs-dist/build/pdf.mjs" {
  export * from "pdfjs-dist/types/src/pdf";
}

declare module "pdfjs-dist/web/pdf_viewer.mjs" {
  export * from "pdfjs-dist/types/web/pdf_viewer";
  export { EventBus } from "pdfjs-dist/types/web/event_utils";
  export { PDFFindController } from "pdfjs-dist/types/web/pdf_find_controller";
  export { PDFLinkService } from "pdfjs-dist/types/web/pdf_link_service";
}
