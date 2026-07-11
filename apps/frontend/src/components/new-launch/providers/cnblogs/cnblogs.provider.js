'use client';
import { PostComment, withProvider, } from "../high.order.provider";
import { Input } from "../../../../../../../libraries/react-shared-libraries/src/form/input";
import { Select } from "../../../../../../../libraries/react-shared-libraries/src/form/select";
import { Canonical } from "../../../../../../../libraries/react-shared-libraries/src/form/canonical";
import { useIntegration } from "../../../launches/helpers/use.integration";
import { useSettings } from "../../../launches/helpers/use.values";
import { CnblogsDto } from "../../../../../../../libraries/nestjs-libraries/src/dtos/posts/providers-settings/cnblogs.dto";
const CnblogsSettings = () => {
    const form = useSettings();
    const { date } = useIntegration();
    return (<>
      <Input label="Title" {...form.register('title')}/>
      <Canonical date={date} label="Original Link" {...form.register('canonical')}/>
      <Input label="Categories" placeholder="Markdown,AI" {...form.register('categories')}/>
      <Select label="Status" {...form.register('status', { value: 'publish' })}>
        <option value="publish">Publish</option>
        <option value="draft">Draft</option>
      </Select>
    </>);
};
export default withProvider({
    postComment: PostComment.COMMENT,
    minimumCharacters: [],
    SettingsComponent: CnblogsSettings,
    CustomPreviewComponent: undefined,
    dto: CnblogsDto,
    maximumCharacters: 100000,
});
//# sourceMappingURL=cnblogs.provider.js.map