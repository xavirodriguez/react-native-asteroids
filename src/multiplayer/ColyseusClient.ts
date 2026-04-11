import { Client, Room } from "@colyseus/sdk";

const COLYSEUS_ENDPOINT =
  process.env.EXPO_PUBLIC_COLYSEUS_URL ?? "ws://127.0.0.1:2567";

let client: Client | null = null;
let room: Room | null = null;

/**
 * Obtiene la instancia única del cliente de Colyseus.
 * @public
 */
export function getColyseusClient() {
  if (!client) {
    client = new Client(COLYSEUS_ENDPOINT);
  }
  return client;
}

/**
 * Se conecta o crea una sala en el servidor de Colyseus.
 *
 * @param roomName - Nombre de la sala a la que unirse.
 * @param playerName - Nombre del jugador local.
 * @returns Una promesa que resuelve con la instancia de la sala.
 * @public
 */
export async function connectToRoom(roomName: string, playerName: string) {
  const client = getColyseusClient();
  room = await client.joinOrCreate(roomName, { name: playerName });
  return room;
}

/**
 * Envía una entrada de usuario al servidor mediante el socket de Colyseus.
 *
 * @param type - El tipo de mensaje de entrada (e.g., "input").
 * @param input - Los datos de la entrada (e.g., acciones y ejes).
 * @public
 */
export function sendInput(type: string, input: any) {
  room?.send(type, input);
}

export function getRoom() { return room; }

export function disconnect() {
    room?.leave();
    room = null;
}
