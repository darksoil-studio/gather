const ERROR_TYPE = "error";
export const DEFAULT_TIMEOUT = 15000;
/**
 * Take a Requester function which deals with tagged requests and responses,
 * and return a Requester which deals only with the inner data types, also
 * with the optional Transformer applied to further modify the input and output.
 *
 * @public
 */
export const requesterTransformer = (requester, tag, transform = identityTransformer) => async (req, timeout) => {
    const transformedInput = await transform.input(req);
    const input = { type: tag, data: transformedInput };
    const response = await requester(input, timeout);
    const output = transform.output(response.data);
    return output;
};
const identity = (x) => x;
const identityTransformer = {
    input: identity,
    output: identity,
};
export const catchError = (res) => {
    return res.type === ERROR_TYPE ? Promise.reject(res) : Promise.resolve(res);
};
export const promiseTimeout = (promise, tag, ms) => {
    let id;
    const timeout = new Promise((_, reject) => {
        id = setTimeout(() => {
            clearTimeout(id);
            reject(new Error(`Timed out in ${ms}ms: ${tag}`));
        }, ms);
    });
    return new Promise((res, rej) => {
        Promise.race([promise, timeout])
            .then((a) => {
            clearTimeout(id);
            return res(a);
        })
            .catch((e) => {
            return rej(e);
        });
    });
};
const CLONE_ID_DELIMITER = ".";
/**
 * Check if a cell's role name is a valid clone id.
 *
 * @param roleName - The role name to check.
 *
 * @public
 */
export const isCloneId = (roleName) => roleName.includes(CLONE_ID_DELIMITER);
/**
 * Parse a clone id and get the role name part of it.
 *
 * @param roleName - The role name to parse.
 * @public
 */
export const getBaseRoleNameFromCloneId = (roleName) => {
    if (!isCloneId(roleName)) {
        throw new Error("invalid clone id: no clone id delimiter found in role name");
    }
    return roleName.split(CLONE_ID_DELIMITER)[0];
};
/**
 * Identifier of a clone cell, composed of the DNA's role id and the index
 * of the clone, starting at 0.
 *
 * Example: `profiles.0`
 *
 * @public
 */
export class CloneId {
    roleName;
    index;
    constructor(roleName, index) {
        this.roleName = roleName;
        this.index = index;
    }
    /**
     * Parse a role id of a clone cell to obtain a clone id instance.
     * @param roleName - Role id to parse.
     * @returns A clone id instance.
     */
    static fromRoleName(roleName) {
        const parts = roleName.split(CLONE_ID_DELIMITER);
        if (parts.length !== 2) {
            throw new Error("Malformed clone id: must consist of {role id.clone index}");
        }
        return new CloneId(parts[0], parseInt(parts[1]));
    }
    toString() {
        return `${this.roleName}${CLONE_ID_DELIMITER}${this.index}`;
    }
    getBaseRoleName() {
        return this.roleName;
    }
}
