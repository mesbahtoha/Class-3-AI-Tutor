declare module "swagger-ui-express" {
  import type { RequestHandler } from "express";
  const serve: RequestHandler[];
  function setup(doc: object, opts?: object): RequestHandler;
  export { serve, setup };
  const def: { serve: RequestHandler[]; setup: typeof setup };
  export default def;
}

declare module "pdf-parse" {
  function pdfParse(data: Buffer): Promise<{ text: string; numpages: number; info?: unknown }>;
  export default pdfParse;
}
