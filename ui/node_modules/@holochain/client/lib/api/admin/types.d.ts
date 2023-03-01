/// <reference types="node" />
import { Action, DhtOp, Entry, ZomeCallCapGrant } from "../../hdk/index.js";
import { ActionHash, AgentPubKey, CellId, DnaHash, DnaProperties, Duration, HoloHash, HoloHashB64, InstalledAppId, KitsuneAgent, KitsuneSpace, RoleName, Signature, Timestamp, WasmHash } from "../../types.js";
import { Requester } from "../common.js";
import { DisableCloneCellRequest } from "../index.js";
/**
 * @public
 */
export declare type AttachAppInterfaceRequest = {
    port: number;
};
/**
 * @public
 */
export declare type AttachAppInterfaceResponse = {
    port: number;
};
/**
 * @public
 */
export declare type EnableAppRequest = {
    installed_app_id: InstalledAppId;
};
/**
 * @public
 */
export declare type EnableAppResponse = {
    app: AppInfo;
    errors: Array<[CellId, string]>;
};
/**
 * @public
 */
export declare type DeactivationReason = {
    never_activated: null;
} | {
    normal: null;
} | {
    quarantined: {
        error: string;
    };
};
/**
 * @public
 */
export declare type PausedAppReason = {
    error: string;
};
/**
 * @public
 */
export declare type DisabledAppReason = {
    never_started: null;
} | {
    user: null;
} | {
    error: string;
};
/**
 * @public
 */
export declare type InstalledAppInfoStatus = {
    paused: {
        reason: PausedAppReason;
    };
} | {
    disabled: {
        reason: DisabledAppReason;
    };
} | {
    running: null;
};
/**
 * @public
 */
export interface StemCell {
    dna: DnaHash;
    name?: string;
    dna_modifiers: DnaModifiers;
}
/**
 * @public
 */
export interface ProvisionedCell {
    cell_id: CellId;
    dna_modifiers: DnaModifiers;
    name: string;
}
/**
 * @public
 */
export interface ClonedCell {
    cell_id: CellId;
    clone_id: RoleName;
    original_dna_hash: DnaHash;
    dna_modifiers: DnaModifiers;
    name: string;
    enabled: boolean;
}
/**
 * @public
 */
export declare enum CellType {
    Provisioned = "provisioned",
    Cloned = "cloned",
    Stem = "stem"
}
/**
 * @public
 */
export declare type CellInfo = {
    [CellType.Provisioned]: ProvisionedCell;
} | {
    [CellType.Cloned]: ClonedCell;
} | {
    [CellType.Stem]: StemCell;
};
/**
 * @public
 */
export declare type AppInfo = {
    agent_pub_key: AgentPubKey;
    installed_app_id: InstalledAppId;
    cell_info: Record<RoleName, Array<CellInfo>>;
    status: InstalledAppInfoStatus;
};
/**
 * @public
 */
export declare type MembraneProof = Buffer;
/**
 * @public
 */
export declare type DisableAppRequest = {
    installed_app_id: InstalledAppId;
};
/**
 * @public
 */
export declare type DisableAppResponse = null;
/**
 * @public
 */
export declare type StartAppRequest = {
    installed_app_id: InstalledAppId;
};
/**
 * @public
 */
export declare type StartAppResponse = boolean;
/**
 * @public
 */
export declare type DumpStateRequest = {
    cell_id: CellId;
};
/**
 * @public
 */
export declare type DumpStateResponse = any;
/**
 * @public
 */
export declare type DumpFullStateRequest = {
    cell_id: CellId;
    dht_ops_cursor: number | undefined;
};
/**
 * @public
 */
export declare type DumpFullStateResponse = FullStateDump;
/**
 * @public
 */
export declare type GenerateAgentPubKeyRequest = void;
/**
 * @public
 */
export declare type GenerateAgentPubKeyResponse = AgentPubKey;
/**
 * @public
 */
export declare type RegisterDnaRequest = {
    modifiers?: {
        network_seed?: string;
        properties?: DnaProperties;
    };
} & DnaSource;
/**
 * @public
 */
export declare type RegisterDnaResponse = HoloHash;
/**
 * @public
 */
export declare type DnaModifiers = {
    network_seed: NetworkSeed;
    properties: DnaProperties;
    origin_time: Timestamp;
    quantum_time: Duration;
};
/**
 * @public
 */
export declare type FunctionName = string;
/**
 * @public
 */
export declare type ZomeName = string;
/**
 * @public
 */
export declare type ZomeDefinition = [
    ZomeName,
    {
        wasm_hash: WasmHash;
        dependencies: ZomeName[];
    }
];
/**
 * @public
 */
export declare type IntegrityZome = ZomeDefinition;
/**
 * @public
 */
export declare type CoordinatorZome = ZomeDefinition;
/**
 * @public
 */
export declare type DnaDefinition = {
    name: string;
    modifiers: DnaModifiers;
    integrity_zomes: IntegrityZome[];
    coordinator_zomes: CoordinatorZome[];
};
/**
 * @public
 */
