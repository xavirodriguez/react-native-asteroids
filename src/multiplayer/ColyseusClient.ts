import { Client, Room } from "@colyseus/sdk";

const COLYSEUS_ENDPOINT = "ws://127.0.0.1:2567";

let client: Client | null = null;
let room: Room | null = null;

export function getColyseusClient() {
  if (!client) {
    client = new Client(COLYSEUS_ENDPOINT);
  }
  return client;
}

export async function connectToRoom(roomName: string, playerName: string) {
  const client = getColyseusClient();
  room = await client.joinOrCreate(roomName, { name: playerName });
  return room;
}

export function sendInput(type: string, input: any) {
  room?.send(type, input);
}

export function getRoom() { return room; }

export function disconnect() {
    room?.leave();
    room = null;
}
