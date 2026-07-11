'use client';

import { FC } from 'react';
import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { Input } from '@gitroom/react/form/input';
import { Select } from '@gitroom/react/form/select';
import { Canonical } from '@gitroom/react/form/canonical';
import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { CnblogsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/cnblogs.dto';

const CnblogsSettings: FC = () => {
  const form = useSettings();
  const { date } = useIntegration();

  return (
    <>
      <Input label="Title" {...form.register('title')} />
      <Canonical
        date={date}
        label="Original Link"
        {...form.register('canonical')}
      />
      <Input
        label="Categories"
        placeholder="Markdown,AI"
        {...form.register('categories')}
      />
      <Select label="Status" {...form.register('status', { value: 'publish' })}>
        <option value="publish">Publish</option>
        <option value="draft">Draft</option>
      </Select>
    </>
  );
};

export default withProvider({
  postComment: PostComment.COMMENT,
  minimumCharacters: [],
  SettingsComponent: CnblogsSettings,
  CustomPreviewComponent: undefined,
  dto: CnblogsDto,
  maximumCharacters: 100000,
});
