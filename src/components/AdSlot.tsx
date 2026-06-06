import { useEffect, useRef } from 'react'

interface AdSlotProps {
  adKey: string
  width: number
  height: number
  className?: string
}

export function AdSlot({ adKey, width, height, className }: AdSlotProps) {
  const ref = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const html = `<!doctype html><html><head><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}</style></head><body>
<script type="text/javascript">
  atOptions = {
    'key' : '${adKey}',
    'format' : 'iframe',
    'height' : ${height},
    'width' : ${width},
    'params' : {}
  };
</script>
<script type="text/javascript" src="//www.highperformanceformat.com/${adKey}/invoke.js"></script>
</body></html>`
    ref.current.srcdoc = html
  }, [adKey, width, height])

  return (
    <iframe
      ref={ref}
      width={width}
      height={height}
      className={className}
      style={{ border: 0, display: 'block', maxWidth: '100%' }}
      scrolling="no"
      title="advertisement"
    />
  )
}
