/**
 * @public
 */
export var CellType;
(function (CellType) {
    CellType["Provisioned"] = "provisioned";
    CellType["Cloned"] = "cloned";
    CellType["Stem"] = "stem";
})(CellType || (CellType = {}));
/**
 * @public
 */
export var CellProvisioningStrategy;
(function (CellProvisioningStrategy) {
    /**
     * Always create a new Cell when installing this App
     */
    CellProvisioningStrategy["Create"] = "create";
    /**
     * Always create a new Cell when installing the App,
     * and use a unique network seed to ensure a distinct DHT network.
     *
     * Not implemented
     */
    // CreateClone = "create_clone",
    /**
     * Require that a Cell is already installed which matches the DNA version
     * spec, and which has an Agent that's associated with this App's agent
     * via DPKI. If no such Cell exists, *app installation fails*.
     */
    CellProvisioningStrategy["UseExisting"] = "use_existing";
    /**
     * Try `UseExisting`, and if that fails, fallback to `Create`
     */
    CellProvisioningStrategy["CreateIfNoExists"] = "create_if_no_exists";
    /**
     * Disallow provisioning altogether. In this case, we expect
     * `clone_limit > 0`: otherwise, no Cells will ever be created.
     *
     * Not implemented
     */
    // Disabled = "disabled",
})(CellProvisioningStrategy || (CellProvisioningStrategy = {}));
/**
 * @public
 */
export var AppStatusFilter;
(function (AppStatusFilter) {
    AppStatusFilter["Enabled"] = "enabled";
    AppStatusFilter["Disabled"] = "disabled";
    AppStatusFilter["Running"] = "running";
    AppStatusFilter["Stopped"] = "stopped";
    AppStatusFilter["Paused"] = "paused";
})(AppStatusFilter || (AppStatusFilter = {}));
