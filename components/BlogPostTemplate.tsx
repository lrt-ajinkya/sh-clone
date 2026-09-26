import { PortableText } from '@portabletext/react';
import type { SanityPost } from '@/lib/sanity';
import { urlForImage } from '@/lib/sanity';
import styles from './BlogPostTemplate.module.css';

export default function BlogPostTemplate({ post }: { post: SanityPost }) {
  const formattedDate = new Date(post.publishedAt).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const imageUrl = urlForImage(post.featuredImage).width(1400).url();

  return (
    <article className={styles.wrapper}>
      {/* Every ported page loads its own page-specific Avada CSS bundle,
          which (among hundreds of unrelated rules) carries the critical
          `body{overflow-x:hidden}` reset that keeps the shared Header/
          Footer's intentional 104%-width full-bleed rows from spilling
          text off the left edge. Blog/inspiration posts never had a
          scraped Avada page to port from, so they never got one - without
          it, that overflow escapes unclipped and the footer (and header,
          once "stuck") render with their first ~50px of text cut off.
          Reusing an existing, already-verified-safe bundle (not writing a
          new one) - confirmed via direct browser testing 2026-09-18 that
          this specific fix (and no smaller one) resolves it. */}
      <link rel="stylesheet" href="/legacy-assets/uploads/fusion-styles/3978f22170001630860f0711fbc80184.min.css" />
      <p className={styles.dateAuthor}>
        {formattedDate} — {post.author}
      </p>
      <h1 className={styles.title}>{post.title}</h1>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={post.featuredImage.alt || post.title}
        className={styles.featuredImage}
      />
      <div className={styles.body}>
        <PortableText value={post.body} />
      </div>
    </article>
  );
}
