import type { Role } from "@/lib/constants";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      username: string | null;
      phone: string;
      role: Role;
      shopId: string | null;
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    username?: string | null;
    phone: string;
    role: Role;
    shopId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    name: string;
    email: string;
    username: string | null;
    role: Role;
    phone: string;
    shopId: string | null;
  }
}
