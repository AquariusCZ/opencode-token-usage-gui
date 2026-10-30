import { readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { build } from "esbuild"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"))

await build({
  absWorkingDir: root,
  entryPoints: ["src/gui.cjs"],
  outfile: "dist/gui-experimental.cjs",
  bundle: true,
  format: "cjs",
  platform: "neutral",
  target: "es2022",
  external: ["@opencode/plugin/gui"],
  legalComments: "none",
  banner: {
    js: `/*! ${pkg.name} v${pkg.version} | MIT | https://github.com/AquariusCZ/${pkg.name} */`,
  },
})

console.log(`built dist/gui-experimental.cjs (v${pkg.version})`)
