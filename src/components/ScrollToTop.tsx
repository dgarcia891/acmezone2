import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const EXCLUDED_PATHS = ["/admin/pod-pipeline"];

const ScrollToTop = () => {
  const { pathname } = useLocation();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    const excluded = EXCLUDED_PATHS.some((p) => pathname.startsWith(p));
    if (!excluded) {
      window.scrollTo(0, 0);
    }
    prevPathname.current = pathname;
  }, [pathname]);

  return null;
};

export default ScrollToTop;