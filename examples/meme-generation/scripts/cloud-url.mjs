#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import process from "node:process";

import { serialize } from "@effing/serde";

const FN_BASE_URL = (
  process.env.EFFING_CLOUD_FN_BASE_URL ?? "https://fn.effing.dev"
).replace(/\/$/, "");
const DEFAULT_WIDTH = 1080;
const DEFAULT_HEIGHT = 1080;
const VALID_KINDS = new Set(["image", "annie", "effie"]);

function usage() {
  return `Usage: cloud:url <kind> <id> [options]

  <kind>                image | annie | effie
  <id>                  fn id (filename without .fn.tsx)

Options:
  --props <json>        JSON object of props (default: {})
  --width <n>           bounds width  (default: ${DEFAULT_WIDTH})
  --height <n>          bounds height (default: ${DEFAULT_HEIGHT})
  --account <slug>      account slug  (default: from config / EFFING_CLOUD_ACCOUNT / credentials)
  --project <name>      project name  (default: from effing-cloud.config.ts)
  --config <path>       path to effing-cloud config (default: ./effing-cloud.config.ts)
  -h, --help            show this help

Example:
  pnpm cloud:url -- image meme-distracted-boyfriend \\
    --props '{"caption":"me"}' --width 1080 --height 1080
`;
}

function die(message) {
  process.stderr.write(`error: ${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const positional = [];
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--") continue;
    else if (a === "-h" || a === "--help") opts.help = true;
    else if (a === "--props") opts.props = argv[++i];
    else if (a === "--width") opts.width = argv[++i];
    else if (a === "--height") opts.height = argv[++i];
    else if (a === "--account") opts.account = argv[++i];
    else if (a === "--project") opts.project = argv[++i];
    else if (a === "--config") opts.config = argv[++i];
    else if (a.startsWith("--")) die(`unknown option: ${a}`);
    else positional.push(a);
  }
  return { positional, opts };
}

function readConfigFields(configPath) {
  let text;
  try {
    text = readFileSync(configPath, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return {};
    throw err;
  }
  const project = text.match(/project:\s*["']([^"']+)["']/)?.[1];
  const account = text.match(/account:\s*["']([^"']+)["']/)?.[1];
  return { project, account };
}

function defaultAccountFromCredentials() {
  const base =
    process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
  const path = join(base, "effing-cloud", "credentials.json");
  try {
    const data = JSON.parse(readFileSync(path, "utf8"));
    return typeof data?.default === "string" ? data.default : null;
  } catch {
    return null;
  }
}

function fetchUrlSecret(project, account) {
  const args = ["url-secret", project];
  if (account) args.push("--account", account);
  const result = spawnSync("effing-cloud", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  if (result.error) {
    die(
      `failed to invoke \`effing-cloud\`: ${result.error.message}\n` +
        `(run via your package manager's script runner so node_modules/.bin is on PATH)`,
    );
  }
  if (result.status !== 0) {
    die(`\`effing-cloud url-secret\` exited with status ${result.status}`);
  }
  const secret = result.stdout.trim();
  if (!secret) die("`effing-cloud url-secret` returned an empty secret");
  return secret;
}

function parseIntStrict(value, name) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    die(`--${name} must be a positive integer (got ${value})`);
  }
  return n;
}

function parseProps(raw) {
  if (raw === undefined) return {};
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    die(`--props is not valid JSON: ${err.message}`);
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    die("--props must be a JSON object");
  }
  return parsed;
}

async function main() {
  const { positional, opts } = parseArgs(process.argv.slice(2));
  if (opts.help || positional.length === 0) {
    process.stdout.write(usage());
    process.exit(opts.help ? 0 : 1);
  }
  if (positional.length !== 2) {
    die(`expected <kind> <id>, got ${positional.length} positional arg(s)`);
  }

  const [kind, id] = positional;
  if (!VALID_KINDS.has(kind)) {
    die(`<kind> must be one of: ${[...VALID_KINDS].join(", ")} (got "${kind}")`);
  }

  const props = parseProps(opts.props);
  const width = opts.width ? parseIntStrict(opts.width, "width") : DEFAULT_WIDTH;
  const height = opts.height
    ? parseIntStrict(opts.height, "height")
    : DEFAULT_HEIGHT;

  const configPath = resolve(
    process.cwd(),
    opts.config ?? "effing-cloud.config.ts",
  );
  const config = readConfigFields(configPath);

  const project = opts.project ?? config.project;
  if (!project) {
    die(
      `couldn't determine project: pass --project or add it to ${configPath}`,
    );
  }

  const account =
    opts.account ??
    process.env.EFFING_CLOUD_ACCOUNT ??
    config.account ??
    defaultAccountFromCredentials();
  if (!account) {
    die(
      "couldn't determine account: pass --account, set EFFING_CLOUD_ACCOUNT, " +
        "add `account` to your effing-cloud config, or run `effing-cloud use <slug>`",
    );
  }

  const secret = fetchUrlSecret(project, account);
  const segment = await serialize(
    { id, props, bounds: { width, height } },
    secret,
  );

  process.stdout.write(
    `${FN_BASE_URL}/${account}/${project}/${kind}/${segment}\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`error: ${err?.stack ?? err}\n`);
  process.exit(1);
});
