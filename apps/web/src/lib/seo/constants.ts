const SITE_URL = "https://dollashashin.com"
const SITE_NAME = "Dolla Shashin"
const PHOTOGRAPHER_NAME = "Dounia Limam"
const DEFAULT_TITLE = "Dolla Shashin - Photographe Paris"
const DEFAULT_DESCRIPTION =
  "Photographe professionnelle a Paris specialisee en mariage, evenement, mode, portrait, editorial et shooting commercial."
const DEFAULT_IMAGE_URL =
  "https://res.cloudinary.com/dvgc2tpte/image/upload/v1750775265/IMG_9388_rtj8oq.jpg"
const DEFAULT_ROBOTS = "index, follow, max-image-preview:large, max-snippet:-1"
const SERVICE_AREA = "Paris et Ile-de-France"

type CategorySeoDetails = {
  description: string
  image: string
  keywords: string
  serviceDescription: string
  serviceType: string
  title: string
}

const CATEGORY_SEO = {
  mariage: {
    title: "Photographe mariage Paris et Ile-de-France",
    description:
      "Photographe mariage a Paris et en Ile-de-France, Dounia capture vos moments avec une approche creative, emotionnelle et adaptee a votre journee.",
    keywords:
      "photographe mariage paris, photographe mariage ile de france, reportage mariage paris, photo mariage paris, photographe couple paris",
    serviceType: "Photographie de mariage",
    serviceDescription:
      "Reportages photo de mariage a Paris et en Ile-de-France, des preparatifs aux moments forts de la reception.",
    image:
      "https://res.cloudinary.com/dvgc2tpte/image/upload/v1751317328/IMG_4770_numfko.jpg",
  },
  portrait: {
    title: "Photographe portrait Paris",
    description:
      "Photographe portrait a Paris, Dounia cree des portraits naturels et elegants pour LinkedIn, CV, reseaux sociaux, book comedien et projets personnels.",
    keywords:
      "photographe portrait paris, photo portrait paris, seance portrait paris, portrait professionnel paris, photographe linkedin paris, book comedien paris",
    serviceType: "Photographie de portrait",
    serviceDescription:
      "Seances portrait professionnelles et artistiques a Paris, en studio ou en exterieur.",
    image:
      "https://res.cloudinary.com/dvgc2tpte/image/upload/v1749506721/IMG_3722_wcmwrr.jpg",
  },
  commercial: {
    title: "Photographe commercial Paris",
    description:
      "Photographe commercial a Paris pour shooting publicitaire, mise en scene artistique, lookbook, catalogue, reseaux sociaux et campagnes de marque.",
    keywords:
      "photographe commercial paris, shooting commercial paris, shooting publicitaire paris, lookbook paris, catalogue paris, campagne publicitaire paris",
    serviceType: "Photographie commerciale",
    serviceDescription:
      "Shootings commerciaux et publicitaires pour marques, createurs, catalogues, reseaux sociaux et campagnes.",
    image:
      "https://res.cloudinary.com/dvgc2tpte/image/upload/v1743802736/IMG_9383_hiktwo.jpg",
  },
  creative: {
    title: "Shooting artistique Paris",
    description:
      "Photographe creatif a Paris pour portraits artistiques, self love shoot, projets conceptuels et experimentations visuelles sur mesure.",
    keywords:
      "photographe creatif paris, portrait artistique paris, self love shoot paris, shooting conceptuel paris, photo creative paris",
    serviceType: "Photographie creative",
    serviceDescription:
      "Seances portrait creatives, artistiques et conceptuelles a Paris.",
    image:
      "https://res.cloudinary.com/dvgc2tpte/image/upload/v1741822875/IMG_2039_lmzixk.jpg",
  },
  event: {
    title: "Photographe evenement Paris",
    description:
      "Photographe evenement a Paris pour anniversaires, lancements produit, showcases, conferences, vernissages et evenements professionnels.",
    keywords:
      "photographe evenement paris, reportage evenement paris, photographe anniversaire paris, photo lancement produit paris, photographe conference paris",
    serviceType: "Photographie d'evenement",
    serviceDescription:
      "Reportages photo pour evenements prives et professionnels a Paris et en Ile-de-France.",
    image:
      "https://res.cloudinary.com/dvgc2tpte/image/upload/v1749506243/IMG_3893_scqasb.jpg",
  },
  "on-the-street": {
    title: "Photographe street et voyage Paris",
    description:
      "Photographe street et voyage a Paris pour documentaires artistiques, reportages de voyage, portraits culturels et projets internationaux.",
    keywords:
      "photographe street paris, reportage voyage paris, photographie documentaire paris, portrait culturel paris, photographe voyage paris",
    serviceType: "Photographie documentaire",
    serviceDescription:
      "Reportages de voyage, series documentaires et portraits dans un contexte culturel.",
    image:
      "https://res.cloudinary.com/dvgc2tpte/image/upload/v1749505618/P1179791_jb6bhk.jpg",
  },
  editorial: {
    title: "Photographe editorial et mode Paris",
    description:
      "Photographe editorial a Paris pour shooting mode, fashion, lookbook, collaborations createurs et mises en scene artistiques.",
    keywords:
      "photographe editorial paris, photographe mode paris, shooting fashion paris, lookbook paris, photographe createur mode paris",
    serviceType: "Photographie editorial",
    serviceDescription:
      "Shootings mode, lookbooks et projets editoriaux avec direction artistique.",
    image:
      "https://res.cloudinary.com/dvgc2tpte/image/upload/v1743294249/P1100823_copie_p7wgc4.jpg",
  },
} satisfies Record<string, CategorySeoDetails>

export {
  CATEGORY_SEO,
  DEFAULT_DESCRIPTION,
  DEFAULT_IMAGE_URL,
  DEFAULT_ROBOTS,
  DEFAULT_TITLE,
  PHOTOGRAPHER_NAME,
  SERVICE_AREA,
  SITE_NAME,
  SITE_URL,
}
export type { CategorySeoDetails }
