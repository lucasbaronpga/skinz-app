export class EngineError extends Error {
  constructor(code, message) {
    super(message)
    this.name = "EngineError"
    this.code = code
  }
}

export function fail(code, message) {
  throw new EngineError(code, message)
}
