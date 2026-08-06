import '../index.css';
import ClientLayout from '../components/ClientLayout';

export const metadata = {
  title: 'DigiWise Kubernetes - Enterprise K3s Cloud Platform',
  description: 'Managed Kubernetes platform with K3s, Traefik, ArgoCD, Longhorn and CloudNativePG. Deploy apps, databases and sites on a production-grade cluster.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/DIGIWISE-SOFTECH-LOGO.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#00459c" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="DigiWise" />
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js'); }); }`,
          }}
        />
      </head>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
