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
    description: v.optional(v.string()),
  })
    .index("by_path", ["path"])
    .index("by_orderRank", ["orderRank"]),
  mediaShoots: defineTable({
    path: v.string(),
    categoryPath: v.string(),
    categoryName: v.string(),
    name: v.string(),
    displayPath: v.string(),
    orderRank: v.number(),
    coverAssetId: nullableString,
    credits: v.optional(v.string()),
  })
    .index("by_path", ["path"])
    .index("by_categoryPath_and_orderRank", ["categoryPath", "orderRank"])
    .index("by_orderRank", ["orderRank"]),
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
    context: v.record(v.string(), v.string()),
    orderRank: v.number(),
    layoutColumn: v.optional(v.number()),
    layoutOrder: v.optional(v.number()),
    layoutColumnCount: v.optional(v.number()),
    homeCarouselOrderRank: v.optional(v.number()),
  })
    .index("by_cloudinaryAssetId", ["cloudinaryAssetId"])
    .index("by_assetFolder_and_orderRank", ["assetFolder", "orderRank"])
    .index("by_shootPath_and_orderRank", ["shootPath", "orderRank"])
    .index("by_categoryPath_and_orderRank", ["categoryPath", "orderRank"])
    .index("by_homeCarouselOrderRank", ["homeCarouselOrderRank"]),
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
  }).index("by_key", ["key"]),
  siteAssets: defineTable({
    key: v.string(),
    cloudinaryAssetId: v.string(),
    publicId: v.string(),
    assetFolder: v.string(),
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
    context: v.record(v.string(), v.string()),
  }).index("by_key", ["key"]),
  contactSettings: defineTable({
    key: v.string(),
    notificationRecipients: v.array(v.string()),
  }).index("by_key", ["key"]),
})
