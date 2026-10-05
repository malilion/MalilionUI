// React versions of the few page snippets that are Vue-specific setup code.
// Everything else on a page is converted from registry.ts by react-docs.ts.

export interface ReactSetup {
  title: string
  filename: string
  lang?: string
  code: string
}

export const reactSetups: Record<string, ReactSetup> = {
  'config-provider': {
    title: '整個 App 改成英文',
    filename: 'app/layout.tsx',
    lang: 'tsx',
    code: `import { ConfigProvider, en } from '@malilion/ui/react'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ConfigProvider locale={en}>{children}</ConfigProvider>
      </body>
    </html>
  )
}

// Outside React components (or before render): setLocale(en)`,
  },
  'theme-toggle': {
    title: '避免重新整理時閃一下：在 <head> 先套用主題',
    filename: 'app/layout.tsx',
    lang: 'tsx',
    code: `import { themeInitScript } from '@malilion/ui/react'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The script sets data-theme before paint, so React must not warn about it.
    <html lang="zh-TW" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript({ storageKey: 'ml-theme' }) }} />
      </head>
      <body>{children}</body>
    </html>
  )
}`,
  },
  toast: {
    title: '先在根元件放一個 <ToastHost>',
    filename: 'app/layout.tsx',
    lang: 'tsx',
    code: `import { ToastHost } from '@malilion/ui/react'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>
        {children}
        <ToastHost placement="bottom-right" />
      </body>
    </html>
  )
}

// Anywhere, even outside components:
// import { toast } from '@malilion/ui/react'
// toast.success('已儲存')`,
  },
}
