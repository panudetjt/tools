"use client";

import { useCallback } from "react";
import type { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  className?: string;
  appName: string;
}

export const Button = ({ children, className, appName }: ButtonProps) => {
  const handleClick = useCallback(() => {
    // eslint-disable-next-line no-console
    console.log(`Hello from your ${appName} app!`);
  }, [appName]);

  return (
    <button className={className} onClick={handleClick} type="button">
      {children}
    </button>
  );
};
