import { Base64 } from "js-base64";
/**
 * Decodes a Base64 encoded string to a byte array hash.
 *
 * @param hash - The Base64 encoded string to decode.
 * @returns The hash in byte format.
 *
 * @public
 */
export function decodeHashFromBase64(hash) {
    return Base64.toUint8Array(hash.slice(1));
}
/**
 * Encode a byte array hash to a Base64 string.
 *
 * @param hash - The hash to encode to a Base64 string.
 * @returns The Base64 encoded string
 *
 * @public
 */
export function encodeHashToBase64(hash) {
    return `u${Base64.fromUint8Array(hash, true)}`;
}
