import { invoke } from "@tauri-apps/api/tauri";
import { getNonceExpiration, randomNonce, } from "../api/index.js";
import { encode } from "@msgpack/msgpack";
const __HC_LAUNCHER_ENV__ = "__HC_LAUNCHER_ENV__";
export const isLauncher = typeof window === "object" && __HC_LAUNCHER_ENV__ in window;
export const getLauncherEnvironment = () => isLauncher ? window[__HC_LAUNCHER_ENV__] : undefined;
export const signZomeCallTauri = async (request) => {
    const zomeCallUnsigned = {
        provenance: Array.from(request.provenance),
        cell_id: [Array.from(request.cell_id[0]), Array.from(request.cell_id[1])],
        zome_name: request.zome_name,
        fn_name: request.fn_name,
        payload: Array.from(encode(request.payload)),
        nonce: Array.from(await randomNonce()),
        expires_at: getNonceExpiration(),
    };
    const signedZomeCallTauri = await invoke("sign_zome_call", { zomeCallUnsigned });
    const signedZomeCall = {
        provenance: Uint8Array.from(signedZomeCallTauri.provenance),
        cap_secret: null,
        cell_id: [
            Uint8Array.from(signedZomeCallTauri.cell_id[0]),
            Uint8Array.from(signedZomeCallTauri.cell_id[1]),
        ],
        zome_name: signedZomeCallTauri.zome_name,
        fn_name: signedZomeCallTauri.fn_name,
        payload: Uint8Array.from(signedZomeCallTauri.payload),
        signature: Uint8Array.from(signedZomeCallTauri.signature),
        expires_at: signedZomeCallTauri.expires_at,
        nonce: Uint8Array.from(signedZomeCallTauri.nonce),
    };
    return signedZomeCall;
};
