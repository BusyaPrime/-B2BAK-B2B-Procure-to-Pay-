declare module "@playwright/test" {
  export const test: (name: string, fn: (args: { page: any }) => Promise<void> | void) => void;
  export const expect: any;
}
