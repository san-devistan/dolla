import type {
  CloudinaryAsset,
  CloudinaryCategoryPage,
  CloudinaryHome,
  CloudinaryPricing,
  CloudinaryShootPage,
} from "@/lib/cloudinary.server"
import { toMediaRouteSegment } from "@/lib/media-route-segment"

import {
  CATEGORY_SEO,
  DEFAULT_IMAGE_URL,
  DEFAULT_ROBOTS,
  DEFAULT_TITLE,
  NOINDEX_ROBOTS,
  SITE_NAME,
  type CategorySeoDetails,
} from "./constants"
import {
  createCategorySchema,
  createPersonSchema,
  createPricingSchema,
  createProfessionalServiceSchema,
  createShootSchema,
  createWebsiteSchema,
} from "./schema"
import {
  getAbsoluteUrl,
  getAssetSeoImage,
  humanizeRouteSegment,
  serializeJsonLd,
  type JsonLdObject,
} from "./utils"

type SeoHeadOptions = {
  description: string
  image?: string
  jsonLd?: JsonLdObject[]
  keywords?: string
  path: string
  title: string
  type?: "article" | "profile" | "website"
}

function createSeoHead({
  description,
  image = DEFAULT_IMAGE_URL,
  jsonLd = [],
  keywords,
  path,
  title,
  type = "website",
}: SeoHeadOptions) {
  const canonicalUrl = getAbsoluteUrl(path)
  const imageUrl = getAbsoluteUrl(image)

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: DEFAULT_ROBOTS },
      { name: "googlebot", content: DEFAULT_ROBOTS },
      ...(keywords ? [{ name: "keywords", content: keywords }] : []),
      { property: "og:locale", content: "fr_FR" },
      { property: "og:type", content: type },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: canonicalUrl },
      { property: "og:image", content: imageUrl },
      { property: "og:image:alt", content: title },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: imageUrl },
    ],
    links: [{ rel: "canonical", href: canonicalUrl }],
    scripts: jsonLd.map((schema) => ({
      type: "application/ld+json",
      children: serializeJsonLd(schema),
    })),
  }
}

function createNoindexSeoHead(title: string) {
  return {
    meta: [
      { title },
      { name: "robots", content: NOINDEX_ROBOTS },
      { name: "googlebot", content: NOINDEX_ROBOTS },
    ],
  }
}

function createHomeSeoHead(home?: CloudinaryHome) {
  return createSeoHead({
    title: DEFAULT_TITLE,
    description:
      "Dolla Shashin est le portfolio de Dounia Limam, photographe professionnelle a Paris pour mariage, portrait, mode, evenement, editorial et projets commerciaux.",
    image: getAssetSeoImage(home?.heroAssets[0]),
    keywords:
      "photographe paris, photographe mariage paris, photographe portrait paris, photographe evenement paris, photographe mode paris",
    path: "/",
    jsonLd: [createWebsiteSchema(), createProfessionalServiceSchema()],
  })
}

function createAboutSeoHead(image?: CloudinaryAsset) {
  const title = "A propos de Dounia Limam | Dolla Shashin"
  const description =
    "Rencontrez Dounia Limam, photographe artistique basee a Paris, specialisee en portrait creatif, mariage, mode, editorial et photographie commerciale."

  return createSeoHead({
    title,
    description,
    image: getAssetSeoImage(image),
    path: "/about",
    type: "profile",
    jsonLd: [
      createPersonSchema({ description, image: getAssetSeoImage(image) }),
    ],
  })
}

function createContactSeoHead() {
  const title = "Contact photographe Paris | Dolla Shashin"
  const description =
    "Contactez Dounia Limam, photographe professionnelle a Paris et en Ile-de-France, pour reserver une seance photo, un mariage, un evenement ou un projet creatif."

  return createSeoHead({
    title,
    description,
    path: "/contact",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "ContactPage",
        name: title,
        description,
        url: getAbsoluteUrl("/contact"),
        mainEntity: createProfessionalServiceSchema(),
      },
    ],
  })
}

function createPricingSeoHead(pricing?: CloudinaryPricing) {
  const head = createSeoHead({
    title: "Tarifs photographe Paris | Dolla Shashin",
    description:
      "Consultez les tarifs de Dolla Shashin pour portrait, mariage, evenement, mode, editorial et shooting commercial a Paris. Demandez un devis personnalise.",
    keywords:
      "tarif photographe paris, prix photographe paris, tarif photo mariage paris, prix shooting portrait paris, devis photographe paris",
    path: "/pricing",
    jsonLd: [createPricingSchema(pricing?.items ?? [])],
  })

  return {
    ...head,
    links: [
      ...head.links,
      {
        rel: "alternate",
        type: "text/plain",
        href: getAbsoluteUrl("/pricing.txt"),
      },
    ],
  }
}

