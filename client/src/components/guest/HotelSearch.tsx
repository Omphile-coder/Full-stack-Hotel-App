import type { FormEvent } from 'react';
import { useState } from 'react';
import { useDispatch,useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { chooseStay } from '../../lib/bookingDraft';
import { calendarDate,today } from '../../lib/format';
import type { RootState } from '../../store';
import { Field } from '../shared/Shared';

/** Search starts the same stay draft used by hotel selection, checkout, and sign-in. */
export function SearchForm({ params = new URLSearchParams() }: { params?: URLSearchParams }) {
  const draft = useSelector((state: RootState) => state.bookingDraft);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const checkInDate = String(form.get('checkInDate') || '');
    const checkOutDate = String(form.get('checkOutDate') || '');
    if (Boolean(checkInDate) !== Boolean(checkOutDate) || (checkInDate && checkOutDate <= checkInDate)) {
      setError('Choose both dates, with check-out after check-in.');
      return;
    }
    if (checkInDate && (!calendarDate(checkInDate) || !calendarDate(checkOutDate) || checkInDate < today())) {
      setError('Choose valid dates starting today or later.');
      return;
    }
    const minPrice = String(form.get('minPrice') || '');
    const maxPrice = String(form.get('maxPrice') || '');
    if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
      setError('Maximum price must be at least the minimum price.');
      return;
    }
    const next = new URLSearchParams();
    form.forEach((value, key) => { if (String(value).trim()) next.set(key, String(value).trim()); });
    dispatch(chooseStay({
      hotelId: '', roomIds: [], checkInDate, checkOutDate,
      numberOfGuests: Number(form.get('guests')), roomCount: Number(form.get('roomCount')),
    }));
    setError('');
    navigate('/hotels?' + next.toString());
  }
  return <form className="stay-search" onSubmit={search}>
    <div className="search-primary">
      <Field label="Where would you like to stay?"><input name="location" list="search-cities" maxLength={100} placeholder="All locations" defaultValue={params.get('location') || ''} /></Field>
      <datalist id="search-cities"><option>Cape Town</option><option>Johannesburg</option><option>Franschhoek</option></datalist>
      <Field label="Check-in"><input name="checkInDate" type="date" min={today()} defaultValue={params.get('checkInDate') ?? draft.checkInDate} /></Field>
      <Field label="Check-out"><input name="checkOutDate" type="date" min={today()} defaultValue={params.get('checkOutDate') ?? draft.checkOutDate} /></Field>
      <Field label="Guests"><input name="guests" type="number" min={1} max={1000} required defaultValue={params.get('guests') ?? draft.numberOfGuests} /></Field>
      <Field label="Rooms"><input name="roomCount" type="number" min={1} max={20} required defaultValue={params.get('roomCount') ?? draft.roomCount} /></Field>
      <button className="button" type="submit">Find hotels</button>
    </div>
    <details className="more-filters" open={Boolean(params.get('minPrice') || params.get('maxPrice') || params.get('minStars'))}>
      <summary>Price {'&'} rating filters</summary>
      <div className="grid three">
        <Field label="Minimum price / night"><input name="minPrice" type="number" min="0" max="99999999.99" step="0.01" defaultValue={params.get('minPrice') || ''} /></Field>
        <Field label="Maximum price / night"><input name="maxPrice" type="number" min="0" max="99999999.99" step="0.01" defaultValue={params.get('maxPrice') || ''} /></Field>
        <Field label="Minimum stars"><select name="minStars" defaultValue={params.get('minStars') || ''}><option value="">Any rating</option>{[1,2,3,4,5].map(star => <option key={star} value={star}>{star} stars</option>)}</select></Field>
      </div>
    </details>
    {error && <p className="notice error" role="alert">{error}</p>}
  </form>;
}
