const fs = require("fs");
const path = require("path");

let version = process.argv[2];
if (!version) {
  console.error("Missing version.");
  process.exit(1);
}

version = version.replace(/^v/i, "");
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error("Version must be a semver string without v prefix, for example 1.4.8.");
  process.exit(1);
}

const root = path.resolve(__dirname, "..");

function readJson(file) {
  const text = fs.readFileSync(path.join(root, file), "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(text);
}

function writeJson(file, value) {
  fs.writeFileSync(path.join(root, file), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const pkg = readJson("package.json");
pkg.version = version;
writeJson("package.json", pkg);

const lock = readJson("package-lock.json");
lock.version = version;
if (lock.packages && lock.packages[""]) {
  lock.packages[""].version = version;
}
writeJson("package-lock.json", lock);

const tauri = readJson(path.join("src-tauri", "tauri.conf.json"));
tauri.version = version;
writeJson(path.join("src-tauri", "tauri.conf.json"), tauri);

const cargoPath = path.join(root, "src-tauri", "Cargo.toml");
const cargo = fs
  .readFileSync(cargoPath, "utf8")
  .replace(/^version = "[^"]+"/m, `version = "${version}"`);
fs.writeFileSync(cargoPath, cargo, "utf8");

console.log(`Version updated to ${version}.`);
