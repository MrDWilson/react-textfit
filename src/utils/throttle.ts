/**
 * Returns a new function that, when invoked, invokes `func` at most once per `wait` milliseconds.
 * Taken from https://github.com/component/throttle v1.0.0
 *
 * @param {Function} func Function to wrap.
 * @param {Number} wait Number of milliseconds that must elapse between `func` invocations.
 * @return {Function} A new function that wraps the `func` function passed in.
 */

export default function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => ReturnType<T> {
  let ctx: any;
  let args: IArguments | null;
  let rtn: ReturnType<T>;
  let timeoutID: ReturnType<typeof setTimeout> | 0;
  let last = 0;

  function call(): void {
    timeoutID = 0;
    last = +new Date();
    rtn = func.apply(ctx, args as any);
    ctx = null;
    args = null;
  }

  return function throttled(this: any): ReturnType<T> {
    ctx = this;
    args = arguments;
    const delta = new Date().getTime() - last;
    if (!timeoutID) {
      if (delta >= wait) call();
      else timeoutID = setTimeout(call, wait - delta);
    }
    return rtn;
  };
}
