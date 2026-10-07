import { createContext, type RefObject } from 'react';

// Keep popup options inside the owning dialog's focus and accessibility boundary.
export const ComboboxPortalContext = createContext<RefObject<HTMLDivElement | null> | undefined>(
  undefined,
);
