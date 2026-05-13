import jwt from "jsonwebtoken";

export class WebsocketAuthService {
  issueSessionToken(tokenContext, request) {
    const secret = process.env.MACHINE_ACCESS_SESSION_SECRET;
    if (!secret) {
      throw new Error("MACHINE_ACCESS_SESSION_SECRET is required for websocket session tokens");
    }
    const expiresInMinutes = Math.min(Number(request.expiresInMinutes || 15), 60);
    const environment = request.environment || tokenContext.environmentAccess[0] || "preview";
    const projectId = request.projectId || tokenContext.projectAccess[0] || "*";

    const token = jwt.sign(
      {
        sub: tokenContext.identityId,
        tokenId: tokenContext.tokenId,
        machineIdentity: tokenContext.machineIdentity,
        scopes: tokenContext.scopes.filter((scope) => scope.startsWith("read:")),
        environment,
        projectId,
        type: "machine-access-session",
      },
      secret,
      {
        algorithm: "HS256",
        expiresIn: `${expiresInMinutes}m`,
        issuer: "satelink-machine-access",
      },
    );

    return {
      token,
      expiresInMinutes,
      environment,
      projectId,
      scopes: tokenContext.scopes.filter((scope) => scope.startsWith("read:")),
    };
  }
}
