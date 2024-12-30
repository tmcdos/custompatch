#!/usr/bin/env node
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// package.json
var package_default = {
  name: "custompatch",
  version: "1.0.28",
  description: "Tool for patching buggy NPM packages instead of forking them",
  author: "IVO GELOV",
  private: false,
  license: "BSD-3-Clause",
  repository: "github:tmcdos/custompatch",
  bin: "./dist/custompatch.js",
  scripts: {
    build: "esbuild ./src/index.js --bundle --platform=node --packages=external --target=es2020,node16 --outfile=dist/custompatch.js"
  },
  engines: {
    node: ">= 16.20.0",
    npm: ">= 9.6.7"
  },
  keywords: [
    "patching",
    "buggy",
    "packages"
  ],
  dependencies: {
    commander: "^12.1.0",
    diff: "^7.0.0",
    pacote: "^18.0.6"
  },
  devDependencies: {
    "@babel/eslint-parser": "^7.13.14",
    "@types/diff": "^5.2.2",
    "@types/node": "^22.5.5",
    "@types/pacote": "^11.1.8",
    esbuild: "0.24.2",
    eslint: "^8.49.0",
    "eslint-config-standard": "^17.0.0",
    "eslint-import-resolver-webpack": "^0.13.8",
    "eslint-plugin-import": "^2.25.3",
    "eslint-plugin-n": "^15.0.0",
    "eslint-plugin-perfectionist": "^3.4.0",
    "eslint-plugin-promise": "^6.0.0",
    "eslint-plugin-simple-import-sort": "^12.1.1"
  },
  overrides: {
    "eslint-plugin-sort-keys-vue-fix": {
      eslint: "^8.49.0"
    }
  }
};

// src/index.js
var import_commander2 = require("commander");
var import_node_fs6 = __toESM(require("node:fs"));
var import_node_path7 = __toESM(require("node:path"));

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
  console.log.apply(null, variableArguments.join(""));
}

// src/utils.js
var import_node_fs = __toESM(require("node:fs"));
var import_node_path2 = __toESM(require("node:path"));

