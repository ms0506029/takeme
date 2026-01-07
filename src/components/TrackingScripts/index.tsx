import type { TrackingScriptsData } from '@/lib/globals'
import Script from 'next/script'

interface TrackingScriptsProps {
  scripts: TrackingScriptsData
}

/**
 * TrackingScriptsComponent
 * 
 * 根據後台設定動態注入第三方追蹤碼
 * - Google Tag Manager
 * - Meta Pixel
 * - Google Analytics 4
 * - Hotjar
 * - 自訂 Script
 */
export function TrackingScriptsComponent({ scripts }: TrackingScriptsProps) {
  return (
    <>
      {/* Google Tag Manager */}
      {scripts.gtmEnabled && scripts.gtmId && (
        <>
          <Script
            id="gtm-script"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${scripts.gtmId}');
              `,
            }}
          />
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${scripts.gtmId}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        </>
      )}

      {/* Google Analytics 4 */}
      {scripts.ga4Enabled && scripts.ga4MeasurementId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${scripts.ga4MeasurementId}`}
            strategy="afterInteractive"
          />
          <Script
            id="ga4-config"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${scripts.ga4MeasurementId}');
              `,
            }}
          />
        </>
      )}

      {/* Meta Pixel (Facebook) */}
      {scripts.metaPixelEnabled && scripts.metaPixelId && (
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${scripts.metaPixelId}');
              fbq('track', 'PageView');
            `,
          }}
        />
      )}

      {/* Hotjar */}
      {scripts.hotjarEnabled && scripts.hotjarId && (
        <Script
          id="hotjar-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(h,o,t,j,a,r){
                h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
                h._hjSettings={hjid:${scripts.hotjarId},hjsv:6};
                a=o.getElementsByTagName('head')[0];
                r=o.createElement('script');r.async=1;
                r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
                a.appendChild(r);
              })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
            `,
          }}
        />
      )}

      {/* Custom Head Script */}
      {scripts.customHeadScript && (
        <Script
          id="custom-head-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: scripts.customHeadScript }}
        />
      )}

      {/* Custom Body Script */}
      {scripts.customBodyScript && (
        <Script
          id="custom-body-script"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{ __html: scripts.customBodyScript }}
        />
      )}
    </>
  )
}
