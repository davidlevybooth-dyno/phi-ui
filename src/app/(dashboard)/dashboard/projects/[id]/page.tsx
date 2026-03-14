"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProjectDetailPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/datasets");
  }, [router]);
  return null;
}
