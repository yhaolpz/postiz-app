import { __decorate, __metadata } from "tslib";
import { IsDefined, IsIn, IsOptional, IsString, Matches, MinLength, ValidateIf, } from 'class-validator';
export class CnblogsDto {
}
__decorate([
    IsString(),
    MinLength(2),
    IsDefined(),
    __metadata("design:type", String)
], CnblogsDto.prototype, "title", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CnblogsDto.prototype, "categories", void 0);
__decorate([
    IsOptional(),
    IsString(),
    ValidateIf((o) => o.canonical && o.canonical.indexOf('(post:') === -1),
    Matches(/^(|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})$/, {
        message: 'Invalid URL',
    }),
    __metadata("design:type", String)
], CnblogsDto.prototype, "canonical", void 0);
__decorate([
    IsOptional(),
    IsString(),
    IsIn(['publish', 'draft']),
    __metadata("design:type", String)
], CnblogsDto.prototype, "status", void 0);
//# sourceMappingURL=cnblogs.dto.js.map