import { __awaiter } from "tslib";
import { MastraService } from "./mastra.service";
import { MCPServer } from '@mastra/mcp';
import { randomUUID } from 'crypto';
import { OrganizationService } from "../database/prisma/organizations/organization.service";
import { OAuthService } from "../database/prisma/oauth/oauth.service";
import { runWithContext } from './async.storage';
import { createOAuthMiddleware } from './oauth-middleware';
const fixAcceptHeader = (req) => {
    const value = 'application/json, text/event-stream';
    req.headers.accept = value;
    const idx = req.rawHeaders.findIndex((h) => h.toLowerCase() === 'accept');
    if (idx !== -1) {
        req.rawHeaders[idx + 1] = value;
    }
    else {
        req.rawHeaders.push('Accept', value);
    }
};
export const startMcp = (app) => __awaiter(void 0, void 0, void 0, function* () {
    const mastraService = app.get(MastraService, { strict: false });
    const organizationService = app.get(OrganizationService, { strict: false });
    const oauthService = app.get(OAuthService, { strict: false });
    const resolveAuth = (token) => __awaiter(void 0, void 0, void 0, function* () {
        if (token.startsWith('pos_')) {
            const authorization = yield oauthService.getOrgByOAuthToken(token);
            if (!authorization)
                return null;
            return authorization.organization;
        }
        return organizationService.getOrgByApiKey(token);
    });
    const mastra = yield mastraService.mastra();
    const agent = mastra.getAgent('postiz');
    const tools = yield agent.listTools();
    const serverConfig = {
        name: 'Postiz MCP',
        version: '1.0.0',
        tools,
        agents: { postiz: agent },
    };
    const server = new MCPServer(serverConfig);
    const oauthMiddleware = createOAuthMiddleware({
        oauth: {
            resource: new URL('/mcp-oauth', process.env.NEXT_PUBLIC_BACKEND_URL).toString(),
            authorizationServers: [process.env.NEXT_PUBLIC_BACKEND_URL],
            validateToken: (token) => __awaiter(void 0, void 0, void 0, function* () {
                const org = yield resolveAuth(token);
                if (!org) {
                    return { valid: false, error: 'invalid_token', errorDescription: 'Invalid API Key or OAuth token' };
                }
                return { valid: true, subject: token };
            }),
        },
        mcpPath: '/mcp-oauth',
    });
    if (process.env.OPENAI_APP_CHALLANGE) {
        app.use('/.well-known/openai-apps-challenge', (req, res) => {
            res.setHeader('Content-Type', 'text/plain');
            res.send(process.env.OPENAI_APP_CHALLANGE);
        });
    }
    app.use('/.well-known/oauth-protected-resource', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const url = new URL('/.well-known/oauth-protected-resource', process.env.NEXT_PUBLIC_BACKEND_URL);
        yield oauthMiddleware(req, res, url);
    }));
    app.use('/.well-known/oauth-authorization-server', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        res.setHeader('Access-Control-Allow-Origin', '*');
        if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            res.writeHead(204);
            res.end();
            return;
        }
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'max-age=3600');
        res.json({
            issuer: process.env.NEXT_PUBLIC_BACKEND_URL,
            authorization_endpoint: `${process.env.FRONTEND_URL}/oauth/authorize`,
            token_endpoint: `${process.env.NEXT_PUBLIC_OVERRIDE_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL}/oauth/token`,
            response_types_supported: ['code'],
            grant_types_supported: ['authorization_code'],
            code_challenge_methods_supported: ['S256'],
            scopes_supported: ['mcp:read', 'mcp:write'],
        });
    }));
    app.use('/mcp-oauth', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        // Skip if this is the /mcp/:id route
        if (req.path !== '/' && req.path !== '') {
            next();
            return;
        }
        const url = new URL('/mcp-oauth', process.env.NEXT_PUBLIC_BACKEND_URL);
        const result = yield oauthMiddleware(req, res, url);
        if (!result.proceed)
            return;
        const token = (_a = result.tokenValidation) === null || _a === void 0 ? void 0 : _a.subject;
        const auth = yield resolveAuth(token);
        if (!auth) {
            res.status(401).json({ error: 'invalid_token', error_description: 'Could not resolve organization' });
            return;
        }
        fixAcceptHeader(req);
        yield runWithContext({ requestId: token, auth }, () => __awaiter(void 0, void 0, void 0, function* () {
            yield server.startHTTP({
                url: url,
                httpPath: url.pathname,
                options: {
                    sessionIdGenerator: () => {
                        return randomUUID();
                    },
                    enableJsonResponse: true,
                },
                req,
                res,
            });
        }));
    }));
    app.use('/mcp', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        // Skip if this is the /mcp/:id route
        if (req.path !== '/' && req.path !== '') {
            next();
            return;
        }
        // @ts-ignore
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', '*');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Access-Control-Expose-Headers', '*');
        if (req.method === 'OPTIONS') {
            res.sendStatus(200);
            return;
        }
        const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            res.status(401).send('Missing Authorization header');
            return;
        }
        // @ts-ignore
        req.auth = yield resolveAuth(token);
        // @ts-ignore
        if (!req.auth) {
            res.status(401).send('Invalid API Key or OAuth token');
            return;
        }
        const url = new URL('/mcp', process.env.NEXT_PUBLIC_BACKEND_URL);
        fixAcceptHeader(req);
        // @ts-ignore
        yield runWithContext({ requestId: token, auth: req.auth }, () => __awaiter(void 0, void 0, void 0, function* () {
            yield server.startHTTP({
                url,
                httpPath: url.pathname,
                options: {
                    sessionIdGenerator: () => {
                        return randomUUID();
                    },
                    enableJsonResponse: true,
                },
                req,
                res,
            });
        }));
    }));
    app.use('/mcp/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        // @ts-ignore
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', '*');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Access-Control-Expose-Headers', '*');
        if (req.method === 'OPTIONS') {
            res.sendStatus(200);
            return;
        }
        // @ts-ignore
        req.auth = yield organizationService.getOrgByApiKey(req.params.id);
        // @ts-ignore
        if (!req.auth) {
            res.status(400).send('Invalid API Key');
            return;
        }
        const url = new URL(`/mcp/${req.params.id}`, process.env.NEXT_PUBLIC_BACKEND_URL);
        fixAcceptHeader(req);
        yield runWithContext(
        // @ts-ignore
        { requestId: req.params.id, auth: req.auth }, () => __awaiter(void 0, void 0, void 0, function* () {
            yield server.startHTTP({
                url,
                httpPath: url.pathname,
                options: {
                    sessionIdGenerator: () => {
                        return randomUUID();
                    },
                    enableJsonResponse: true,
                },
                req,
                res,
            });
        }));
    }));
    app.use(['/sse/:id', '/message/:id'], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        // @ts-ignore
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', '*');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Access-Control-Expose-Headers', '*');
        if (req.method === 'OPTIONS') {
            res.sendStatus(200);
            return;
        }
        // @ts-ignore
        req.auth = yield organizationService.getOrgByApiKey(req.params.id);
        // @ts-ignore
        if (!req.auth) {
            res.status(400).send('Invalid API Key');
            return;
        }
        const url = new URL(req.originalUrl, process.env.NEXT_PUBLIC_BACKEND_URL);
        yield runWithContext(
        // @ts-ignore
        { requestId: req.params.id, auth: req.auth }, () => __awaiter(void 0, void 0, void 0, function* () {
            yield new MCPServer(serverConfig).startSSE({
                url,
                ssePath: `/sse/${req.params.id}`,
                messagePath: `/message/${req.params.id}`,
                req,
                res,
            });
        }));
    }));
});
//# sourceMappingURL=start.mcp.js.map