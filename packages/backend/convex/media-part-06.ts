import type { MutationCtx, QueryCtx } from "./_generated/server"
import {
  MAX_ASSETS,
  ORDER_STEP,
  buildShootDisplayPath,
  getActiveAssetByCloudinaryAssetId,
  getActiveShootByPath,
  getCategoryByPath,
  listActiveAssetsForShoot,
} from "./media-part-01"
import {
  getNextShootRank,
  isDirectPhotoCategoryPath,
  listActiveShootsForCategory,
} from "./media-part-02"
import type { MediaCategory, MediaShoot } from "./media-part-03"

function assertShootCanMove(
  shoot: MediaShoot,
  selectedShootPathSet: Set<string>,
  selectedNames: Set<string>,
  targetShootsByName: Map<string, MediaShoot>,
  targetCategory: MediaCategory
) {
  if (isDirectPhotoCategoryPath(shoot.categoryPath)) {
    throw new Error("Mariage shoot cannot be moved.")
  }

  if (shoot.categoryPath === targetCategory.path) {
    throw new Error("Choose a different category for the selected shoots.")
  }

  const shootNameKey = shoot.name.toLowerCase()

  if (selectedNames.has(shootNameKey)) {
    throw new Error("Selected shoots must have unique names.")
  }

  selectedNames.add(shootNameKey)

  const conflictingShoot = targetShootsByName.get(shootNameKey)

  if (conflictingShoot && !selectedShootPathSet.has(conflictingShoot.path)) {
    throw new Error(`"${shoot.name}" already exists in ${targetCategory.name}.`)
  }
}

export async function moveShootsInConvex(
  ctx: MutationCtx,
  shootPaths: string[],
  targetCategory: MediaCategory
) {
  const selectedShootPathSet = new Set(shootPaths)
  const [targetShoots, selectedShoots] = await Promise.all([
    listActiveShootsForCategory(ctx, targetCategory.path),
    Promise.all(
      shootPaths.map((shootPath) => getActiveShootByPath(ctx, shootPath))
    ),
  ])
  const targetShootsByName = new Map(
    targetShoots.map((shoot) => [shoot.name.toLowerCase(), shoot])
  )
  const selectedNames = new Set<string>()
  const nextRankByCategoryPath = new Map<string, number>()
  const firstOrderRank = await getNextShootRank(
    ctx,
    nextRankByCategoryPath,
    targetCategory.path
  )

  for (const shoot of selectedShoots) {
    if (!shoot) {
      throw new Error("Selected shoots must be active shoots.")
    }

    assertShootCanMove(
      shoot,
      selectedShootPathSet,
      selectedNames,
      targetShootsByName,
      targetCategory
    )
  }

  const moves = await Promise.all(
    selectedShoots.map(async (shoot, index) => {
      if (!shoot) {
        throw new Error("Selected shoots must be active shoots.")
      }

      const [sourceCategory, assets] = await Promise.all([
        getCategoryByPath(ctx, shoot.categoryPath),
        listActiveAssetsForShoot(ctx, shoot.path, MAX_ASSETS),
      ])

      return {
        assets,
        shoot,
        sourceCategory,
        orderRank: firstOrderRank + index * ORDER_STEP,
      }
    })
  )

  await Promise.all(
    moves.map(({ assets, orderRank, shoot, sourceCategory }) => {
      const writes = [
        ctx.db.patch(shoot._id, {
          categoryPath: targetCategory.path,
          categoryName: targetCategory.name,
          displayPath: buildShootDisplayPath(targetCategory.name, shoot.name),
          orderRank,
        }),
        ...assets.map((asset) =>
          ctx.db.patch(asset._id, {
            categoryPath: targetCategory.path,
            categoryName: targetCategory.name,
          })
        ),
      ]

      if (sourceCategory?.coverShootPath === shoot.path) {
        writes.push(ctx.db.patch(sourceCategory._id, { coverShootPath: null }))
      }

      return Promise.all(writes)
    })
  )
}

export async function deleteShootInConvex(ctx: MutationCtx, shoot: MediaShoot) {
  if (isDirectPhotoCategoryPath(shoot.categoryPath)) {
    throw new Error("Mariage shoot cannot be deleted.")
  }

  const assets = await listActiveAssetsForShoot(ctx, shoot.path, MAX_ASSETS)
  const category = await getCategoryByPath(ctx, shoot.categoryPath)

  await Promise.all(assets.map((asset) => ctx.db.delete(asset._id)))

  if (category?.coverShootPath === shoot.path) {
    await ctx.db.patch(category._id, { coverShootPath: null })
  }

  await ctx.db.delete(shoot._id)
}

export async function getShootCoverAsset(ctx: QueryCtx, shoot: MediaShoot) {
  if (shoot.coverAssetId) {
    const coverAsset = await getActiveAssetByCloudinaryAssetId(
      ctx,
      shoot.coverAssetId
    )

    if (coverAsset && coverAsset.shootPath === shoot.path) {
      return coverAsset
    }
  }

  const assets = await listActiveAssetsForShoot(ctx, shoot.path, 1)

  return assets[0] || null
}

export function shootFolderView(shoot: MediaShoot) {
  return {
    name: shoot.name,
    path: shoot.path,
    displayPath: shoot.displayPath,
    kind: "shoot" as const,
    depth: 2,
    parentPath: shoot.categoryPath,
    categoryName: shoot.categoryName,
    shootName: shoot.name,
    orderRank: shoot.orderRank,
    coverShootPath: null,
    coverAssetId: shoot.coverAssetId,
    description: null,
    credits: shoot.credits || null,
  }
}
