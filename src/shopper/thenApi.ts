import { unwrap, type ApiResult } from "./api";

export function isThenable<T>(value: T | Promise<T>): value is Promise<T> {
  return typeof (value as Promise<T>)?.then === "function";
}

export function peekApi<T>(result: ApiResult<T> | Promise<ApiResult<T>>): T | undefined {
  if (isThenable(result) || !result.ok) return undefined;
  return result.body;
}

export function thenApi<T>(result: ApiResult<T> | Promise<ApiResult<T>>, next: (body: T) => void) {
  const go = (row: ApiResult<T>) => {
    if (!row.ok) return;
    next(row.body);
  };
  if (isThenable(result)) {
    void result.then(go).catch(() => undefined);
    return;
  }
  go(result);
}

export async function awaitApi<T>(result: ApiResult<T> | Promise<ApiResult<T>>): Promise<T> {
  return unwrap(await result);
}
