import { Controller, Get, UseGuards } from "@nestjs/common";
import type {
  BossQuestDto,
  DailyQuestDto,
  MainQuestDto,
  PenaltyQuestResponse,
  SideQuestResponse,
  WeeklyQuestDto,
} from "@risesolo/validation";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { QuestsService } from "./quests.service";

@Controller("quests")
@UseGuards(JwtAuthGuard)
export class QuestsController {
  constructor(private readonly questsService: QuestsService) {}

  // Nema POST /quests/:id/complete - quest lifecycle je server-authoritative,
  // zavrsava se iskljucivo unutar workout completion engine-a.
  @Get("today")
  getToday(@CurrentUser() user: AuthenticatedUser): Promise<DailyQuestDto> {
    return this.questsService.getTodayQuest(user.id);
  }

  @Get("boss")
  getBoss(@CurrentUser() user: AuthenticatedUser): Promise<BossQuestDto> {
    return this.questsService.getCurrentBossQuest(user.id);
  }

  // Nedeljni quest se zavrsava LAZY unutar GET-a (progres je izveden iz
  // vec postojecih dogadjaja - vidi QuestsService.getCurrentWeeklyQuest).
  @Get("weekly")
  getWeekly(@CurrentUser() user: AuthenticatedUser): Promise<WeeklyQuestDto> {
    return this.questsService.getCurrentWeeklyQuest(user.id);
  }

  // Main Quest NIKAD ne istice/resetuje se po datumu - lanac napreduje kroz
  // stat-ove (vidi QuestsService.getCurrentMainQuest).
  @Get("main")
  getMain(@CurrentUser() user: AuthenticatedUser): Promise<MainQuestDto> {
    return this.questsService.getCurrentMainQuest(user.id);
  }

  // Read-only - Side Quest se NIKAD ne zavrsava ovde (vidi
  // QuestsService.getCurrentSideQuest); `quest: null` znaci da je korisnik
  // iscrpeo biblioteku vezbi.
  @Get("side")
  getSide(@CurrentUser() user: AuthenticatedUser): Promise<SideQuestResponse> {
    return this.questsService.getCurrentSideQuest(user.id);
  }

  // Read-only i namerno se NE generise ovde ako ne postoji - Penalty Quest
  // postoji SAMO kada je Penalty System stvarno primenio kaznu danas (vidi
  // QuestsService.getCurrentPenaltyQuest). `quest: null` je normalno stanje.
  @Get("penalty")
  getPenalty(@CurrentUser() user: AuthenticatedUser): Promise<PenaltyQuestResponse> {
    return this.questsService.getCurrentPenaltyQuest(user.id);
  }
}
