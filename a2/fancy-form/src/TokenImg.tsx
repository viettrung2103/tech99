import { useState } from "react";

const TOKEN_IMG_URL =
  "https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens";

const getTokenImgUrl = (tokenName: string): string => {
  return `${TOKEN_IMG_URL}/${tokenName.toUpperCase()}.svg`;
};

export default function TokenImg({ symbol }: { symbol: string }) {
  const [ok, setOk] = useState(true);
  return (
    <span className="chip">
      {ok ? (
        <img
          src={getTokenImgUrl(symbol)}
          onError={() => setOk(false)}
          alt={symbol}
          loading="lazy"
        />
      ) : (
        <span className="placeholder">{symbol.slice(0, 2).toUpperCase()}</span>
      )}
    </span>
  );
}
