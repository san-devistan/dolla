import { useCallback, useRef } from "react"

function useStableCallback<Args extends unknown[], Result>(
  callback: (...args: Args) => Result
) {
  const callbackRef = useRef(callback)

  callbackRef.current = callback

  return useCallback(
    (...args: Args): Result => callbackRef.current(...args),
    []
  )
}

export { useStableCallback }
