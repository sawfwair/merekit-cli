import { defineConfig } from 'vitepress'
import { mereMarkdown } from './theme/mere/markdown'

function resolveBase(): string {
  const explicit = process.env.DOCS_BASE?.trim()
  if (explicit) return explicit.startsWith('/') ? explicit : `/${explicit}/`

  const repository = process.env.GITHUB_REPOSITORY?.split('/')[1]
  if (repository) return repository.endsWith('.github.io') ? '/' : `/${repository}/`

  return '/'
}

export default defineConfig({
  title: 'Mere CLI',
  description: 'Manage Mere workspaces and apps from your terminal. Check setup, read product docs, and prepare context for AI agents.',
  base: resolveBase(),
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['meta', { name: 'theme-color', content: '#f8faf7' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Mere CLI' }],
    ['meta', { property: 'og:description', content: 'Manage Mere workspaces and apps from your terminal. Check setup, read product docs, and prepare context for AI agents.' }]
  ],
  markdown: mereMarkdown(),
  vite: {
    build: {
      target: 'esnext'
    }
  },
  themeConfig: {
    siteTitle: 'Mere CLI',
    logo: '/mark.svg',
    search: { provider: 'local' },
    nav: [
      { text: 'Get started', link: '/getting-started' },
      { text: 'Onboarding', link: '/onboarding/' },
      { text: 'Commands', link: '/commands' },
      { text: 'Product docs', link: '/product-docs' },
      { text: 'MCP server', link: '/mcp' }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/sawfwair/merekit-cli' }
    ],
    sidebar: [
      {
        text: 'Orientation',
        items: [
          { text: 'Home', link: '/' },
          { text: 'Get started', link: '/getting-started' }
        ]
      },
      {
        text: 'Onboarding',
        items: [
          { text: 'Overview', link: '/onboarding/' },
          { text: 'Install the CLI', link: '/onboarding/install' },
          { text: 'First run', link: '/onboarding/first-run' },
          { text: 'Read the report', link: '/onboarding/report' },
          { text: 'Agent context pack', link: '/onboarding/context-pack' },
          { text: 'Troubleshooting', link: '/onboarding/troubleshooting' }
        ]
      },
      {
        text: 'Operate',
        items: [
          { text: 'Command reference', link: '/commands' },
          { text: 'Product docs', link: '/product-docs' },
          { text: 'Business workspaces and sites', link: '/business-site' },
          { text: 'Agent workflow', link: '/agent' },
          { text: 'Operational workflows', link: '/ops' },
          { text: 'MCP server', link: '/mcp' }
        ]
      },
      {
        text: 'Reference',
        items: [
          { text: 'Safety model', link: '/reference/safety' },
          { text: 'Release checklist', link: '/release-checklist' }
        ]
      }
    ],
    outline: { level: [2, 3] },
    docFooter: {
      prev: 'Previous',
      next: 'Next'
    },
    footer: {
      message: 'Released under the Apache License, Version 2.0.',
      copyright: 'Copyright Sawfwair Inc. and MereKit contributors'
    }
  }
})