// src/variables.js
var import_commander = require("commander");
var import_node_os = __toESM(require("node:os"));
var import_node_path = __toESM(require("node:path"));
var curDir = process.cwd();
var tmpDir = import_node_os.default.tmpdir();
var patchDir = import_node_path.default.join(curDir, "patches");
import_commander.program.name("custompatch").usage("[options] [packageName ...]").version(package_default.version).description(
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
import_commander.program.parse();
var programOptions = import_commander.program.opts();

// src/utils.js
function removeBuildMetadataFromVersion(version) {
  const plusPos = version.indexOf("+");
  if (plusPos === -1) {
    return version;
  }
  return version.substring(0, plusPos);
}
function getScopelessName(name) {
  if (name[0] !== "@") {
    return name;
  }
  return name.split("/")[1];
}
function hasPatches() {
  if (!import_node_fs.default.existsSync(patchDir)) {
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
  const folder = import_node_path2.default.join(curDir, "node_modules", pkgName);
  const cfgName = import_node_path2.default.join(folder, "package.json");
  if (!import_node_fs.default.existsSync(folder)) {
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
    import_node_fs.default.accessSync(cfgName, import_node_fs.default.constants.R_OK);
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
  const pkgConfig = import_node_fs.default.readFileSync(cfgName, "utf8");
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
var import_node_fs2 = __toESM(require("node:fs"));
var import_node_path3 = __toESM(require("node:path"));
function pathNormalize(pathName) {
  return import_node_path3.default.normalize(
    import_node_path3.default.sep === "/" ? pathName.replace(/\\/g, "/") : pathName.replace(/\//g, "\\\\")
  );
}
function ensureDirectoryExists(dirPath) {
  if (!import_node_fs2.default.existsSync(dirPath)) {
    import_node_fs2.default.mkdirSync(dirPath, { recursive: true });
  }
}
function readFileContent(filePath) {
  try {
    return import_node_fs2.default.readFileSync(filePath, "utf8");
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
function makePatchName(pkgName, version) {
  return pkgName.replace(/\//g, "+") + "#" + version + ".patch";
}
function parsePatchName(filename) {
  const pkg = filename.replace(".patch", "").split("#");
  return {
    pkgName: pkg[0].replace(/\+/g, import_node_path3.default.sep),
    version: pkg[1]
  };
}

// src/patchApplying.js
var import_node_fs3 = __toESM(require("node:fs"));
var import_node_path4 = __toESM(require("node:path"));
var import_diff = __toESM(require("diff"));
function readPatch(pkgName, version, patchCounter, reversing) {
  const packageName = pkgName.replace(/\+/g, import_node_path4.default.sep);
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
      version,
      stopColor()
    );
    if (!isVersionSuitable(version, cfg.version)) {
      echo(
        startColor("yellowBright"),
        "WARNING: ",
        stopColor(),
        "The patch is for v",
        startColor("greenBright"),
        version,
        stopColor(),
        " but you have installed ",
        startColor("redBright"),
        cfg.version,
        stopColor()
      );
    } else {
      if (version !== cfg.version) {
        echo(
          startColor("yellowBright"),
          "WARNING: ",
          stopColor(),
          "The patch for ",
          startColor("greenBright"),
          version,
          stopColor(),
          " may not ",
          reversing ? "reverse" : "apply",
          " cleanly to the installed ",
          startColor("redBright"),
          cfg.version,
          stopColor()
        );
      }
      const patchFile = makePatchName(pkgName, version);
      const patch = import_node_fs3.default.readFileSync(import_node_path4.default.join(patchDir, patchFile), "utf8");
      const chunks2 = import_diff.default.parsePatch(patch);
      chunks2.forEach((chunk, subIndex) => {
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
          const fileName = import_node_path4.default.join(curDir, "node_modules", normalizedPath);
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
            const reversedPatchText = import_diff.default.reversePatch(chunk);
            const reversePatchedContent = import_diff.default.applyPatch(fileContent, reversedPatchText);
            if (reversePatchedContent === false) {
              const patchedContent = import_diff.default.applyPatch(fileContent, chunk);
              if (patchedContent !== false) {
                echo(
                  startColor("yellowBright"),
                  "WARNING: ",
                  stopColor(),
                  "Patch already reversed for ",
                  startColor("greenBright"),
                  filePath,
                  stopColor()
                );
                chunk.success = false;
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
                import_node_fs3.default.writeFileSync(fileName, reversePatchedContent, "utf8");
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
            const patchedContent = import_diff.default.applyPatch(fileContent, chunk);
            if (patchedContent === false) {
              const reversedPatchText = import_diff.default.reversePatch(chunk);
              const reversePatchedContent = import_diff.default.applyPatch(fileContent, reversedPatchText);
              if (reversePatchedContent !== false) {
                echo(
                  startColor("yellowBright"),
                  "WARNING: ",
                  stopColor(),
                  "Patch already applied to ",
                  startColor("greenBright"),
                  fileName,
                  stopColor()
                );
                chunk.success = false;
              } else {
                if (!import_node_fs3.default.existsSync(chunk.oldFileName)) {
                  const folder = import_node_path4.default.dirname(chunk.oldFileName);
                  if (!import_node_fs3.default.existsSync(folder)) {
                    echo(
                      startColor("yellowBright"),
                      "WARNING: Folder ",
                      stopColor(),
                      startColor("redBright"),
                      import_node_path4.default.dirname(pathNormalize(chunk.oldFileName)),
                      stopColor(),
                      startColor("yellowBright"),
                      " does not exist - the patch is probably for older version"
                    );
                    chunk.success = false;
                  }
                } else {
                  echo(
                    startColor("yellowBright") + "WARNING: " + stopColor() + "Chunk failed - " + startColor("redBright") + " either already applied or for different version",
                    stopColor()
                  );
                  chunk.success = false;
                }
              }
            } else {
              try {
                import_node_fs3.default.writeFileSync(fileName, patchedContent, "utf8");
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
    }
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
function applyPatches(packageNames = [], reversing = false) {
  if (hasPatches()) {
    import_node_fs3.default.readdirSync(patchDir).map((item) => {
      if (!item.endsWitdh(".patch")) return;
      const pkg = parsePatchName(item);
      if (packageNames.length > 0 ? packageNames.includes(pkg.pkgName) : true) {
        const dest = import_node_path4.default.join(curDir, "node_modules", pkg.pkgName);
        if (!import_node_fs3.default.existsSync(dest)) {
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
var import_pacote = __toESM(require("pacote"));
var import_node_fs4 = __toESM(require("node:fs"));
var import_node_path5 = __toESM(require("node:path"));
function npmTarballURL(pkgName, pkgVersion) {
  const scopelessName = getScopelessName(pkgName);
  return `https://registry.npmjs.org/${pkgName}/-/${scopelessName}-${removeBuildMetadataFromVersion(pkgVersion)}.tgz`;
}
function fetchPackage(pkgName, pkgVersion, callback) {
  const url = npmTarballURL(pkgName, pkgVersion);
  const dest = import_node_path5.default.join(tmpDir, pkgName);
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
  import_pacote.default.extract(url, dest).then(() => {
    callback(pkgName, pkgVersion);
    import_node_fs4.default.rm(dest, { recursive: true, force: true }, (err) => {
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
var import_node_fs5 = __toESM(require("node:fs"));
var import_node_path6 = __toESM(require("node:path"));
var import_diff2 = __toESM(require("diff"));
function createPatches(packageNames) {
  packageNames.forEach(makePatch);
}
function goodFileName(fn) {
  const pattern = new RegExp("/", "g");
  return fn.replace(pattern, "+");
}
function makePatchName2(pkgName, version) {
  return goodFileName(pkgName) + "#" + version + ".patch";
}
function createPatch(pkgName, pathname, patch) {
  if (pathname === "package.json" && !programOptions.all) return;
  const newFile = import_node_path6.default.join(curDir, "node_modules", pkgName, pathname);
  const oldFile = import_node_path6.default.join(tmpDir, pkgName, pathname);
  const oldStr = import_node_fs5.default.existsSync(oldFile) ? import_node_fs5.default.readFileSync(oldFile, "utf8") : "";
  const newStr = import_node_fs5.default.readFileSync(newFile, "utf8");
  if (oldStr !== newStr) patch.write(import_diff2.default.createTwoFilesPatch(oldFile.replace(tmpDir, ""), newFile.replace(import_node_path6.default.join(curDir, "node_modules"), ""), oldStr, newStr));
}
function scanFiles(pkgName, src, patch) {
  const files = import_node_fs5.default.readdirSync(import_node_path6.default.join(curDir, "node_modules", pkgName, src));
  files.forEach((item) => {
    if (item === "node_modules") return;
    const pathname = import_node_path6.default.join(src, item);
    const stat = import_node_fs5.default.lstatSync(import_node_path6.default.join(curDir, "node_modules", pkgName, pathname));
    if (stat.isDirectory()) scanFiles(pkgName, pathname, patch);
    else createPatch(pkgName, pathname, patch);
  });
}
function comparePackages(pkgName, version) {
  const patchFile = makePatchName2(pkgName, version);
  ensureDirectoryExists(patchDir);
  const stream = import_node_fs5.default.createWriteStream(import_node_path6.default.join(patchDir, patchFile));
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
    package_default.version,
    stopColor(),
    "\n"
  );
}
if (!import_node_fs6.default.existsSync(import_node_path7.default.join(curDir, "node_modules"))) {
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
  applyPatches(import_commander2.program.args);
} else if (programOptions.reverse) {
  applyPatches(import_commander2.program.args, true);
} else if (import_commander2.program.args.length > 0) {
  createPatches(import_commander2.program.args);
} else {
  applyPatches();
}
