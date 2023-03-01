/**
 * @public
 */
export declare type HoloHash = Uint8Array;
/**
 * @public
 */
export declare type AgentPubKey = HoloHash;
/**
 * @public
 */
export declare type DnaHash = HoloHash;
/**
 * @public
 */
export declare type WasmHash = HoloHash;
/**
 * @public
 */
export declare type EntryHash = HoloHash;
/**
 * @public
 */
export declare type ActionHash = HoloHash;
/**
 * @public
 */
export declare type AnyDhtHash = HoloHash;
/**
 * @public
 */
export declare type KitsuneAgent = Uint8Array;
/**
 * @public
 */
export declare type KitsuneSpace = Uint8Array;
/** Base64 hash types */
/**
 * @public
 */
export declare type HoloHashB64 = string;
/**
 * @public
 */
export declare type AgentPubKeyB64 = HoloHashB64;
/**
 * @public
 */
export declare type DnaHashB64 = HoloHashB64;
/**
 * @public
 */
export declare type WasmHashB64 = HoloHashB64;
/**
 * @public
 */
export declare type EntryHashB64 = HoloHashB64;
/**
 * @public
 */
export declare type ActionHashB64 = HoloHashB64;
/**
 * @public
 */
export declare type AnyDhtHashB64 = HoloHashB64;
/**
 * @public
 */
export declare type InstalledAppId = string;
/**
 * @public
 */
export declare type Signature = Uint8Array;
/**
 * @public
 */
export declare type CellId = [DnaHash, AgentPubKey];
/**
 * @public
 */
export declare type DnaProperties = any;
/**
 * @public
 */
export declare type RoleName = string;
/**
 * @public
 */
export declare type InstalledCell = {
    cell_id: CellId;
    role_name: RoleName;
};
/**
 * @public
 */
export declare type Timestamp = number;
/**
 * @public
 */
export interface Duration {
    secs: number;
    nanos: number;
}
/**
 * @public
 */
export interface HoloHashed<T> {
    hash: HoloHash;
    content: T;
}
/**
 * @public
 */
export interface NetworkInfo {
    fetch_queue_info: FetchQueueInfo;
}
/**
 * @public
 */
export interface FetchQueueInfo {
    op_bytes_to_fetch: number;
    num_ops_to_fetch: number;
}
