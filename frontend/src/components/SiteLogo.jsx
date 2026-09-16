import { Link } from 'react-router-dom';

export const LOGO_SRC = '/dealsluxy-logo.png';

/**
 * DealsLuxy brand logo — use everywhere the site identity appears.
 */
export default function SiteLogo({
  className = '',
  imgClassName = 'h-10 w-auto max-w-[200px] object-contain',
  linkTo = '/',
  showLink = true
}) {
  const img = <img src={LOGO_SRC} alt="DealsLuxy" className={imgClassName} width={200} height={40} />;

  if (!showLink) {
    return <div className={`inline-flex items-center ${className}`}>{img}</div>;
  }

  return (
    <Link to={linkTo} className={`inline-flex items-center shrink-0 ${className}`} aria-label="DealsLuxy home">
      {img}
    </Link>
  );
}
