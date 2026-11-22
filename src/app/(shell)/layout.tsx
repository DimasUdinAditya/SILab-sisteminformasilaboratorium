import type { ReactNode } from "react";
import { Suspense } from "react";

import ShellLayout from "@/components/app/shell-layout";

// Signed-in pages read the current URL and session on the client, so wrap them in Suspense.
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <ShellLayout>{children}</ShellLayout>
    </Suspense>
  );
}
