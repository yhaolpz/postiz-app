import { __decorate, __metadata } from "tslib";
import { IsArray, IsDefined, IsIn, IsOptional, IsString, MaxLength, MinLength, registerDecorator, ValidateNested, ValidatorConstraint, } from 'class-validator';
import { MediaDto } from "../../media/media.dto";
import { Type } from 'class-transformer';
// YouTube caps the combined length of all tags at 500 characters.
// Tags containing whitespace are wrapped in quotes by YouTube, which adds
// two extra characters per tag toward that limit.
export const YOUTUBE_TAGS_MAX_LENGTH = 500;
export function getYoutubeTagsLength(tags) {
    return (tags !== null && tags !== void 0 ? tags : []).reduce((total, tag) => {
        var _a;
        const label = (_a = tag === null || tag === void 0 ? void 0 : tag.label) !== null && _a !== void 0 ? _a : '';
        return total + label.length + (/\s/.test(label) ? 2 : 0);
    }, 0);
}
let IsYoutubeTagsLengthConstraint = class IsYoutubeTagsLengthConstraint {
    validate(value, _args) {
        if (!Array.isArray(value)) {
            return true;
        }
        return getYoutubeTagsLength(value) <= YOUTUBE_TAGS_MAX_LENGTH;
    }
    defaultMessage(_args) {
        return `The maximum allowed is ${YOUTUBE_TAGS_MAX_LENGTH} characters in total for all tags.`;
    }
};
IsYoutubeTagsLengthConstraint = __decorate([
    ValidatorConstraint({ name: 'IsYoutubeTagsLength', async: false })
], IsYoutubeTagsLengthConstraint);
export { IsYoutubeTagsLengthConstraint };
export function IsYoutubeTagsLength(validationOptions) {
    return function (object, propertyName) {
        registerDecorator({
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: IsYoutubeTagsLengthConstraint,
        });
    };
}
export class YoutubeTagsSettings {
}
__decorate([
    IsString(),
    __metadata("design:type", String)
], YoutubeTagsSettings.prototype, "value", void 0);
__decorate([
    IsString(),
    __metadata("design:type", String)
], YoutubeTagsSettings.prototype, "label", void 0);
export class YoutubeSettingsDto {
}
__decorate([
    IsString(),
    MinLength(2),
    MaxLength(100),
    IsDefined(),
    __metadata("design:type", String)
], YoutubeSettingsDto.prototype, "title", void 0);
__decorate([
    IsIn(['public', 'private', 'unlisted']),
    IsDefined(),
    __metadata("design:type", String)
], YoutubeSettingsDto.prototype, "type", void 0);
__decorate([
    IsIn(['yes', 'no']),
    IsOptional(),
    __metadata("design:type", String)
], YoutubeSettingsDto.prototype, "selfDeclaredMadeForKids", void 0);
__decorate([
    IsOptional(),
    ValidateNested(),
    Type(() => MediaDto),
    __metadata("design:type", MediaDto)
], YoutubeSettingsDto.prototype, "thumbnail", void 0);
__decorate([
    IsArray(),
    IsOptional(),
    ValidateNested({ each: true }),
    IsYoutubeTagsLength(),
    Type(() => YoutubeTagsSettings),
    __metadata("design:type", Array)
], YoutubeSettingsDto.prototype, "tags", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], YoutubeSettingsDto.prototype, "playlistId", void 0);
__decorate([
    IsString(),
    MaxLength(150),
    IsOptional(),
    __metadata("design:type", String)
], YoutubeSettingsDto.prototype, "playlistTitle", void 0);
__decorate([
    IsIn(['public', 'private', 'unlisted']),
    IsOptional(),
    __metadata("design:type", String)
], YoutubeSettingsDto.prototype, "playlistPrivacyStatus", void 0);
//# sourceMappingURL=youtube.settings.dto.js.map