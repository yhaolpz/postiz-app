import { __awaiter } from "tslib";
import { SocialAbstract } from "../social.abstract";
import { makeId } from "../../services/make.is";
import dayjs from 'dayjs';
import { CnblogsDto } from "../../dtos/posts/providers-settings/cnblogs.dto";
export class CnblogsProvider extends SocialAbstract {
    constructor() {
        super(...arguments);
        this.maxConcurrentJob = 1;
        this.identifier = 'cnblogs';
        this.name = '博客园';
        this.isBetweenSteps = false;
        this.editor = 'html';
        this.scopes = [];
        this.dto = CnblogsDto;
    }
    maxLength() {
        return 100000;
    }
    generateAuthUrl() {
        return __awaiter(this, void 0, void 0, function* () {
            const state = makeId(6);
            return {
                url: state,
                codeVerifier: makeId(10),
                state,
            };
        });
    }
    refreshToken() {
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
    customFields() {
        return __awaiter(this, void 0, void 0, function* () {
            return [
                {
                    key: 'metaWeblogUrl',
                    label: 'MetaWeblog URL',
                    defaultValue: 'https://rpc.cnblogs.com/metaweblog/',
                    validation: `/^https:\\/\\/rpc\\.cnblogs\\.com\\/metaweblog\\/[A-Za-z0-9_-]+$/`,
                    type: 'text',
                    hint: 'Find it in cnblogs blog backend > Settings > Other settings > MetaWeblog access address.',
                },
                {
                    key: 'username',
                    label: 'MetaWeblog login name',
                    validation: `/.+/`,
                    type: 'text',
                },
                {
                    key: 'accessToken',
                    label: 'MetaWeblog access token',
                    validation: `/.{8,}/`,
                    type: 'password',
                    hint: 'Use the MetaWeblog access token, not your cnblogs account password.',
                },
            ];
        });
    }
    authenticate(params) {
        return __awaiter(this, void 0, void 0, function* () {
            let body;
            try {
                body = JSON.parse(Buffer.from(params.code, 'base64').toString());
            }
            catch (_a) {
                return 'Invalid credentials';
            }
            const metaWeblogUrl = normalizeCnblogsUrl(body.metaWeblogUrl);
            const blogId = extractBlogId(metaWeblogUrl);
            if (!metaWeblogUrl || !blogId || !body.username || !body.accessToken) {
                return 'Invalid credentials';
            }
            const token = {
                metaWeblogUrl,
                blogId,
                username: body.username.trim(),
                accessToken: body.accessToken.trim(),
            };
            try {
                yield this.callMetaWeblog(token, 'metaWeblog.getRecentPosts', [
                    token.blogId,
                    token.username,
                    token.accessToken,
                    1,
                ]);
            }
            catch (err) {
                console.log(err);
                return 'Invalid cnblogs MetaWeblog credentials';
            }
            return {
                refreshToken: '',
                expiresIn: dayjs().add(100, 'years').unix() - dayjs().unix(),
                accessToken: Buffer.from(JSON.stringify(token)).toString('base64'),
                id: token.blogId,
                name: `博客园 ${token.blogId}`,
                picture: '',
                username: token.username,
            };
        });
    }
    post(id, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            const token = readToken(accessToken);
            const post = postDetails === null || postDetails === void 0 ? void 0 : postDetails[0];
            const settings = (post === null || post === void 0 ? void 0 : post.settings) || {};
            const title = settings.title || 'Untitled';
            const categories = splitCategories(settings.categories);
            const publish = (settings.status || 'publish') === 'publish';
            const content = buildCnblogsBody((post === null || post === void 0 ? void 0 : post.message) || '', settings.canonical);
            const result = yield this.callMetaWeblog(token, 'metaWeblog.newPost', [
                token.blogId,
                token.username,
                token.accessToken,
                Object.assign(Object.assign(Object.assign({ dateCreated: new Date(), title, description: content }, (categories.length ? { categories } : {})), (settings.canonical ? { link: settings.canonical } : {})), { wp_slug: slugFromTitle(title) }),
                publish,
            ]);
            const postId = String(result);
            const publishedPost = yield this.getPublishedPost(token, postId);
            return [
                {
                    id: post === null || post === void 0 ? void 0 : post.id,
                    status: 'completed',
                    postId,
                    releaseURL: (publishedPost === null || publishedPost === void 0 ? void 0 : publishedPost.url) ||
                        `https://www.cnblogs.com/${token.blogId}/p/${postId}.html`,
                },
            ];
        });
    }
    getPublishedPost(token, postId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this.callMetaWeblogResponse(token, 'metaWeblog.getPost', [postId, token.username, token.accessToken]);
                return {
                    title: readXmlMember(response.raw, 'title'),
                    url: readXmlMember(response.raw, 'link') ||
                        readXmlMember(response.raw, 'permalink'),
                };
            }
            catch (_a) {
                return null;
            }
        });
    }
    callMetaWeblog(token, methodName, params) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.callMetaWeblogResponse(token, methodName, params)).value;
        });
    }
    callMetaWeblogResponse(token, methodName, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield fetch(token.metaWeblogUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'User-Agent': 'Postiz cnblogs integration',
                },
                body: xmlRpcCall(methodName, params),
            });
            const raw = yield response.text();
            const parsed = parseXmlRpcResponse(raw);
            if (!response.ok) {
                throw new Error(`Cnblogs MetaWeblog HTTP ${response.status}: ${parsed.faultString || response.statusText}`);
            }
            if (parsed.fault) {
                throw new Error(`Cnblogs MetaWeblog fault ${parsed.faultCode || 'unknown'}: ${parsed.faultString || 'unknown fault'}`);
            }
            return { raw, value: parsed.value };
        });
    }
}
function normalizeCnblogsUrl(url) {
    return String(url || '')
        .trim()
        .replace(/\/+$/, '');
}
function extractBlogId(metaWeblogUrl) {
    var _a;
    return (((_a = metaWeblogUrl.match(/^https:\/\/rpc\.cnblogs\.com\/metaweblog\/([A-Za-z0-9_-]+)$/i)) === null || _a === void 0 ? void 0 : _a[1]) || '');
}
function readToken(accessToken) {
    return JSON.parse(Buffer.from(accessToken, 'base64').toString());
}
function buildCnblogsBody(message, canonical) {
    const content = looksLikeHtml(message)
        ? message.trim()
        : textToHtmlParagraphs(message);
    if (!canonical || content.includes(canonical)) {
        return content;
    }
    return `<p><strong>原文：</strong><a href="${escapeHtmlAttribute(canonical)}">${escapeHtml(canonical)}</a></p>\n${content}`;
}
function textToHtmlParagraphs(message) {
    const paragraphs = String(message || '')
        .trim()
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`);
    return paragraphs.length ? paragraphs.join('\n') : '<p></p>';
}
function looksLikeHtml(value) {
    return /<\/?[a-z][\s\S]*>/i.test(value || '');
}
function splitCategories(value) {
    return String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}
function slugFromTitle(title) {
    const slug = String(title || '')
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
    return slug || `post-${Date.now()}`;
}
function xmlRpcCall(methodName, params) {
    return `<?xml version="1.0" encoding="UTF-8"?>\n<methodCall><methodName>${escapeXml(methodName)}</methodName><params>${params
        .map((param) => `<param>${xmlRpcValue(param)}</param>`)
        .join('')}</params></methodCall>`;
}
function xmlRpcValue(value) {
    if (value instanceof Date) {
        return `<value><dateTime.iso8601>${formatXmlRpcDate(value)}</dateTime.iso8601></value>`;
    }
    if (typeof value === 'boolean') {
        return `<value><boolean>${value ? '1' : '0'}</boolean></value>`;
    }
    if (typeof value === 'number') {
        return `<value><int>${Math.trunc(value)}</int></value>`;
    }
    if (Array.isArray(value)) {
        return `<value><array><data>${value
            .map((item) => xmlRpcValue(item))
            .join('')}</data></array></value>`;
    }
    if (value && typeof value === 'object') {
        const members = Object.entries(value)
            .filter(([, memberValue]) => memberValue !== undefined && memberValue !== null)
            .map(([name, memberValue]) => `<member><name>${escapeXml(name)}</name>${xmlRpcValue(memberValue)}</member>`)
            .join('');
        return `<value><struct>${members}</struct></value>`;
    }
    return `<value><string>${escapeXml(String(value !== null && value !== void 0 ? value : ''))}</string></value>`;
}
function parseXmlRpcResponse(text) {
    if (/<fault>/i.test(text)) {
        return {
            fault: true,
            faultCode: readXmlMember(text, 'faultCode'),
            faultString: readXmlMember(text, 'faultString') ||
                decodeXml(stripTags(readFirstValue(text))),
            value: '',
        };
    }
    return {
        fault: false,
        faultCode: '',
        faultString: '',
        value: parseXmlRpcValue(readFirstValue(text)),
    };
}
function parseXmlRpcValue(valueXml) {
    var _a, _b;
    if (!valueXml) {
        return '';
    }
    if (/<array>/i.test(valueXml)) {
        const data = readTag(valueXml, 'data') || '';
        return {
            type: 'array',
            itemCount: (data.match(/<struct>/gi) || data.match(/<value>/gi) || [])
                .length,
        };
    }
    if (/<struct>/i.test(valueXml)) {
        return {
            type: 'struct',
            memberCount: ((_a = valueXml.match(/<member>/gi)) === null || _a === void 0 ? void 0 : _a.length) || 0,
        };
    }
    const stringValue = readTag(valueXml, 'string');
    if (stringValue !== null) {
        return decodeXml(stringValue).trim();
    }
    const intValue = (_b = readTag(valueXml, 'int')) !== null && _b !== void 0 ? _b : readTag(valueXml, 'i4');
    if (intValue !== null) {
        return Number(intValue);
    }
    const booleanValue = readTag(valueXml, 'boolean');
    if (booleanValue !== null) {
        return booleanValue.trim() === '1';
    }
    return decodeXml(stripTags(valueXml)).trim();
}
function readFirstValue(text) {
    const match = text.match(/<param>\s*(<value>[\s\S]*?<\/value>)\s*<\/param>/i);
    return match ? match[1] : '';
}
function readXmlMember(text, name) {
    const pattern = new RegExp(`<member>\\s*<name>${escapeRegExp(name)}</name>\\s*<value>([\\s\\S]*?)</value>\\s*</member>`, 'i');
    const match = text.match(pattern);
    return match ? decodeXml(stripTags(match[1])).trim() : '';
}
function readTag(text, tag) {
    const pattern = new RegExp(`<${escapeRegExp(tag)}>([\\s\\S]*?)</${escapeRegExp(tag)}>`, 'i');
    const match = text.match(pattern);
    return match ? match[1] : null;
}
function formatXmlRpcDate(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}
function escapeXml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
function escapeHtmlAttribute(value) {
    return escapeHtml(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function decodeXml(value) {
    return String(value)
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
}
function stripTags(value) {
    return String(value).replace(/<[^>]+>/g, '');
}
function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
//# sourceMappingURL=cnblogs.provider.js.map