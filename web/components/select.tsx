"use client";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import clsx from "clsx";

import * as React from "react";

export function Select({
  children,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [value, setValue] = React.useState("");
  const reactId = React.useId();

  return (
    <div className="relative flex flex-col">
      <select
        id={props.id || reactId}
        name={props.name || props.id || reactId}
        className={clsx(
          "appearance-none rounded-md border border-[--border] bg-[--surface-secondary] py-2 pl-3 pr-3.5 text-sm placeholder:text-sm placeholder:text-[--text-tertiary-50] dark:border-[--dark-border] dark:bg-[--dark-surface-tertiary] dark:placeholder:text-[--dark-text-tertiary-50]",
          value === "" && "text-[--text-tertiary-50] dark:text-[--dark-text-tertiary-50]",
          className,
        )}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        {...props}
      >
        <option disabled value="">
          Select an option
        </option>
        {children}
      </select>
      <ChevronDownIcon className="absolute right-2 top-1/2 size-4 -translate-y-1/2 text-[--text-tertiary] dark:text-[--dark-text-tertiary]" />
    </div>
  );
}
