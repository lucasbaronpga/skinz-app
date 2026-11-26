const DEFAULT_ERROR_MESSAGE = "Die Anfrage konnte nicht verarbeitet werden."

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = typeof data?.code === "string" ? data.code : null
    this.data = data
  }
}

async function readJson(response) {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

/** Gemeinsame Fetch-Schicht mit deutschen Fehlermeldungen vom Server. */
export async function apiRequest(path, { method = "GET", body, signal } = {}) {
  const hasBody = body !== undefined
  const response = await fetch(path, {
    method,
    signal,
    credentials: "same-origin",
    headers: hasBody
      ? { Accept: "application/json", "Content-Type": "application/json" }
      : { Accept: "application/json" },
    body: hasBody ? JSON.stringify(body) : undefined,
  })
  const data = await readJson(response)

  if (!response.ok) {
    const message =
      typeof data.error === "string" && data.error.trim() ? data.error : DEFAULT_ERROR_MESSAGE

    throw new ApiError(message, response.status, data)
  }

  return data
}

export function getErrorMessage(error, fallback = DEFAULT_ERROR_MESSAGE) {
  return error instanceof Error && error.message ? error.message : fallback
}
