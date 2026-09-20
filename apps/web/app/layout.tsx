import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://wpexit.dev'),
  title: 'WP Exit Scanner — can you leave WordPress without losing a single URL?',
  description:
    'Free, open-source migration feasibility scan. Enter your WordPress site URL and get a report in 60 seconds: what breaks, what it costs, and whether zero-URL-change static hosting works for you.',
  openGraph: {
    title: 'WP Exit Scanner',
    description: 'Can you leave WordPress without losing a single URL? Free feasibility scan.',
    type: 'website',
    siteName: 'WP Exit Scanner',
    url: '/',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'WP Exit Scanner' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WP Exit Scanner',
    description: 'Can you leave WordPress without losing a single URL? Free feasibility scan.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
  return (
    <html lang="en">
      <body>
        {children}
        {posthogKey ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);posthog.init('${posthogKey}',{api_host:'${posthogHost}',defaults:'2025-05-24',capture_pageview:true,capture_pageleave:true,person_profiles:'identified_only',cross_subdomain_cookie:false});`,
            }}
          />
        ) : null}
      </body>
    </html>
  );
}
