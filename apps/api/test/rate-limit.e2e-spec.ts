import { Controller, Get, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import request from "supertest";

/**
 * ThrottlerGuard je globalno ozicen preko app.module.ts (vidi
 * providers: APP_GUARD) - u produkciji/development-u 60 zahteva/minut
 * default, 5/minut na /auth/register i /auth/login (vidi
 * auth.controller.ts AUTH_THROTTLE). Ti stvarni limiti se NE mogu
 * integraciono testirati direktno - racunaju se JEDNOM pri ucitavanju
 * modula preko isTestEnvironment() (vidi src/common/throttle.ts) i u
 * testovima su namerno prakticno neograniceni da ne bi lazno rusili
 * stotine zahteva koje ostatak e2e paketa pravi. Ovaj test zato proverava
 * SAM MEHANIZAM (ThrottlerGuard vraca 429 posle limita) na izolovanom
 * mini-modulu sa niskim, fiksnim limitom - nezavisno od AppModule-a i
 * NODE_ENV grananja.
 */
@Controller("probe")
class ThrottleProbeController {
  @Get()
  ping(): { ok: true } {
    return { ok: true };
  }
}

@Module({
  imports: [ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 3 }])],
  controllers: [ThrottleProbeController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
class ThrottleProbeModule {}

describe("ThrottlerGuard mehanizam (e2e, izolovan mini-modul)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ThrottleProbeModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("propusta zahteve do limita, pa vraca 429 za sledeci u istom vremenskom prozoru", async () => {
    await request(app.getHttpServer()).get("/probe").expect(200);
    await request(app.getHttpServer()).get("/probe").expect(200);
    await request(app.getHttpServer()).get("/probe").expect(200);

    await request(app.getHttpServer()).get("/probe").expect(429);
  });
});
