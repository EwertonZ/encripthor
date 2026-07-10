import { Room } from '@/types/game';

interface RoomStoreData {
  room: Room;
  isLeader: boolean;
}

let roomData: RoomStoreData | null = null;

export function setRoomData(data: RoomStoreData): void {
  roomData = data;
}

export function getRoomData(): RoomStoreData | null {
  return roomData;
}
