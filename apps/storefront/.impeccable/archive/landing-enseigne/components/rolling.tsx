/** Nombre dont chaque chiffre roule dans sa colonne ; la valeur entière est lue d'un bloc par les lecteurs d'écran. */
export function Rolling({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const text = new Intl.NumberFormat('fr-FR').format(value);
  const chars = [...text];
  return (
    <span className={`ul-digits ${className ?? ''}`}>
      <span className="sr-only">{text}</span>
      {chars.map((char, index) => {
        const key = chars.length - index;
        if (!/\d/.test(char))
          return (
            <span key={key} aria-hidden>
              {/\s/.test(char) ? ' ' : char}
            </span>
          );
        return (
          <span key={key} aria-hidden className="ul-digit">
            <span
              className="ul-digit-strip"
              style={{ transform: `translateY(-${Number(char)}em)` }}
            >
              {'0123456789'.split('').map((digit) => (
                <span key={digit}>{digit}</span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}
