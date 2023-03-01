import { CapSecret, GrantedFunctions } from "../../hdk/capabilities.js";
import type { AgentPubKey, CellId } from "../../types.js";
import { WsClient } from "../client.js";
import { Requester, Transformer } from "../common.js";
import { AddAgentInfoRequest, AddAgentInfoResponse, AdminApi, AgentInfoRequest, AgentInfoResponse, AttachAppInterfaceRequest, AttachAppInterfaceResponse, DeleteCloneCellRequest, DeleteCloneCellResponse, DisableAppRequest, DisableAppResponse, DumpFullStateRequest, DumpFullStateResponse, DumpStateRequest, DumpStateResponse, EnableAppRequest, EnableAppResponse, GenerateAgentPubKeyRequest, GenerateAgentPubKeyResponse, GetDnaDefinitionRequest, GetDnaDefinitionResponse, GrantZomeCallCapabilityRequest, GrantZomeCallCapabilityResponse, InstallAppRequest, InstallAppResponse, ListAppInterfacesRequest, ListAppInterfacesResponse, ListAppsRequest, ListAppsResponse, ListCellIdsRequest, ListCellIdsResponse, ListDnasRequest, ListDnasResponse, RegisterDnaRequest, RegisterDnaResponse, UninstallAppRequest, UninstallAppResponse } from "./types.js";
/**
 * A class for interacting with a conductor's Admin API.
 *
 * @public
 */
export declare class AdminWebsocket implements AdminApi {
    /**
     * The websocket client used for transporting requests and responses.
     */
    readonly client: WsClient;
    /**
     * Default timeout for any request made over the websocket.
     */
    defaultTimeout: number;
    private constructor();
    /**
     * Factory mehtod to create a new instance connected to the given URL.
     *
     * @param url - A `ws://` URL used as the connection address.
     * @param defaultTimeout - The default timeout for any request.
     * @returns A promise for a new connected instance.
     */
    static connect(url: string, defaultTimeout?: number): Promise<AdminWebsocket>;
    _requester<ReqI, ReqO, ResI, ResO>(tag: string, transformer?: Transformer<ReqI, ReqO, ResI, ResO>): (req: ReqI, timeout?: number | undefined) => Promise<ResO>;
    /**
     * Send a request to open the given port for {@link AppWebsocket} connections.
     */
    attachAppInterface: Requester<AttachAppInterfaceRequest, AttachAppInterfaceResponse>;
    /**
     * Enable a stopped app.
     */
    enableApp: Requester<EnableAppRequest, EnableAppResponse>;
    /**
     * Disable a running app.
     */
    disableApp: Requester<DisableAppRequest, DisableAppResponse>;
    /**
     * Dump the state of the specified cell, including its source chain, as JSON.
     */
    dumpState: Requester<DumpStateRequest, DumpStateResponse>;
    /**
     * Dump the full state of the specified cell, including its chain and DHT
     * shard, as JSON.
     */
    dumpFullState: Requester<DumpFullStateRequest, DumpFullStateResponse>;
    /**
     * Generate a new agent pub key.
     */
    generateAgentPubKey: Requester<GenerateAgentPubKeyRequest, GenerateAgentPubKeyResponse>;
    /**
     * Register a DNA for later app installation.
     *
     * Stores the given DNA into the Holochain DNA database and returns the hash of it.
     */
    registerDna: Requester<RegisterDnaRequest, RegisterDnaResponse>;
    /**
     * Get the DNA definition for the specified DNA hash.
     */
    getDnaDefinition: Requester<GetDnaDefinitionRequest, GetDnaDefinitionResponse>;
    /**
     * Uninstall the specified app from Holochain.
     */
    uninstallApp: Requester<UninstallAppRequest, UninstallAppResponse>;
    /**
     * Install the specified app into Holochain.
     */
    installApp: Requester<InstallAppRequest, InstallAppResponse>;
    /**
     * List all registered DNAs.
     */
    listDnas: Requester<ListDnasRequest, ListDnasResponse>;
    /**
     * List all installed cell ids.
     */
    listCellIds: Requester<ListCellIdsRequest, ListCellIdsResponse>;
    /**
     * List all installed apps.
     */
    listApps: Requester<ListAppsRequest, ListAppsResponse>;
    /**
     * List all attached app interfaces.
     */
    listAppInterfaces: Requester<ListAppInterfacesRequest, ListAppInterfacesResponse>;
    /**
     * Request all available info about an agent.
     */
    agentInfo: Requester<AgentInfoRequest, AgentInfoResponse>;
    /**
     * Add an existing agent to Holochain.
     */
    addAgentInfo: Requester<AddAgentInfoRequest, AddAgentInfoResponse>;
    /**
     * Delete a disabled clone cell.
     */
    deleteCloneCell: Requester<DeleteCloneCellRequest, DeleteCloneCellResponse>;
    /**
     * Grant a zome call capability for an agent, to be used for signing zome
     * calls.
     */
    grantZomeCallCapability: Requester<GrantZomeCallCapabilityRequest, GrantZomeCallCapabilityResponse>;
    /**
     * Grant a capability for signing zome calls.
     *
     * @param cellId - The cell to grant the capability for.
     * @param functions - The zome functions to grant the capability for.
     * @param signingKey - The assignee of the capability.
     * @returns The cap secret of the created capability.
     */
    grantSigningKey: (cellId: CellId, functions: GrantedFunctions, signingKey: AgentPubKey) => Promise<CapSecret>;
    /**
     * Generate and authorize a new key pair for signing zome calls.
     *
     * @param cellId - The cell id to create the capability grant for.
     * @param functions - Zomes and functions to authorize the signing key for
     * (optional). When no functions are specified, the capability will be
     * granted for all zomes and functions.
     */
    authorizeSigningCredentials: (cellId: CellId, functions?: GrantedFunctions) => Promise<void>;
}
