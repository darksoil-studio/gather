import nacl from "tweetnacl";
import { CapSecret } from "../hdk/capabilities.js";
import { AgentPubKey, CellId } from "../types.js";
/**
 * @public
 */
export declare type Nonce256Bit = Uint8Array;
/**
 * @public
 */
export interface SigningCredentials {
    capSecret: CapSecret;
    keyPair: nacl.SignKeyPair;
    signingKey: AgentPubKey;
}
/**
 * Get credentials for signing zome calls.
 *
 * @param cellId - Cell id to get credentials of.
 * @returns The keys and cap secret required for signing a zome call.
 *
 * @public
 */
export declare const getSigningCredentials: (cellId: CellId) => SigningCredentials | undefined;
/**
 * Set credentials for signing zome calls.
 *
 * @param cellId - Cell id to set credentials for.
 *
 * @public
 */
export declare const setSigningCredentials: (cellId: CellId, credentials: SigningCredentials) => void;
/**
 * Generates a key pair for signing zome calls.
 *
 * @returns The signing key pair and an agent pub key based on the public key.
 *
 * @public
 */
export declare const generateSigningKeyPair: () => [
    nacl.SignKeyPair,
    AgentPubKey
];
/**
 * @public
 */
export declare const randomCapSecret: () => Promise<CapSecret>;
/**
 * @public
 */
export declare const randomNonce: () => Promise<Nonce256Bit>;
/**
 * @public
 */
export declare const randomByteArray: (length: number) => Promise<Uint8Array>;
/**
 * @public
 */
export declare const getNonceExpiration: () => number;
