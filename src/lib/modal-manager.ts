"use client";

import { useEffect, useState } from "react";

type ModalListener = () => void;

const listeners = new Set<ModalListener>();
let openCount = 0;
const openIds = new Set<string>();

function notify() {
  for (const l of listeners) l();
}

export function openModal(id: string) {
  if (!openIds.has(id)) {
    openIds.add(id);
    openCount = openIds.size;
    notify();
  }
}

export function closeModal(id: string) {
  if (openIds.delete(id)) {
    openCount = openIds.size;
    notify();
  }
}

export function isAnyModalOpen() {
  return openCount > 0;
}

export function useAnyModalOpen() {
  const [isOpen, setIsOpen] = useState(isAnyModalOpen());

  useEffect(() => {
    const l: ModalListener = () => setIsOpen(isAnyModalOpen());
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  return isOpen;
}

