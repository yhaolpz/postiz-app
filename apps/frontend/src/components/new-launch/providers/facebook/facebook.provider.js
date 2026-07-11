'use client';
import { PostComment, withProvider, } from "../high.order.provider";
import { FacebookDto, FACEBOOK_PRESETS, } from "../../../../../../../libraries/nestjs-libraries/src/dtos/posts/providers-settings/facebook.dto";
import { getPresetBackground } from "./facebook.background";
import { Input } from "../../../../../../../libraries/react-shared-libraries/src/form/input";
import { Select } from "../../../../../../../libraries/react-shared-libraries/src/form/select";
import { useSettings } from "../../../launches/helpers/use.values";
import { useIntegration } from "../../../launches/helpers/use.integration";
import { FacebookPreview } from "./facebook.preview";
import { useT } from "../../../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
import { useEffect } from 'react';
const postType = [
    {
        value: 'post',
        label: 'Post',
    },
    {
        value: 'story',
        label: 'Story',
    },
    {
        value: 'reel',
        label: 'Reel',
    },
];
export const FacebookSettings = () => {
    const t = useT();
    const { register, watch, setValue } = useSettings();
    const { value } = useIntegration();
    const postCurrentType = watch('post_type');
    const preset = watch('text_format_preset_id');
    // Facebook background presets only render on text-only Page posts (no media).
    const hasMedia = !!(value === null || value === void 0 ? void 0 : value.some((p) => { var _a; return !!((_a = p.image) === null || _a === void 0 ? void 0 : _a.length); }));
    const presetAvailable = postCurrentType !== 'story' && !hasMedia;
    const selectedBg = getPresetBackground(preset);
    // Clear any selected background when it can no longer apply (story / media),
    // so a stray combination never reaches the provider.
    useEffect(() => {
        if (!presetAvailable && preset) {
            setValue('text_format_preset_id', '');
        }
    }, [presetAvailable, preset, setValue]);
    return (<>
      <div className="pt-[20px]">
        <Select label="Post Type" {...register('post_type', {
        value: 'post',
    })}>
          <option value="">
            {t('select_post_type', 'Select Post Type...')}
          </option>
          {postType.map((item) => (<option key={item.value} value={item.value}>
              {item.label}
            </option>))}
        </Select>
      </div>

      {postCurrentType !== 'story' && (<Input label={'Embedded URL (only for text Post)'} {...register('url')}/>)}

      {presetAvailable && (<>
          <Select label="Background (applies to text-only posts shorter than 130 characters)" hideErrors {...register('text_format_preset_id')} style={selectedBg
                ? { background: selectedBg.background, color: selectedBg.text }
                : undefined}>
            <option value="" style={{ background: '#ffffff', color: '#1c1e21' }}>
              {t('facebook_background_none', 'None (plain text)')}
            </option>
            {FACEBOOK_PRESETS.map((item) => {
                const bg = getPresetBackground(item.id);
                return (<option key={item.id} value={item.id} style={bg ? { background: bg.background, color: bg.text } : undefined}>
                  {item.name}
                </option>);
            })}
          </Select>
          <div className="text-[12px] opacity-70 mt-[8px]">
            {t('facebook_background_note', 'Unofficial list: the colors shown are approximate, an unsupported background is dropped (published as plain text)')}
          </div>
        </>)}
    </>);
};
export default withProvider({
    postComment: PostComment.COMMENT,
    minimumCharacters: [],
    SettingsComponent: FacebookSettings,
    CustomPreviewComponent: FacebookPreview,
    dto: FacebookDto,
    maximumCharacters: 63206,
});
//# sourceMappingURL=facebook.provider.js.map