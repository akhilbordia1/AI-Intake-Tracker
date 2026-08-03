// Export every icon the app imports as a standalone SVG, for handing to
// development. Reads the icon geometry straight out of the installed
// lucide-react package (each icon module exports its `__iconNode`), so the files
// match what the UI renders — no redrawing, no guessing.
//
//   node scripts/export-icons.mjs        → writes icons/*.svg + icons/README.md
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "src");
const outDir = join(root, "icons");
const iconModules = join(root, "node_modules/lucide-react/dist/esm/icons");

// Lucide's own defaults — the attributes createLucideIcon puts on every <svg>.
const SVG_ATTRS = [
  ['xmlns', "http://www.w3.org/2000/svg"],
  ["width", "24"],
  ["height", "24"],
  ["viewBox", "0 0 24 24"],
  ["fill", "none"],
  ["stroke", "currentColor"],
  ["stroke-width", "2"],
  ["stroke-linecap", "round"],
  ["stroke-linejoin", "round"],
];

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry) ? [path] : [];
  });
}

// Which icons are used, and where — the "where" goes in the README so a
// developer can see the icon in context.
function collectUsage() {
  const usage = new Map();
  for (const file of sourceFiles(srcDir)) {
    const code = readFileSync(file, "utf8");
    for (const [, block] of code.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']lucide-react["']/g)) {
      for (const entry of block.split(",")) {
        const name = entry.trim().split(/\s+as\s+/)[0].trim();
        if (!/^[A-Z]/.test(name)) continue;
        const where = usage.get(name) ?? new Set();
        where.add(relative(root, file));
        usage.set(name, where);
      }
    }
  }
  return usage;
}

// Button → button, ArrowUpToLine → arrow-up-to-line, Columns3 → columns-3.
const kebab = (name) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([a-zA-Z])([0-9])/g, "$1-$2")
    .toLowerCase();

const attrName = (key) => key.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

function toSvg(slug, nodes) {
  const children = nodes.map(([tag, attrs]) => {
    const pairs = Object.entries(attrs)
      .filter(([key]) => key !== "key")
      .map(([key, value]) => `${attrName(key)}="${value}"`)
      .join(" ");
    return `  <${tag} ${pairs} />`;
  });
  const open = SVG_ATTRS.map(([key, value]) => `${key}="${value}"`).join(" ");
  return `<svg ${open} class="lucide lucide-${slug}">\n${children.join("\n")}\n</svg>\n`;
}

// Exported name → icon module. Deriving the filename from the name works for most
// icons but not for lucide's aliases (CheckCircle2 lives in circle-check-big.mjs),
// so read the mapping off the package barrel, which imports every icon by path.
function moduleMap() {
  const barrel = readFileSync(join(root, "node_modules/lucide-react/dist/esm/lucide-react.mjs"), "utf8");
  const map = new Map();
  // One statement per icon module, re-exporting its default under every name and
  // alias lucide gives it: `export { default as CircleCheck, default as CheckCircle2 } from './icons/circle-check-big.mjs'`.
  for (const [, block, slug] of barrel.matchAll(/(?:import|export)\s*\{([^}]*)\}\s*from\s*'\.\/icons\/([\w-]+)\.mjs'/g)) {
    for (const [, name] of block.matchAll(/default as (\w+)/g)) map.set(name, slug);
  }
  return map;
}

const usage = collectUsage();
const modules = moduleMap();
const names = [...usage.keys()].sort();

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const written = [];
const missing = [];
for (const name of names) {
  const slug = modules.get(name) ?? kebab(name);
  try {
    const { __iconNode } = await import(pathToFileURL(join(iconModules, `${slug}.mjs`)).href);
    writeFileSync(join(outDir, `${slug}.svg`), toSvg(slug, __iconNode));
    written.push({ name, slug, files: [...usage.get(name)].sort() });
  } catch {
    missing.push(name);
  }
}

const version = JSON.parse(readFileSync(join(root, "node_modules/lucide-react/package.json"), "utf8")).version;
writeFileSync(
  join(outDir, "README.md"),
  [
    "# Icons",
    "",
    `Every icon the app uses, exported as SVG from \`lucide-react@${version}\` (ISC licensed).`,
    "Regenerate with `node scripts/export-icons.mjs` — do not hand-edit these files.",
    "",
    "Each SVG is a 24×24 stroke icon with `stroke=\"currentColor\"` and `stroke-width=\"2\"`, so it",
    "takes the colour of its container. The app renders them at 11–18px; set `width`/`height`",
    "to the size you need rather than scaling with CSS transforms.",
    "",
    `${written.length} icons.`,
    "",
    "| Icon | File | Used in |",
    "| --- | --- | --- |",
    ...written.map(({ name, slug, files }) => `| ${name} | \`${slug}.svg\` | ${files.map((file) => `\`${file}\``).join(", ")} |`),
    "",
  ].join("\n"),
);

console.log(`Wrote ${written.length} icons to ${relative(root, outDir)}/`);
if (missing.length) console.log(`No icon module found for: ${missing.join(", ")}`);
