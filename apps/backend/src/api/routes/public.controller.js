import { __awaiter, __decorate, __metadata, __param, __rest } from "tslib";
import { Body, Controller, Get, Param, Post, Query, Req, Res, } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PostsService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/posts/posts.service";
import { TrackService } from "../../../../../libraries/nestjs-libraries/src/track/track.service";
import { RealIP } from 'nestjs-real-ip';
import { UserAgent } from "../../../../../libraries/nestjs-libraries/src/user/user.agent";
import { makeId } from "../../../../../libraries/nestjs-libraries/src/services/make.is";
import { getCookieUrlFromDomain } from "../../../../../libraries/helpers/src/subdomain/subdomain.management";
import { AgentGraphInsertService } from "../../../../../libraries/nestjs-libraries/src/agent/agent.graph.insert.service";
import { SubscriptionService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/subscriptions/subscription.service";
import { AuthService } from "../../../../../libraries/helpers/src/auth/auth.service";
import { pricing } from "../../../../../libraries/nestjs-libraries/src/database/prisma/subscriptions/pricing";
import { Readable, pipeline } from 'stream';
import { promisify } from 'util';
import { OnlyURL } from "../../../../../libraries/nestjs-libraries/src/dtos/webhooks/webhooks.dto";
import { isSafePublicHttpsUrl } from "../../../../../libraries/nestjs-libraries/src/dtos/webhooks/webhook.url.validator";
import { ssrfSafeDispatcher } from "../../../../../libraries/nestjs-libraries/src/dtos/webhooks/ssrf.safe.dispatcher";
const pump = promisify(pipeline);
let PublicController = class PublicController {
    constructor(_trackService, _agentGraphInsertService, _postsService, _subscriptionService) {
        this._trackService = _trackService;
        this._agentGraphInsertService = _agentGraphInsertService;
        this._postsService = _postsService;
        this._subscriptionService = _subscriptionService;
    }
    createAgent(body) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!body.apiKey ||
                !process.env.AGENT_API_KEY ||
                body.apiKey !== process.env.AGENT_API_KEY) {
                return;
            }
            return this._agentGraphInsertService.newPost(body.text);
        });
    }
    getPreview(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._postsService.getPostsRecursively(id, true)).map((_a) => {
                var { childrenPost } = _a, p = __rest(_a, ["childrenPost"]);
                return (Object.assign(Object.assign({}, p), (p.integration
                    ? {
                        integration: {
                            id: p.integration.id,
                            name: p.integration.name,
                            picture: p.integration.picture,
                            providerIdentifier: p.integration.providerIdentifier,
                            profile: p.integration.profile,
                        },
                    }
                    : {})));
            });
        });
    }
    getComments(postId) {
        return __awaiter(this, void 0, void 0, function* () {
            return { comments: yield this._postsService.getComments(postId) };
        });
    }
    trackEvent(res, req, ip, userAgent, body) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const uniqueId = ((_a = req === null || req === void 0 ? void 0 : req.cookies) === null || _a === void 0 ? void 0 : _a.track) || makeId(10);
            const fbclid = ((_b = req === null || req === void 0 ? void 0 : req.cookies) === null || _b === void 0 ? void 0 : _b.fbclid) || body.fbclid;
            yield this._trackService.track(uniqueId, ip, userAgent, body.tt, body.additional, fbclid);
            if (!req.cookies.track) {
                res.cookie('track', uniqueId, Object.assign(Object.assign({ domain: getCookieUrlFromDomain(process.env.FRONTEND_URL) }, (!process.env.NOT_SECURED
                    ? {
                        secure: true,
                        httpOnly: true,
                    }
                    : {})), { sameSite: 'none', expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365) }));
            }
            if (body.fbclid && !req.cookies.fbclid) {
                res.cookie('fbclid', body.fbclid, Object.assign(Object.assign({ domain: getCookieUrlFromDomain(process.env.FRONTEND_URL) }, (!process.env.NOT_SECURED
                    ? {
                        secure: true,
                        httpOnly: true,
                    }
                    : {})), { sameSite: 'none', expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365) }));
            }
            res.status(200).json({
                track: uniqueId,
            });
        });
    }
    modifySubscription(params) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const load = AuthService.verifyJWT(params);
                if (!load || !load.orgId || !load.billing || !pricing[load.billing]) {
                    return { success: false };
                }
                const totalChannels = pricing[load.billing].channel || 0;
                yield this._subscriptionService.modifySubscriptionByOrg(load.orgId, totalChannels, load.billing);
                return { success: true };
            }
            catch (err) {
                return { success: false };
            }
        });
    }
    streamFile(query, res, req) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const { url } = query;
            if (!url.endsWith('mp4')) {
                return res.status(400).send('Invalid video URL');
            }
            const ac = new AbortController();
            const onClose = () => ac.abort();
            req.on('aborted', onClose);
            res.on('close', onClose);
            // Manually follow redirects so every hop is re-validated against
            // the SSRF blocklist (see GHSA-34w8-5j2v-h6ww). `fetch` defaults to
            // `redirect: 'follow'`, which bypasses the DTO-level URL check.
            const MAX_REDIRECTS = 5;
            let currentUrl = url;
            let r;
            for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
                if (!(yield isSafePublicHttpsUrl(currentUrl))) {
                    return res.status(400).send('Blocked URL');
                }
                r = yield fetch(currentUrl, {
                    signal: ac.signal,
                    redirect: 'manual',
                    // @ts-ignore — undici option, not in lib.dom fetch types
                    dispatcher: ssrfSafeDispatcher,
                });
                if (r.status >= 300 && r.status < 400) {
                    const location = r.headers.get('location');
                    if (!location) {
                        return res.status(502).send('Redirect without Location');
                    }
                    try {
                        currentUrl = new URL(location, currentUrl).toString();
                    }
                    catch (_c) {
                        return res.status(400).send('Invalid redirect target');
                    }
                    continue;
                }
                break;
            }
            if (!r) {
                return res.status(502).send('No upstream response');
            }
            if (r.status >= 300 && r.status < 400) {
                return res.status(508).send('Too many redirects');
            }
            if (!r.ok && r.status !== 206) {
                res.status(r.status);
                throw new Error(`Upstream error: ${r.statusText}`);
            }
            const type = (_a = r.headers.get('content-type')) !== null && _a !== void 0 ? _a : 'application/octet-stream';
            res.setHeader('Content-Type', type);
            const contentRange = r.headers.get('content-range');
            if (contentRange)
                res.setHeader('Content-Range', contentRange);
            const len = r.headers.get('content-length');
            if (len)
                res.setHeader('Content-Length', len);
            const acceptRanges = (_b = r.headers.get('accept-ranges')) !== null && _b !== void 0 ? _b : 'bytes';
            res.setHeader('Accept-Ranges', acceptRanges);
            if (r.status === 206)
                res.status(206); // Partial Content for range responses
            try {
                yield pump(Readable.fromWeb(r.body), res);
            }
            catch (err) { }
        });
    }
};
__decorate([
    Post('/agent'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "createAgent", null);
__decorate([
    Get(`/posts/:id`),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "getPreview", null);
__decorate([
    Get(`/posts/:id/comments`),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "getComments", null);
__decorate([
    Post('/t'),
    __param(0, Res()),
    __param(1, Req()),
    __param(2, RealIP()),
    __param(3, UserAgent()),
    __param(4, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "trackEvent", null);
__decorate([
    Post('/modify-subscription'),
    __param(0, Body('params')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "modifySubscription", null);
__decorate([
    Get('/stream'),
    __param(0, Query()),
    __param(1, Res()),
    __param(2, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [OnlyURL, Object, Object]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "streamFile", null);
PublicController = __decorate([
    ApiTags('Public'),
    Controller('/public'),
    __metadata("design:paramtypes", [TrackService,
        AgentGraphInsertService,
        PostsService,
        SubscriptionService])
], PublicController);
export { PublicController };
//# sourceMappingURL=public.controller.js.map