import { readFileSync, writeFileSync } from "node:fs";
writeFileSync(
  "public/third-party.txt",
  "Fresta — third-party notices\n\nHyperapp 2.0.22\n" +
    readFileSync("node_modules/hyperapp/LICENSE.md", "utf8"),
);
