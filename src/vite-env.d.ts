/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 'fixture' serves deterministic offline data; anything else uses the live proxy server. */
  readonly VITE_DATA_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
