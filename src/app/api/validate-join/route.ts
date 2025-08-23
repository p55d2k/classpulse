import { NextResponse } from "next/server";

interface ValidateJoinPayload {
  cpcsRegion: string;
  presenterEmail: string;
  classCode: string;
  participantId: string;
  participantUsername: string;
}

export async function POST(req: Request) {
  const required: (keyof ValidateJoinPayload)[] = [
    "cpcsRegion",
    "presenterEmail",
    "classCode",
    "participantId",
    "participantUsername",
  ];

  const raw: Record<string, unknown> = {};
  const contentType = req.headers.get("content-type") || "";

  // Try parse based on content type
  if (contentType.includes("application/json")) {
    try {
      const parsed = await req.json();
      if (parsed && typeof parsed === "object") {
        Object.assign(raw, parsed as Record<string, unknown>);
      }
    } catch {
      // will fallback to other sources below
    }
  } else if (contentType.includes("application/x-www-form-urlencoded")) {
    try {
      const text = await req.text();
      const sp = new URLSearchParams(text);
      sp.forEach((v, k) => {
        raw[k] = v;
      });
    } catch {
      // ignore
    }
  }

  // Fallback to query string if still missing
  const url = new URL(req.url);
  for (const k of required) {
    if (!raw[k]) {
      const v = url.searchParams.get(k);
      if (v) raw[k] = v;
    }
  }

  // Allow alternate naming (region instead of cpcsRegion) if present
  if (!raw.cpcsRegion && raw.region) raw.cpcsRegion = raw.region;

  const params: ValidateJoinPayload = {
    cpcsRegion: String(raw.cpcsRegion || ""),
    presenterEmail: String(raw.presenterEmail || ""),
    classCode: String(raw.classCode || ""),
    participantId: String(raw.participantId || ""),
    participantUsername: String(raw.participantUsername || ""),
  };

  for (const k of required) {
    if (!params[k] || typeof params[k] !== "string") {
      return NextResponse.json(
        { error: true, statusCode: 400, message: `Missing or invalid ${k}` },
        { status: 400 }
      );
    }
  }

  if (!/^[a-z0-9-]+$/.test(params.cpcsRegion)) {
    return NextResponse.json(
      { error: true, statusCode: 400, message: "Invalid region" },
      { status: 400 }
    );
  }

  const upstreamUrl =
    `https://${params.cpcsRegion}.classpoint.app/liveclasses/validate-join` +
    `?presenterEmail=${encodeURIComponent(params.presenterEmail)}` +
    `&classCode=${encodeURIComponent(params.classCode)}` +
    `&participantId=${encodeURIComponent(params.participantId)}` +
    `&participantUsername=${encodeURIComponent(params.participantUsername)}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "POST", // Upstream expects POST with query parameters only
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/x-www-form-urlencoded", // mimic original (even though no body)
      },
      cache: "no-store",
    });
    const status = upstream.status;
    let bodyJson: unknown = null;
    try {
      bodyJson = await upstream.json();
    } catch {
      /* ignore */
    }

    // Attempt to extract message & error code from upstream body if available
    const body: Record<string, unknown> | null =
      bodyJson && typeof bodyJson === "object"
        ? (bodyJson as Record<string, unknown>)
        : null;
    const upstreamMessage =
      (body?.message as string) || upstream.statusText || "";
    const errorCode =
      (body?.errorCode as string) ||
      (body?.code as string) ||
      (body?.error as string) ||
      undefined;

    if (!upstream.ok) {
      return NextResponse.json(
        {
          error: true,
          statusCode: status,
          message: upstreamMessage || "Upstream error",
          data: body,
          errorCode,
        },
        { status }
      );
    }

    return NextResponse.json(
      {
        error: false,
        statusCode: 200,
        message: upstreamMessage || "Success",
        data: body,
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
