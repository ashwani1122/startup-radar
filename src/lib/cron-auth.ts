import { createRemoteJWKSet, jwtVerify } from "jose";

const GITHUB_ACTIONS_ISSUER = "https://token.actions.githubusercontent.com";
const GITHUB_ACTIONS_AUDIENCE = "startup-radar-funding-sync";
const GITHUB_REPOSITORY = "ashwani1122/startup-radar";
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
    // The signed subject already binds the token to this repository and its
    // main branch. Optional workflow claims vary across GitHub event types.
    return payload.sub === `repo:${GITHUB_REPOSITORY}:ref:refs/heads/main`
      && payload.repository === GITHUB_REPOSITORY;
  } catch (error) {
    console.warn("Rejected GitHub Actions funding-sync identity.", error instanceof Error ? error.message : "Unknown token error");
    return false;
  }
}
