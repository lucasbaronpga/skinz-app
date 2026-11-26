import { isIP } from "node:net"

export function sendJson(response, status, data) {
  return response.status(status).json(data)
}

export function sendError(response, status, message, code) {
  return sendJson(response, status, code ? { error: message, code } : { error: message })
}

export function readBody(request) {
  if (request.body && typeof request.body === "object") return request.body

  if (typeof request.body === "string") {
    try {
      const parsedBody = JSON.parse(request.body)
      return parsedBody && typeof parsedBody === "object" ? parsedBody : {}
    } catch {
      return {}
    }
  }

  return {}
}

export function getQueryValue(request, name) {
  const value = request.query?.[name]
  return Array.isArray(value) ? value[0] : value
}

/** Liefert die Client-IP oder null, falls der Header keine gültige IP enthält. */
export function getClientIp(request) {
  const forwardedFor = String(request.headers?.["x-forwarded-for"] || "")
    .split(",")[0]
    .trim()
  const realIp = String(request.headers?.["x-real-ip"] || "").trim()
  const ipAddress = forwardedFor || realIp

  return isIP(ipAddress) ? ipAddress : null
}

export function getUserAgent(request) {
  const userAgent = String(request.headers?.["user-agent"] || "").trim()
  return userAgent ? userAgent.slice(0, 1000) : null
}
