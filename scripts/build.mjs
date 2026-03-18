import fs from "node:fs";
import path from "node:path";

const distDir = path.resolve("dist");
const srcDir = path.resolve("src");
const assetsDir = path.resolve("assets");

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(path.join(distDir, "src"), { recursive: true });
fs.mkdirSync(path.join(distDir, "assets"), { recursive: true });

for (const file of ["index.html"]) {
  fs.copyFileSync(path.resolve(file), path.join(distDir, file));
}
for (const file of fs.readdirSync(srcDir)) {
  fs.copyFileSync(path.join(srcDir, file), path.join(distDir, "src", file));
}
for (const file of fs.readdirSync(assetsDir)) {
  fs.copyFileSync(path.join(assetsDir, file), path.join(distDir, "assets", file));
}
