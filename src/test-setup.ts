// Polyfill File.prototype.stream for jsdom which doesn't implement it
if (typeof File !== 'undefined' && !File.prototype.stream) {
  File.prototype.stream = function (): ReadableStream<Uint8Array> {
    const self = this
    return new ReadableStream<Uint8Array>({
      start(controller) {
        self.arrayBuffer().then((buf) => {
          controller.enqueue(new Uint8Array(buf))
          controller.close()
        })
      },
    })
  }
}
