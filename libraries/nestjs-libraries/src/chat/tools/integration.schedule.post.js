import { __awaiter, __decorate, __metadata } from "tslib";
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { IntegrationService } from "../../database/prisma/integrations/integration.service";
import { PostsService } from "../../database/prisma/posts/posts.service";
import { makeId } from "../../services/make.is";
import { checkAuth } from "../auth.context";
import { ValidUrlExtension, ValidUrlPath, } from "../../../../helpers/src/utils/valid.url.path";
const validUrlExtension = new ValidUrlExtension();
const validUrlPath = new ValidUrlPath();
// Same URL validation as MediaDto (valid.url.path) - each attachment must
// point to an allowed upload domain and a supported file extension.
const attachmentUrl = z
    .string()
    .refine((url) => validUrlPath.validate(url, {}), {
    message: validUrlPath.defaultMessage({}),
})
    .refine((url) => validUrlExtension.validate(url, {}), {
    message: validUrlExtension.defaultMessage({}),
});
let IntegrationSchedulePostTool = class IntegrationSchedulePostTool {
    constructor(_postsService, _integrationService) {
        this._postsService = _postsService;
        this._integrationService = _integrationService;
        this.name = 'integrationSchedulePostTool';
    }
    run() {
        return createTool({
            id: 'schedulePostTool',
            mcp: {
                annotations: {
                    title: 'Schedule Social Media Post',
                    readOnlyHint: false,
                    destructiveHint: false,
                    idempotentHint: false,
                    openWorldHint: true,
                },
            },
            description: `
This tool allows you to schedule a post to a social media platform, based on integrationSchema tool.
So for example:

If the user want to post a post to LinkedIn with one comment
- socialPost array length will be one
- postsAndComments array length will be two (one for the post, one for the comment)

If the user want to post 20 posts for facebook each in individual days without comments
- socialPost array length will be 20
- postsAndComments array length will be one

If the tools return errors, you would need to rerun it with the right parameters, don't ask again, just run it
`,
            inputSchema: z.object({
                socialPost: z
                    .array(z.object({
                    integrationId: z
                        .string()
                        .describe('The id of the integration (not internal id)'),
                    isPremium: z
                        .boolean()
                        .describe("If the integration is X, return if it's premium or not"),
                    date: z.string().describe('The date of the post in UTC time'),
                    shortLink: z
                        .boolean()
                        .describe('If the post has a link inside, we can ask the user if they want to add a short link'),
                    type: z
                        .enum(['draft', 'schedule', 'now'])
                        .describe('The type of the post, if we pass now, we should pass the current date also'),
                    postsAndComments: z
                        .array(z.object({
                        content: z
                            .string()
                            .describe("The content of the post, HTML, Each line must be wrapped in <p> here is the possible tags: h1, h2, h3, u, strong, li, ul, p (you can't have u and strong together)"),
                        attachments: z
                            .array(attachmentUrl)
                            .describe('The image of the post (URLS)'),
                    }))
                        .describe('first item is the post, every other item is the comments'),
                    settings: z
                        .array(z.object({
                        key: z
                            .string()
                            .describe('Name of the settings key to pass'),
                        value: z
                            .any()
                            .describe('Value of the key, always prefer the id then label if possible'),
                    }))
                        .describe('This relies on the integrationSchema tool to get the settings [input:settings]'),
                }))
                    .describe('Individual post'),
            }),
            outputSchema: z.object({
                output: z
                    .array(z.object({
                    postId: z.string(),
                    integration: z.string(),
                }))
                    .or(z.object({ errors: z.string() })),
            }),
            execute: (inputData, context) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                checkAuth(inputData, context);
                const organizationId = JSON.parse((_a = context === null || context === void 0 ? void 0 : context.requestContext) === null || _a === void 0 ? void 0 : _a.get('organization')).id;
                const finalOutput = [];
                const integrations = {};
                for (const platform of inputData.socialPost) {
                    integrations[platform.integrationId] =
                        yield this._integrationService.getIntegrationById(organizationId, platform.integrationId);
                    // Same server-side validation as the dashboard / public API
                    // (settings DTO + media checkValidity + empty / too-long content).
                    const settings = platform.settings.reduce((acc, s) => (Object.assign(Object.assign({}, acc), { [s.key]: s.value })), {});
                    const [validation] = yield this._postsService.validatePosts(organizationId, [
                        {
                            integration: { id: platform.integrationId },
                            settings,
                            value: platform.postsAndComments.map((p) => ({
                                content: p.content,
                                image: (p.attachments || []).map((path) => ({
                                    path,
                                })),
                            })),
                        },
                    ]);
                    if (validation.emptyContent) {
                        return {
                            errors: `${validation.name}: Your post should have at least one character or one image.`,
                        };
                    }
                    if (platform.type !== 'draft') {
                        if (!validation.valid) {
                            return {
                                errors: `${validation.name}: ${validation.settingsError || 'Please fix your settings'}, please fix it, and try integrationSchedulePostTool again.`,
                            };
                        }
                        if (validation.errors !== true) {
                            return {
                                errors: `${validation.name}: ${validation.errors}, please fix it, and try integrationSchedulePostTool again.`,
                            };
                        }
                        if (validation.tooLong) {
                            return {
                                errors: `${validation.name}: The maximum characters is ${validation.maximumCharacters}, please fix it, and try integrationSchedulePostTool again.`,
                            };
                        }
                    }
                }
                for (const post of inputData.socialPost) {
                    const integration = integrations[post.integrationId];
                    if (!integration) {
                        throw new Error('Integration not found');
                    }
                    const output = yield this._postsService.createPost(organizationId, {
                        date: post.date,
                        type: post.type,
                        shortLink: post.shortLink,
                        tags: [],
                        posts: [
                            {
                                integration,
                                group: makeId(10),
                                settings: post.settings.reduce((acc, s) => (Object.assign(Object.assign({}, acc), { [s.key]: s.value })), {
                                    __type: integration.providerIdentifier,
                                }),
                                value: post.postsAndComments.map((p) => ({
                                    content: p.content,
                                    id: makeId(10),
                                    delay: 0,
                                    image: p.attachments.map((p) => ({
                                        id: makeId(10),
                                        path: p,
                                    })),
                                })),
                            },
                        ],
                    }, 'MCP');
                    finalOutput.push(...output);
                }
                return {
                    output: finalOutput,
                };
            }),
        });
    }
};
IntegrationSchedulePostTool = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PostsService,
        IntegrationService])
], IntegrationSchedulePostTool);
export { IntegrationSchedulePostTool };
//# sourceMappingURL=integration.schedule.post.js.map