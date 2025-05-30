#!/usr/bin/env node

// package.json
var version = "1.1.7";

// src/index.js
import { program as program2 } from "commander";
import fs6 from "node:fs";
import path7 from "node:path";

// src/ansiUtils.js
var ansiColors = [
  "black",
  "red",
  "green",
  "yellow",
  "blue",
  "magenta",
  "cyan",
  "white"
];
function startColor(colorName, background = false) {
  let idx = ansiColors.indexOf(colorName);
  if (idx !== -1) {
    return ansi(idx + (background ? 40 : 30));
  }
  idx = ansiColors.indexOf(colorName.replace("Bright", ""));
  if (idx !== -1) {
    return ansi(idx + (background ? 100 : 90));
  }
  return ansi(background ? 100 : 90);
}
function stopColor(background = false) {
  return ansi(background ? 49 : 39);
}
function ansi(code) {
  return "\x1B[" + code + "m";
}
function echo(...variableArguments) {
  console.log.call(null, variableArguments.join(""));
}

// src/utils.js
import fs from "node:fs";
import path2 from "node:path";

// src/variables.js
import { program } from "commander";
import os from "node:os";
import path from "node:path";
var curDir = process.cwd();
var tmpDir = os.tmpdir();
var patchDir = path.join(curDir, "patches");
program.name("custompatch").usage("[options] [packageName ...]").version(version).description(
  'Tool for patching buggy NPM packages instead of forking them.\nWhen invoked without arguments - apply all patches from the "patches" folder.\nIf one or more package names are specified - create a patch for the given NPM package (already patched by you in your "node_modules" folder) and save it inside "patches" folder.'
).option(
  "-a, --all",
  'Include "package.json" files in the patch, by default these are ignored'
).option(
  "-r, --reverse",
  "Reverse the patch(es) instead of applying them"
).option(
  "-p, --patch",
  "Apply the patch(es) to the specified package(s) instead of all patches"
);
program.parse();
var programOptions = program.opts();

// src/utils.js
function removeBuildMetadataFromVersion(version2) {
  const plusPos = version2.indexOf("+");
  if (plusPos === -1) {
    return version2;
  }
  return version2.substring(0, plusPos);
}
function getScopelessName(name) {
  if (name[0] !== "@") {
    return name;
  }
  return name.split("/")[1];
}
function hasPatches() {
  if (!fs.existsSync(patchDir)) {
    echo(
      startColor("yellowBright"),
      "WARNING: ",
      stopColor(),
      "Missing ",
      startColor("whiteBright"),
      "patches",
      stopColor(),
      " folder - nothing to do"
    );
    process.exit(2);
  }
  return true;
}
function getConfig(pkgName) {
  const folder = path2.join(curDir, "node_modules", pkgName);
  const cfgName = path2.join(folder, "package.json");
  if (!fs.existsSync(folder)) {
    echo(
      startColor("redBright"),
      "ERROR: ",
      stopColor(),
      'Missing folder "',
      startColor("whiteBright"),
      "./node_modules/",
      stopColor(),
      startColor("greenBright"),
      pkgName,
      stopColor(),
      '"'
    );
    return false;
  }
  try {
    fs.accessSync(cfgName, fs.constants.R_OK);
  } catch (e) {
    echo(
      startColor("redBright"),
      "ERROR: ",
      stopColor(),
      "Can not read ",
      startColor("whiteBright"),
      '"package.json"',
      stopColor(),
      " for ",
      startColor("greenBright"),
      pkgName,
      stopColor()
    );
    return false;
  }
  const pkgConfig = fs.readFileSync(cfgName, "utf8");
  let cfg = {};
  try {
    cfg = JSON.parse(pkgConfig);
  } catch (e) {
    echo(
      startColor("redBright"),
      "ERROR: ",
      stopColor(),
      "Could not parse ",
      startColor("whiteBright"),
      '"package.json"',
      stopColor(),
      " - ",
      startColor("redBright"),
      e.message,
      stopColor()
    );
    return false;
  }
  return cfg;
}
function isVersionSuitable(patchSemVer, packageSemVer) {
  const oldVer = patchSemVer.split(".");
  const newVer = packageSemVer.split(".");
  if (+oldVer[0] < +newVer[0]) return true;
  if (+oldVer[0] > +newVer[0]) return false;
  if (+oldVer[1] < +newVer[1]) return true;
  if (+oldVer[1] > +newVer[1]) return false;
  return +oldVer[2] <= +newVer[2];
}

