import {
  ClassCodeResult,
  ValidateJoinAttempt,
  ValidateJoinResult,
  JoinContext,
} from "@/types";

export async function fetchClassCodeInfo(
  classCode: string
): Promise<ClassCodeResult> {
  const res = await fetch(
    `/api/byclasscode?classcode=${encodeURIComponent(classCode)}`
  );
  const data = await res.json();
  if (data.error) {
    throw new Error(`${data.statusCode} ${data.message}`);
  }
  return data as ClassCodeResult;
}

export async function validateJoin(payload: {
  cpcsRegion: string;
  presenterEmail: string;
  classCode: string;
  participantId: string;
  participantUsername: string;
}): Promise<ValidateJoinAttempt> {
  const res = await fetch(`/api/validate-join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const wrapper = await res.json();
  if (wrapper.error) {
    const d = wrapper.data || {};
    const errorCode = d.errorCode || d.code || d.error || undefined;
    return {
      ok: false,
      statusCode: wrapper.statusCode || res.status,
      message: wrapper.message || d.message || "Join validation failed",
      errorCode,
      data: d,
    };
  }
  return {
    ok: true,
    statusCode: wrapper.statusCode || res.status,
    message: wrapper.message || "Success",
    data: (wrapper.data || {}) as ValidateJoinResult,
  };
}

export function persistJoinContext(ctx: JoinContext) {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("classJoinInfo", JSON.stringify(ctx));
  }
}

export function readJoinContext(): JoinContext | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem("classJoinInfo");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as JoinContext;
  } catch {
    return null;
  }
}

export function clearJoinContext() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("classJoinInfo");
  }
}
