import { BadRequestException, Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import {
  equipShopItemRequestSchema,
  purchaseShopItemRequestSchema,
  type EquipShopItemRequest,
  type PurchaseShopItemRequest,
  type PurchaseShopItemResponse,
  type ShopItemDto,
} from "@risesolo/validation";
import { SHOP_CATEGORIES, type ShopCategory } from "@risesolo/domain";
import { CurrentUser, type AuthenticatedUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { ShopService } from "./shop.service";

@Controller("shop")
@UseGuards(JwtAuthGuard)
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<ShopItemDto[]> {
    return this.shopService.list(user.id);
  }

  @Post("purchase")
  purchase(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(purchaseShopItemRequestSchema)) dto: PurchaseShopItemRequest,
  ): Promise<PurchaseShopItemResponse> {
    return this.shopService.purchase(user.id, dto.itemId);
  }

  @Post("equip")
  equip(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(equipShopItemRequestSchema)) dto: EquipShopItemRequest,
  ): Promise<ShopItemDto[]> {
    return this.shopService.equip(user.id, dto.itemId);
  }

  @Delete("equip/:category")
  unequip(@CurrentUser() user: AuthenticatedUser, @Param("category") category: string): Promise<ShopItemDto[]> {
    if (!isShopCategory(category)) {
      throw new BadRequestException(`Nepoznata kategorija: ${category}`);
    }
    return this.shopService.unequip(user.id, category);
  }
}

function isShopCategory(value: string): value is ShopCategory {
  return (SHOP_CATEGORIES as readonly string[]).includes(value);
}
