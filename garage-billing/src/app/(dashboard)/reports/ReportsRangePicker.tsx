"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui";

export default function ReportsRangePicker({ days, options }: { days: number; options: readonly number[] }) {
  const router = useRouter();
  return (
    <Select
      value={days}
      onChange={(e) => router.push(`/reports?days=${e.target.value}`)}
      className="w-auto"
    >
      {options.map((d) => (
        <option key={d} value={d}>
          Last {d} days
        </option>
      ))}
    </Select>
  );
}
