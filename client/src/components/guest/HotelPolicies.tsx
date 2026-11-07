/** Keep hotel policies beside facilities while allowing the API to supply their content. */
export function HotelPolicies({ policies }: { policies: string }) {
  return <><p className="eyebrow">POLICIES</p><p>{policies}</p></>;
}

