import { Injectable } from "@nestjs/common";
import type { UserRecord } from "./user.entity";

export const USERS_REPOSITORY = Symbol("USERS_REPOSITORY");

export interface UsersRepository {
  findByEmail(email: string): Promise<UserRecord | undefined>;
  findById(id: string): Promise<UserRecord | undefined>;
  save(user: UserRecord): Promise<void>;
}

/**
 * In-memory implementacija (Faza 2 jos nema Prisma/PostgreSQL konekciju -
 * videti "Poznata ogranicenja" u root README-u). Zamenjuje se Prisma
 * adapterom iza istog `UsersRepository` porta bez menjanja AuthService-a.
 */
@Injectable()
export class InMemoryUsersRepository implements UsersRepository {
  private readonly usersById = new Map<string, UserRecord>();
  private readonly userIdByEmail = new Map<string, string>();

  async findByEmail(email: string): Promise<UserRecord | undefined> {
    const id = this.userIdByEmail.get(email.toLowerCase());
    return id ? this.usersById.get(id) : undefined;
  }

  async findById(id: string): Promise<UserRecord | undefined> {
    return this.usersById.get(id);
  }

  async save(user: UserRecord): Promise<void> {
    this.usersById.set(user.id, user);
    this.userIdByEmail.set(user.email.toLowerCase(), user.id);
  }
}
