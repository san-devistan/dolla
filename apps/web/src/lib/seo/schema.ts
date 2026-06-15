import type { CloudinaryAsset, PricingItem } from "@/lib/cloudinary.server"

import {
  DEFAULT_DESCRIPTION,
  DEFAULT_IMAGE_URL,
  PHOTOGRAPHER_NAME,
  SERVICE_AREA,
  SITE_NAME,
  SITE_URL,
  type CategorySeoDetails,
} from "./constants"
import { getAbsoluteUrl, getNumericPrice } from "./utils"

function createWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: "fr-FR",
    publisher: {
      "@id": `${SITE_URL}/#photographer`,
    },
  }
}

function createProfessionalServiceSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${SITE_URL}/#photographer`,
    name: SITE_NAME,
    alternateName: PHOTOGRAPHER_NAME,
    url: SITE_URL,
    image: DEFAULT_IMAGE_URL,
    description: DEFAULT_DESCRIPTION,
    priceRange: "130 EUR - 1000 EUR+",
    address: createParisAddress(),
    areaServed: [
      { "@type": "City", name: "Paris" },
      { "@type": "AdministrativeArea", name: "Ile-de-France" },
    ],
    founder: {
      "@type": "Person",
      name: PHOTOGRAPHER_NAME,
      alternateName: SITE_NAME,
      jobTitle: "Photographe professionnelle",
    },
    sameAs: [
      "https://www.instagram.com/dollashashin",
      "https://www.tiktok.com/@dollashashin",
      "https://pin.it/4livaNVaP",
    ],
  }
}

function createPersonSchema({
  description,
  image,
}: {
  description: string
  image?: string
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${SITE_URL}/#dounia-limam`,
    name: PHOTOGRAPHER_NAME,
    alternateName: SITE_NAME,
    jobTitle: "Photographe professionnelle",
    description,
    url: SITE_URL,
    image: image || DEFAULT_IMAGE_URL,
    address: createParisAddress(),
    knowsAbout: [
      "Photographie de portrait",
      "Photographie de mariage",
      "Photographie de mode",
      "Photographie commerciale",
      "Photographie editorial",
      "Direction artistique",
    ],
  }
}

function createCategorySchema({
  categoryName,
  categorySlug,
  details,
  image,
}: {
  categoryName: string
  categorySlug: string
  details: CategorySeoDetails
  image: string
}) {
  const url = getAbsoluteUrl(`/${categorySlug}`)

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#collection`,
    name: details.serviceType,
    description: details.serviceDescription,
    url,
    image: getAbsoluteUrl(image),
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: {
      "@type": "Service",
      name: details.serviceType,
      description: details.serviceDescription,
      provider: { "@id": `${SITE_URL}/#photographer` },
      areaServed: SERVICE_AREA,
      serviceType: details.serviceType,
    },
    breadcrumb: createBreadcrumbSchema([
      { name: "Accueil", path: "/" },
      { name: categoryName, path: `/${categorySlug}` },
    ]),
  }
}

function createShootSchema({
  assets,
  categoryName,
  categorySlug,
  description,
  image,
  path,
  shootName,
}: {
  assets: CloudinaryAsset[]
  categoryName: string
  categorySlug: string
  description: string
  image: string
  path: string
  shootName: string
}) {
  const url = getAbsoluteUrl(path)

  return {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    "@id": `${url}#gallery`,
    name: `${shootName} - ${SITE_NAME}`,
    description,
    url,
    image: getAbsoluteUrl(image),
    author: { "@id": `${SITE_URL}/#dounia-limam` },
    isPartOf: { "@id": `${SITE_URL}/#website` },
    associatedMedia: assets.slice(0, 20).map(createImageObjectSchema),
    breadcrumb: createBreadcrumbSchema([
      { name: "Accueil", path: "/" },
      { name: categoryName, path: `/${categorySlug}` },
      { name: shootName, path },
    ]),
  }
}

function createPricingSchema(items: PricingItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    "@id": `${SITE_URL}/pricing#offers`,
    name: "Tarifs photographie Paris - Dolla Shashin",
    description:
      "Tarifs et prestations photo pour mariage, portrait, evenement, editorial, mode et commercial a Paris.",
    url: getAbsoluteUrl("/pricing"),
    itemListElement: items.map(createOfferSchema),
  }
}

function createImageObjectSchema(asset: CloudinaryAsset) {
  return {
    "@type": "ImageObject",
    name: asset.displayName,
    contentUrl: asset.secureUrl,
    thumbnailUrl: asset.thumbnailUrl,
    creator: { "@id": `${SITE_URL}/#dounia-limam` },
  }
}

function createOfferSchema(item: PricingItem, index: number) {
  return {
    "@type": "Offer",
    position: index + 1,
    name: item.name,
    description: item.description,
    price: getNumericPrice(item.price),
    priceCurrency: "EUR",
    itemOffered: {
      "@type": "Service",
      name: item.name,
      provider: { "@id": `${SITE_URL}/#photographer` },
    },
  }
}

function createBreadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: getAbsoluteUrl(item.path),
    })),
  }
}

function createParisAddress() {
  return {
    "@type": "PostalAddress",
    addressLocality: "Paris",
    addressRegion: "Ile-de-France",
    addressCountry: "FR",
  }
}

export {
  createCategorySchema,
  createPersonSchema,
  createPricingSchema,
  createProfessionalServiceSchema,
  createShootSchema,
  createWebsiteSchema,
}
