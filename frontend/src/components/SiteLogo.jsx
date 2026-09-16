import { Link } from 'react-router-dom';

export const LOGO_DARK_SURFACE = '/dealsluxy-logo.png';
export const LOGO_LIGHT_SURFACE = '/dealsluxy-logo-light.png';
export const LOGO_ICON = '/dealsluxy-icon.png';

const SIZES = {
  sm: { icon: 'h-8 w-8', text: 'text-lg' },
  md: { icon: 'h-9 w-9', text: 'text-xl' },
  lg: { icon: 'h-10 w-10 md:h-11 md:w-11', text: 'text-xl md:text-2xl' }
};

function LogoWordmark({ textClass = '' }) {
  return (
    <span className={`font-bold tracking-tight leading-none ${textClass}`}>
      <span className="text-slate-800">Deals</span>
      <span className="bg-gradient-to-r from-orange-500 via-rose-500 to-fuchsia-500 bg-clip-text text-transparent">
        Luxy
      </span>
    </span>
  );
}

/**
 * @param {'light' | 'dark' | 'full'} variant
 *   light — crisp icon + HTML wordmark (storefront headers)
 *   dark  — full PNG on white chip (dark footer/admin)
 *   full  — transparent full PNG fallback
 */
export default function SiteLogo({
  className = '',
  linkTo = '/',
  showLink = true,
  variant = 'light',
  size = 'md'
}) {
  const sz = SIZES[size] || SIZES.md;

  let content;
  if (variant === 'light') {
    content = (
      <span className="inline-flex items-center gap-2.5 select-none">
        <img
          src={LOGO_ICON}
          alt=""
          aria-hidden
          className={`${sz.icon} object-contain shrink-0 drop-shadow-sm`}
          width={44}
          height={44}
          decoding="async"
        />
        <LogoWordmark textClass={sz.text} />
      </span>
    );
  } else if (variant === 'dark') {
    content = (
      <span className="inline-flex items-center rounded-xl bg-white px-3 py-1.5 shadow-sm ring-1 ring-white/20">
        <img
          src={LOGO_DARK_SURFACE}
          alt="DealsLuxy"
          className="h-8 w-auto max-w-[180px] object-contain block"
          width={180}
          height={32}
          decoding="async"
        />
      </span>
    );
  } else {
    content = (
      <img
        src={LOGO_LIGHT_SURFACE}
        alt="DealsLuxy"
        className="h-9 w-auto max-w-[200px] object-contain block"
        width={200}
        height={44}
        decoding="async"
      />
    );
  }

  if (!showLink) {
    return <div className={`inline-flex items-center ${className}`}>{content}</div>;
  }

  return (
    <Link to={linkTo} className={`inline-flex items-center shrink-0 ${className}`} aria-label="DealsLuxy home">
      {content}
    </Link>
  );
}
