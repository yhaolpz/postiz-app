'use client';
import dynamic from 'next/dynamic';
const Bridge = dynamic(() => import('./bridge').then((mod) => mod.default), { ssr: false });
export const InBridge = ({ provider }) => {
    return <Bridge provider={provider}/>;
};
//# sourceMappingURL=in-bridge.js.map