import { getLauncherEnvironment } from "../../environments/launcher.js";
import { GrantedFunctionsType, } from "../../hdk/capabilities.js";
import { WsClient } from "../client.js";
import { catchError, DEFAULT_TIMEOUT, promiseTimeout, requesterTransformer, } from "../common.js";
import { generateSigningKeyPair, randomCapSecret, setSigningCredentials, } from "../zome-call-signing.js";
import { AppStatusFilter, } from "./types.js";
/**
 * A class for interacting with a conductor's Admin API.
 *
 * @public
 */
export class AdminWebsocket {
    /**
     * The websocket client used for transporting requests and responses.
     */
    client;
    /**
     * Default timeout for any request made over the websocket.
     */
    defaultTimeout;
    constructor(client, defaultTimeout) {
        this.client = client;
        this.defaultTimeout =
            defaultTimeout === undefined ? DEFAULT_TIMEOUT : defaultTimeout;
    }
    /**
     * Factory mehtod to create a new instance connected to the given URL.
     *
     * @param url - A `ws://` URL used as the connection address.
     * @param defaultTimeout - The default timeout for any request.
     * @returns A promise for a new connected instance.
     */
    static async connect(url, defaultTimeout) {
        // Check if we are in the launcher's environment, and if so, redirect the url to connect to
        const env = getLauncherEnvironment();
        if (env?.ADMIN_INTERFACE_PORT) {
            url = `ws://127.0.0.1:${env.ADMIN_INTERFACE_PORT}`;
        }
        const wsClient = await WsClient.connect(url);
        return new AdminWebsocket(wsClient, defaultTimeout);
    }
    _requester(tag, transformer) {
        return requesterTransformer((req, timeout) => promiseTimeout(this.client.request(req), tag, timeout || this.defaultTimeout).then(catchError), tag, transformer);
    }
    /**
     * Send a request to open the given port for {@link AppWebsocket} connections.
     */
    attachAppInterface = this._requester("attach_app_interface");
    /**
     * Enable a stopped app.
     */
    enableApp = this._requester("enable_app");
    /**
     * Disable a running app.
     */
    disableApp = this._requester("disable_app");
    /**
     * Dump the state of the specified cell, including its source chain, as JSON.
     */
    dumpState = this._requester("dump_state", dumpStateTransform);
    /**
     * Dump the full state of the specified cell, including its chain and DHT
     * shard, as JSON.
     */
    dumpFullState = this._requester("dump_full_state");
    /**
     * Generate a new agent pub key.
     */
    generateAgentPubKey = this._requester("generate_agent_pub_key");
    /**
     * Register a DNA for later app installation.
     *
     * Stores the given DNA into the Holochain DNA database and returns the hash of it.
     */
    registerDna = this._requester("register_dna");
    /**
     * Get the DNA definition for the specified DNA hash.
     */
    getDnaDefinition = this._requester("get_dna_definition");
    /**
     * Uninstall the specified app from Holochain.
     */
    uninstallApp = this._requester("uninstall_app");
    /**
     * Install the specified app into Holochain.
     */
    installApp = this._requester("install_app");
    /**
     * List all registered DNAs.
     */
    listDnas = this._requester("list_dnas");
    /**
     * List all installed cell ids.
     */
    listCellIds = this._requester("list_cell_ids");
    /**
     * List all installed apps.
     */
    listApps = this._requester("list_apps", listAppsTransform);
    /**
     * List all attached app interfaces.
     */
    listAppInterfaces = this._requester("list_app_interfaces");
    /**
     * Request all available info about an agent.
     */
    agentInfo = this._requester("agent_info");
    /**
     * Add an existing agent to Holochain.
     */
    addAgentInfo = this._requester("add_agent_info");
    /**
     * Delete a disabled clone cell.
     */
    deleteCloneCell = this._requester("delete_clone_cell");
    /**
     * Grant a zome call capability for an agent, to be used for signing zome
     * calls.
     */
    grantZomeCallCapability = this._requester("grant_zome_call_capability");
    // zome call signing related methods
    /**
     * Grant a capability for signing zome calls.
     *
     * @param cellId - The cell to grant the capability for.
     * @param functions - The zome functions to grant the capability for.
     * @param signingKey - The assignee of the capability.
     * @returns The cap secret of the created capability.
     */
    grantSigningKey = async (cellId, functions, signingKey) => {
        const capSecret = await randomCapSecret();
        await this.grantZomeCallCapability({
            cell_id: cellId,
            cap_grant: {
                tag: "zome-call-signing-key",
                functions,
                access: {
                    Assigned: {
                        secret: capSecret,
                        assignees: [signingKey],
                    },
                },
            },
        });
        return capSecret;
    };
    /**
     * Generate and authorize a new key pair for signing zome calls.
     *
     * @param cellId - The cell id to create the capability grant for.
     * @param functions - Zomes and functions to authorize the signing key for
     * (optional). When no functions are specified, the capability will be
     * granted for all zomes and functions.
     */
    authorizeSigningCredentials = async (cellId, functions) => {
        const [keyPair, signingKey] = generateSigningKeyPair();
        const capSecret = await this.grantSigningKey(cellId, functions || { [GrantedFunctionsType.All]: null }, signingKey);
        setSigningCredentials(cellId, { capSecret, keyPair, signingKey });
    };
}
const listAppsTransform = {
    input: (req) => {
        const args = {};
        if (req.status_filter) {
            args.status_filter = getAppStatusInApiForm(req.status_filter);
        }
        return args;
    },
    output: (res) => res,
};
const dumpStateTransform = {
    input: (req) => req,
    output: (res) => {
        return JSON.parse(res);
    },
};
function getAppStatusInApiForm(status_filter) {
    switch (status_filter) {
        case AppStatusFilter.Running:
            return {
                Running: null,
            };
        case AppStatusFilter.Enabled:
            return {
                Enabled: null,
            };
        case AppStatusFilter.Paused:
            return {
                Paused: null,
            };
        case AppStatusFilter.Disabled:
            return {
                Disabled: null,
            };
        case AppStatusFilter.Stopped:
            return {
                Stopped: null,
            };
    }
}
