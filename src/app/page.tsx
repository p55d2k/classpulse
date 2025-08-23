"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  fetchClassCodeInfo,
  validateJoin,
  persistJoinContext,
} from "@/lib/classSession";
import { logger } from "@/lib/logger";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { uuidFromString } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";

export default function Home() {
  const [classCode, setClassCode] = useState("");
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [warningCode, setWarningCode] = useState<string | null>(null);
  const router = useRouter();

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (joining) return;
    setJoining(true);
    setErrorMsg(null);
    setWarningCode(null);
    // any previous status cleared implicitly

    (async () => {
      try {
        logger.info("Fetching class code info", { classCode });
        const info = await fetchClassCodeInfo(classCode);
        // Deterministic participant ID: same name + classCode -> same stable ID
        const participantId = `participant-${uuidFromString(
          `${classCode}::${name.trim().toLowerCase()}`
        )}`;
        logger.info("Validating join", { classCode, participantId, name });
        const joinAttempt = await validateJoin({
          cpcsRegion: info.cpcsRegion,
          presenterEmail: info.presenterEmail,
          classCode,
          participantId,
          participantUsername: name,
        });
        if (!joinAttempt.ok) {
          // surface duplicate or other upstream codes
          setErrorMsg(joinAttempt.message);
          if (joinAttempt.errorCode) setWarningCode(joinAttempt.errorCode);
          logger.warn("Join validation failed", joinAttempt);
          return; // don't proceed
        }
        logger.info("Join validation succeeded", joinAttempt.data);
        persistJoinContext({
          cpcsRegion: info.cpcsRegion,
          presenterEmail: info.presenterEmail,
          classCode,
          participantId,
          participantUsername: name,
          participantName: name,
          classSessionId: joinAttempt.data.classSessionId,
        });
        logger.info("Join context persisted; navigating to /class");
        router.push("/class");
      } catch (err: unknown) {
        const msg =
          typeof err === "object" && err !== null && "message" in err
            ? String((err as { message?: unknown }).message || "Join failed")
            : "Join failed";
        setErrorMsg(msg);
        logger.error("Join flow exception", err);
      } finally {
        setJoining(false);
      }
    })();

    // console.log({ classCode, name });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <CardHeader className="flex flex-col items-center text-center space-y-4">
            <Image
              src="/logo.png"
              alt="ClassPoint Client Logo"
              width={80}
              height={80}
              priority
              className="rounded-md select-none"
            />
            <CardTitle className="text-2xl">
              Classpoint Client: Join a Class
            </CardTitle>
            <CardDescription>
              Enter the code provided by your instructor and your display name.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleJoin} className="space-y-6">
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="classCode">Class Code</Label>
                <Input
                  id="classCode"
                  placeholder="e.g. ABC123"
                  value={classCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setClassCode(e.target.value.toUpperCase())
                  }
                  required
                  autoComplete="off"
                  maxLength={10}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setName(e.target.value)
                  }
                  required
                  autoComplete="name"
                  maxLength={40}
                />
              </div>
            </CardContent>
            <CardFooter>
              <div className="w-full space-y-2">
                {errorMsg && (
                  <div className="text-sm text-red-400 rounded border border-red-500/40 p-2 bg-red-500/10">
                    <div className="font-medium">
                      {errorMsg}{" "}
                      {errorMsg == "Bad Request" && "(Duplicate/guest name?)"}
                    </div>
                    {warningCode && (
                      <div className="text-[10px] uppercase tracking-wider opacity-75">
                        {warningCode}
                      </div>
                    )}
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  variant={"secondary"}
                  disabled={!classCode || !name || joining}
                >
                  {joining ? "Joining..." : "Join Class"}
                </Button>
              </div>
            </CardFooter>
          </form>
        </Card>
      </main>
      <footer className="pb-4 text-center text-xs text-muted-foreground">
        <span>
          Custom ClassPoint Client • Done by{" "}
          <Link href="https://github.com/p55d2k" className="underline">
            p55d2k
          </Link>
        </span>
      </footer>
    </div>
  );
}
