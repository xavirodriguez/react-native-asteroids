declare module 'next-themes' {
  import * as React from 'react';
  export interface ThemeProviderProps {
    children?: React.ReactNode;
    [key: string]: any;
  }
  export const ThemeProvider: React.ComponentType<ThemeProviderProps>;
  export const NextThemesProvider: React.ComponentType<ThemeProviderProps>;
}
