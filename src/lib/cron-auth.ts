import { createRemoteJWKSet, jwtVerify } from "jose";

const GITHUB_ACTIONS_ISSUER = "https://token.actions.githubusercontent.com";
const GITHUB_ACTIONS_AUDIENCE = "startup-radar-funding-sync";
const GITHUB_REPOSITORY = "ashwani1122/startup-radar";
const GITHUB_WORKFLOW_REF = `${GITHUB_REPOSITORY}/.github/workflows/funding-sync.yml@refs/heads/main`;
const githubActionsKeys = createRemoteJWKSet(new URL(`${GITHUB_ACTIONS_ISSUER}/.well-known/jwks`));

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
}

export function isVercelCronRequestAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  return Boolean(cronSecret && bearerToken(request) === cronSecret);
}

export async function isFundingSyncRequestAuthorized(request: Request) {
  if (isVercelCronRequestAuthorized(request)) return true;

  const token = bearerToken(request);
  if (!token || token.split(".").length !== 3) return false;

  try {
    const { payload } = await jwtVerify(token, githubActionsKeys, {
      issuer: GITHUB_ACTIONS_ISSUER,
      audience: GITHUB_ACTIONS_AUDIENCE,
      algorithms: ["RS256"],
    });
    return payload.sub === `repo:${GITHUB_REPOSITORY}:ref:refs/heads/main`
      && payload.repository === GITHUB_REPOSITORY
      && payload.ref === "refs/heads/main"
      && payload.workflow_ref === GITHUB_WORKFLOW_REF
      && (payload.event_name === "schedule" || payload.event_name === "workflow_dispatch");
  } catch (error) {
    console.warn("Rejected GitHub Actions funding-sync identity.", error instanceof Error ? error.message : "Unknown token error");
    return false;
  }
}
