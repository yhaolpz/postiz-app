'use client';

import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { Checkbox } from '@gitroom/react/form/checkbox';
import { Input } from '@gitroom/react/form/input';
import { Select } from '@gitroom/react/form/select';
import { Textarea } from '@gitroom/react/form/textarea';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { LinkedinDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/linkedin.dto';
import { LinkedinPreview } from '@gitroom/frontend/components/new-launch/providers/linkedin/linkedin.preview';
import { useEffect } from 'react';

const LinkedInSettings = () => {
  const t = useT();
  const { watch, register, setValue } = useSettings();
  const postType = watch('post_type') || 'post';
  const isCarousel = watch('post_as_images_carousel');

  useEffect(() => {
    if (postType === 'article') {
      setValue('post_as_images_carousel', false);
    }
  }, [postType, setValue]);

  return (
    <div className="mb-[20px] flex flex-col gap-[10px]">
      <Select
        label={t('linkedin_content_type', 'Content type')}
        {...register('post_type', { value: 'post' })}
      >
        <option value="post">{t('linkedin_post', 'Post')}</option>
        <option value="article">
          {t('linkedin_article_link_card', 'Article link card')}
        </option>
      </Select>

      {postType === 'article' ? (
        <>
          <Input
            type="url"
            label={t('linkedin_article_url', 'Article URL')}
            {...register('article_url')}
          />
          <Input
            maxLength={399}
            label={t('linkedin_article_title', 'Article title')}
            {...register('article_title')}
          />
          <Textarea
            maxLength={4085}
            className="min-h-[110px]"
            label={t('linkedin_article_description', 'Article description')}
            {...register('article_description')}
          />
        </>
      ) : (
        <>
          <Checkbox
            variant="hollow"
            label={t('post_as_images_carousel', 'Post as images carousel')}
            {...register('post_as_images_carousel', {
              value: false,
            })}
          />
          {isCarousel && (
            <div className="mt-[10px]">
              <Input
                label={t('carousel_name', 'Carousel slide name')}
                placeholder="slides"
                {...register('carousel_name')}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};
export default withProvider<LinkedinDto>({
  postComment: PostComment.COMMENT,
  minimumCharacters: [],
  SettingsComponent: LinkedInSettings,
  CustomPreviewComponent: LinkedinPreview,
  dto: LinkedinDto,
  maximumCharacters: 3000,
});
