/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module '*.wasm?url' {
  const content: string;
  export default content;
}

declare module 'sql.js/dist/sql-wasm.wasm?url' {
  const content: string;
  export default content;
}

declare module 'sql.js/dist/sql-wasm-inline.js' {
  import type { InitSqlJsStatic } from 'sql.js';
  const initSqlJs: InitSqlJsStatic;
  export default initSqlJs;
}

