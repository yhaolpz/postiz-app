import { __awaiter } from "tslib";
import { SettingsPopup } from "../../../../components/layout/settings.component";
export const dynamic = 'force-dynamic';
import { isGeneralServerSide } from "../../../../../../../libraries/helpers/src/utils/is.general.server.side";
export const metadata = {
    title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Settings`,
    description: '',
};
export default function Index(props) {
    return __awaiter(this, void 0, void 0, function* () {
        const searchParams = yield props.searchParams;
        return <SettingsPopup />;
    });
}
//# sourceMappingURL=page.js.map