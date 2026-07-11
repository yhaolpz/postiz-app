import { __awaiter, __decorate, __rest } from "tslib";
import { makeId } from "../../services/make.is";
import dayjs from 'dayjs';
import { SocialAbstract, } from "../social.abstract";
import { FacebookDto, FACEBOOK_PRESET_MAX_CHARS, } from "../../dtos/posts/providers-settings/facebook.dto";
import { hasExtension } from "../../../../helpers/src/utils/has.extension";
import { timer } from "../../../../helpers/src/utils/timer";
import { Rules } from "../../chat/rules.description.decorator";
let FacebookProvider = class FacebookProvider extends SocialAbstract {
    constructor() {
        super(...arguments);
        this.identifier = 'facebook';
        this.name = 'Facebook Page';
        this.isBetweenSteps = true;
        this.scopes = [
            'pages_show_list',
            'business_management',
            'pages_manage_posts',
            'pages_manage_engagement',
            'pages_read_engagement',
            'read_insights',
        ];
        this.maxConcurrentJob = 500; // Facebook has reasonable rate limits
        this.editor = 'normal';
        this.dto = FacebookDto;
    }
    maxLength() {
        return 63206;
    }
    checkValidity(_a, settings_1) {
        return __awaiter(this, arguments, void 0, function* ([firstPost], settings) {
            var _b, _c;
            if ((settings === null || settings === void 0 ? void 0 : settings.post_type) === 'reel') {
                if (((_b = firstPost === null || firstPost === void 0 ? void 0 : firstPost.length) !== null && _b !== void 0 ? _b : 0) !== 1) {
                    return 'Reel should have exactly one video';
                }
                if (!hasExtension((_c = firstPost === null || firstPost === void 0 ? void 0 : firstPost[0]) === null || _c === void 0 ? void 0 : _c.path, 'mp4')) {
                    return 'Reel should be an MP4 video';
                }
            }
            if ((settings === null || settings === void 0 ? void 0 : settings.post_type) === 'story') {
                if (!(firstPost === null || firstPost === void 0 ? void 0 : firstPost.length)) {
                    return 'Story should have at least one media';
                }
            }
            return true;
        });
    }
    handleErrors(body, status) {
        const graphError = (() => {
            var _a;
            try {
                return (_a = JSON.parse(body)) === null || _a === void 0 ? void 0 : _a.error;
            }
            catch (_b) {
                return undefined;
            }
        })();
        const graphMessage = typeof (graphError === null || graphError === void 0 ? void 0 : graphError.message) === 'string' ? graphError.message : '';
        const graphCode = typeof (graphError === null || graphError === void 0 ? void 0 : graphError.code) === 'number' ? graphError.code : undefined;
        // Access token validation errors - require re-authentication
        if (body.indexOf('Error validating access token') > -1) {
            return {
                type: 'refresh-token',
                value: 'Please re-authenticate your Facebook account',
            };
        }
        if (body.indexOf('REVOKED_ACCESS_TOKEN') > -1) {
            return {
                type: 'refresh-token',
                value: 'Access token has been revoked, please re-authenticate',
            };
        }
        if (body.indexOf('1366046') > -1) {
            return {
                type: 'bad-body',
                value: 'Photos should be smaller than 4 MB and saved as JPG, PNG',
            };
        }
        if (body.indexOf('1390008') > -1) {
            return {
                type: 'bad-body',
                value: 'You are posting too fast, please slow down',
            };
        }
        // Content policy violations
        if (body.indexOf('1346003') > -1) {
            return {
                type: 'bad-body',
                value: 'Content flagged as abusive by Facebook',
            };
        }
        if (body.indexOf('1404006') > -1) {
            return {
                type: 'bad-body',
                value: "We couldn't post your comment, A security check in facebook required to proceed.",
            };
        }
        if (body.indexOf('2069019') > -1) {
            return {
                type: 'bad-body',
                value: 'Invalid file',
            };
        }
        if (body.indexOf('1404102') > -1) {
            return {
                type: 'bad-body',
                value: 'Content violates Facebook Community Standards',
            };
        }
        // Permission errors
        if (body.indexOf('1404078') > -1) {
            return {
                type: 'refresh-token',
                value: 'Page publishing authorization required, please re-authenticate',
            };
        }
        if (body.indexOf('1366051') > -1) {
            return {
                type: 'bad-body',
                value: 'These photos were already posted.',
            };
        }
        if (body.indexOf('1609008') > -1) {
            return {
                type: 'bad-body',
                value: 'Cannot post Facebook.com links',
            };
        }
        // Parameter validation errors
        if (body.indexOf('2061006') > -1) {
            return {
                type: 'bad-body',
                value: 'Invalid URL format in post content',
            };
        }
        if (body.indexOf('1349125') > -1) {
            return {
                type: 'bad-body',
                value: 'Invalid content format',
            };
        }
        if (body.indexOf('1404112') > -1) {
            return {
                type: 'bad-body',
                value: 'For security reasons, your account has limited access to the site for a few days',
            };
        }
        if (body.indexOf('Name parameter too long') > -1) {
            return {
                type: 'bad-body',
                value: 'Post content is too long',
            };
        }
        // Service errors - checking specific subcodes first
        if (body.indexOf('1363047') > -1) {
            return {
                type: 'bad-body',
                value: 'Facebook service temporarily unavailable',
            };
        }
        if (body.indexOf('1609010') > -1) {
            return {
                type: 'bad-body',
                value: 'Facebook service temporarily unavailable',
            };
        }
        if (body.indexOf('4854002') > -1) {
            return {
                type: 'bad-body',
                value: 'Confirm your identity before you can publish as this Page. Open the Facebook app on your phone and follow the instructions',
            };
        }
        if (body.indexOf('(#100) No permission to publish the video') > -1) {
            return {
                type: 'bad-body',
                value: 'Facebook return: No permission to publish the video',
            };
        }
        if (body.indexOf('490') > -1) {
            return {
                type: 'refresh-token',
                value: 'Access token expired, please re-authenticate',
            };
        }
        if (/Cannot call API for app .* on behalf of user/i.test(graphMessage)) {
            return {
                type: 'retry',
                value: 'Facebook temporarily rejected the app/Page context, retrying shortly',
            };
        }
        if (graphCode === 190) {
            return {
                type: 'refresh-token',
                value: 'Facebook access token expired, please re-authenticate',
            };
        }
        if (graphMessage) {
            return {
                type: 'bad-body',
                value: `Facebook returned: ${graphMessage}`,
            };
        }
        if (status === 401) {
            return {
                type: 'bad-body',
                value: 'An unknown error occurred, please try again later or contact support',
            };
        }
        return undefined;
    }
    refreshToken(refresh_token) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                refreshToken: '',
                expiresIn: 0,
                accessToken: '',
                id: '',
                name: '',
                picture: '',
                username: '',
            };
        });
    }
    generateAuthUrl() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
                throw new Error('Missing Facebook app credentials');
            }
            const state = makeId(6);
            return {
                url: 'https://www.facebook.com/v20.0/dialog/oauth' +
                    `?client_id=${process.env.FACEBOOK_APP_ID}` +
                    `&redirect_uri=${encodeURIComponent(`${process.env.FRONTEND_URL}/integrations/social/facebook`)}` +
                    `&state=${state}` +
                    `&scope=${this.scopes.join(',')}`,
                codeVerifier: makeId(10),
                state,
            };
        });
    }
    reConnect(id, requiredId, accessToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const information = yield this.fetchPageInformation(accessToken, {
                page: requiredId,
            });
            return {
                id: information.id,
                name: information.name,
                accessToken: information.access_token,
                picture: information.picture,
                username: information.username,
            };
        });
    }
    authenticate(params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const getAccessToken = yield (yield fetch('https://graph.facebook.com/v20.0/oauth/access_token' +
                `?client_id=${process.env.FACEBOOK_APP_ID}` +
                `&redirect_uri=${encodeURIComponent(`${process.env.FRONTEND_URL}/integrations/social/facebook${params.refresh ? `?refresh=${params.refresh}` : ''}`)}` +
                `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
                `&code=${params.code}`)).json();
            const { access_token } = yield (yield fetch('https://graph.facebook.com/v20.0/oauth/access_token' +
                '?grant_type=fb_exchange_token' +
                `&client_id=${process.env.FACEBOOK_APP_ID}` +
                `&client_secret=${process.env.FACEBOOK_APP_SECRET}` +
                `&fb_exchange_token=${getAccessToken.access_token}&fields=access_token,expires_in`)).json();
            const { data } = yield (yield fetch(`https://graph.facebook.com/v20.0/me/permissions?access_token=${access_token}`)).json();
            const permissions = data
                .filter((d) => d.status === 'granted')
                .map((p) => p.permission);
            this.checkScopes(this.scopes, permissions);
            const { id, name, picture } = yield (yield fetch(`https://graph.facebook.com/v20.0/me?fields=id,name,picture&access_token=${access_token}`)).json();
            return {
                id,
                name,
                accessToken: access_token,
                refreshToken: access_token,
                expiresIn: dayjs().add(59, 'days').unix() - dayjs().unix(),
                picture: ((_a = picture === null || picture === void 0 ? void 0 : picture.data) === null || _a === void 0 ? void 0 : _a.url) || '',
                username: '',
            };
        });
    }
    pages(accessToken) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const seenIds = new Set();
            const allPages = [];
            const fetchPaginated = (startUrl) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                let nextUrl = startUrl;
                while (nextUrl) {
                    const response = yield (yield fetch(nextUrl)).json();
                    if (response.data) {
                        for (const page of response.data) {
                            if (!seenIds.has(page.id)) {
                                seenIds.add(page.id);
                                allPages.push(page);
                            }
                        }
                    }
                    nextUrl = (_a = response.paging) === null || _a === void 0 ? void 0 : _a.next;
                }
            });
            // Fetch pages the user explicitly shared during the OAuth dialog
            yield fetchPaginated(`https://graph.facebook.com/v20.0/me/accounts?fields=id,username,name,access_token,picture.type(large)&limit=100&access_token=${accessToken}`);
            // Also fetch pages via Business Manager API to discover pages
            // not selected during the OAuth page selection step
            try {
                let bizUrl = `https://graph.facebook.com/v20.0/me/businesses?access_token=${accessToken}`;
                while (bizUrl) {
                    const bizResponse = yield (yield fetch(bizUrl)).json();
                    if (bizResponse.data) {
                        for (const business of bizResponse.data) {
                            try {
                                yield fetchPaginated(`https://graph.facebook.com/v20.0/${business.id}/owned_pages?fields=id,username,name,access_token,picture.type(large)&limit=100&access_token=${accessToken}`);
                            }
                            catch (_b) {
                                // Continue with other businesses
                            }
                            try {
                                yield fetchPaginated(`https://graph.facebook.com/v20.0/${business.id}/client_pages?fields=id,username,name,access_token,picture.type(large)&limit=100&access_token=${accessToken}`);
                            }
                            catch (_c) {
                                // Continue with other businesses
                            }
                        }
                    }
                    bizUrl = (_a = bizResponse.paging) === null || _a === void 0 ? void 0 : _a.next;
                }
            }
            catch (_d) {
                // Business Manager API not available for all users
            }
            return allPages;
        });
    }
    fetchPageInformation(accessToken, data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const pageId = data.page;
            const fields = 'id,username,name,access_token,picture.type(large)';
            const searchPaginated = (startUrl) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c;
                let url = startUrl;
                while (url) {
                    const response = yield (yield fetch(url)).json();
                    if (response.data) {
                        const page = response.data.find((p) => String(p.id) === String(pageId));
                        if (page) {
                            return {
                                id: page.id,
                                name: page.name,
                                access_token: page.access_token,
                                picture: ((_b = (_a = page.picture) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.url) || '',
                                username: page.username,
                            };
                        }
                    }
                    url = (_c = response.paging) === null || _c === void 0 ? void 0 : _c.next;
                }
                return null;
            });
            // 1. Check /me/accounts
            const fromAccounts = yield searchPaginated(`https://graph.facebook.com/v20.0/me/accounts?fields=${fields}&limit=100&access_token=${accessToken}`);
            if (fromAccounts)
                return fromAccounts;
            // 2. Check Business Manager owned_pages and client_pages
            try {
                let bizUrl = `https://graph.facebook.com/v20.0/me/businesses?access_token=${accessToken}`;
                while (bizUrl) {
                    const bizResponse = yield (yield fetch(bizUrl)).json();
                    if (bizResponse.data) {
                        for (const business of bizResponse.data) {
                            try {
                                const fromOwned = yield searchPaginated(`https://graph.facebook.com/v20.0/${business.id}/owned_pages?fields=${fields}&limit=100&access_token=${accessToken}`);
                                if (fromOwned)
                                    return fromOwned;
                            }
                            catch (_b) {
                                // Continue with other businesses
                            }
                            try {
                                const fromClient = yield searchPaginated(`https://graph.facebook.com/v20.0/${business.id}/client_pages?fields=${fields}&limit=100&access_token=${accessToken}`);
                                if (fromClient)
                                    return fromClient;
                            }
                            catch (_c) {
                                // Continue with other businesses
                            }
                        }
                    }
                    bizUrl = (_a = bizResponse.paging) === null || _a === void 0 ? void 0 : _a.next;
                }
            }
            catch (_d) {
                // Business Manager API not available for all users
            }
            throw new Error('Page not found in your accounts');
        });
    }
    post(id, accessToken, postDetails) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
            const [firstPost] = postDetails;
            const isStory = ((_a = firstPost === null || firstPost === void 0 ? void 0 : firstPost.settings) === null || _a === void 0 ? void 0 : _a.post_type) === 'story';
            const isReel = ((_b = firstPost === null || firstPost === void 0 ? void 0 : firstPost.settings) === null || _b === void 0 ? void 0 : _b.post_type) === 'reel';
            let finalId = '';
            let finalUrl = '';
            if (isReel) {
                const { video_id, upload_url } = yield (yield this.fetch(`https://graph.facebook.com/v20.0/${id}/video_reels?upload_phase=start&access_token=${accessToken}`, {
                    method: 'POST',
                }, 'start reel upload')).json();
                const reelUrl = (_d = (_c = firstPost === null || firstPost === void 0 ? void 0 : firstPost.media) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.path;
                const isLocalReelUrl = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?\//i.test(reelUrl);
                if (isLocalReelUrl) {
                    const reelResponse = yield fetch(reelUrl);
                    if (!reelResponse.ok) {
                        throw new Error(`Could not read local reel media: ${reelResponse.status}`);
                    }
                    const reelBuffer = Buffer.from(yield reelResponse.arrayBuffer());
                    yield this.fetch(upload_url, {
                        method: 'POST',
                        headers: {
                            Authorization: `OAuth ${accessToken}`,
                            offset: '0',
                            file_size: String(reelBuffer.byteLength),
                            'Content-Type': 'application/octet-stream',
                        },
                        body: reelBuffer,
                    }, 'upload local reel');
                }
                else {
                    yield this.fetch(upload_url, {
                        method: 'POST',
                        headers: {
                            Authorization: `OAuth ${accessToken}`,
                            file_url: reelUrl,
                        },
                    }, 'upload reel');
                }
                let videoStatus = 'in_progress';
                let attempts = 0;
                const maxAttempts = 54; // ~9 minutes at 10s interval
                while (videoStatus !== 'upload_complete' && videoStatus !== 'ready') {
                    if (attempts++ >= maxAttempts) {
                        throw new Error('Reel processing timed out');
                    }
                    const { status } = yield (yield this.fetch(`https://graph.facebook.com/v20.0/${video_id}?fields=status&access_token=${accessToken}`, undefined, '', 0, true)).json();
                    videoStatus = (status === null || status === void 0 ? void 0 : status.video_status) || 'in_progress';
                    if (videoStatus === 'error') {
                        throw new Error('Reel processing failed');
                    }
                    if (videoStatus !== 'upload_complete' && videoStatus !== 'ready') {
                        yield timer(10000);
                    }
                }
                const reelState = ((_e = firstPost === null || firstPost === void 0 ? void 0 : firstPost.settings) === null || _e === void 0 ? void 0 : _e.video_state) || 'PUBLISHED';
                const finishParams = new URLSearchParams({
                    upload_phase: 'finish',
                    video_id,
                    video_state: reelState,
                    access_token: accessToken,
                });
                if (firstPost.message) {
                    finishParams.set('description', firstPost.message);
                }
                if ((_f = firstPost === null || firstPost === void 0 ? void 0 : firstPost.settings) === null || _f === void 0 ? void 0 : _f.title) {
                    finishParams.set('title', firstPost.settings.title);
                }
                yield (yield this.fetch(`https://graph.facebook.com/v20.0/${id}/video_reels?${finishParams.toString()}`, {
                    method: 'POST',
                }, 'finish reel upload')).json();
                finalId = video_id;
                finalUrl = 'https://www.facebook.com/reel/' + video_id;
            }
            else if (isStory) {
                let lastPostId = '';
                for (const media of (firstPost === null || firstPost === void 0 ? void 0 : firstPost.media) || []) {
                    const isVideoStory = hasExtension(media.path, 'mp4');
                    if (isVideoStory) {
                        const { video_id, upload_url } = yield (yield this.fetch(`https://graph.facebook.com/v20.0/${id}/video_stories?upload_phase=start&access_token=${accessToken}`, {
                            method: 'POST',
                        }, 'start video story upload')).json();
                        yield this.fetch(upload_url, {
                            method: 'POST',
                            headers: {
                                Authorization: `OAuth ${accessToken}`,
                                file_url: media.path,
                            },
                        }, 'upload video story');
                        let videoStatus = 'in_progress';
                        let attempts = 0;
                        const maxAttempts = 54; // ~9 minutes at 10s interval
                        while (videoStatus !== 'upload_complete' && videoStatus !== 'ready') {
                            if (attempts++ >= maxAttempts) {
                                throw new Error('Video processing timed out');
                            }
                            const { status } = yield (yield this.fetch(`https://graph.facebook.com/v20.0/${video_id}?fields=status&access_token=${accessToken}`, undefined, '', 0, true)).json();
                            videoStatus = (status === null || status === void 0 ? void 0 : status.video_status) || 'in_progress';
                            if (videoStatus === 'error') {
                                throw new Error('Video processing failed');
                            }
                            if (videoStatus !== 'upload_complete' && videoStatus !== 'ready') {
                                yield timer(10000);
                            }
                        }
                        const { post_id: storyPostId } = yield (yield this.fetch(`https://graph.facebook.com/v20.0/${id}/video_stories?upload_phase=finish&video_id=${video_id}&access_token=${accessToken}`, {
                            method: 'POST',
                        }, 'finish video story upload')).json();
                        lastPostId = storyPostId;
                    }
                    else {
                        const { id: photoId } = yield (yield this.fetch(`https://graph.facebook.com/v20.0/${id}/photos?access_token=${accessToken}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                url: media.path,
                                published: false,
                            }),
                        }, 'upload photo story')).json();
                        const { post_id: storyPostId } = yield (yield this.fetch(`https://graph.facebook.com/v20.0/${id}/photo_stories?photo_id=${photoId}&access_token=${accessToken}`, {
                            method: 'POST',
                        }, 'publish photo story')).json();
                        lastPostId = storyPostId;
                    }
                }
                finalId = lastPostId;
                finalUrl = `https://www.facebook.com/stories/${lastPostId}`;
            }
            else if (hasExtension((_h = (_g = firstPost === null || firstPost === void 0 ? void 0 : firstPost.media) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.path, 'mp4')) {
                const _r = yield (yield this.fetch(`https://graph.facebook.com/v20.0/${id}/videos?access_token=${accessToken}&fields=id,permalink_url`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        file_url: (_k = (_j = firstPost === null || firstPost === void 0 ? void 0 : firstPost.media) === null || _j === void 0 ? void 0 : _j[0]) === null || _k === void 0 ? void 0 : _k.path,
                        description: firstPost.message,
                        published: true,
                    }),
                }, 'upload mp4')).json(), { id: videoId, permalink_url } = _r, all = __rest(_r, ["id", "permalink_url"]);
                finalUrl = 'https://www.facebook.com/reel/' + videoId;
                finalId = videoId;
            }
            else {
                const uploadPhotos = !((_l = firstPost === null || firstPost === void 0 ? void 0 : firstPost.media) === null || _l === void 0 ? void 0 : _l.length)
                    ? []
                    : yield Promise.all(firstPost.media.map((media) => __awaiter(this, void 0, void 0, function* () {
                        const { id: photoId } = yield (yield this.fetch(`https://graph.facebook.com/v20.0/${id}/photos?access_token=${accessToken}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                url: media.path,
                                published: false,
                            }),
                        }, 'upload images slides')).json();
                        return { media_fbid: photoId };
                    })));
                // Background presets are only valid on text-only posts (no media) and
                // Facebook caps them at ~130 chars, so we only attach the preset when it
                // can apply.
                const presetId = !(uploadPhotos === null || uploadPhotos === void 0 ? void 0 : uploadPhotos.length) &&
                    ((_m = firstPost === null || firstPost === void 0 ? void 0 : firstPost.settings) === null || _m === void 0 ? void 0 : _m.text_format_preset_id) &&
                    (((_o = firstPost.message) === null || _o === void 0 ? void 0 : _o.length) || 0) <= FACEBOOK_PRESET_MAX_CHARS
                    ? firstPost.settings.text_format_preset_id
                    : undefined;
                const publishFeed = (withPreset) => __awaiter(this, void 0, void 0, function* () {
                    var _a;
                    return (yield this.fetch(`https://graph.facebook.com/v20.0/${id}/feed?access_token=${accessToken}&fields=id,permalink_url`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(Object.assign(Object.assign(Object.assign(Object.assign({}, ((uploadPhotos === null || uploadPhotos === void 0 ? void 0 : uploadPhotos.length)
                            ? { attached_media: uploadPhotos }
                            : {})), (((_a = firstPost === null || firstPost === void 0 ? void 0 : firstPost.settings) === null || _a === void 0 ? void 0 : _a.url)
                            ? { link: firstPost.settings.url }
                            : {})), (withPreset && presetId
                            ? { text_format_preset_id: presetId }
                            : {})), { message: firstPost.message, published: true })),
                    }, 'finalize upload')).json();
                });
                // Facebook exposes no official preset list and adds/retires backgrounds
                // over time, so a stale text_format_preset_id can make FB reject the whole
                // post. Observed Graph API responses for a bad preset:
                //   - malformed id  -> HTTP 400, code 100, message names
                //                      "text_format_preset_id" explicitly
                //   - retired numeric id -> HTTP 500, code 1, generic "unknown error"
                //     (our fetch() retries 500s and then reports it with the body stripped)
                // So retry once without the preset on an explicit preset error or a
                // generic/unknown failure, but never on a recognized auth/token error
                // (dropping the background can't fix that). A retry that only succeeds once
                // the preset is removed confirms the preset was the cause.
                const isPresetRejection = (err) => {
                    var _a, _b, _c, _d;
                    const detail = `${(_c = (_b = (_a = err === null || err === void 0 ? void 0 : err.details) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.json) !== null && _c !== void 0 ? _c : ''} ${(_d = err === null || err === void 0 ? void 0 : err.message) !== null && _d !== void 0 ? _d : ''}`;
                    if (/access token|re-authenticate|revoked|"code":\s*190\b/i.test(detail)) {
                        return false;
                    }
                    return (/text_format_preset_id/i.test(detail) ||
                        /"code":\s*1\b/.test(detail) ||
                        String(err === null || err === void 0 ? void 0 : err.message) === 'Unknown Error');
                };
                let feedResult;
                try {
                    feedResult = yield publishFeed(!!presetId);
                }
                catch (err) {
                    if (!presetId || !isPresetRejection(err)) {
                        throw err;
                    }
                    // Surface the (recovered) rejection in the logs, since the fallback
                    // below makes the activity succeed and Facebook's error would otherwise
                    // be swallowed silently.
                    console.warn('Facebook rejected text_format_preset_id — dropping the background and publishing as plain text', {
                        preset: presetId,
                        facebook: (_q = (_p = err === null || err === void 0 ? void 0 : err.details) === null || _p === void 0 ? void 0 : _p[0]) === null || _q === void 0 ? void 0 : _q.json,
                        message: err === null || err === void 0 ? void 0 : err.message,
                    });
                    feedResult = yield publishFeed(false);
                }
                const { id: postId, permalink_url } = feedResult, all = __rest(feedResult, ["id", "permalink_url"]);
                finalUrl = permalink_url;
                finalId = postId;
            }
            return [
                {
                    id: firstPost.id,
                    postId: finalId,
                    releaseURL: finalUrl,
                    status: 'success',
                },
            ];
        });
    }
    comment(id, postId, lastCommentId, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const [commentPost] = postDetails;
            const replyToId = lastCommentId || postId;
            const data = yield (yield this.fetch(`https://graph.facebook.com/v20.0/${replyToId}/comments?access_token=${accessToken}&fields=id,permalink_url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(Object.assign(Object.assign({}, (((_a = commentPost.media) === null || _a === void 0 ? void 0 : _a.length)
                    ? { attachment_url: commentPost.media[0].path }
                    : {})), { message: commentPost.message })),
            }, 'add comment')).json();
            return [
                {
                    id: commentPost.id,
                    postId: data.id,
                    releaseURL: data.permalink_url,
                    status: 'success',
                },
            ];
        });
    }
    analytics(id, accessToken, date) {
        return __awaiter(this, void 0, void 0, function* () {
            const until = dayjs().endOf('day').unix();
            const since = dayjs().subtract(date, 'day').unix();
            // Reach/impression metrics (page_impressions_unique, page_posts_impressions_unique,
            // page_video_views) were deprecated by Meta on 2026-06-15 and now return an
            // "invalid metric" error. They are replaced by the Media Views metrics, which
            // require Graph API v23.0+:
            //   - page_total_media_view_unique: total unique views on the page's media (reach)
            //   - page_media_view: total media views, broken down between paid and organic
            const { data } = yield (yield fetch(`https://graph.facebook.com/v23.0/${id}/insights?metric=page_total_media_view_unique,page_media_view,page_post_engagements,page_daily_follows&access_token=${accessToken}&period=day&since=${since}&until=${until}`)).json();
            // page_media_view returns paid/organic breakdowns as an object; sum them to
            // keep the single-total UI working.
            const sumValue = (value) => {
                if (value && typeof value === 'object') {
                    return Object.values(value).reduce((sum, v) => sum + (Number(v) || 0), 0);
                }
                return Number(value) || 0;
            };
            return ((data === null || data === void 0 ? void 0 : data.map((d) => {
                var _a;
                return ({
                    label: d.name === 'page_total_media_view_unique'
                        ? 'Page Impressions'
                        : d.name === 'page_post_engagements'
                            ? 'Posts Engagement'
                            : d.name === 'page_daily_follows'
                                ? 'Page followers'
                                : 'Media views',
                    percentageChange: 5,
                    data: (_a = d === null || d === void 0 ? void 0 : d.values) === null || _a === void 0 ? void 0 : _a.map((v) => ({
                        total: sumValue(v.value),
                        date: dayjs(v.end_time).format('YYYY-MM-DD'),
                    })),
                });
            })) || []);
        });
    }
    postAnalytics(integrationId, accessToken, postId, date) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const today = dayjs().format('YYYY-MM-DD');
            try {
                // Fetch post insights from Facebook Graph API.
                // post_impressions_unique was deprecated by Meta on 2026-06-15; it is replaced
                // by post_total_media_view_unique (unique media views = reach), available on
                // Graph API v23.0+. Engagement metrics below are unaffected.
                const { data } = yield (yield this.fetch(`https://graph.facebook.com/v23.0/${postId}/insights?metric=post_total_media_view_unique,post_reactions_by_type_total,post_clicks,post_clicks_by_type&access_token=${accessToken}`)).json();
                if (!data || data.length === 0) {
                    return [];
                }
                const result = [];
                for (const metric of data) {
                    const value = (_b = (_a = metric.values) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.value;
                    if (value === undefined)
                        continue;
                    let label = '';
                    let total = '';
                    switch (metric.name) {
                        case 'post_total_media_view_unique':
                            label = 'Impressions';
                            total = String(value);
                            break;
                        case 'post_clicks':
                            label = 'Clicks';
                            total = String(value);
                            break;
                        case 'post_clicks_by_type':
                            // This returns an object with click types
                            if (typeof value === 'object') {
                                const totalClicks = Object.values(value).reduce((sum, v) => sum + v, 0);
                                label = 'Clicks by Type';
                                total = String(totalClicks);
                            }
                            break;
                        case 'post_reactions_by_type_total':
                            // This returns an object with reaction types
                            if (typeof value === 'object') {
                                const totalReactions = Object.values(value).reduce((sum, v) => sum + v, 0);
                                label = 'Reactions';
                                total = String(totalReactions);
                            }
                            break;
                    }
                    if (label) {
                        result.push({
                            label,
                            percentageChange: 0,
                            data: [{ total, date: today }],
                        });
                    }
                }
                return result;
            }
            catch (err) {
                console.error('Error fetching Facebook post analytics:', err);
                return [];
            }
        });
    }
};
FacebookProvider = __decorate([
    Rules("Facebook posts can be text only, or include photos or a video. If it's a story, it must have at least one attachment (photo or video), and each media is published as a separate story.")
], FacebookProvider);
export { FacebookProvider };
//# sourceMappingURL=facebook.provider.js.map