/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

declare module "react" {
  export function useState<S>(
    initialState: S | (() => S)
  ): [S, React.Dispatch<React.SetStateAction<S>>];
  export function useEffect(
    effect: React.EffectCallback,
    deps?: React.DependencyList
  ): void;
  export function useMemo<T>(
    factory: () => T,
    deps: React.DependencyList | undefined
  ): T;
  export function useCallback<T extends (...args: any[]) => any>(
    callback: T,
    deps: React.DependencyList
  ): T;
  export function useRef<T>(initialValue: T): React.MutableRefObject<T>;
  export function useRef<T>(initialValue: T | null): React.RefObject<T>;
  export function useRef<T = undefined>(): React.MutableRefObject<
    T | undefined
  >;
}

declare module "react-dom" {
  export * from "react-dom";
}
