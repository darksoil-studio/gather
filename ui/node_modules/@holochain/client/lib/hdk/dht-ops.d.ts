import { Signature } from "../types.js";
import { Entry } from "./entry.js";
import { CreateLink, Delete, DeleteLink, Action, NewEntryAction, Update } from "./action.js";
/**
 * @public
 */
export declare enum DhtOpType {
    StoreRecord = "StoreRecord",
    StoreEntry = "StoreEntry",
    RegisterAgentActivity = "RegisterAgentActivity",
    RegisterUpdatedContent = "RegisterUpdatedContent",
    RegisterUpdatedRecord = "RegisterUpdatedRecord",
    RegisterDeletedBy = "RegisterDeletedBy",
    RegisterDeletedEntryAction = "RegisterDeletedEntryAction",
    RegisterAddLink = "RegisterAddLink",
    RegisterRemoveLink = "RegisterRemoveLink"
}
/**
 * @public
 */
export declare type DhtOp = {
    [DhtOpType.StoreRecord]: [Signature, Action, Entry | undefined];
} | {
    [DhtOpType.StoreEntry]: [Signature, NewEntryAction, Entry];
} | {
    [DhtOpType.RegisterAgentActivity]: [Signature, Action];
} | {
    [DhtOpType.RegisterUpdatedContent]: [
        Signature,
        Update,
        Entry | undefined
    ];
} | {
    [DhtOpType.RegisterUpdatedRecord]: [Signature, Update, Entry | undefined];
} | {
    [DhtOpType.RegisterDeletedBy]: [Signature, Delete];
} | {
    [DhtOpType.RegisterDeletedEntryAction]: [Signature, Delete];
} | {
    [DhtOpType.RegisterAddLink]: [Signature, CreateLink];
} | {
    [DhtOpType.RegisterRemoveLink]: [Signature, DeleteLink];
};
/**
 * @public
 */
export declare function getDhtOpType(op: DhtOp): DhtOpType;
/**
 * @public
 */
export declare function getDhtOpAction(op: DhtOp): Action;
/**
 * @public
 */
export declare function getDhtOpEntry(op: DhtOp): Entry | undefined;
/**
 * @public
 */
export declare function getDhtOpSignature(op: DhtOp): Signature;
