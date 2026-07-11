import { __awaiter, __decorate, __metadata } from "tslib";
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { MediaService } from "../../database/prisma/media/media.service";
import { UploadFactory } from "../../upload/upload.factory";
import { getMaxSize } from "../../upload/custom.upload.validation";
import { checkAuth } from "../auth.context";
import { ssrfSafeDispatcher } from "../../dtos/webhooks/ssrf.safe.dispatcher";
import { Readable } from 'stream';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { fromBuffer } = require('file-type');
// Same allow-list as the public API /upload-from-url route.
const ALLOWED_MIME = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/avif',
    'image/bmp',
    'image/tiff',
    'video/mp4',
]);
let UploadFromUrlTool = class UploadFromUrlTool {
    constructor(_mediaService) {
        this._mediaService = _mediaService;
        this.storage = UploadFactory.createStorage();
        this.name = 'uploadFromUrlTool';
    }
    run() {
        return createTool({
            id: 'uploadFromUrlTool',
            description: `Upload a remote image or video into the media library from a public URL.
Use this before scheduling a post when the user provides an external media URL (not already hosted on our domain),
so the attachment passes the upload-domain validation. Returns the hosted media { id, path } to use as an attachment, or { error } on failure.`,
            mcp: {
                annotations: {
                    title: 'Upload Media From URL',
                    readOnlyHint: false,
                    destructiveHint: false,
                    idempotentHint: false,
                    openWorldHint: true,
                },
            },
            inputSchema: z.object({
                url: z
                    .string()
                    .url()
                    .describe('The public URL of the image or video to upload'),
            }),
            // Mastra validates a tool's return against this schema, so it must also
            // allow the graceful { error } shape. Fields are optional (rather than
            // wrapping everything in an `output` union) to keep the change minimal:
            // the existing { id, path } success return and the new { error } return
            // both validate without rewriting every return statement.
            outputSchema: z.object({
                id: z.string().optional(),
                path: z.string().optional(),
                error: z.string().optional(),
            }),
            execute: (inputData, context) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                checkAuth(inputData, context);
                try {
                    const org = JSON.parse((_a = context === null || context === void 0 ? void 0 : context.requestContext) === null || _a === void 0 ? void 0 : _a.get('organization'));
                    const response = yield fetch(inputData.url, {
                        // @ts-ignore — undici option, not in lib.dom fetch types
                        dispatcher: ssrfSafeDispatcher,
                    });
                    if (!response.ok) {
                        return { error: 'Failed to fetch URL' };
                    }
                    // Guard against OOM: bail out before buffering the whole body into
                    // memory. Content-Length may be absent or wrong, so we re-check the
                    // real size after download too. The type isn't known yet (sniffed
                    // below), so the pre-check uses the largest allowed cap (video).
                    const maxDownloadSize = getMaxSize('video/mp4');
                    const declaredSize = Number(response.headers.get('content-length'));
                    if (declaredSize && declaredSize > maxDownloadSize) {
                        return {
                            error: `File is too large: ${declaredSize} bytes (max ${maxDownloadSize} bytes).`,
                        };
                    }
                    const buffer = Buffer.from(yield response.arrayBuffer());
                    const detected = yield fromBuffer(buffer);
                    if (!detected || !ALLOWED_MIME.has(detected.mime)) {
                        return { error: 'Unsupported file type.' };
                    }
                    const maxSize = getMaxSize(detected.mime);
                    if (buffer.length > maxSize) {
                        return {
                            error: `File is too large: ${buffer.length} bytes (max ${maxSize} bytes).`,
                        };
                    }
                    const getFile = yield this.storage.uploadFile({
                        buffer,
                        mimetype: detected.mime,
                        size: buffer.length,
                        path: '',
                        fieldname: '',
                        destination: '',
                        stream: new Readable(),
                        filename: '',
                        originalname: `upload.${detected.ext}`,
                        encoding: '',
                    });
                    return yield this._mediaService.saveFile(org.id, getFile.originalname, getFile.path);
                }
                catch (err) {
                    return {
                        error: `Failed to upload media from URL: ${err instanceof Error ? err.message : 'Unexpected error'}`,
                    };
                }
            }),
        });
    }
};
UploadFromUrlTool = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [MediaService])
], UploadFromUrlTool);
export { UploadFromUrlTool };
//# sourceMappingURL=upload.from.url.tool.js.map