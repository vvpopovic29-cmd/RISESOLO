import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import {
  claimEventItemRequestSchema,
  craftWorkshopItemRequestSchema,
  createCustomItemRequestSchema,
  type ClaimEventItemRequest,
  type ClaimEventItemResponse,
  type CraftWorkshopItemRequest,
  type CraftWorkshopItemResponse,
  type CreateCustomItemRequest,
  type CreateCustomItemResponse,
  type EventItemDto,
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

  @Get("event")
  listEvent(@CurrentUser() user: AuthenticatedUser): Promise<EventItemDto[]> {
    return this.inventoryService.listEvent(user.id);
  }

  @Post("event/claim")
  claimEventItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(claimEventItemRequestSchema)) dto: ClaimEventItemRequest,
  ): Promise<ClaimEventItemResponse> {
    return this.inventoryService.claimEventItem(user.id, dto.itemId);
  }

  @Get("ai")
  listAiItems(@CurrentUser() user: AuthenticatedUser): Promise<InventoryItemDto[]> {
    return this.inventoryService.listAiItems(user.id);
  }

  @Get("recovery")
  listRecoveryItems(@CurrentUser() user: AuthenticatedUser): Promise<InventoryItemDto[]> {
    return this.inventoryService.listRecoveryItems(user.id);
  }

  @Get("custom")
  listCustomItems(@CurrentUser() user: AuthenticatedUser): Promise<InventoryItemDto[]> {
    return this.inventoryService.listCustomItems(user.id);
  }

  @Post("custom/create")
  createCustomItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createCustomItemRequestSchema)) dto: CreateCustomItemRequest,
  ): Promise<CreateCustomItemResponse> {
    return this.inventoryService.createCustomItem(user.id, dto.name, dto.description);
  }
}
