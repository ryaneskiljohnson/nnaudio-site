/**
 * @fileoverview Ensures React is on globalThis/window before any styled-components import.
 * @module set-global-react
 *
 * styled-components (v6) checks `React.createContext` at module load time and expects
 * React to be on the global object in some environments. Next.js 16 with Turbopack
 * can evaluate client modules in contexts where React is not global, causing
 * "React is not defined" in styled-components/src/constants.
 *
 * Import this module first in any file that (transitively) imports styled-components
 * so that React is set before styled-components is evaluated.
 */

import React from 'react';

if (typeof globalThis !== 'undefined') {
  (globalThis as unknown as { React: typeof React }).React = React;
}
if (typeof window !== 'undefined') {
  (window as unknown as { React: typeof React }).React = React;
}
