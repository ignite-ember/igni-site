import { useEffect } from 'react'

const BASE_TITLE = 'igni'
const BASE_URL = 'https://ignite-ember.sh'

function setMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) ||
           document.querySelector(`meta[property="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    if (name.startsWith('og:') || name.startsWith('twitter:')) {
      el.setAttribute('property', name)
    } else {
      el.setAttribute('name', name)
    }
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export function useDocumentTitle(title?: string, description?: string) {
  useEffect(() => {
    const fullTitle = title ? `${title} — ${BASE_TITLE}` : BASE_TITLE
    document.title = fullTitle

    // Update meta tags
    setMeta('og:title', fullTitle)
    setMeta('twitter:title', fullTitle)

    if (description) {
      setMeta('description', description)
      setMeta('og:description', description)
      setMeta('twitter:description', description)
    }

    // Update canonical to current path
    const canonical = document.querySelector('link[rel="canonical"]')
    if (canonical) {
      canonical.setAttribute('href', `${BASE_URL}${window.location.pathname}`)
    }

    setMeta('og:url', `${BASE_URL}${window.location.pathname}`)

    return () => {
      document.title = BASE_TITLE
    }
  }, [title, description])
}
