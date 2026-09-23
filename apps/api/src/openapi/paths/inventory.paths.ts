import {
  claimEventItemRequestSchema,
  claimEventItemResponseSchema,
  craftWorkshopItemRequestSchema,
  craftWorkshopItemResponseSchema,
  createCustomItemRequestSchema,
  createCustomItemResponseSchema,
  listEventResponseSchema,
  listInventoryResponseSchema,
  listWorkshopResponseSchema,
} from "@risesolo/validation";
import { AUTH_RESPONSES, AUTH_SECURITY, badRequestResponse, jsonBody, jsonResponse, registry } from "../registry";

export function registerInventoryPaths(): void {
  const InventoryItemList = registry.register("InventoryItemList", listInventoryResponseSchema);
  const WorkshopItemList = registry.register("WorkshopItemList", listWorkshopResponseSchema);
  const CraftWorkshopItemRequest = registry.register("CraftWorkshopItemRequest", craftWorkshopItemRequestSchema);
  const CraftWorkshopItemResponse = registry.register("CraftWorkshopItemResponse", craftWorkshopItemResponseSchema);
  const EventItemList = registry.register("EventItemList", listEventResponseSchema);
  const ClaimEventItemRequest = registry.register("ClaimEventItemRequest", claimEventItemRequestSchema);
  const ClaimEventItemResponse = registry.register("ClaimEventItemResponse", claimEventItemResponseSchema);
  const CreateCustomItemRequest = registry.register("CreateCustomItemRequest", createCustomItemRequestSchema);
  const CreateCustomItemResponse = registry.register("CreateCustomItemResponse", createCustomItemResponseSchema);

  const inventoryList = (path: string, summary: string): void => {
    registry.registerPath({
      method: "get",
      path,
      tags: ["Inventory"],
      summary,
      security: AUTH_SECURITY,
      responses: { 200: jsonResponse(InventoryItemList), ...AUTH_RESPONSES },
    });
  };

  inventoryList("/inventory", "Svi predmeti u inventaru (svi izvori)");
  inventoryList("/inventory/guild", "Predmeti dobijeni od ceha");
  inventoryList("/inventory/ai", "AI-generisani predmeti");
  inventoryList("/inventory/recovery", "Predmeti za oporavak");
  inventoryList("/inventory/custom", "Sopstveni (custom) predmeti");

  registry.registerPath({
    method: "get",
    path: "/inventory/workshop",
    tags: ["Inventory"],
    summary: "Radionica - predmeti dostupni za izradu (craft)",
    security: AUTH_SECURITY,
    responses: { 200: jsonResponse(WorkshopItemList), ...AUTH_RESPONSES },
  });

  registry.registerPath({
    method: "post",
    path: "/inventory/workshop/craft",
    tags: ["Inventory"],
    summary: "Izradi predmet u radionici",
    security: AUTH_SECURITY,
    request: { body: jsonBody(CraftWorkshopItemRequest) },
    responses: { 201: jsonResponse(CraftWorkshopItemResponse), 400: badRequestResponse, ...AUTH_RESPONSES },
  });

  registry.registerPath({
    method: "get",
    path: "/inventory/event",
    tags: ["Inventory"],
    summary: "Predmeti dostupni tokom trenutnog event-a",
    security: AUTH_SECURITY,
    responses: { 200: jsonResponse(EventItemList), ...AUTH_RESPONSES },
  });

  registry.registerPath({
    method: "post",
    path: "/inventory/event/claim",
    tags: ["Inventory"],
    summary: "Preuzmi (claim) event predmet",
    security: AUTH_SECURITY,
    request: { body: jsonBody(ClaimEventItemRequest) },
    responses: { 201: jsonResponse(ClaimEventItemResponse), 400: badRequestResponse, ...AUTH_RESPONSES },
  });

  registry.registerPath({
    method: "post",
    path: "/inventory/custom/create",
    tags: ["Inventory"],
    summary: "Kreiraj sopstveni (custom) predmet",
    security: AUTH_SECURITY,
    request: { body: jsonBody(CreateCustomItemRequest) },
    responses: { 201: jsonResponse(CreateCustomItemResponse), 400: badRequestResponse, ...AUTH_RESPONSES },
  });
}
