import { Link } from 'react-router-dom';

/** Original PNG — black matte; use on dark surfaces inside a light chip. */
export const LOGO_DARK_SURFACE = '/dealsluxy-logo.png';
/** Transparent PNG — use directly on white/light headers. */
export const LOGO_LIGHT_SURFACE = '/dealsluxy-logo-light.png';

const SIZES = {
  sm: 'h-8 max-w-[180px]',
  md: 'h-9 max-w-[200px]',
  lg: 'h-11 max-w-[240px]'
};

/**
 * @param {'light' | 'dark'} variant
 *   light — transparent logo on white/light pages (no box)
 *   dark  — original logo on white chip for dark footer/admin
 */
export default function SiteLogo({
  className = '',
  imgClassName = '',
  linkTo = '/',
  showLink = true,
  variant = 'light',
  size = 'md'
}) {
  const onDarkSurface = variant === 'dark';
  const src = onDarkSurface ? LOGO_DARK_SURFACE : LOGO_LIGHT_SURFACE;

  const img = (
    <img
      src={src}
      alt="DealsLuxy"
      className={[SIZES[size] || SIZES.md, 'w-auto object-contain block', imgClassName].filter(Boolean).join(' ')}
      width={220}
      height={44}
      decoding="async"
    />
  );

  const content = onDarkSurface ? (
    <span className="inline-flex items-center rounded-xl bg-white px-3 py-1.5 shadow-sm ring-1 ring-white/20">{img}</span>
  ) : (
    img
  );

  if (!showLink) {
    return <div className={`inline-flex items-center ${className}`}>{content}</div>;
  }

  return (
    <Link to={linkTo} className={`inline-flex items-center shrink-0 ${className}`} aria-label="DealsLuxy home">
      {content}
    </Link>
  );
}
