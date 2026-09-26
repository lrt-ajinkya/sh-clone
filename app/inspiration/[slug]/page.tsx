import { notFound } from "next/navigation";
import type { Metadata } from "next";
import BlogPostTemplate from "@/components/BlogPostTemplate";
import { getPostBySlugAndType, getPostSlugsByType, urlForImage } from "@/lib/sanity";

type Params = { slug: string };

export async function generateStaticParams() {
  const slugs = await getPostSlugsByType("inspiration");
  return slugs.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlugAndType(slug, "inspiration");

  if (!post) {
    return {};
  }

  const url = `https://secure-house.co.uk/inspiration/${post.slug}/`;
  const imageUrl = urlForImage(post.featuredImage).width(1200).url();

  return {
    title: post.title,
    description: post.excerpt,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url,
      type: "article",
      images: [{ url: imageUrl }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [imageUrl],
    },
  };
}

export default async function InspirationPostPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const post = await getPostBySlugAndType(slug, "inspiration");

  if (!post) {
    notFound();
  }

  return <BlogPostTemplate post={post} />;
}
