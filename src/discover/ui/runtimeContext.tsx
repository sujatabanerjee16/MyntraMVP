import { createContext, useContext, type ReactNode } from "react";
import type { DiscoverRuntime } from "../runtime";

const Ctx = createContext<DiscoverRuntime | null>(null);

export function DiscoverRuntimeProvider({
  runtime,
  children,
}: {
  runtime: DiscoverRuntime;
  children: ReactNode;
}) {
  return <Ctx.Provider value={runtime}>{children}</Ctx.Provider>;
}

export function useDiscoverRuntime(): DiscoverRuntime {
  const value = useContext(Ctx);
  if (!value) throw new Error("Discover runtime missing");
  return value;
}
