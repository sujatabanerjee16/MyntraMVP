import { createContext, useContext, type ReactNode } from "react";
import type { ShopperRuntime } from "../runtime";

const Ctx = createContext<ShopperRuntime | null>(null);

export function ShopperRuntimeProvider({
  runtime,
  children,
}: {
  runtime: ShopperRuntime;
  children: ReactNode;
}) {
  return <Ctx.Provider value={runtime}>{children}</Ctx.Provider>;
}

export function useShopperRuntime() {
  const value = useContext(Ctx);
  if (!value) throw new Error("Shopper runtime missing");
  return value;
}
