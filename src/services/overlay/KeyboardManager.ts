export class KeyboardManager {
  private shortcuts: Map<string, () => void> = new Map()
  private isListening = false

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this)
  }

  register(key: string, handler: () => void): void {
    this.shortcuts.set(key, handler)
  }

  unregister(key: string): void {
    this.shortcuts.delete(key)
  }

  startListening(): void {
    if (!this.isListening) {
      window.addEventListener('keydown', this.handleKeyDown)
      this.isListening = true
    }
  }

  stopListening(): void {
    if (this.isListening) {
      window.removeEventListener('keydown', this.handleKeyDown)
      this.isListening = false
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      return

    const handler = this.shortcuts.get(e.key)
    if (handler) {
      e.preventDefault()
      handler()
    }
  }
}
