// Keep the browser and its shared libraries inside this repository for isolated QA.
import { resolve } from "node:path";
import { brotliDecompressSync } from "node:zlib";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  chmodSync,
  existsSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
const target = ".cache/browser";
mkdirSync(target, { recursive: true });
mkdirSync(".cache/tmp", { recursive: true });
if (!existsSync(`${target}/chromium`)) {
  writeFileSync(
    `${target}/chromium`,
    brotliDecompressSync(
      readFileSync("node_modules/@sparticuz/chromium/bin/chromium.br"),
    ),
  );
  chmodSync(`${target}/chromium`, 0o755);
  for (const name of ["al2023", "fonts", "swiftshader"]) {
    const tar = `${target}/${name}.tar`;
    writeFileSync(
      tar,
      brotliDecompressSync(
        readFileSync(`node_modules/@sparticuz/chromium/bin/${name}.tar.br`),
      ),
    );
    execFileSync("tar", ["xf", tar, "-C", target]);
  }
}

writeFileSync(
  `${target}/fonts.conf`,
  `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>${resolve(target, "fonts")}</dir><cachedir>${resolve(target, "font-cache")}</cachedir><config></config></fontconfig>`,
);