export declare type GetDnaDefinitionRequest = DnaHash;
/**
 * @public
 */
export declare type GetDnaDefinitionResponse = DnaDefinition;
/**
 * @public
 */
export declare type UninstallAppRequest = {
    installed_app_id: InstalledAppId;
};
/**
 * @public
 */
export declare type UninstallAppResponse = null;
/**
 * @public
 */
export declare type ResourceBytes = Uint8Array;
/**
 * @public
 */
export declare type ResourceMap = {
    [key: string]: ResourceBytes;
};
/**
 * @public
 */
export declare enum CellProvisioningStrategy {
    /**
     * Always create a new Cell when installing this App
     */
    Create = "create",
    /**
     * Always create a new Cell when installing the App,
     * and use a unique network seed to ensure a distinct DHT network.
     *
     * Not implemented
     */
    /**
     * Require that a Cell is already installed which matches the DNA version
     * spec, and which has an Agent that's associated with this App's agent
     * via DPKI. If no such Cell exists, *app installation fails*.
     */
    UseExisting = "use_existing",
    /**
     * Try `UseExisting`, and if that fails, fallback to `Create`
     */
    CreateIfNoExists = "create_if_no_exists"
}
/**
 * @public
 */
export interface CellProvisioning {
    strategy: CellProvisioningStrategy;
    deferred?: boolean;
}
/**
 * @public
 */
export declare type Location = {
    /**
     * Expect file to be part of this bundle
     */
    bundled: string;
} | {
    /**
     * Get file from local filesystem (not bundled)
     */
    path: string;
} | {
    /**
     * Get file from URL
     */
    url: string;
};
/**
 * @public
 */
export declare type DnaVersionSpec = Array<HoloHashB64>;
/**
 * @public
 */
export declare type DnaVersionFlexible = {
    singleton: HoloHashB64;
} | {
    multiple: DnaVersionSpec;
};
/**
 * @public
 */
export declare type AppRoleDnaManifest = {
    clone_limit?: number;
    modifiers?: Partial<DnaModifiers>;
    version?: DnaVersionFlexible;
} & Location;
/**
 * @public
 */
export declare type AppRoleManifest = {
    name: RoleName;
    provisioning?: CellProvisioning;
    dna: AppRoleDnaManifest;
};
/**
 * @public
 */
export declare type AppManifest = {
    manifest_version: string;
    name: string;
    description?: string;
    roles: Array<AppRoleManifest>;
};
/**
 * @public
 */
export declare type AppBundle = {
    manifest: AppManifest;
    resources: ResourceMap;
};
/**
 * @public
 */
export declare type AppBundleSource = {
    bundle: AppBundle;
} | {
    path: string;
};
/**
 * @public
 */
export declare type NetworkSeed = string;
/**
 * @public
 */
export declare type InstallAppRequest = {
    agent_key: AgentPubKey;
    installed_app_id?: InstalledAppId;
    membrane_proofs: {
        [key: string]: MembraneProof;
    };
    network_seed?: NetworkSeed;
} & AppBundleSource;
/**
 * @public
 */
export declare type InstallAppResponse = AppInfo;
/**
 * @public
 */
export declare type ListDnasRequest = void;
/**
 * @public
 */
export declare type ListDnasResponse = Array<string>;
/**
 * @public
 */
export declare type ListCellIdsRequest = void;
/**
 * @public
 */
export declare type ListCellIdsResponse = Array<CellId>;
/**
 * @public
 */
export declare type ListActiveAppsRequest = void;
/**
 * @public
 */
export declare type ListActiveAppsResponse = Array<InstalledAppId>;
/**
 * @public
 */
export declare enum AppStatusFilter {
    Enabled = "enabled",
    Disabled = "disabled",
    Running = "running",
    Stopped = "stopped",
    Paused = "paused"
}
/**
 * @public
 */
export declare type ListAppsRequest = {
    status_filter?: AppStatusFilter;
};
/**
 * @public
 */
export declare type ListAppsResponse = Array<AppInfo>;
/**
 * @public
 */
export declare type ListAppInterfacesRequest = void;
/**
 * @public
 */
export declare type ListAppInterfacesResponse = Array<number>;
/**
 * This type is meant to be opaque
 *
 * @public
 */
export declare type AgentInfoSigned = unknown;
/**
 * @public
 */
export declare type AgentInfoRequest = {
    cell_id: CellId | null;
};
/**
 * @public
 */
export declare type AgentInfoResponse = Array<AgentInfoSigned>;
/**
 * @public
 */
export declare type AddAgentInfoRequest = {
    agent_infos: Array<AgentInfoSigned>;
};
/**
 * @public
 */
export declare type AddAgentInfoResponse = any;
/**
 * @public
 */
export declare type DeleteCloneCellRequest = DisableCloneCellRequest;
/**
 * @public
 */
export declare type DeleteCloneCellResponse = void;
/**
 * @public
 */
