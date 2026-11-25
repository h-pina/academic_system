"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** The curriculum now lives in "Meu curso"; this keeps old links working. */
export default function MyCurriculumRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/app/my-course");
  }, [router]);
  return null;
}
