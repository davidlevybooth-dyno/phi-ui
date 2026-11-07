/** The one page this site shows: Dyno Phi lives at dynophi.com now. */
export const DYNO_PHI_URL = "https://dynophi.com";

export function Notice() {
  return (
    <main>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/dyno.png" alt="Dyno" width={64} height={64} />
      <h1>Dyno Phi has moved</h1>
      <p>
        Dyno Phi is now at <a href={DYNO_PHI_URL}>dynophi.com</a>.
      </p>
    </main>
  );
}
