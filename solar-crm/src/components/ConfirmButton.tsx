"use client";

import type { ButtonHTMLAttributes } from "react";
import { Button } from "./ui";

/** Submit button that asks for confirmation first (for delete / cancel actions inside a <form>). */
export default function ConfirmButton({
  message,
  variant = "danger",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { message: string; variant?: "danger" | "secondary" | "ghost" }) {
  return (
    <Button
      {...rest}
      variant={variant}
      type="submit"
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    />
  );
}
