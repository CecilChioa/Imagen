const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const version = packageJson.version;
const targetsConfigPath = path.join(root, "scripts", "build-targets.json");
const targetsConfig = JSON.parse(fs.readFileSync(targetsConfigPath, "utf8"));
const cliArgs = process.argv.slice(2);
const configuredTargets = Array.isArray(targetsConfig.targets) ? targetsConfig.targets : [];
const requestedTargets = cliArgs.flatMap((arg) => {
  const value = arg.startsWith("--target=") ? arg.slice("--target=".length) : arg;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
});
const enabledTargets = configuredTargets.filter((target) => target.enabled !== false);
const targets = requestedTargets.length
  ? enabledTargets.filter((target) => {
      const name = target.name || target.triple;
      return requestedTargets.includes(name) || requestedTargets.includes(target.triple);
    })
  : enabledTargets;

if (!configuredTargets.length) {
  console.error("No build targets configured.");
  process.exit(1);
}

if (!targets.length) {
  console.error(requestedTargets.length ? `No matching enabled targets found: ${requestedTargets.join(", ")}` : "No enabled build targets configured.");
  process.exit(1);
}

const distRoot = path.join(root, "dist-release", version);
fs.mkdirSync(distRoot, { recursive: true });
fs.copyFileSync(targetsConfigPath, path.join(distRoot, "build-targets.json"));

for (const target of targets) {
  const targetName = target.name || target.triple;
  const targetDir = path.join(distRoot, targetName);
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });

  console.log(`\n==> Building ${target.triple} -> ${targetName}`);
  const result = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["tauri", "build", "--target", target.triple],
    {
      cwd: root,
      stdio: "inherit",
      shell: false,
      env: { ...process.env, ...(target.env || {}) },
    },
  );

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }

  const releaseDir = path.join(root, "src-tauri", "target", target.triple, "release");
  const bundlePath = path.join(releaseDir, "bundle");
  const executableName = target.executableName || (target.triple.includes("windows") ? "imagen.exe" : "imagen");
  const executablePath = path.join(releaseDir, executableName);

  if (fs.existsSync(executablePath)) {
    fs.copyFileSync(executablePath, path.join(targetDir, path.basename(executableName)));
  }

  if (fs.existsSync(bundlePath)) {
    copyDirectory(bundlePath, path.join(targetDir, "bundle"));
  }

  fs.writeFileSync(
    path.join(targetDir, "build-meta.json"),
    `${JSON.stringify(
      {
        version,
        target: target.triple,
        name: targetName,
        executable: fs.existsSync(executablePath) ? path.basename(executableName) : null,
        builtAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

function copyDirectory(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}
