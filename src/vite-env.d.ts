/// <reference types="vite/client" />

declare const __BUILD_DATE__: string;

interface ImportMetaEnv {
  readonly VITE_BUILD_NUMBER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