function createCategorySeoHead(
  categoryPage: CloudinaryCategoryPage | undefined,
  routeCategory: string
) {
  const categoryName = getCategoryName(categoryPage, routeCategory)
  const categorySlug = toMediaRouteSegment(categoryName)
  const details = getCategorySeoDetails(categorySlug, categoryName)
  const description =
    getCategoryPageDescription(categoryPage) || details.description
  const image = getCategoryImage(categoryPage, details)

  return createSeoHead({
    title: `${details.title} | ${SITE_NAME}`,
    description,
    image,
    keywords: details.keywords,
    path: `/${categorySlug}`,
    jsonLd: [
      createCategorySchema({ categoryName, categorySlug, details, image }),
    ],
  })
}

function createShootSeoHead(
  shootPage: CloudinaryShootPage | undefined,
  routeCategory: string,
  routeShoot: string
) {
  const categoryName = getShootCategoryName(shootPage, routeCategory)
  const shootName = getShootName(shootPage, routeShoot)
  const categorySlug = toMediaRouteSegment(categoryName)
  const path = `/${categorySlug}/${toMediaRouteSegment(shootName)}`
  const image = getAssetSeoImage(shootPage?.assets[0]) || DEFAULT_IMAGE_URL
  const description = getShootDescription(shootPage, shootName)

  return createSeoHead({
    title: `${shootName} | ${SITE_NAME}`,
    description,
    image,
    path,
    type: "article",
    jsonLd: [
      createShootSchema({
        assets: shootPage?.assets ?? [],
        categoryName,
        categorySlug,
        description,
        image,
        path,
        shootName,
      }),
    ],
  })
}

function getCategoryName(
  categoryPage: CloudinaryCategoryPage | undefined,
  routeCategory: string
) {
  return categoryPage?.category?.name || humanizeRouteSegment(routeCategory)
}

function getShootCategoryName(
  shootPage: CloudinaryShootPage | undefined,
  routeCategory: string
) {
  return shootPage?.category?.name || humanizeRouteSegment(routeCategory)
}

function getShootName(
  shootPage: CloudinaryShootPage | undefined,
  routeShoot: string
) {
  return shootPage?.shoot?.name || humanizeRouteSegment(routeShoot)
}

function getCategoryImage(
  categoryPage: CloudinaryCategoryPage | undefined,
  details: CategorySeoDetails
) {
  const categoryCover = categoryPage?.categories.find(
    (category) => category.path === categoryPage.category?.path
  )?.cover

  return (
    getAssetSeoImage(categoryCover) ||
    getAssetSeoImage(categoryPage?.assets[0]) ||
    getAssetSeoImage(categoryPage?.shoots[0]?.cover || undefined) ||
    details.image
  )
}

function getCategoryPageDescription(
  categoryPage: CloudinaryCategoryPage | undefined
) {
  if (typeof categoryPage?.category?.description !== "string") {
    return null
  }

  return categoryPage.category.description.trim()
}

function getShootDescription(
  shootPage: CloudinaryShootPage | undefined,
  shootName: string
) {
  return (
    shootPage?.shoot?.credits ||
    `Decouvrez la galerie photo ${shootName} par Dounia Limam, photographe professionnelle a Paris.`
  )
}

function getCategorySeoDetails(slug: string, name: string) {
  return (
    (isCategorySeoSlug(slug) ? CATEGORY_SEO[slug] : undefined) ?? {
      title: `${name} - photographe Paris`,
      description: `Decouvrez la galerie ${name} de Dolla Shashin, photographe professionnelle a Paris et en Ile-de-France.`,
      keywords: `photographe ${name.toLowerCase()} paris, shooting ${name.toLowerCase()} paris, dolla shashin ${name.toLowerCase()}`,
      serviceType: `Photographie ${name}`,
      serviceDescription: `Galerie et prestations photo ${name} par Dolla Shashin a Paris.`,
      image: DEFAULT_IMAGE_URL,
    }
  )
}

function isCategorySeoSlug(slug: string): slug is keyof typeof CATEGORY_SEO {
  return Object.hasOwn(CATEGORY_SEO, slug)
}

function getCategorySeoDescription(categoryName: string) {
  const categorySlug = toMediaRouteSegment(categoryName)

  return getCategorySeoDetails(categorySlug, categoryName).description
}

function getCategorySeoTitle(categoryName: string) {
  const categorySlug = toMediaRouteSegment(categoryName)

  return getCategorySeoDetails(categorySlug, categoryName).title
}

export {
  createAboutSeoHead,
  createCategorySeoHead,
  createContactSeoHead,
  createHomeSeoHead,
  createNoindexSeoHead,
  createPricingSeoHead,
  createSeoHead,
  createShootSeoHead,
  getCategorySeoDescription,
  getCategorySeoTitle,
}
