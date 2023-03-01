import { FunctionName, ZomeName } from "../api/index.js";
import { AgentPubKey } from "../types.js";
/**
 * @public
 */
export declare type CapSecret = Uint8Array;
/**
 * @public
 */
export interface CapClaim {
    tag: string;
    grantor: AgentPubKey;
    secret: CapSecret;
}
/**
 * @public
 */
export declare enum GrantedFunctionsType {
    All = "All",
    Listed = "Listed"
}
/**
 * @public
 */
export declare type GrantedFunctions = {
    [GrantedFunctionsType.All]: null;
} | {
    [GrantedFunctionsType.Listed]: [ZomeName, FunctionName][];
};
/**
 * @public
 */
export interface ZomeCallCapGrant {
    tag: string;
    access: CapAccess;
    functions: GrantedFunctions;
}
/**
 * @public
 */
export declare type CapAccess = "Unrestricted" | {
    Transferable: {
        secret: CapSecret;
    };
} | {
    Assigned: {
        secret: CapSecret;
        assignees: AgentPubKey[];
    };
};
/**
 * @public
 */
export declare type CapGrant = {
    ChainAuthor: AgentPubKey;
} | {
    RemoteAgent: ZomeCallCapGrant;
};
