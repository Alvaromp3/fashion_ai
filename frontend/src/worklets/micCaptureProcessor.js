/**
 * Captures mono PCM from the mic graph and forwards copies to the main thread (WAV encoding).
 * Loaded only via audioWorklet.addModule — keep self-contained (no imports).
 */
class MicCaptureProcessor extends AudioWorkletProcessor {
  process(inputs, outputs) {
    const input = inputs[0]
    const outCh = outputs[0]?.[0]
    if (input?.[0]?.length) {
      const ch = input[0]
      const copy = new Float32Array(ch.length)
      copy.set(ch)
      this.port.postMessage(copy, [copy.buffer])
    }
    if (outCh?.length) {
      outCh.fill(0)
    }
    return true
  }
}

registerProcessor('mic-capture', MicCaptureProcessor)
