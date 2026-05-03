import { defineConfig } from 'vitepress'

function resolveBase(): string {
  const explicit = process.env.DOCS_BASE?.trim()
  if (explicit) return explicit.startsWith('/') ? explicit : `/${explicit}/`

  const repository = process.env.GITHUB_REPOSITORY?.split('/')[1]
  if (repository) return repository.endsWith('.github.io') ? '/' : `/${repository}/`

  return '/'
}

export default defineConfig({
  title: 'Mere CLI',
  description: 'The user and agent command plane for Mere workspaces.',
  base: resolveBase(),
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['meta', { name: 'theme-color', content: '#f8faf7' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Mere CLI' }],
    ['meta', { property: 'og:description', content: 'Install Mere, onboard safely, inspect workspaces, and operate app CLIs from one command plane.' }]
  ],
  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    }
  },
  themeConfig: {
    siteTitle: 'Mere CLI',
    logo: '/mark.svg',
    search: { provider: 'local' },
    nav: [
      { text: 'Start', link: '/getting-started' },
      { text: 'Onboarding', link: '/onboarding/' },
      { text: 'Commands', link: '/commands' },
      { text: 'MCP', link: '/mcp' }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/sawfwair/merekit-cli' }
    ],
    sidebar: [
      {
        text: 'Orientation',
        items: [
          { text: 'Home', link: '/' },
          { text: 'Getting Started', link: '/getting-started' }
        ]
      },
      {
        text: 'Onboarding',
        items: [
          { text: 'Overview', link: '/onboarding/' },
          { text: 'Install', link: '/onboarding/install' },
          { text: 'First Run', link: '/onboarding/first-run' },
          { text: 'Read The Report', link: '/onboarding/report' },
          { text: 'Agent Context Pack', link: '/onboarding/context-pack' },
          { text: 'Troubleshooting', link: '/onboarding/troubleshooting' }
        ]
      },
      {
        text: 'Operate',
        items: [
          { text: 'Command Reference', link: '/commands' },
          { text: 'Agent Workflow', link: '/agent' },
          { text: 'Ops Workflows', link: '/ops' },
          { text: 'MCP Server', link: '/mcp' }
        ]
      },
      {
        text: 'Reference',
        items: [
          { text: 'Safety Model', link: '/reference/safety' },
          { text: 'Release Checklist', link: '/release-checklist' }
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
      copyright: 'Copyright MereKit contributors'
    }
  }
})
