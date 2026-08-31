import { createContext, useContext, type ReactNode } from "react";
import { createRuntime, type AppRuntime } from "../runtime";

const RuntimeContext = createContext<AppRuntime | null>(null);

export function RuntimeProvider({
  runtime,
  children,
}: {
  runtime: AppRuntime;
  children: ReactNode;
}) {
  return (
    <RuntimeContext.Provider value={runtime}>{children}</RuntimeContext.Provider>
  );
}

export function useRuntime(): AppRuntime {
  const value = useContext(RuntimeContext);
  if (!value) throw new Error("RuntimeProvider missing");
  return value;
}

export function createDefaultRuntime(): AppRuntime {
  return createRuntime();
}
