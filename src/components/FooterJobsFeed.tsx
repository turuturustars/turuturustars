import { FC } from 'react';

export const FooterJobsFeed: FC = () => (
  <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
    <a
      href="https://mkcgkfzltohxagqvsbqk.supabase.co/functions/v1/jobs-feed"
      className="hover:text-primary underline-offset-2 hover:underline"
      target="_blank"
      rel="noreferrer"
    >
      Jobs Sitemap
    </a>
    <span aria-hidden="true">·</span>
    <a
      href="https://mkcgkfzltohxagqvsbqk.supabase.co/functions/v1/jobs-feed?format=atom"
      className="hover:text-primary underline-offset-2 hover:underline"
      target="_blank"
      rel="noreferrer"
    >
      Jobs Atom Feed
    </a>
  </div>
);

export default FooterJobsFeed;
