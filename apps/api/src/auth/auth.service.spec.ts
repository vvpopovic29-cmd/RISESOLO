import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { Test, type TestingModule } from "@nestjs/testing";
import { InMemoryPlayerRepository, PLAYER_REPOSITORY } from "../player/player.repository";
import { PlayerService } from "../player/player.service";
import { AuthService } from "./auth.service";
import { InMemoryUsersRepository, USERS_REPOSITORY } from "./users.repository";

describe("AuthService", () => {
  let service: AuthService;
  let playerService: PlayerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: "test-secret", signOptions: { expiresIn: "1h" } })],
      providers: [
        AuthService,
        PlayerService,
        { provide: USERS_REPOSITORY, useClass: InMemoryUsersRepository },
        { provide: PLAYER_REPOSITORY, useClass: InMemoryPlayerRepository },
      ],
    }).compile();

    service = module.get(AuthService);
    playerService = module.get(PlayerService);
  });

  it("register kreira nalog, JWT i pocetni player profil", async () => {
    const response = await service.register({
      email: "hunter@risesolo.app",
      password: "password123",
      displayName: "Hunter",
    });

    expect(response.user.email).toBe("hunter@risesolo.app");
    expect(response.accessToken.length).toBeGreaterThan(0);

    const profile = await playerService.getProfile(response.user.id);
    expect(profile.level).toBe(1);
  });

  it("register odbija duplirani email", async () => {
    await service.register({
      email: "hunter@risesolo.app",
      password: "password123",
      displayName: "Hunter",
    });

    await expect(
      service.register({
        email: "hunter@risesolo.app",
        password: "another-pass",
        displayName: "Drugi",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("login uspeva sa ispravnom lozinkom", async () => {
    await service.register({
      email: "hunter@risesolo.app",
      password: "password123",
      displayName: "Hunter",
    });

    const response = await service.login({
      email: "hunter@risesolo.app",
      password: "password123",
    });

    expect(response.user.email).toBe("hunter@risesolo.app");
  });

  it("login baca UnauthorizedException za pogresnu lozinku", async () => {
    await service.register({
      email: "hunter@risesolo.app",
      password: "password123",
      displayName: "Hunter",
    });

    await expect(
      service.login({ email: "hunter@risesolo.app", password: "wrong-password" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("login baca UnauthorizedException za nepostojeci email", async () => {
    await expect(
      service.login({ email: "nobody@risesolo.app", password: "password123" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
