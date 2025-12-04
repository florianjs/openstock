// Extend nuxt-auth-utils types
// See: https://github.com/atinux/nuxt-auth-utils#extending-the-types

declare module '#auth-utils' {
  interface User {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'member' | 'viewer';
  }
}

export {};
