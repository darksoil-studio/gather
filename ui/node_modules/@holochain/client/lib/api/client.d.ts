/// <reference types="ws" />
import { decode } from "@msgpack/msgpack";
import Emittery from "emittery";
import Websocket from "isomorphic-ws";
/**
 * A Websocket client which can make requests and receive responses,
 * as well as send and receive signals.
 *
 * Uses Holochain's websocket WireMessage for communication.
 *
 * @public
 */
export declare class WsClient extends Emittery {
    socket: Websocket;
    pendingRequests: Record<number, {
        resolve: (msg: unknown) => ReturnType<typeof decode>;
        reject: (error: Error) => void;
    }>;
    index: number;
    constructor(socket: Websocket);
    /**
     * Instance factory for creating WsClients.
     *
     * @param url - The `ws://` URL to connect to.
     * @returns An new instance of the WsClient.
     */
    static connect(url: string): Promise<WsClient>;
    /**
     * Sends data as a signal.
     *
     * @param data - Data to send.
     */
    emitSignal(data: unknown): void;
    /**
     * Send requests to the connected websocket.
     *
     * @param request - The request to send over the websocket.
     * @returns
     */
    request<Req, Res>(request: Req): Promise<Res>;
    private handleResponse;
    /**
     * Close the websocket connection.
     */
    close(): Promise<void>;
}
