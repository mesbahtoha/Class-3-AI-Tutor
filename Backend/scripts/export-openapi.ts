import fs from "fs";
import { openapiDocument } from "../src/docs/openapi.js";

fs.writeFileSync("openapi.json", JSON.stringify(openapiDocument, null, 2));
console.log("openapi.json written");
