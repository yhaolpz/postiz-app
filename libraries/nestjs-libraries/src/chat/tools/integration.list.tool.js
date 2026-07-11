import { __awaiter, __decorate, __metadata } from "tslib";
import { createTool } from '@mastra/core/tools';
import { Injectable } from '@nestjs/common';
import { IntegrationService } from "../../database/prisma/integrations/integration.service";
import z from 'zod';
import { checkAuth } from "../auth.context";
let IntegrationListTool = class IntegrationListTool {
    constructor(_integrationService) {
        this._integrationService = _integrationService;
        this.name = 'integrationList';
    }
    run() {
        return createTool({
            id: 'integrationList',
            description: `This tool list available integrations to schedule posts to. Optionally pass a group id (from the groupList tool) to only list integrations belonging to that group`,
            inputSchema: z.object({
                group: z
                    .string()
                    .optional()
                    .describe('Optional group (customer) id from the groupList tool to filter the integrations'),
            }),
            mcp: {
                annotations: {
                    title: 'List Integrations',
                    readOnlyHint: true,
                    destructiveHint: false,
                    idempotentHint: true,
                    openWorldHint: false,
                },
            },
            outputSchema: z.object({
                output: z.array(z.object({
                    id: z.string(),
                    name: z.string(),
                    picture: z.string(),
                    platform: z.string(),
                })),
            }),
            execute: (inputData, context) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                checkAuth(inputData, context);
                const organizationId = JSON.parse((_a = context === null || context === void 0 ? void 0 : context.requestContext) === null || _a === void 0 ? void 0 : _a.get('organization')).id;
                return {
                    output: (yield this._integrationService.getIntegrationsList(organizationId))
                        .filter((p) => { var _a; return !inputData.group || ((_a = p.customer) === null || _a === void 0 ? void 0 : _a.id) === inputData.group; })
                        .map((p) => ({
                        name: p.name,
                        id: p.id,
                        disabled: p.disabled,
                        picture: p.picture || '/no-picture.jpg',
                        platform: p.providerIdentifier,
                        display: p.profile,
                        type: p.type,
                        customer: p.customer
                            ? {
                                id: p.customer.id,
                                name: p.customer.name,
                            }
                            : undefined,
                    })),
                };
            }),
        });
    }
};
IntegrationListTool = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [IntegrationService])
], IntegrationListTool);
export { IntegrationListTool };
//# sourceMappingURL=integration.list.tool.js.map