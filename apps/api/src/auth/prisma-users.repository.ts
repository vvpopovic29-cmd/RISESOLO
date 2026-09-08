import { Injectable } from "@nestjs/common";
import type { User as PrismaUser } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { UserRecord } from "./user.entity";
import type { UsersRepository } from "./users.repository";

function toRecord(user: PrismaUser): UserRecord {
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    displayName: user.displayName,
    createdAt: user.createdAt.toISOString(),
  };
}

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserRecord | undefined> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    return user ? toRecord(user) : undefined;
  }

  async findById(id: string): Promise<UserRecord | undefined> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? toRecord(user) : undefined;
  }

  async save(user: UserRecord): Promise<void> {
    await this.prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email.toLowerCase(),
        passwordHash: user.passwordHash,
        displayName: user.displayName,
        createdAt: new Date(user.createdAt),
      },
      update: {
        email: user.email.toLowerCase(),
        passwordHash: user.passwordHash,
        displayName: user.displayName,
      },
    });
  }
}
