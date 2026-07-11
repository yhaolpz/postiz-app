'use client';
import { __awaiter } from "tslib";
import { useEffect, useRef, useState } from 'react';
import { ProviderPreviewComponent, } from "../../../../components/provider-preview/preview.provider.component";
const ProviderPreviewBridge = ({ provider, }) => {
    // Read __PROVIDER_INIT__ in an effect, not via a useState lazy
    // initializer. The initializer would run on the server (where `window`
    // is undefined → {}), and during hydration React reuses the server
    // state — so the seeded payload would never reach the form. Setting
    // state inside an effect guarantees the read happens client-side
    // after mount; useForm's `values` prop then reactively resets the
    // form to the seed AFTER any field-level `register('x', { value })`
    // defaults have been applied, so the seed wins.
    const [init, setInit] = useState(null);
    useEffect(() => {
        if (typeof window !== 'undefined' && window.__PROVIDER_INIT__) {
            setInit(window.__PROVIDER_INIT__ || {});
        }
    }, []);
    const controlRef = useRef(null);
    useEffect(() => {
        window.__getProviderPreviewValues__ = () => { var _a, _b; return (_b = (_a = controlRef.current) === null || _a === void 0 ? void 0 : _a.getValues()) !== null && _b !== void 0 ? _b : {}; };
        window.__validateProviderPreview__ = () => __awaiter(void 0, void 0, void 0, function* () {
            return controlRef.current
                ? yield controlRef.current.validate()
                : {
                    isValid: false,
                    value: {},
                    errors: ['not-ready'],
                    formValid: false,
                    checkValidityError: null,
                };
        });
        window.__getProviderMaxCharacters__ = () => { var _a, _b; return (_b = (_a = controlRef.current) === null || _a === void 0 ? void 0 : _a.getMaximumCharacters()) !== null && _b !== void 0 ? _b : null; };
        return () => {
            delete window.__getProviderPreviewValues__;
            delete window.__validateProviderPreview__;
            delete window.__getProviderMaxCharacters__;
        };
    }, []);
    if (!init) {
        return null;
    }
    return (<ProviderPreviewComponent provider={provider} value={init.value} errors={init.errors} integration={init.integration} posts={init.posts} controlRef={controlRef}/>);
};
export default ProviderPreviewBridge;
//# sourceMappingURL=bridge.js.map