// src/fileUtils.js
import fs2 from "node:fs";
import path3 from "node:path";
function pathNormalize(pathName) {
  return path3.normalize(
    path3.sep === "/" ? pathName.replace(/\\/g, "/") : pathName.replace(/\//g, "\\\\")
  );
}
function ensureDirectoryExists(dirPath) {
  if (!fs2.existsSync(dirPath)) {
    fs2.mkdirSync(dirPath, { recursive: true });
  }
}
function readFileContent(filePath) {
  try {
    return fs2.readFileSync(filePath, "utf8");
  } catch (err) {
    let errorMessage;
    if (err instanceof Error) {
      errorMessage = err.message;
    } else {
      errorMessage = String(err);
    }
    echo(
      startColor("redBright"),
      "ERROR: ",
      stopColor(),
      `Failed to read file ${filePath} - ${errorMessage}`
    );
    return "";
  }
}
function makePatchName(pkgName, version2) {
  return pkgName.replace(/[\\\/]/g, "+") + "#" + version2 + ".patch";
}
function parsePatchName(filename) {
  const pkg = filename.replace(".patch", "").split("#");
  return {
    pkgName: pkg[0].replace(/\+/g, path3.sep),
    version: pkg[1]
  };
}

// src/patchApplying.js
import fs3 from "node:fs";
import path4 from "node:path";
import { applyPatch, parsePatch, reversePatch } from "diff";
function readPatch(pkgName, version2, patchCounter, reversing) {
  const packageName = pkgName.replace(/\+/g, path4.sep);
  const cfg = getConfig(packageName);
  if (cfg) {
    echo(
      "\n ",
      patchCounter,
      ") ",
      reversing ? "Reversing" : "Applying",
      " patch for ",
      startColor("magentaBright"),
      pkgName,
      stopColor(),
      " ",
      startColor("greenBright"),
      version2,
      stopColor(),
      " onto ",
      startColor("whiteBright"),
      cfg.version,
      stopColor()
    );
    if (!isVersionSuitable(version2, cfg.version)) {
      echo(
        startColor("yellowBright"),
        "WARNING: ",
        stopColor(),
        "The patch is for v",
        startColor("greenBright"),
        version2,
        stopColor(),
        " but you have installed ",
        startColor("redBright"),
        cfg.version,
        stopColor()
      );
    } else {
      if (version2 !== cfg.version) {
        echo(
          startColor("yellowBright"),
          "WARNING: ",
          stopColor(),
          "The patch for ",
          startColor("greenBright"),
          version2,
          stopColor(),
          " may not ",
          reversing ? "reverse" : "apply",
          " cleanly to the installed ",
          startColor("redBright"),
          cfg.version,
          stopColor()
        );
      }
      const patchFile = makePatchName(pkgName, version2);
      const patch = fs3.readFileSync(path4.join(patchDir, patchFile), "utf8");
      const chunks = parsePatch(patch);
      chunks.forEach((chunk, subIndex) => {
        const filePath = chunk.newFileName ?? chunk.oldFileName;
        if (!filePath) {
          echo(
            startColor("redBright"),
            "ERROR: ",
            stopColor(),
            "A chunk has no file names for package ",
            startColor("greenBright"),
            pkgName,
            stopColor()
          );
          chunk.success = false;
        } else {
          const normalizedPath = pathNormalize(filePath);
          const fileName = path4.join(curDir, "node_modules", normalizedPath);
          const fileContent = readFileContent(fileName);
          if (reversing) {
            echo(
              "\n(",
              patchCounter,
              ".",
              1 + subIndex,
              ") ",
              "Reversing chunk ",
              startColor("greenBright"),
              filePath,
              stopColor()
            );
            const reversedPatchText = reversePatch(chunk);
            const reversePatchedContent = applyPatch(fileContent, reversedPatchText);
            if (reversePatchedContent === false) {
              const patchedContent = applyPatch(fileContent, chunk);
              if (patchedContent !== false) {
                echo(
                  startColor("yellowBright"),
                  "WARNING: ",
                  stopColor(),
                  "Patch already reversed"
                );
                chunk.success = true;
              } else {
                echo(
                  startColor("yellowBright"),
                  "WARNING: ",
                  stopColor(),
                  "Failed to reverse patch for ",
                  startColor("redBright"),
                  filePath,
                  stopColor()
                );
                chunk.success = false;
              }
            } else {
              try {
                fs3.writeFileSync(fileName, reversePatchedContent, "utf8");
                chunk.success = true;
              } catch (err) {
                echo(
                  startColor("redBright"),
                  "ERROR: ",
                  stopColor(),
                  "Could not write the new content for chunk ",
                  startColor("greenBright"),
                  fileName,
                  stopColor(),
                  " = ",
                  startColor("redBright"),
                  err.message || err
                );
                chunk.success = false;
              }
            }
          } else {
            echo(
              "\n(",
              patchCounter,
              ".",
              1 + subIndex,
              ") ",
              "Applying chunk ",
              startColor("greenBright"),
              filePath,
              stopColor()
            );
            const patchedContent = applyPatch(fileContent, chunk);
            if (patchedContent === false) {
              const reversedPatchText = reversePatch(chunk);
              const reversePatchedContent = applyPatch(fileContent, reversedPatchText);
              if (reversePatchedContent !== false) {
                echo(
                  startColor("yellowBright"),
                  "WARNING: ",
                  stopColor(),
                  "Patch already applied"
                );
                chunk.success = true;
              } else {
                if (!fs3.existsSync(fileName)) {
                  chunk.success = false;
                  const folder = path4.dirname(fileName);
                  if (!fs3.existsSync(folder)) {
                    echo(
                      startColor("yellowBright"),
                      "WARNING: Folder ",
                      stopColor(),
                      startColor("redBright"),
                      path4.dirname(fileName),
                      stopColor(),
                      startColor("yellowBright"),
                      " does not exist - the patch is probably for older version",
                      stopColor()
                    );
                  }
                } else {
                  echo(
                    startColor("yellowBright"),
                    "WARNING: ",
                    stopColor(),
                    "Chunk failed - ",
                    startColor("redBright"),
                    cfg.version !== version2 ? " either already applied or for different version" : "probably already applied",
                    stopColor()
                  );
                  chunk.success = false;
                }
              }
            } else {
              try {
                fs3.writeFileSync(fileName, patchedContent, "utf8");
                chunk.success = true;
              } catch (err) {
                echo(
                  "Could not write the new content for chunk ",
                  startColor("greenBright"),
                  fileName,
                  stopColor(),
                  " = ",
                  startColor("redBright"),
                  err.message || err,
                  stopColor()
                );
                chunk.success = false;
              }
            }
          }
        }
      });
      const allChunks = chunks.every((chunk) => chunk.success);
      const noneChunks = chunks.every((chunk) => !chunk.success);
      echo(
        "\nPatch for ",
        startColor("magentaBright"),
        pkgName,
        stopColor(),
        " was ",
        startColor(allChunks ? "cyanBright" : noneChunks ? "redBright" : "yellow"),
        allChunks ? "successfully" : noneChunks ? "not" : "partially",
        stopColor(),
        reversing ? " reversed" : " applied"
      );
    }
  }
}
function applyPatches(packageNames = [], reversing = false) {
  if (hasPatches()) {
    const patchFiles = [];
    fs3.readdirSync(patchDir).map((item) => {
      if (!item.endsWith(".patch")) return;
      const pkg = parsePatchName(item);
      if (packageNames.length > 0 ? packageNames.includes(pkg.pkgName) : true) {
        const dest = path4.join(curDir, "node_modules", pkg.pkgName);
        if (!fs3.existsSync(dest)) {
          echo(
            startColor("yellowBright"),
            "WARNING: ",
            stopColor(),
            "Package ",
            startColor("whiteBright"),
            pkg.pkgName,
            stopColor(),
            " is not installed - skipping this patch"
          );
          return;
        }
        patchFiles.push(pkg);
      }
    });
    echo(
      "Found ",
      startColor("cyanBright"),
      patchFiles.length,
      stopColor(),
      " patches"
    );
    if (packageNames.length > 0 && patchFiles.length !== packageNames.length) {
      packageNames.filter((name) => !patchFiles.find((file) => file.pkgName !== name)).forEach((name) => {
        echo(
          "No patch was found for ",
          startColor("cyanBright"),
          name,
          stopColor()
        );
      });
    }
    patchFiles.forEach((item, index) => {
      readPatch(item.pkgName, item.version, index + 1, reversing);
    });
  }
}

// src/npmUtils.js
import pacote from "pacote";
import fs4 from "node:fs";
import path5 from "node:path";
function npmTarballURL(pkgName, pkgVersion) {
  const scopelessName = getScopelessName(pkgName);
  return `https://registry.npmjs.org/${pkgName}/-/${scopelessName}-${removeBuildMetadataFromVersion(pkgVersion)}.tgz`;
}
function fetchPackage(pkgName, pkgVersion, callback) {
  const url = npmTarballURL(pkgName, pkgVersion);
  const dest = path5.join(tmpDir, pkgName);
  echo(
    "Fetching tarball of ",
    startColor("whiteBright"),
    pkgName,
    stopColor(),
    " from ",
    startColor("green"),
    url,
    stopColor()
  );
  pacote.extract(url, dest).then(() => {
    callback(pkgName, pkgVersion);
    fs4.rm(dest, { recursive: true, force: true }, (err) => {
      if (err) {
        echo(
          startColor("redBright"),
          "ERROR: ",
          stopColor(),
          "Could not clean up the TEMP folder"
        );
      }
    });
  }).catch((err) => {
    echo(
      startColor("redBright"),
      err.message,
      stopColor()
    );
  });
}

// src/patchCreation.js
import fs5 from "node:fs";
import path6 from "node:path";
import { createTwoFilesPatch } from "diff";
function createPatches(packageNames) {
  packageNames.forEach(makePatch);
}
function goodFileName(fn) {
  const pattern = new RegExp("/", "g");
  return fn.replace(pattern, "+");
}
function makePatchName2(pkgName, version2) {
  return goodFileName(pkgName) + "#" + version2 + ".patch";
}
function createPatch(pkgName, pathname, patch) {
  if (pathname === "package.json" && !programOptions.all) return;
  const newFile = path6.join(curDir, "node_modules", pkgName, pathname);
  const oldFile = path6.join(tmpDir, pkgName, pathname);
  const oldStr = fs5.existsSync(oldFile) ? fs5.readFileSync(oldFile, "utf8") : "";
  const newStr = fs5.readFileSync(newFile, "utf8");
  if (oldStr !== newStr) patch.write(createTwoFilesPatch(oldFile.replace(tmpDir, ""), newFile.replace(path6.join(curDir, "node_modules"), ""), oldStr, newStr));
}
function scanFiles(pkgName, src, patch) {
  const files = fs5.readdirSync(path6.join(curDir, "node_modules", pkgName, src));
  files.forEach((item) => {
    if (item === "node_modules") return;
    const pathname = path6.join(src, item);
    const stat = fs5.lstatSync(path6.join(curDir, "node_modules", pkgName, pathname));
    if (stat.isDirectory()) scanFiles(pkgName, pathname, patch);
    else createPatch(pkgName, pathname, patch);
  });
}
function comparePackages(pkgName, version2) {
  const patchFile = makePatchName2(pkgName, version2);
  ensureDirectoryExists(patchDir);
  const stream = fs5.createWriteStream(path6.join(patchDir, patchFile));
  stream.on("error", (err) => {
    echo(
      startColor("redBright"),
      "ERROR: ",
      stopColor(),
      "Could not write patch file ",
      startColor("cyanBright"),
      patchFile,
      stopColor(),
      " = ",
      startColor("redBright"),
      err.message || err,
      stopColor()
    );
  });
  stream.cork();
  scanFiles(pkgName, "", stream);
  stream.uncork();
  if (!stream.write("")) {
    stream.once("drain", () => stream.end());
  } else {
    stream.end();
  }
  echo(
    "Successfully created ",
    startColor("greenBright"),
    patchFile,
    stopColor()
  );
}
function makePatch(pkgName) {
  echo(
    "Creating patch for: ",
    startColor("magentaBright"),
    pkgName,
    stopColor()
  );
  const cfg = getConfig(pkgName);
  if (cfg) {
    fetchPackage(pkgName, cfg.version, comparePackages);
  } else {
    echo(
      startColor("redBright"),
      "ERROR: ",
      stopColor(),
      "Could not find the ",
      startColor("whiteBright"),
      "URL",
      stopColor(),
      " for ",
      startColor("greenBright"),
      "tarball",
      stopColor()
    );
  }
}

// src/index.js
if (!programOptions.version) {
  echo(
    startColor("whiteBright"),
    "CustomPatch",
    stopColor(),
    " version ",
    startColor("greenBright"),
    version,
    stopColor(),
    "\n"
  );
}
if (!fs6.existsSync(path7.join(curDir, "node_modules"))) {
  echo(
    startColor("redBright"),
    "ERROR: ",
    stopColor(),
    "Missing ",
    startColor("whiteBright"),
    '"node_modules"',
    stopColor(),
    " folder"
  );
  process.exit(1);
}
if (programOptions.patch && programOptions.reverse) {
  echo(
    startColor("redBright"),
    "ERROR: ",
    stopColor(),
    "Cannot use -p/--patch and -r/--reverse together."
  );
  process.exit(1);
}
if (programOptions.patch) {
  applyPatches(program2.args);
} else if (programOptions.reverse) {
  applyPatches(program2.args, true);
} else if (program2.args.length > 0) {
  createPatches(program2.args);
} else {
  applyPatches();
}
