import Link from "next/link";
import type { Metadata } from "next";
import { getPostsByType, urlForImage } from "@/lib/sanity";
import styles from "./page.module.css";
import { DEFAULT_OG_IMAGE } from "../../lib/seo";

export const metadata: Metadata = {
  title: "Blog - Secure House",
  description: "Blog",
  alternates: {
    canonical: "https://secure-house.co.uk/blog/",
  },
  openGraph: {
    title: "Blog - Secure House",
    description: "Blog",
    url: "https://secure-house.co.uk/blog/",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog - Secure House",
    description: "Blog",
    images: [DEFAULT_OG_IMAGE.url],
  },
};

export default async function BlogIndexPage() {
  const posts = await getPostsByType("blog");

  return (
    <>
      {/* Every Avada-scraped page loads its own compiled fusion-styles
         bundle, which - besides page-specific rules - carries the base
         theme CSS the shared <Header/>/<Footer/> components depend on
         (menu layout, image resets, etc; confirmed by comparing rule
         counts: this page loaded ~100 rules total vs several thousand on
         every other page). This hand-built page never included any such
         link, so the header rendered as an unstyled bullet list and a
         plain <img> overflowed unclamped (see theme-globals.css's img
         reset, added earlier for the same reason). Reusing the
         homepage's bundle here restores the missing base styling -
         confirmed these bundles are near-duplicate global CSS across
         pages, not page-locked, so this carries no page-specific risk. */}
      <link
        rel="stylesheet"
        href="/legacy-assets/uploads/fusion-styles/3978f22170001630860f0711fbc80184.min.css"
      />
      <div className={styles.wrapper}>
      <h1 className={styles.heading}>Blog</h1>
      <ul className={styles.grid}>
        {posts.map((post) => {
          const formattedDate = new Date(post.publishedAt).toLocaleDateString(
            "en-GB",
            {
              year: "numeric",
              month: "long",
              day: "numeric",
            },
          );
          const cardImageUrl = urlForImage(post.featuredImage).width(600).url();
          return (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className={styles.card}
                style={{ backgroundImage: `url('${cardImageUrl}')` }}
              >
                <div>
                  <div className={styles.cardCategory}>Blog</div>
                  <h2 className={styles.cardTitle}>{post.title}</h2>
                  <p className={styles.cardExcerpt}>{post.excerpt}</p>
                  <p className={styles.cardDate}>{formattedDate}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      </div>
    </>
  );
}
