/**
 * Vitest setup: ensure React is on global for styled-components in jsdom tests.
 */
import React from 'react';
(globalThis as unknown as { React: typeof React }).React = React;
