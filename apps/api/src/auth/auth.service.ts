import { ConflictException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import type { AuthResponse, LoginRequest, RegisterRequest } from "@risesolo/validation";
import { PlayerService } from "../player/player.service";
import type { UserRecord } from "./user.entity";
import { USERS_REPOSITORY, type UsersRepository } from "./users.repository";

const PASSWORD_SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    @Inject(USERS_REPOSITORY) private readonly usersRepository: UsersRepository,
    private readonly playerService: PlayerService,
    private readonly jwtService: JwtService,
  ) {}

  async register(request: RegisterRequest): Promise<AuthResponse> {
    const existing = await this.usersRepository.findByEmail(request.email);
    if (existing) {
      throw new ConflictException("Nalog sa ovim emailom vec postoji");
    }

    const user: UserRecord = {
      id: randomUUID(),
      email: request.email,
      passwordHash: await bcrypt.hash(request.password, PASSWORD_SALT_ROUNDS),
      displayName: request.displayName,
      createdAt: new Date().toISOString(),
    };

    await this.usersRepository.save(user);
    await this.playerService.createInitialProfile(user.id);

    return this.buildAuthResponse(user);
  }

  async login(request: LoginRequest): Promise<AuthResponse> {
    const user = await this.usersRepository.findByEmail(request.email);
    if (!user) {
      throw new UnauthorizedException("Pogresan email ili lozinka");
    }

    const passwordMatches = await bcrypt.compare(request.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException("Pogresan email ili lozinka");
    }

    return this.buildAuthResponse(user);
  }

  private async buildAuthResponse(user: UserRecord): Promise<AuthResponse> {
    const accessToken = await this.jwtService.signAsync({ sub: user.id, email: user.email });
    return {
      accessToken,
      user: { id: user.id, email: user.email, displayName: user.displayName },
    };
  }
}
