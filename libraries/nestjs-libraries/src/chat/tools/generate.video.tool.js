import { __awaiter, __decorate, __metadata } from "tslib";
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { MediaService } from "../../database/prisma/media/media.service";
import { VideoManager } from "../../videos/video.manager";
import { checkAuth } from "../auth.context";
let GenerateVideoTool = class GenerateVideoTool {
    constructor(_mediaService, _videoManager) {
        this._mediaService = _mediaService;
        this._videoManager = _videoManager;
        this.name = 'generateVideoTool';
    }
    run() {
        return createTool({
            id: 'generateVideoTool',
            mcp: {
                annotations: {
                    title: 'Generate Video',
                    readOnlyHint: false,
                    destructiveHint: false,
                    idempotentHint: false,
                    openWorldHint: true,
                },
            },
            description: `Generate video to use in a post,
                    in case the user specified a platform that requires attachment and attachment was not provided,
                    ask if they want to generate a picture of a video.
                    In many cases 'videoFunctionTool' will need to be called first, to get things like voice id
                    Here are the type of video that can be generated:
                    ${this._videoManager
                .getAllVideos()
                .map((p) => "-" + p.title)
                .join('\n')}
      `,
            inputSchema: z.object({
                identifier: z.string(),
                output: z.enum(['vertical', 'horizontal']),
                customParams: z.array(z.object({
                    key: z.string().describe('Name of the settings key to pass'),
                    value: z.any().describe('Value of the key'),
                })),
            }),
            outputSchema: z.object({
                url: z.string(),
            }),
            execute: (inputData, context) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                checkAuth(inputData, context);
                const org = JSON.parse((_a = context === null || context === void 0 ? void 0 : context.requestContext) === null || _a === void 0 ? void 0 : _a.get('organization'));
                const value = yield this._mediaService.generateVideo(org, {
                    type: inputData.identifier,
                    output: inputData.output,
                    customParams: inputData.customParams.reduce((all, current) => (Object.assign(Object.assign({}, all), { [current.key]: current.value })), {}),
                });
                return {
                    url: value.path,
                };
            }),
        });
    }
};
GenerateVideoTool = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [MediaService,
        VideoManager])
], GenerateVideoTool);
export { GenerateVideoTool };
//# sourceMappingURL=generate.video.tool.js.map