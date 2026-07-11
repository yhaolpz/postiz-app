import { __awaiter, __decorate, __metadata } from "tslib";
import { createTool } from '@mastra/core/tools';
import { Injectable } from '@nestjs/common';
import { IntegrationService } from "../../database/prisma/integrations/integration.service";
import z from 'zod';
import { checkAuth } from "../auth.context";
let GroupListTool = class GroupListTool {
    constructor(_integrationService) {
        this._integrationService = _integrationService;
        this.name = 'groupList';
    }
    run() {
        return createTool({
            id: 'groupList',
            description: `This tool lists the available groups (customers). Use a group id with the integrationList tool to filter the integrations belonging to that group`,
            inputSchema: z.object({}),
            mcp: {
                annotations: {
                    title: 'List Groups',
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
                })),
            }),
            execute: (inputData, context) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                checkAuth(inputData, context);
                const organizationId = JSON.parse((_a = context === null || context === void 0 ? void 0 : context.requestContext) === null || _a === void 0 ? void 0 : _a.get('organization')).id;
                return {
                    output: (yield this._integrationService.customers(organizationId)).map((p) => ({
                        id: p.id,
                        name: p.name,
                    })),
                };
            }),
        });
    }
};
GroupListTool = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [IntegrationService])
], GroupListTool);
export { GroupListTool };
//# sourceMappingURL=group.list.tool.js.map