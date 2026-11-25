"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** The list of subjects now lives under "Meu curso"; this keeps old links working. */
export default function MySubjectsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/app/my-course/subjects");
  }, [router]);
  return null;
}
