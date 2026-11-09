import { useState } from "react";

const defaultLimit = 5300;
const highestPrice = 99999999.99;
const rand = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function readPrice(value: string | null) {
  const price = value?.trim() ?? "";
  return /^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(price) ? Number(price) : null;
}

/** Two price handles share one track. The far right means there is no price cap. */
export function PriceRange({ params }: { params: URLSearchParams }) {
  const savedMin = readPrice(params.get("minPrice")) ?? 0;
  const savedMax = readPrice(params.get("maxPrice"));
  // Leave room for the uncapped position even when a saved filter exceeds R5,300.
  const limit = Math.max(
    defaultLimit,
    Math.floor(Math.max(savedMin, savedMax ?? 0)) + 1,
  );
  const [min, setMin] = useState(Math.min(savedMin, savedMax ?? limit));
  const [max, setMax] = useState(savedMax);
  const upper = max ?? limit;
  const minLabel = rand.format(min);
  const maxLabel = rand.format(upper) + (max === null ? "+" : "");

  return (
    <div className="price-range" role="group" aria-label="Nightly price range">
      <p>Price per night</p>
      <div className={"price-slider" + (min === upper ? " handles-touch" : "")}>
        <div className="price-slider-track" aria-hidden="true">
          <div
            className="price-slider-fill"
            style={{
              left: (min / limit) * 100 + "%",
              right: (1 - upper / limit) * 100 + "%",
            }}
          />
        </div>
        <input
          className="price-slider-min"
          type="range"
          min={0}
          max={limit}
          step="any"
          value={min}
          aria-label="Minimum price per night"
          aria-valuetext={minLabel}
          onChange={(event) => {
            const price = Math.round(event.currentTarget.valueAsNumber);
            setMin(Math.min(upper, highestPrice, price));
          }}
        />
        <input
          className="price-slider-max"
          type="range"
          min={0}
          max={limit}
          step="any"
          value={upper}
          aria-label="Maximum price per night"
          aria-valuetext={max === null ? "No maximum" : maxLabel}
          onChange={(event) => {
            const price = Math.round(event.currentTarget.valueAsNumber);
            setMax(price >= limit ? null : Math.max(min, Math.min(price, highestPrice)));
          }}
        />
      </div>
      <div className="price-range-values" aria-hidden="true">
        <div>
          <span>Minimum</span>
          <strong>{minLabel}</strong>
        </div>
        <div>
          <span>Maximum</span>
          <strong>{maxLabel}</strong>
        </div>
      </div>
      <input type="hidden" name="minPrice" value={min || ""} />
      <input type="hidden" name="maxPrice" value={max ?? ""} />
    </div>
  );
}
