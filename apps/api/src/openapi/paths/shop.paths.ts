import { equipShopItemRequestSchema, listShopResponseSchema, purchaseShopItemRequestSchema, purchaseShopItemResponseSchema, z } from "@risesolo/validation";
import { AUTH_RESPONSES, AUTH_SECURITY, badRequestResponse, jsonBody, jsonResponse, registry } from "../registry";

export function registerShopPaths(): void {
  const ShopItemList = registry.register("ShopItemList", listShopResponseSchema);
  const PurchaseShopItemRequest = registry.register("PurchaseShopItemRequest", purchaseShopItemRequestSchema);
  const PurchaseShopItemResponse = registry.register("PurchaseShopItemResponse", purchaseShopItemResponseSchema);
  const EquipShopItemRequest = registry.register("EquipShopItemRequest", equipShopItemRequestSchema);

  registry.registerPath({
    method: "get",
    path: "/shop",
    tags: ["Shop"],
    summary: "Ceo katalog kozmetike (kupljeno i nekupljeno)",
    security: AUTH_SECURITY,
    responses: {
      200: jsonResponse(ShopItemList),
      ...AUTH_RESPONSES,
    },
  });

  registry.registerPath({
    method: "post",
    path: "/shop/purchase",
    tags: ["Shop"],
    summary: "Kupi kozmetički predmet za coins",
    security: AUTH_SECURITY,
    request: { body: jsonBody(PurchaseShopItemRequest) },
    responses: {
      200: jsonResponse(PurchaseShopItemResponse),
      400: badRequestResponse,
      ...AUTH_RESPONSES,
    },
  });

  registry.registerPath({
    method: "post",
    path: "/shop/equip",
    tags: ["Shop"],
    summary: "Opremi kupljeni kozmetički predmet",
    security: AUTH_SECURITY,
    request: { body: jsonBody(EquipShopItemRequest) },
    responses: {
      200: jsonResponse(ShopItemList),
      400: badRequestResponse,
      ...AUTH_RESPONSES,
    },
  });

  registry.registerPath({
    method: "delete",
    path: "/shop/equip/{category}",
    tags: ["Shop"],
    summary: "Skini opremljeni predmet iz date kategorije",
    security: AUTH_SECURITY,
    request: { params: z.object({ category: z.string().openapi({ description: "Jedna od SHOP_CATEGORIES vrednosti (npr. AVATAR_FRAME, TITLE)" }) }) },
    responses: {
      200: jsonResponse(ShopItemList),
      400: badRequestResponse,
      ...AUTH_RESPONSES,
    },
  });
}
