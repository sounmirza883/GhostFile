import { useEffect } from 'react'

const CONTAINER_ID = 'container-a7be003de40c41c043a544a3930a069c'
const SCRIPT_SRC =
  'https://pl29656693.effectivecpmnetwork.com/a7be003de40c41c043a544a3930a069c/invoke.js'

export function NativeBanner() {
  useEffect(() => {
    if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) return
    const s = document.createElement('script')
    s.async = true
    s.setAttribute('data-cfasync', 'false')
    s.src = SCRIPT_SRC
    document.body.appendChild(s)
  }, [])

  return <div id={CONTAINER_ID} className="w-full" />
}
