import Emittery from "emittery";
import { CapSecret } from "../../hdk/capabilities.js";
import { InstalledAppId } from "../../types.js";
import { WsClient } from "../client.js";
import { Requester, Transformer } from "../common.js";
import { Nonce256Bit } from "../zome-call-signing.js";
import { AppApi, AppInfoRequest, AppInfoResponse, CallZomeRequest, CallZomeResponse, CreateCloneCellRequest, CreateCloneCellResponse, DisableCloneCellRequest, DisableCloneCellResponse, EnableCloneCellRequest, EnableCloneCellResponse, NetworkInfoRequest, NetworkInfoResponse } from "./types.js";
/**
 * A class to establish a websocket connection to an App interface of a
 * Holochain conductor.
 *
 * @public
 */
export declare class AppWebsocket extends Emittery implements AppApi {
    readonly client: WsClient;
    defaultTimeout: number;
    overrideInstalledAppId?: InstalledAppId;
    private constructor();
    /**
     * Instance factory for creating AppWebsockets.
     *
     * @param url - The `ws://` URL of the App API to connect to.
     * @param defaultTimeout - Timeout to default to for all operations.
     * @returns A new instance of an AppWebsocket.
     */
    static connect(url: string, defaultTimeout?: number): Promise<AppWebsocket>;
    _requester: <ReqI, ReqO, ResI, ResO>(tag: string, transformer?: Transformer<ReqI, ReqO, ResI, ResO> | undefined) => (req: ReqI, timeout?: number | undefined) => Promise<ResO>;
    /**
     * Request the app's info, including all cell infos.
     *
     * @returns The app's {@link AppInfo}.
     */
    appInfo: Requester<AppInfoRequest, AppInfoResponse>;
    /**
     * Call a zome.
     *
     * @param request - The zome call arguments.
     * @param timeout - A timeout to override the default.
     * @returns The zome call's response.
     */
    callZome: Requester<CallZomeRequest | CallZomeRequestSigned, CallZomeResponse>;
    /**
     * Clone an existing provisioned cell.
     *
     * @param args - Specify the cell to clone.
     * @returns The created clone cell.
     */
    createCloneCell: Requester<CreateCloneCellRequest, CreateCloneCellResponse>;
    /**
     * Enable a disabled clone cell.
     *
     * @param args - Specify the clone cell to enable.
     * @returns The enabled clone cell.
     */
    enableCloneCell: Requester<EnableCloneCellRequest, EnableCloneCellResponse>;
    /**
     * Disable an enabled clone cell.
     *
     * @param args - Specify the clone cell to disable.
     */
    disableCloneCell: Requester<DisableCloneCellRequest, DisableCloneCellResponse>;
    /**
     * Request network info about gossip status.
     */
    networkInfo: Requester<NetworkInfoRequest, NetworkInfoResponse>;
}
/**
 * @public
 */
export interface CallZomeRequestUnsigned extends CallZomeRequest {
    cap_secret: CapSecret | null;
    nonce: Nonce256Bit;
    expires_at: number;
}
/**
 * @public
 */
export interface CallZomeRequestSigned extends CallZomeRequestUnsigned {
    signature: Uint8Array;
}
/**
 * @public
 */
export declare const signZomeCall: (request: CallZomeRequest) => Promise<CallZomeRequestSigned>;
