// https://github.com/holochain/holochain/blob/develop/crates/types/src/dht_op.rs
/**
 * @public
 */
export var DhtOpType;
(function (DhtOpType) {
    DhtOpType["StoreRecord"] = "StoreRecord";
    DhtOpType["StoreEntry"] = "StoreEntry";
    DhtOpType["RegisterAgentActivity"] = "RegisterAgentActivity";
    DhtOpType["RegisterUpdatedContent"] = "RegisterUpdatedContent";
    DhtOpType["RegisterUpdatedRecord"] = "RegisterUpdatedRecord";
    DhtOpType["RegisterDeletedBy"] = "RegisterDeletedBy";
    DhtOpType["RegisterDeletedEntryAction"] = "RegisterDeletedEntryAction";
    DhtOpType["RegisterAddLink"] = "RegisterAddLink";
    DhtOpType["RegisterRemoveLink"] = "RegisterRemoveLink";
})(DhtOpType || (DhtOpType = {}));
/**
 * @public
 */
export function getDhtOpType(op) {
    return Object.keys(op)[0];
}
/**
 * @public
 */
export function getDhtOpAction(op) {
    const opType = getDhtOpType(op);
    const action = Object.values(op)[0][1];
    if (opType === DhtOpType.RegisterAddLink) {
        return {
            type: "CreateLink",
            ...action,
        };
    }
    if (opType === DhtOpType.RegisterUpdatedContent ||
        opType === DhtOpType.RegisterUpdatedRecord) {
        return {
            type: "Update",
            ...action,
        };
    }
    if (action.author)
        return action;
    else {
        const actionType = Object.keys(action)[0];
        return {
            type: actionType,
            ...action[actionType],
        };
    }
}
/**
 * @public
 */
export function getDhtOpEntry(op) {
    return Object.values(op)[0][2];
}
/**
 * @public
 */
export function getDhtOpSignature(op) {
    return Object.values(op)[0][1];
}
