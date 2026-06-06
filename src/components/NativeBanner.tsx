import { useEffect } from 'react'

interface NativeBannerProps {
  scriptSrc: string
  containerId: string
}

export function NativeBanner({ scriptSrc, containerId }: NativeBannerProps) {
  useEffect(() => {
    if (document.querySelector(`script[src="${scriptSrc}"]`)) return
    const s = document.createElement('script')
    s.async = true
    s.setAttribute('data-cfasync', 'false')
    s.src = scriptSrc
    document.body.appendChild(s)
  }, [scriptSrc])

  return <div id={containerId} className="w-full" />
}
