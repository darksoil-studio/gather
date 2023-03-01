import { ActionHash, AgentPubKey, EntryHash, Signature, Timestamp } from "../types.js";
import { EntryType } from "./entry.js";
/**
 * @public
 */
export interface CounterSigningSessionData {
    preflight_request: PreflightRequest;
    responses: Array<[CountersigningAgentState, Signature]>;
}
/**
 * @public
 */
export interface PreflightRequest {
    app_entry_hash: EntryHash;
    signing_agents: CounterSigningAgents;
    enzyme_index: number | undefined;
    session_times: CounterSigningSessionTimes;
    action_base: ActionBase;
    preflight_bytes: PreflightBytes;
}
/**
 * @public
 */
export interface CounterSigningSessionTimes {
    start: Timestamp;
    end: Timestamp;
}
/**
 * @public
 */
export declare type ActionBase = {
    Create: CreateBase;
} | {
    Update: UpdateBase;
};
/**
 * @public
 */
export interface CreateBase {
    entry_type: EntryType;
}
/**
 * @public
 */
export interface UpdateBase {
    original_action_address: ActionHash;
    original_entry_address: EntryHash;
    entry_type: EntryType;
}
/**
 * @public
 */
export declare type CounterSigningAgents = Array<[AgentPubKey, Array<Role>]>;
/**
 * @public
 */
export declare type PreflightBytes = Uint8Array;
/**
 * @public
 */
export declare type Role = number;
/**
 * @public
 */
export interface CountersigningAgentState {
    agent_index: number;
    chain_top: ActionHash;
    action_seq: number;
}
