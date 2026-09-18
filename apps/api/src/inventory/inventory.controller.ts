import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import {
  craftWorkshopItemRequestSchema,
  type CraftWorkshopItemRequest,
  type CraftWorkshopItemResponse,
  type InventoryItemDto,
  type WorkshopItemDto,
} from "@risesolo/validation";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { InventoryService } from "./inventory.service";

@Controller("inventory")
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<InventoryItemDto[]> {
    return this.inventoryService.listForUser(user.id);
  }

  @Get("workshop")
  listWorkshop(@CurrentUser() user: AuthenticatedUser): Promise<WorkshopItemDto[]> {
    return this.inventoryService.listWorkshop(user.id);
  }

  @Post("workshop/craft")
  craftWorkshopItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(craftWorkshopItemRequestSchema)) dto: CraftWorkshopItemRequest,
  ): Promise<CraftWorkshopItemResponse> {
    return this.inventoryService.craftWorkshopItem(user.id, dto.itemId);
  }

  @Get("guild")
  listGuildItems(@CurrentUser() user: AuthenticatedUser): Promise<InventoryItemDto[]> {
    return this.inventoryService.listGuildItems(user.id);
  }
}
