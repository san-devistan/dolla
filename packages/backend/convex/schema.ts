import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

const nullableString = v.union(v.string(), v.null())
const nullableNumber = v.union(v.number(), v.null())

export default defineSchema({
  mediaCategories: defineTable({
    path: v.string(),
    name: v.string(),
    displayPath: v.string(),
    orderRank: v.number(),
    coverShootPath: nullableString,
    cloudinaryExternalId: nullableString,
    cloudinaryCreatedAt: nullableString,
    cloudinaryUpdatedAt: nullableString,
    syncedAt: v.number(),
    deletedAt: nullableNumber,
  })
    .index("by_path", ["path"])
    .index("by_deletedAt_and_orderRank", ["deletedAt", "orderRank"]),
  mediaShoots: defineTable({
    path: v.string(),
    categoryPath: v.string(),
    categoryName: v.string(),
    name: v.string(),
    displayPath: v.string(),
    orderRank: v.number(),
    coverAssetId: nullableString,
    credits: v.optional(v.string()),
    cloudinaryExternalId: nullableString,
    cloudinaryCreatedAt: nullableString,
    cloudinaryUpdatedAt: nullableString,
    syncedAt: v.number(),
    deletedAt: nullableNumber,
  })
    .index("by_path", ["path"])
    .index("by_categoryPath_and_deletedAt_and_orderRank", [
      "categoryPath",
      "deletedAt",
      "orderRank",
    ])
    .index("by_deletedAt_and_orderRank", ["deletedAt", "orderRank"]),
  mediaAssets: defineTable({
    cloudinaryAssetId: v.string(),
    publicId: v.string(),
    assetFolder: v.string(),
    categoryPath: v.string(),
    shootPath: v.string(),
    categoryName: v.string(),
    shootName: v.string(),
    displayName: v.string(),
    format: v.string(),
    resourceType: v.string(),
    bytes: v.number(),
    width: nullableNumber,
    height: nullableNumber,
    aspectRatio: nullableNumber,
    secureUrl: v.string(),
    thumbnailUrl: v.string(),
    previewUrl: v.string(),
    displayFolder: v.string(),
    createdAt: nullableString,
    context: v.record(v.string(), v.string()),
    orderRank: v.number(),
    layoutColumn: v.optional(v.number()),
    layoutOrder: v.optional(v.number()),
    layoutColumnCount: v.optional(v.number()),
    syncedAt: v.number(),
    deletedAt: nullableNumber,
  })
    .index("by_cloudinaryAssetId", ["cloudinaryAssetId"])
    .index("by_assetFolder_and_deletedAt_and_orderRank", [
      "assetFolder",
      "deletedAt",
      "orderRank",
    ])
    .index("by_shootPath_and_deletedAt_and_orderRank", [
      "shootPath",
      "deletedAt",
      "orderRank",
    ])
    .index("by_categoryPath_and_deletedAt_and_orderRank", [
      "categoryPath",
      "deletedAt",
      "orderRank",
    ])
    .index("by_deletedAt_and_createdAt", ["deletedAt", "createdAt"]),
  siteContent: defineTable({
    key: v.string(),
    blocks: v.array(
      v.object({
        id: v.string(),
        kind: v.union(v.literal("paragraph"), v.literal("heading")),
        text: v.string(),
        bold: v.boolean(),
      })
    ),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
  contactSettings: defineTable({
    key: v.string(),
    notificationRecipients: v.array(v.string()),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
})
