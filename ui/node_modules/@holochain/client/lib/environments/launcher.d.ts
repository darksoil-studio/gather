import { InstalledAppId } from "../types.js";
import { CallZomeRequest, CallZomeRequestSigned } from "../api/index.js";
export interface LauncherEnvironment {
    APP_INTERFACE_PORT?: number;
    ADMIN_INTERFACE_PORT?: number;
    INSTALLED_APP_ID?: InstalledAppId;
}
declare const __HC_LAUNCHER_ENV__ = "__HC_LAUNCHER_ENV__";
export declare const isLauncher: boolean;
export declare const getLauncherEnvironment: () => LauncherEnvironment | undefined;
declare global {
    interface Window {
        [__HC_LAUNCHER_ENV__]: LauncherEnvironment | undefined;
    }
}
export declare const signZomeCallTauri: (request: CallZomeRequest) => Promise<CallZomeRequestSigned>;
export {};
