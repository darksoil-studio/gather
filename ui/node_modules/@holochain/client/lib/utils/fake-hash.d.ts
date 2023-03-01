import { ActionHash, AgentPubKey, EntryHash } from "../types.js";
/**
 * Generate a valid hash of a non-existing entry.
 *
 * From https://github.com/holochain/holochain/blob/develop/crates/holo_hash/src/hash_type/primitive.rs
 *
 * @returns An {@link EntryHash}.
 *
 * @public
 */
export declare function fakeEntryHash(): Promise<EntryHash>;
/**
 * Generate a valid agent key of a non-existing agent.
 *
 * @returns An {@link AgentPubKey}.
 *
 * @public
 */
export declare function fakeAgentPubKey(): Promise<AgentPubKey>;
/**
 * Generate a valid hash of a non-existing action.
 *
 * @returns An {@link ActionHash}.
 *
 * @public
 */
export declare function fakeActionHash(): Promise<ActionHash>;
