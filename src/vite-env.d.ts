/// <reference types="vite/client" />

// Add ImportMeta.url type
interface ImportMeta {
  readonly env: Record<string, string>;
  readonly url: string;
}

// Declare module types if needed
declare module 'vite' {
  export function defineConfig(config: any): any;
}

declare module '@vitejs/plugin-react-swc' {
  const reactSWC: any;
  export default reactSWC;
}
