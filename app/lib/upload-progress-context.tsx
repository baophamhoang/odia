"use client";

import { createContext, useContext } from "react";

export interface UploadProgressValue {
  setProgress: (uploaded: number, total: number) => void;
  clearProgress: () => void;
}

export const UploadProgressContext = createContext<UploadProgressValue>({
  setProgress: () => {},
  clearProgress: () => {},
});

export function useUploadProgress() {
  return useContext(UploadProgressContext);
}
