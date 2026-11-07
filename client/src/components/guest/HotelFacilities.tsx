/** Show the facilities stored for the selected hotel using the existing typography. */
export function HotelFacilities({ facilities }: { facilities: string[] }) {
  return <><p className="eyebrow">FACILITIES</p><p>{facilities.join(' · ')}</p></>;
}

