import "@testing-library/jest-dom/vitest";

(globalThis as typeof globalThis & { activeDocument?: Document }).activeDocument = document;
(globalThis as typeof globalThis & { activeWindow?: Window }).activeWindow = window;
