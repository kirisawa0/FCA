interface Props {
  className?: string;
  alt?: string;
}

export function Logo({ className = 'h-14 w-auto', alt = 'FCA' }: Props) {
  return (
    <img
      src="./logo-white.png"
      alt={alt}
      className={`object-contain ${className}`}
    />
  );
}
