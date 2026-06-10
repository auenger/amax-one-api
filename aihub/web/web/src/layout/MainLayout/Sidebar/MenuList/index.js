// material-ui
import { Typography } from '@mui/material';

// project imports
import NavGroup from './NavGroup';
import menuItem from 'menu-items';
import { isAdmin } from 'utils/common';

// ==============================|| SIDEBAR MENU LIST ||============================== //
const MenuList = () => {
  const userIsAdmin = isAdmin();

  const filterMenu = (items) => {
    return items
      .filter((item) => !item.isAdmin || userIsAdmin)
      .map((item) => {
        if (item.children && item.children.length > 0) {
          return { ...item, children: filterMenu(item.children) };
        }
        return item;
      });
  };

  return (
    <>
      {menuItem.items.map((item) => {
        if (item.type !== 'group') {
          return (
            <Typography key={item.id} variant="h6" color="error" align="center">
              Menu Items Error
            </Typography>
          );
        }

        const filteredChildren = filterMenu(item.children);

        if (filteredChildren.length === 0) {
          return null;
        }

        return <NavGroup key={item.id} item={{ ...item, children: filteredChildren }} />;
      })}
    </>
  );
};

export default MenuList;
