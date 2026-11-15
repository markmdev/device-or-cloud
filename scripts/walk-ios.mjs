// Walks the iPhone shop in the iOS simulator: every feature answers its sample once with the network on, then once
// with the app's network cut. Build the app first (the README says how).
// [SIMULATOR=<name or id>] [IOS_APPCHECK_DEBUG_TOKEN=...] node scripts/walk-ios.mjs
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";

const BUNDLE = "app.deviceorcloud.larkfield";
const APP = "ios/build/target-build/Debug-iphonesimulator/Larkfield.app";
const device = process.env.SIMULATOR ?? "booted";
const simctl = (...args) => execFileSync("xcrun", ["simctl", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

// What each feature has in the iPhone app: the template's value for it, or its default. With its mode comes how it
// runs there: with the model's randomness off, with one added line, or as written.
const { parameters } = JSON.parse(readFileSync("remoteconfig.template.json", "utf8"));
const inApp = (key) => parameters[key] && (parameters[key].conditionalValues?.["The iPhone app"] ?? parameters[key].defaultValue).value;
const modes = Object.keys(parameters).filter((key) => key.startsWith("mode_")).map((key) => {
  const id = key.replace("mode_", "");
  return [id, inApp(key), inApp(`steady_${id}`) === "true" ? "steady" : inApp(`line_${id}`) ? "line" : "plain"];
});

let failed = 0;
const expect = (ok, what) => { console.log(ok ? "ok  " : "FAIL", what); if (!ok) failed++; };

// The simulator has no flight mode, so a small library loaded into the app refuses its network connections instead.
const offline = `${mkdtempSync(`${tmpdir()}/larkfield-`)}/offline.dylib`;
execFileSync("xcrun", ["--sdk", "iphonesimulator", "clang", "-arch", "arm64", "-mios-simulator-version-min=26.0", "-dynamiclib", "-o", offline, "ios/offline/offline.c"]);

/**
 * Starts the shop so that every card answers its sample, and returns what each card reported: [mode, how, where it ran].
 * Under "apple" comes whether Apple's model answered one request on the device alone.
 */
function answers(env) {
  return new Promise((done) => {
    try { simctl("terminate", device, BUNDLE); } catch {}
    const app = spawn("xcrun", ["simctl", "launch", "--console-pty", device, BUNDLE, "-tab", "shop", "-walk"], { env: { ...process.env, ...env } });
    const said = {};
    let text = "";
    const finish = () => { clearTimeout(timer); app.kill(); done(said); };
    const timer = setTimeout(finish, 120_000);
    app.stdout.on("data", (chunk) => {
      text += chunk;
      for (const [, id, rest] of text.matchAll(/^WALK (\S+) (.+?)\r?$/gm)) {
        const [first, how, ...where] = rest.split(" ");
        said[id] = id === "apple" ? [first] : [first, how, where.join(" ")];
      }
      if (Object.keys(said).length === modes.length + 1) finish();
    });
  });
}

// A fresh install, so the app starts on the published template and not on values it fetched before.
try { simctl("uninstall", device, BUNDLE); } catch {}
simctl("install", device, APP);
const token = process.env.IOS_APPCHECK_DEBUG_TOKEN ? { SIMCTL_CHILD_FIRAAppCheckDebugToken: process.env.IOS_APPCHECK_DEBUG_TOKEN } : {};

const online = await answers(token);
expect(online.apple?.[0] === "on_device", "Apple's model answers in the app, on the device alone");
for (const [id, mode, how] of modes) {
  const [got, gotHow, where] = online[id] ?? [];
  expect(got === mode, `${id} is set to ${mode}, as published for the iPhone app`);
  if (how !== "plain") expect(gotHow === how, `${id} runs with ${how === "steady" ? "the model's randomness off" : "its added line"}, as published`);
  expect(where === (mode === "prefer_on_device" ? "on_device" : "in_cloud"), `${id} answered ${mode === "prefer_on_device" ? "on this iPhone" : "in the cloud"}`);
}

const cut = await answers({ ...token, SIMCTL_CHILD_DYLD_INSERT_LIBRARIES: offline });
expect(cut.apple?.[0] === "on_device", "Apple's model still answers with the network cut");
for (const [id, mode] of modes) {
  const [, , where] = cut[id] ?? [];
  if (mode === "prefer_on_device") expect(where === "on_device", `${id} still answers on this iPhone with the network cut`);
  else expect(/needs a connection/.test(where ?? ""), `${id} says it needs a connection with the network cut`);
}

// The app must not stay running with its network cut.
try { simctl("terminate", device, BUNDLE); } catch {}
process.exit(failed ? 1 : 0);
