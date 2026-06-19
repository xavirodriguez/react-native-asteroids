'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

/**
 * Wrapper component for the `next-themes` provider to handle application-wide theming.
 *
 * @param props - Component properties extending {@link ThemeProviderProps}.
 * @returns A React functional component.
 *
 * @remarks
 * This component enables theme switching (e.g., light, dark, system) across the application.
 * It is marked with `'use client'` as it relies on client-side React context.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
