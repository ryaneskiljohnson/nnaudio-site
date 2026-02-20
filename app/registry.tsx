'use client';

/**
 * Must run first: styled-components reads global React at module load.
 * This module sets global React so styled-components does not throw "React is not defined".
 */
import './set-global-react';

import React, { useState } from 'react';
import { useServerInsertedHTML } from 'next/navigation';
import { ServerStyleSheet, StyleSheetManager } from 'styled-components';

// This is necessary to ensure that styled-components works properly with SSR
// See: https://styled-components.com/docs/advanced#nextjs
export default function StyledComponentsRegistry({
  children,
}: {
  children: React.ReactNode;
}) {
  // Only create stylesheet once with lazy initial state
  // x-ref: https://reactjs.org/docs/hooks-reference.html#lazy-initial-state
  const [styledComponentsStyleSheet] = useState(() => new ServerStyleSheet());

  useServerInsertedHTML(() => {
    const styles = styledComponentsStyleSheet.getStyleElement();
    // Important: Clear the sheet after collecting styles to prevent memory leaks
    styledComponentsStyleSheet.instance.clearTag();
    return <>{styles}</>;
  });

  // Only use StyleSheetManager on the server
  if (typeof window !== 'undefined') return <>{children}</>;

  return (
    <StyleSheetManager sheet={styledComponentsStyleSheet.instance} enableVendorPrefixes>
      {children}
    </StyleSheetManager>
  );
} 