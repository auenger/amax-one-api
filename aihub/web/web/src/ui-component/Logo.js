import logoWhite from 'assets/images/logo_white.png';
import { useSelector } from 'react-redux';

const Logo = () => {
  const siteInfo = useSelector((state) => state.siteInfo);

  return <img src={siteInfo.logo || logoWhite} alt={siteInfo.system_name} height="50" />;
};

export default Logo;
