import Image from "next/image";
import { cn } from "@/lib/utils";

export function DynoLogo({ className }: { className?: string }) {
  return (
    <div className={cn("relative rounded-md overflow-hidden", className)}>
      <Image
        src="/dyno.png"
        alt="Dyno"
        fill
        sizes="64px"
        className="object-contain"
        priority
      />
    </div>
  );
}
