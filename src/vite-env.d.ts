/// <reference types="vite/client" />

declare global {
  interface Window {
    openEventModal: (eventId?: number | null) => void;
    editEvent: (id: number) => void;
    deleteEvent: (id: number) => void;
  }
}

export {};

