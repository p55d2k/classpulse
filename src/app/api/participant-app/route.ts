import { NextResponse } from "next/server";

// GET /api/participant-app?email=someone@example.com
// Proxies participant app user DTO lookup to upstream API.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json(
      { error: true, statusCode: 400, message: "Missing email parameter" },
      { status: 400 }
    );
  }

  // Basic email shape validation (lightweight, not exhaustive)
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json(
      { error: true, statusCode: 400, message: "Invalid email format" },
      { status: 400 }
    );
  }

  const upstreamUrl = `https://api.classpoint.app/users/dto/participant-app?email=${encodeURIComponent(
    email
  )}`;
  try {
    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        accept: "application/json, text/plain, */*",
      },
      cache: "no-store", // Ensure fresh data
    });

    const status = upstream.status;
  let body: unknown = null;
    try {
      body = await upstream.json();
    } catch {
      // Non-JSON (unexpected) – keep body null
    }

    if (!upstream.ok) {
      const obj =
        body && typeof body === "object"
          ? (body as Record<string, unknown>)
          : undefined;
      return NextResponse.json(
        {
          error: true,
          statusCode: status,
          message:
            (obj && typeof obj.message === "string" && obj.message) ||
            upstream.statusText ||
            "Upstream error",
          data: obj,
        },
        { status }
      );
    }

    return NextResponse.json(
      {
        error: false,
        statusCode: 200,
        message:
          body && typeof body === "object" && "message" in body
            ? String((body as { message?: unknown }).message || "Success")
            : "Success",
        data:
          body && typeof body === "object"
            ? (body as Record<string, unknown>)
            : {},
      },
      { status: 200 }
    );
  } catch (e: unknown) {
    const msg =
      typeof e === "object" && e !== null && "message" in e
        ? String((e as { message?: unknown }).message || "Upstream fetch failed")
        : "Upstream fetch failed";
    return NextResponse.json(
      { error: true, statusCode: 502, message: msg },
      { status: 502 }
    );
  }
}
