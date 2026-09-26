import { createClient } from "@sanity/client";
import { createImageUrlBuilder } from "@sanity/image-url";
import type { PortableTextBlock } from "@portabletext/react";

// Not env vars, deliberately: these are public, non-secret identifiers (the
// dataset is world-readable, confirmed - reads never need a token), and
// reading them from process.env was the exact cause of a prod delivery bug
// with the FormSubmit destination address earlier in this project - see
// app/api/enquiry/route.ts. Hardcoding avoids repeating that.
const PROJECT_ID = "teixlfvm";
const DATASET = "production";

export const sanityClient = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: "2026-01-01",
  useCdn: true,
});

const imageBuilder = createImageUrlBuilder({ projectId: PROJECT_ID, dataset: DATASET });

export function urlForImage(source: SanityImage) {
  return imageBuilder.image(source);
}

export type SanityImage = {
  asset: { _ref: string; _type: "reference" };
  alt?: string;
  hotspot?: { x: number; y: number };
};

export type SanityPost = {
  _id: string;
  title: string;
  slug: string;
  postType: "blog" | "inspiration";
  author: string;
  excerpt: string;
  featuredImage: SanityImage;
  publishedAt: string;
  body: PortableTextBlock[];
};

// Fields shared by both the list and single-post queries.
const POST_FIELDS = `
  _id,
  title,
  "slug": slug.current,
  postType,
  "author": author->name,
  excerpt,
  featuredImage,
  publishedAt,
  body
`;

export async function getPostsByType(postType: "blog" | "inspiration") {
  return sanityClient.fetch<SanityPost[]>(
    `*[_type == "post" && postType == $postType] | order(publishedAt desc) { ${POST_FIELDS} }`,
    { postType },
  );
}

export async function getPostSlugsByType(postType: "blog" | "inspiration") {
  return sanityClient.fetch<{ slug: string }[]>(
    `*[_type == "post" && postType == $postType && defined(slug.current)]{ "slug": slug.current }`,
    { postType },
  );
}

export async function getPostBySlugAndType(slug: string, postType: "blog" | "inspiration") {
  return sanityClient.fetch<SanityPost | null>(
    `*[_type == "post" && postType == $postType && slug.current == $slug][0]{ ${POST_FIELDS} }`,
    { slug, postType },
  );
}
