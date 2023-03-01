import { HoloHash, HoloHashB64 } from "../types.js";
/**
 * Decodes a Base64 encoded string to a byte array hash.
 *
 * @param hash - The Base64 encoded string to decode.
 * @returns The hash in byte format.
 *
 * @public
 */
export declare function decodeHashFromBase64(hash: HoloHashB64): HoloHash;
/**
 * Encode a byte array hash to a Base64 string.
 *
 * @param hash - The hash to encode to a Base64 string.
 * @returns The Base64 encoded string
 *
 * @public
 */
export declare function encodeHashToBase64(hash: HoloHash): HoloHashB64;
