import { SignedActionHashed } from "./action.js";
import { Entry } from "./entry.js";
/**
 * @public
 */
export declare type Record = {
    signed_action: SignedActionHashed;
    entry: RecordEntry;
};
/**
 * @public
 */
export declare type RecordEntry = {
    Present: Entry;
} | {
    Hidden: void;
} | {
    NotApplicable: void;
} | {
    NotStored: void;
};
