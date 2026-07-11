import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Body, Controller, Delete, Get, HttpException, Param, Post, Put, Query, UploadedFile, UseInterceptors, UsePipes, } from '@nestjs/common';
import { CustomFileValidationPipe, getMaxSize, } from "../../../../../../libraries/nestjs-libraries/src/upload/custom.upload.validation";
import { ApiTags } from '@nestjs/swagger';
import { GetOrgFromRequest } from "../../../../../../libraries/nestjs-libraries/src/user/org.from.request";
import { IntegrationService } from "../../../../../../libraries/nestjs-libraries/src/database/prisma/integrations/integration.service";
import { CheckPolicies } from "../../../services/auth/permissions/permissions.ability";
import { PostsService } from "../../../../../../libraries/nestjs-libraries/src/database/prisma/posts/posts.service";
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadFactory } from "../../../../../../libraries/nestjs-libraries/src/upload/upload.factory";
import { MediaService } from "../../../../../../libraries/nestjs-libraries/src/database/prisma/media/media.service";
import { GetPostsDto } from "../../../../../../libraries/nestjs-libraries/src/dtos/posts/get.posts.dto";
import { ChangePostStatusDto } from "../../../../../../libraries/nestjs-libraries/src/dtos/posts/change.post.status.dto";
import { AuthorizationActions, Sections, } from "../../../services/auth/permissions/permission.exception.class";
import { VideoDto } from "../../../../../../libraries/nestjs-libraries/src/dtos/videos/video.dto";
import { VideoFunctionDto } from "../../../../../../libraries/nestjs-libraries/src/dtos/videos/video.function.dto";
import { UploadDto } from "../../../../../../libraries/nestjs-libraries/src/dtos/media/upload.dto";
import { NotificationService } from "../../../../../../libraries/nestjs-libraries/src/database/prisma/notifications/notification.service";
import { GetNotificationsDto } from "../../../../../../libraries/nestjs-libraries/src/dtos/notifications/get.notifications.dto";
import { Readable } from 'stream';
import { ssrfSafeDispatcher } from "../../../../../../libraries/nestjs-libraries/src/dtos/webhooks/ssrf.safe.dispatcher";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { fromBuffer } = require('file-type');
const PUBLIC_API_ALLOWED_MIME = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/avif',
    'image/bmp',
    'image/tiff',
    'video/mp4',
]);
import * as Sentry from '@sentry/nestjs';
import { socialIntegrationList, IntegrationManager, } from "../../../../../../libraries/nestjs-libraries/src/integrations/integration.manager";
import { getValidationSchemas } from "../../../../../../libraries/nestjs-libraries/src/chat/validation.schemas.helper";
import { RefreshIntegrationService } from "../../../../../../libraries/nestjs-libraries/src/integrations/refresh.integration.service";
import { RefreshToken } from "../../../../../../libraries/nestjs-libraries/src/integrations/social.abstract";
import { PostValidationException } from "../../../api/routes/posts.validation.exception";
import { timer } from "../../../../../../libraries/helpers/src/utils/timer";
import { ioRedis } from "../../../../../../libraries/nestjs-libraries/src/redis/redis.service";
let PublicIntegrationsController = class PublicIntegrationsController {
    constructor(_integrationService, _postsService, _mediaService, _notificationService, _integrationManager, _refreshIntegrationService) {
        this._integrationService = _integrationService;
        this._postsService = _postsService;
        this._mediaService = _mediaService;
        this._notificationService = _notificationService;
        this._integrationManager = _integrationManager;
        this._refreshIntegrationService = _refreshIntegrationService;
        this.storage = UploadFactory.createStorage();
    }
    uploadSimple(org, file) {
        return __awaiter(this, void 0, void 0, function* () {
            Sentry.metrics.count('public_api-request', 1);
            if (!file) {
                throw new HttpException({ msg: 'No file provided' }, 400);
            }
            const getFile = yield this.storage.uploadFile(file);
            return this._mediaService.saveFile(org.id, getFile.originalname, getFile.path);
        });
    }
    uploadsFromUrl(org, body) {
        return __awaiter(this, void 0, void 0, function* () {
            Sentry.metrics.count('public_api-request', 1);
            let response;
            try {
                response = yield fetch(body.url, {
                    // @ts-ignore — undici option, not in lib.dom fetch types
                    dispatcher: ssrfSafeDispatcher,
                });
            }
            catch (_a) {
                // Network-level failure (DNS, connection refused, SSRF block, etc.) —
                // fetch rejects rather than returning a non-ok response.
                throw new HttpException({ msg: 'Failed to fetch URL' }, 400);
            }
            if (!response.ok) {
                throw new HttpException({ msg: 'Failed to fetch URL' }, 400);
            }
            // Guard against OOM: bail out before buffering the whole body into memory.
            // Content-Length may be absent or wrong, so we re-check the real size after
            // download too. The type isn't known yet (sniffed below), so the pre-check
            // uses the largest allowed cap (video).
            const maxDownloadSize = getMaxSize('video/mp4');
            const declaredSize = Number(response.headers.get('content-length'));
            if (declaredSize && declaredSize > maxDownloadSize) {
                throw new HttpException({ msg: 'File is too large.' }, 400);
            }
            const buffer = Buffer.from(yield response.arrayBuffer());
            const detected = yield fromBuffer(buffer);
            if (!detected || !PUBLIC_API_ALLOWED_MIME.has(detected.mime)) {
                throw new HttpException({ msg: 'Unsupported file type.' }, 400);
            }
            if (buffer.length > getMaxSize(detected.mime)) {
                throw new HttpException({ msg: 'File is too large.' }, 400);
            }
            const mimetype = detected.mime;
            const ext = detected.ext;
            const getFile = yield this.storage.uploadFile({
                buffer,
                mimetype,
                size: buffer.length,
                path: '',
                fieldname: '',
                destination: '',
                stream: new Readable(),
                filename: '',
                originalname: `upload.${ext}`,
                encoding: '',
            });
            return this._mediaService.saveFile(org.id, getFile.originalname, getFile.path);
        });
    }
    findSlotIntegration(org, id) {
        return __awaiter(this, void 0, void 0, function* () {
            Sentry.metrics.count('public_api-request', 1);
            return { date: yield this._postsService.findFreeDateTime(org.id, id) };
        });
    }
    getPosts(org, query) {
        return __awaiter(this, void 0, void 0, function* () {
            Sentry.metrics.count('public_api-request', 1);
            const posts = yield this._postsService.getPosts(org.id, query);
            return {
                posts,
                // comments,
            };
        });
    }
    createPost(org, rawBody) {
        return __awaiter(this, void 0, void 0, function* () {
            Sentry.metrics.count('public_api-request', 1);
            const body = yield this._postsService.mapTypeToPost(rawBody, org.id, (rawBody === null || rawBody === void 0 ? void 0 : rawBody.type) === 'draft' || true);
            body.type = rawBody.type;
            if (process.env.RESTRICT_UPLOAD_DOMAINS &&
                body.posts.some((p) => p.value.some((a) => a.image.some((i) => i.path.indexOf(process.env.RESTRICT_UPLOAD_DOMAINS) === -1)))) {
                throw new HttpException({
                    msg: `All media must be uploaded through our upload API route and contain the domain: ${process.env.RESTRICT_UPLOAD_DOMAINS}`,
                }, 400);
            }
            // Server-side validation — same rules as the dashboard, surfaced as a
            // readable 400 (see PostValidationExceptionFilter).
            const validation = yield this._postsService.validatePosts(org.id, body.posts);
            const fail = (item, error) => {
                throw new PostValidationException({
                    provider: item.identifier,
                    name: item.name,
                    error,
                });
            };
            for (const item of validation) {
                if (item.emptyContent) {
                    fail(item, 'Your post should have at least one character or one image.');
                }
            }
            if (body.type !== 'draft') {
                for (const item of validation) {
                    if (!item.valid) {
                        fail(item, item.settingsError || 'Please fix your settings');
                    }
                    if (item.errors !== true) {
                        fail(item, item.errors);
                    }
                    if (item.tooLong) {
                        fail(item, 'post is too long, please fix it');
                    }
                }
            }
            const allowedCreationMethods = ['CLI', 'API'];
            const creationMethod = allowedCreationMethods.includes(rawBody.creationMethod)
                ? rawBody.creationMethod
                : 'API';
            return this._postsService.createPost(org.id, body, creationMethod);
        });
    }
    deletePost(org, id) {
        return __awaiter(this, void 0, void 0, function* () {
            Sentry.metrics.count('public_api-request', 1);
            const getPostById = yield this._postsService.getPost(org.id, id);
            return this._postsService.deletePost(org.id, getPostById.group);
        });
    }
    deletePostByGroup(org, group) {
        Sentry.metrics.count('public_api-request', 1);
        return this._postsService.deletePost(org.id, group);
    }
    getActiveIntegrations(org) {
        return __awaiter(this, void 0, void 0, function* () {
            Sentry.metrics.count('public_api-request', 1);
            return { connected: true };
        });
    }
    listGroups(org) {
        return __awaiter(this, void 0, void 0, function* () {
            Sentry.metrics.count('public_api-request', 1);
            return (yield this._integrationService.customers(org.id)).map((customer) => ({
                id: customer.id,
                name: customer.name,
            }));
        });
    }
    listIntegration(org, group) {
        return __awaiter(this, void 0, void 0, function* () {
            Sentry.metrics.count('public_api-request', 1);
            return (yield this._integrationService.getIntegrationsList(org.id))
                .filter((integration) => { var _a; return !group || ((_a = integration.customer) === null || _a === void 0 ? void 0 : _a.id) === group; })
                .map((integration) => ({
                id: integration.id,
                name: integration.name,
                identifier: integration.providerIdentifier,
                picture: integration.picture,
                disabled: integration.disabled,
                profile: integration.profile,
                customer: integration.customer
                    ? {
                        id: integration.customer.id,
                        name: integration.customer.name,
                    }
                    : undefined,
            }));
        });
    }
    getIntegrationUrl(integration, refresh, org) {
        return __awaiter(this, void 0, void 0, function* () {
            Sentry.metrics.count('public_api-request', 1);
            if (!this._integrationManager
                .getAllowedSocialsIntegrations()
                .includes(integration)) {
                throw new HttpException({ msg: 'Integration not allowed' }, 400);
            }
            const integrationProvider = this._integrationManager.getSocialIntegration(integration);
            if (integrationProvider.externalUrl) {
                throw new HttpException({
                    msg: 'This integration requires an external URL and is not supported via the public API',
                }, 400);
            }
            try {
                const { codeVerifier, state, url } = yield integrationProvider.generateAuthUrl();
                if (refresh) {
                    yield ioRedis.set(`refresh:${state}`, refresh, 'EX', 3600);
                }
                yield ioRedis.set(`organization:${state}`, org.id, 'EX', 3600);
                yield ioRedis.set(`login:${state}`, codeVerifier, 'EX', 3600);
                return { url };
            }
            catch (err) {
                throw new HttpException({ msg: 'Failed to generate auth URL' }, 500);
            }
        });
    }
    getNotifications(org, query) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            Sentry.metrics.count('public_api-request', 1);
            return this._notificationService.getNotificationsPaginated(org.id, (_a = query.page) !== null && _a !== void 0 ? _a : 0);
        });
    }
    generateVideo(org, body) {
        Sentry.metrics.count('public_api-request', 1);
        return this._mediaService.generateVideo(org, body);
    }
    videoFunction(body) {
        Sentry.metrics.count('public_api-request', 1);
        return this._mediaService.videoFunction(body.identifier, body.functionName, body.params);
    }
    deleteChannel(org, id) {
        return __awaiter(this, void 0, void 0, function* () {
            Sentry.metrics.count('public_api-request', 1);
            const isTherePosts = yield this._integrationService.getPostsForChannel(org.id, id);
            if (isTherePosts.length) {
                for (const post of isTherePosts) {
                    this._postsService.deletePost(org.id, post.group).catch(() => { });
                }
            }
            return this._integrationService.deleteChannel(org.id, id);
        });
    }
    getIntegrationSettings(org, id) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            Sentry.metrics.count('public_api-request', 1);
            const loadIntegration = yield this._integrationService.getIntegrationById(org.id, id);
            if (!loadIntegration) {
                throw new HttpException({ msg: 'Integration not found' }, 404);
            }
            const verified = ((_b = (_a = JSON.parse(loadIntegration.additionalSettings || '[]')) === null || _a === void 0 ? void 0 : _a.find((p) => (p === null || p === void 0 ? void 0 : p.title) === 'Verified')) === null || _b === void 0 ? void 0 : _b.value) || false;
            const integration = socialIntegrationList.find((p) => p.identifier === loadIntegration.providerIdentifier);
            if (!integration) {
                return {
                    output: { rules: '', maxLength: 0, settings: {}, tools: [] },
                };
            }
            const maxLength = integration.maxLength(verified);
            const schemas = !integration.dto
                ? false
                : getValidationSchemas()[integration.dto.name];
            const tools = this._integrationManager.getAllTools();
            const rules = this._integrationManager.getAllRulesDescription();
            return {
                output: {
                    rules: rules[integration.identifier],
                    maxLength,
                    settings: !schemas ? 'No additional settings required' : schemas,
                    tools: tools[integration.identifier],
                },
            };
        });
    }
    getMissingContent(org, id) {
        return __awaiter(this, void 0, void 0, function* () {
            Sentry.metrics.count('public_api-request', 1);
            return this._postsService.getMissingContent(org.id, id);
        });
    }
    changePostStatus(org, id, body) {
        return __awaiter(this, void 0, void 0, function* () {
            Sentry.metrics.count('public_api-request', 1);
            return this._postsService.changePostStatus(org.id, id, body.status);
        });
    }
    updateReleaseId(org, id, releaseId) {
        return __awaiter(this, void 0, void 0, function* () {
            Sentry.metrics.count('public_api-request', 1);
            return this._postsService.updateReleaseId(org.id, id, releaseId);
        });
    }
    getAnalytics(org, integration, date) {
        return __awaiter(this, void 0, void 0, function* () {
            Sentry.metrics.count('public_api-request', 1);
            return this._integrationService.checkAnalytics(org, integration, date);
        });
    }
    getPostAnalytics(org, postId, date) {
        return __awaiter(this, void 0, void 0, function* () {
            Sentry.metrics.count('public_api-request', 1);
            return this._postsService.checkPostAnalytics(org.id, postId, +date);
        });
    }
    triggerIntegrationTool(org, id, body) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            Sentry.metrics.count('public_api-request', 1);
            const getIntegration = yield this._integrationService.getIntegrationById(org.id, id);
            if (!getIntegration) {
                throw new HttpException({ msg: 'Integration not found' }, 404);
            }
            const integrationProvider = socialIntegrationList.find((p) => p.identifier === getIntegration.providerIdentifier);
            if (!integrationProvider) {
                throw new HttpException({ msg: 'Integration provider not found' }, 404);
            }
            const tools = this._integrationManager.getAllTools();
            if (
            // @ts-ignore
            !((_a = tools[integrationProvider.identifier]) === null || _a === void 0 ? void 0 : _a.some((p) => p.methodName === body.methodName)) ||
                // @ts-ignore
                !integrationProvider[body.methodName]) {
                throw new HttpException({ msg: 'Tool not found' }, 404);
            }
            while (true) {
                try {
                    // @ts-ignore
                    const result = yield integrationProvider[body.methodName](getIntegration.token, body.data || {}, getIntegration.internalId, getIntegration);
                    return { output: result };
                }
                catch (err) {
                    if (err instanceof RefreshToken) {
                        const data = yield this._refreshIntegrationService.refresh(getIntegration);
                        if (!data) {
                            yield this._integrationService.disconnectChannel(org.id, getIntegration);
                            throw new HttpException({ msg: 'Channel disconnected due to expired token' }, 401);
                        }
                        const { accessToken } = data;
                        if (accessToken) {
                            getIntegration.token = accessToken;
                            if (integrationProvider.refreshWait) {
                                yield timer(10000);
                            }
                            continue;
                        }
                    }
                    throw new HttpException({ msg: 'Unexpected error' }, 500);
                }
            }
        });
    }
};
__decorate([
    Post('/upload'),
    UseInterceptors(FileInterceptor('file')),
    UsePipes(new CustomFileValidationPipe()),
    __param(0, GetOrgFromRequest()),
    __param(1, UploadedFile('file')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "uploadSimple", null);
__decorate([
    Post('/upload-from-url'),
    __param(0, GetOrgFromRequest()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, UploadDto]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "uploadsFromUrl", null);
__decorate([
    Get('/find-slot/:id'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "findSlotIntegration", null);
__decorate([
    Get('/posts'),
    __param(0, GetOrgFromRequest()),
    __param(1, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, GetPostsDto]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "getPosts", null);
__decorate([
    Post('/posts'),
    CheckPolicies([AuthorizationActions.Create, Sections.POSTS_PER_MONTH]),
    __param(0, GetOrgFromRequest()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "createPost", null);
__decorate([
    Delete('/posts/:id'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "deletePost", null);
__decorate([
    Delete('/posts/group/:group'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('group')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PublicIntegrationsController.prototype, "deletePostByGroup", null);
__decorate([
    Get('/is-connected'),
    __param(0, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "getActiveIntegrations", null);
__decorate([
    Get('/groups'),
    __param(0, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "listGroups", null);
__decorate([
    Get('/integrations'),
    __param(0, GetOrgFromRequest()),
    __param(1, Query('group')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "listIntegration", null);
__decorate([
    Get('/social/:integration'),
    CheckPolicies([AuthorizationActions.Create, Sections.CHANNEL]),
    __param(0, Param('integration')),
    __param(1, Query('refresh')),
    __param(2, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "getIntegrationUrl", null);
__decorate([
    Get('/notifications'),
    __param(0, GetOrgFromRequest()),
    __param(1, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, GetNotificationsDto]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "getNotifications", null);
__decorate([
    Post('/generate-video'),
    __param(0, GetOrgFromRequest()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, VideoDto]),
    __metadata("design:returntype", void 0)
], PublicIntegrationsController.prototype, "generateVideo", null);
__decorate([
    Post('/video/function'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VideoFunctionDto]),
    __metadata("design:returntype", void 0)
], PublicIntegrationsController.prototype, "videoFunction", null);
__decorate([
    Delete('/integrations/:id'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "deleteChannel", null);
__decorate([
    Get('/integration-settings/:id'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "getIntegrationSettings", null);
__decorate([
    Get('/posts/:id/missing'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "getMissingContent", null);
__decorate([
    Put('/posts/:id/status'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, ChangePostStatusDto]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "changePostStatus", null);
__decorate([
    Put('/posts/:id/release-id'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __param(2, Body('releaseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "updateReleaseId", null);
__decorate([
    Get('/analytics/:integration'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('integration')),
    __param(2, Query('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "getAnalytics", null);
__decorate([
    Get('/analytics/post/:postId'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('postId')),
    __param(2, Query('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "getPostAnalytics", null);
__decorate([
    Post('/integration-trigger/:id'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "triggerIntegrationTool", null);
PublicIntegrationsController = __decorate([
    ApiTags('Public API'),
    Controller('/public/v1'),
    __metadata("design:paramtypes", [IntegrationService,
        PostsService,
        MediaService,
        NotificationService,
        IntegrationManager,
        RefreshIntegrationService])
], PublicIntegrationsController);
export { PublicIntegrationsController };
//# sourceMappingURL=public.integrations.controller.js.map