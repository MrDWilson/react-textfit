const noop = (): void => {};

type TestFunction = (...args: any[]) => boolean;
type IteratorFunction = (callback: (err?: any, ...args: any[]) => void) => void;
type CallbackFunction = (err?: any) => void;

/**
 * Repeatedly call fn, while test returns true. Calls callback when stopped, or an error occurs.
 *
 * @param {Function} test Synchronous truth test to perform before each execution of fn.
 * @param {Function} fn A function which is called each time test passes. The function is passed a callback(err), which must be called once it has completed with an optional err argument.
 * @param {Function} callback A callback which is called after the test fails and repeated execution of fn has stopped.
 */

export default function whilst(
  test: TestFunction,
  iterator: IteratorFunction,
  callback: CallbackFunction = noop
): void {
  if (test()) {
    iterator(function next(err?: any, ...args: any[]): void {
      if (err) {
        callback(err);
      } else if (test(...args)) {
        iterator(next);
      } else {
        callback();
      }
    });
  } else {
    callback();
  }
}
