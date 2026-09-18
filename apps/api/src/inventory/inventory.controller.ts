import { Controller, Get, UseGuards } from "@nestjs/common";
import type { InventoryItemDto } from "@risesolo/validation";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { InventoryService } from "./inventory.service";

@Controller("inventory")
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<InventoryItemDto[]> {
    return this.inventoryService.listForUser(user.id);
  }
}
