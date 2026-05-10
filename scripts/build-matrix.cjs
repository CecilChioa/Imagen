const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

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
const defaultTargets = process.platform === "win32" ? ["windows-x64"] : [];
const effectiveRequestedTargets = requestedTargets.length ? requestedTargets : defaultTargets;
const enabledTargets = configuredTargets.filter((target) => target.enabled !== false);
const targets = effectiveRequestedTargets.length
  ? enabledTargets.filter((target) => {
      const name = target.name || target.triple;
      return effectiveRequestedTargets.includes(name) || effectiveRequestedTargets.includes(target.triple);
    })
  : enabledTargets;

if (!configuredTargets.length) {
  console.error("No build targets configured.");
  process.exit(1);
}

if (!targets.length) {
  console.error(effectiveRequestedTargets.length ? `No matching enabled targets found: ${effectiveRequestedTargets.join(", ")}` : "No enabled build targets configured.");
  process.exit(1);
}

(async () => {
  const distRoot = path.join(root, "dist-release", version);
  fs.mkdirSync(distRoot, { recursive: true });
  fs.copyFileSync(targetsConfigPath, path.join(distRoot, "build-targets.json"));

  for (const target of targets) {
    const targetName = target.name || target.triple;
    const targetDir = path.join(distRoot, targetName);
    const logPath = path.join(targetDir, "tauri-build.log");
    fs.rmSync(targetDir, { recursive: true, force: true });
    fs.mkdirSync(targetDir, { recursive: true });

    console.log(`\n==> Building ${target.triple} -> ${targetName}`);
    const result = await runCommand(
      process.platform === "win32"
        ? "cmd.exe"
        : (process.platform === "win32" ? "cmd.exe" : "sh"),
      process.platform === "win32"
        ? ["/d", "/s", "/c", `npx tauri build --target ${target.triple}`]
        : ["-lc", `npx tauri build --target ${target.triple}`],
      {
        cwd: root,
        shell: false,
        env: { ...process.env, ...(target.env || {}) },
      },
      logPath,
    );

    if (result.exitCode !== 0) {
      console.error(`\nLog written to ${path.relative(root, logPath)}`);
      process.exit(result.exitCode);
    }

    const releaseDir = findReleaseDir(root, target.triple);
    if (!releaseDir) {
      console.error(`Unable to locate release output for ${target.triple}`);
      process.exit(1);
    }

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
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

function runCommand(command, args, options, logPath) {
  return new Promise((resolve) => {
    const logStream = fs.createWriteStream(logPath, { flags: "w", encoding: "utf8" });
    const child = spawn(command, args, options);
    let resolved = false;

    const finish = (result) => {
      if (resolved) {
        return;
      }
      resolved = true;
      logStream.end(() => resolve(result));
    };

    logStream.write(`command: ${command} ${args.join(" ")}\n`);
    logStream.write(`cwd: ${options.cwd}\n\n`);

    child.stdout.on("data", (chunk) => {
      process.stdout.write(chunk);
      logStream.write(chunk);
    });

    child.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
      logStream.write(chunk);
    });

    child.on("error", (error) => {
      logStream.write(`\n[error]\n${error.stack || error.message}\n`);
      finish({ exitCode: 1, signal: null, error });
    });

    child.on("close", (exitCode, signal) => {
      logStream.write(`\n[exit]\nexitCode: ${exitCode}\nsignal: ${signal || ""}\n`);
      finish({ exitCode: exitCode === null ? 1 : exitCode, signal, error: null });
    });
  });
}

function findReleaseDir(rootDir, targetTriple) {
  const candidates = [
    path.join(rootDir, "target", targetTriple, "release"),
    path.join(rootDir, "src-tauri", "target", targetTriple, "release"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
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
