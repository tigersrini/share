"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input, Label } from "@/components/ui";

export default function CustomerSearch({ initialPhone }: { initialPhone: string }) {
  const [phone, setPhone] = useState(initialPhone);
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(phone ? `/customers?phone=${encodeURIComponent(phone)}` : "/customers");
      }}
    >
      <Label>Search by phone number</Label>
      <Input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="e.g. 98765 43210"
        inputMode="tel"
      />
    </form>
  );
}
