import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const REQUIRED_ENVIRONMENT_VARIABLES = [
  "TIDYHQ_APPLICATION_ID",
  "TIDYHQ_APPLICATION_SECRET",
  "TIDYHQ_DOMAIN_PREFIX",
  "TIDYHQ_USERNAME",
  "TIDYHQ_API_KEY",
];

function loadEnvironment(content) {
  for (const line of content.split(/\r?\n/)) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) continue;

    const separatorIndex = trimmedLine.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

async function loadEnvironmentFile() {
  try {
    loadEnvironment(await readFile(resolve(process.cwd(), ".env"), "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

function requiredConfiguration() {
  const configuration = {};

  for (const key of REQUIRED_ENVIRONMENT_VARIABLES) {
    const value = process.env[key]?.trim();
    if (!value) throw new Error(`Missing required environment variable: ${key}`);
    configuration[key] = value;
  }

  return configuration;
}

async function requestJson(label, url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`${label} request failed with HTTP ${response.status}`);
  }

  try {
    return await response.json();
  } catch {
    throw new Error(`${label} request returned invalid JSON`);
  }
}

async function main() {
  await loadEnvironmentFile();
  const configuration = requiredConfiguration();
  const tokenResponse = await requestJson(
    "Token",
    "https://accounts.tidyhq.com/oauth/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "password",
        client_id: configuration.TIDYHQ_APPLICATION_ID,
        client_secret: configuration.TIDYHQ_APPLICATION_SECRET,
        domain_prefix: configuration.TIDYHQ_DOMAIN_PREFIX,
        username: configuration.TIDYHQ_USERNAME,
        password: configuration.TIDYHQ_API_KEY,
      }),
    },
  );

  if (!tokenResponse.access_token) {
    throw new Error("Token response did not include an access token");
  }

  const memberships = await requestJson(
    "Memberships",
    "https://api.tidyhq.com/v2/memberships",
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${tokenResponse.access_token}`,
      },
    },
  );

  console.log("TidyHQ authentication succeeded; memberships fetched.");
  console.log(JSON.stringify(memberships, null, 2));
}

main().catch((error) => {
  console.error(`TidyHQ membership smoke test failed: ${error.message}`);
  process.exitCode = 1;
});
