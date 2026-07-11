'use client';
import { __awaiter } from "tslib";
import 'reflect-metadata';
import { useEffect, useMemo } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { classValidatorResolver } from '@hookform/resolvers/class-validator';
import { Providers } from "../new-launch/providers/show.all.providers";
import { getProviderSettingsMeta } from "../new-launch/providers/high.order.provider";
import { IntegrationContext, } from "../launches/helpers/use.integration";
import { newDayjs } from "../layout/set.timezone";
const DEFAULT_INTEGRATION = {
    id: 'preview',
    name: 'Preview',
    identifier: '',
    picture: '',
    display: '',
    type: 'social',
    editor: 'normal',
    disabled: false,
    inBetweenSteps: false,
    additionalSettings: '[]',
    changeProfilePicture: false,
    changeNickName: false,
    time: [],
};
/** Emits onChange whenever the form changes. Mounted inside FormProvider. */
const FormChangeEmitter = ({ onChange }) => {
    const values = useWatch();
    useEffect(() => {
        if (onChange)
            onChange(values !== null && values !== void 0 ? values : {});
    }, [values, onChange]);
    return null;
};
const flattenFormErrors = (errs) => {
    const out = [];
    const walk = (node) => {
        if (!node || typeof node !== 'object')
            return;
        const n = node;
        if (typeof n.message === 'string')
            out.push(n.message);
        if (n.types && typeof n.types === 'object') {
            for (const t of Object.values(n.types)) {
                if (typeof t === 'string')
                    out.push(t);
            }
        }
        for (const [key, child] of Object.entries(n)) {
            if (['message', 'type', 'types', 'ref', 'root'].includes(key))
                continue;
            walk(child);
        }
    };
    walk(errs);
    return out;
};
export const ProviderPreviewComponent = ({ provider, value, onChange, errors, integration, posts, controlRef, }) => {
    const meta = useMemo(() => {
        const entry = Providers.find((p) => p.identifier === provider);
        if (!entry)
            return null;
        return getProviderSettingsMeta(entry.component);
    }, [provider]);
    // When `value` is absent or `{}`, don't feed it to react-hook-form at all —
    // passing an empty object as `values` wipes out DTO-level defaults that the
    // SettingsComponent relies on (e.g. tiktok privacy = PUBLIC).
    const hasSeededValue = !!value && typeof value === 'object' && Object.keys(value).length > 0;
    const form = useForm({
        resolver: (meta === null || meta === void 0 ? void 0 : meta.dto) ? classValidatorResolver(meta.dto) : undefined,
        defaultValues: hasSeededValue ? value : undefined,
        values: hasSeededValue ? value : undefined,
        mode: 'all',
        criteriaMode: 'all',
        reValidateMode: 'onChange',
    });
    useEffect(() => {
        if (!controlRef)
            return;
        const resolveAdditionalSettings = () => {
            var _a;
            const additional = (_a = integration === null || integration === void 0 ? void 0 : integration.additionalSettings) !== null && _a !== void 0 ? _a : '[]';
            if (Array.isArray(additional))
                return additional;
            try {
                const parsed = JSON.parse(additional || '[]');
                return Array.isArray(parsed) ? parsed : [];
            }
            catch (_b) {
                return [];
            }
        };
        controlRef.current = {
            getValues: () => form.getValues(),
            getMaximumCharacters: () => {
                const max = meta === null || meta === void 0 ? void 0 : meta.maximumCharacters;
                if (typeof max === 'number')
                    return max;
                if (typeof max === 'function') {
                    try {
                        return max(resolveAdditionalSettings());
                    }
                    catch (_a) {
                        return null;
                    }
                }
                return null;
            },
            validate: () => __awaiter(void 0, void 0, void 0, function* () {
                const formValid = yield form.trigger(undefined, { shouldFocus: false });
                const errs = flattenFormErrors(form.formState.errors);
                // Media validation (`checkValidity`) now runs server-side at create
                // time (`/posts/valid` + `/posts`), so the preview only does the
                // local DTO/form validation here.
                return {
                    isValid: formValid,
                    value: form.getValues(),
                    errors: errs,
                    formValid,
                    checkValidityError: null,
                };
            }),
        };
        return () => {
            if (controlRef.current)
                controlRef.current = null;
        };
    }, [controlRef, form, meta, integration, posts]);
    const contextValue = useMemo(() => ({
        date: newDayjs(),
        integration: Object.assign(Object.assign(Object.assign({}, DEFAULT_INTEGRATION), { identifier: provider }), integration),
        allIntegrations: [],
        value: [],
    }), [provider, integration]);
    if (!meta) {
        return <div>Provider &quot;{provider}&quot; not found</div>;
    }
    const { SettingsComponent } = meta;
    if (!SettingsComponent) {
        return (<div className="p-4 text-sm">
        This provider has no configurable settings.
      </div>);
    }
    return (<IntegrationContext.Provider value={contextValue}>
      <FormProvider {...form}>
        <div className="flex flex-col text-white p-[10px]">
          {errors && errors.length > 0 && (<div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
              <ul className="list-disc ps-5">
                {errors.map((e, i) => (<li key={i}>{e}</li>))}
              </ul>
            </div>)}
          <FormChangeEmitter onChange={onChange}/>
          <SettingsComponent />
        </div>
      </FormProvider>
    </IntegrationContext.Provider>);
};
//# sourceMappingURL=preview.provider.component.js.map