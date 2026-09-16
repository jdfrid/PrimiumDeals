import { Link } from 'react-router-dom';

export const LOGO_SRC = '/dealsluxy-logo.png';

const SIZES = {
  sm: 'h-8 max-w-[180px]',
  md: 'h-9 max-w-[200px]',
  lg: 'h-11 max-w-[240px]'
};

/**
 * DealsLuxy logo — the PNG has a black matte, so we frame it per surface:
 * light pages → dark chip; dark pages → white chip.
 */
export default function SiteLogo({
  className = '',
  imgClassName = '',
  linkTo = '/',
  showLink = true,
  /** @type {'light' | 'dark'} */
  variant = 'light',
  /** @type {'sm' | 'md' | 'lg'} */
  size = 'md'
}) {
  const chipClass =
    variant === 'dark'
      ? 'rounded-xl bg-white px-3 py-1.5 shadow-sm ring-1 ring-white/20'
      : 'rounded-xl bg-neutral-950 px-3 py-1.5 shadow-md ring-1 ring-black/10';

  const img = (
    <img
      src={LOGO_SRC}
      alt="DealsLuxy"
      className={[SIZES[size] || SIZES.md, 'w-auto object-contain block', imgClassName].filter(Boolean).join(' ')}
      width={220}
      height={44}
      decoding="async"
    />
  );

  const content = <span className={`inline-flex items-center ${chipClass}`}>{img}</span>;

  if (!showLink) {
    return <div className={`inline-flex items-center ${className}`}>{content}</div>;
  }

  return (
    <Link to={linkTo} className={`inline-flex items-center shrink-0 ${className}`} aria-label="DealsLuxy home">
      {content}
    </Link>
  );
}
