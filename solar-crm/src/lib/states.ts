/** GST state codes, for place of supply. */
export const STATES: { code: string; name: string }[] = [
  { code: "33", name: "Tamil Nadu" },
  { code: "29", name: "Karnataka" },
  { code: "32", name: "Kerala" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "36", name: "Telangana" },
  { code: "34", name: "Puducherry" },
  { code: "27", name: "Maharashtra" },
  { code: "24", name: "Gujarat" },
  { code: "07", name: "Delhi" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "08", name: "Rajasthan" },
  { code: "06", name: "Haryana" },
  { code: "03", name: "Punjab" },
  { code: "19", name: "West Bengal" },
  { code: "21", name: "Odisha" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "22", name: "Chhattisgarh" },
  { code: "10", name: "Bihar" },
  { code: "20", name: "Jharkhand" },
  { code: "18", name: "Assam" },
  { code: "30", name: "Goa" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "05", name: "Uttarakhand" },
  { code: "01", name: "Jammu & Kashmir" },
];

export function stateName(code: string): string {
  return STATES.find((s) => s.code === code)?.name ?? `State code ${code}`;
}
