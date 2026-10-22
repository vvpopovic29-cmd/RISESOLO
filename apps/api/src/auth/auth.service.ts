import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Prisma } from "@prisma/client";
import { BASE_PLAYER_STATS } from "@risesolo/domain";
import type { AuthResponse, LoginRequest, RegisterRequest } from "@risesolo/validation";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import type { ApiEnv } from "../config/env";

const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<ApiEnv, true>,
  ) {}

  async register(dto: RegisterRequest): Promise<AuthResponse> {
    const [existingEmail, existingUsername] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: dto.email } }),
      this.prisma.profile.findUnique({ where: { username: dto.username } }),
    ]);
    if (existingEmail) {
      throw new ConflictException("Email je vec registrovan");
    }
    if (existingUsername) {
      throw new ConflictException("Korisnicko ime je zauzeto");
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    let user;
    try {
      user = await this.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: { email: dto.email, passwordHash },
        });
        await tx.profile.create({
          data: { userId: createdUser.id, username: dto.username },
        });
        await tx.playerStats.create({
          data: { userId: createdUser.id, ...BASE_PLAYER_STATS },
        });
        await tx.progression.create({
          data: { userId: createdUser.id },
        });
        return createdUser;
      });
    } catch (error) {
      // Paralelna registracija sa istim email-om/username-om prodje proveru iznad pre nego sto
      // jedna od njih upise red - unique constraint je poslednja linija odbrane, mapiramo ga na 409.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const target = String(error.meta?.target ?? "");
        throw new ConflictException(target.includes("username") ? "Korisnicko ime je zauzeto" : "Email je vec registrovan");
      }
      throw error;
    }

    return this.buildAuthResponse(user.id, user.email, dto.username);
  }

  async login(dto: LoginRequest): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { profile: true },
    });
    if (!user || !user.profile) {
      throw new UnauthorizedException("Neispravan email ili lozinka");
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException("Neispravan email ili lozinka");
    }

    return this.buildAuthResponse(user.id, user.email, user.profile.username);
  }

  private buildAuthResponse(userId: string, email: string, username: string): AuthResponse {
    const accessToken = this.jwtService.sign(
      { sub: userId, email },
      { expiresIn: this.configService.get("JWT_EXPIRES_IN", { infer: true }) },
    );
    return { accessToken, user: { id: userId, email, username } };
  }
}