export interface GrantZomeCallCapabilityRequest {
    /**
     * Cell for which to authorize the capability.
     */
    cell_id: CellId;
    /**
     * Specifies the capability, consisting of zomes and functions to allow
     * signing for as well as access level, secret and assignees.
     */
    cap_grant: ZomeCallCapGrant;
}
/**
 * @public
 */
export declare type GrantZomeCallCapabilityResponse = void;
/**
 * @public
 */
export declare type InstallAppDnaPayload = {
    hash: HoloHash;
    role_name: RoleName;
    membrane_proof?: MembraneProof;
};
/**
 * @public
 */
export declare type ZomeLocation = Location;
/**
 * @public
 */
export declare type ZomeManifest = {
    name: string;
    hash?: string;
} & ZomeLocation;
/**
 * @public
 */
export declare type DnaManifest = {
    /**
     * Currently one "1" is supported
     */
    manifest_version: string;
    /**
     * The friendly "name" of a Holochain DNA.
     */
    name: string;
    /**
     * A network seed for uniquifying this DNA.
     */
    network_seed?: NetworkSeed;
    /**
     * Any arbitrary application properties can be included in this object.
     */
    properties?: DnaProperties;
    /**
     * An array of zomes associated with your DNA.
     * The order is significant: it determines initialization order.
     */
    zomes: Array<ZomeManifest>;
};
/**
 * @public
 */
export declare type DnaBundle = {
    manifest: DnaManifest;
    resources: ResourceMap;
};
/**
 * @public
 */
export declare type DnaSource = {
    hash: HoloHash;
} | {
    path: string;
} | {
    bundle: DnaBundle;
};
/**
 * @public
 */
export declare type Zomes = Array<[string, {
    wasm_hash: Array<HoloHash>;
}]>;
/**
 * @public
 */
export declare type WasmCode = [HoloHash, {
    code: Array<number>;
}];
/**
 * @public
 */
export interface AgentInfoDump {
    kitsune_agent: KitsuneAgent;
    kitsune_space: KitsuneSpace;
    dump: string;
}
/**
 * @public
 */
export interface P2pAgentsDump {
    /**
     * The info of this agent's cell.
     */
    this_agent_info: AgentInfoDump | undefined;
    /**
     * The dna as a [`DnaHash`] and [`kitsune_p2p::KitsuneSpace`].
     */
    this_dna: [DnaHash, KitsuneSpace] | undefined;
    /**
     * The agent as [`AgentPubKey`] and [`kitsune_p2p::KitsuneAgent`].
     */
    this_agent: [AgentPubKey, KitsuneAgent] | undefined;
    /**
     * All other agent info.
     */
    peers: Array<AgentInfoDump>;
}
/**
 * @public
 */
export interface FullIntegrationStateDump {
    validation_limbo: Array<DhtOp>;
    integration_limbo: Array<DhtOp>;
    integrated: Array<DhtOp>;
    dht_ops_cursor: number;
}
/**
 * @public
 */
export interface SourceChainJsonRecord {
    signature: Signature;
    action_address: ActionHash;
    action: Action;
    entry: Entry | undefined;
}
/**
 * @public
 */
export interface SourceChainJsonDump {
    records: Array<SourceChainJsonRecord>;
    published_ops_count: number;
}
/**
 * @public
 */
export interface FullStateDump {
    peer_dump: P2pAgentsDump;
    source_chain_dump: SourceChainJsonDump;
    integration_dump: FullIntegrationStateDump;
}
/**
 * @public
 */
export interface AdminApi {
    attachAppInterface: Requester<AttachAppInterfaceRequest, AttachAppInterfaceResponse>;
    enableApp: Requester<EnableAppRequest, EnableAppResponse>;
    disableApp: Requester<DisableAppRequest, DisableAppResponse>;
    dumpState: Requester<DumpStateRequest, DumpStateResponse>;
    dumpFullState: Requester<DumpFullStateRequest, DumpFullStateResponse>;
    generateAgentPubKey: Requester<GenerateAgentPubKeyRequest, GenerateAgentPubKeyResponse>;
    registerDna: Requester<RegisterDnaRequest, RegisterDnaResponse>;
    getDnaDefinition: Requester<GetDnaDefinitionRequest, GetDnaDefinitionResponse>;
    uninstallApp: Requester<UninstallAppRequest, UninstallAppResponse>;
    installApp: Requester<InstallAppRequest, InstallAppResponse>;
    listDnas: Requester<ListDnasRequest, ListDnasResponse>;
    listCellIds: Requester<ListCellIdsRequest, ListCellIdsResponse>;
    listApps: Requester<ListAppsRequest, ListAppsResponse>;
    listAppInterfaces: Requester<ListAppInterfacesRequest, ListAppInterfacesResponse>;
    agentInfo: Requester<AgentInfoRequest, AgentInfoResponse>;
    addAgentInfo: Requester<AddAgentInfoRequest, AddAgentInfoResponse>;
    deleteCloneCell: Requester<DeleteCloneCellRequest, DeleteCloneCellResponse>;
    grantZomeCallCapability: Requester<GrantZomeCallCapabilityRequest, GrantZomeCallCapabilityResponse>;
}
