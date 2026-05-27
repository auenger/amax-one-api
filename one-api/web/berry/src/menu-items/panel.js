// assets
import {
  IconDashboard,
  IconSitemap,
  IconArticle,
  IconCoin,
  IconAdjustments,
  IconKey,
  IconGardenCart,
  IconUser,
  IconUserScan,
  IconSparkles,
  IconChartBar,
  IconClock,
  IconArrowDown,
  IconDownload,
  IconBook
} from '@tabler/icons-react';

// constant
const icons = { IconDashboard, IconSitemap, IconArticle, IconCoin, IconAdjustments, IconKey, IconGardenCart, IconUser, IconUserScan, IconSparkles, IconChartBar, IconClock, IconArrowDown, IconDownload, IconBook };

// ==============================|| DASHBOARD MENU ITEMS ||============================== //

const panel = {
  id: 'panel',
  type: 'group',
  children: [
    {
      id: 'dashboard',
      title: '总览',
      type: 'item',
      url: '/panel/dashboard',
      icon: icons.IconDashboard,
      breadcrumbs: false,
      isAdmin: false
    },
    {
      id: 'models',
      title: '模型广场',
      type: 'item',
      url: '/panel/models',
      icon: icons.IconSparkles,
      breadcrumbs: false
    },
    {
      id: 'skills',
      title: 'Skill 市场',
      type: 'item',
      url: '/panel/skills',
      icon: icons.IconBook,
      breadcrumbs: false
    },
    {
      id: 'channel',
      title: '渠道',
      type: 'item',
      url: '/panel/channel',
      icon: icons.IconSitemap,
      breadcrumbs: false,
      isAdmin: true
    },
    {
      id: 'token',
      title: '令牌',
      type: 'item',
      url: '/panel/token',
      icon: icons.IconKey,
      breadcrumbs: false
    },
    {
      id: 'download',
      title: '下载 CC Switch',
      type: 'item',
      url: '/download',
      icon: icons.IconDownload,
      breadcrumbs: false
    },
    {
      id: 'log',
      title: '日志',
      type: 'item',
      url: '/panel/log',
      icon: icons.IconArticle,
      breadcrumbs: false
    },
    {
      id: 'timing',
      title: '计时日志',
      type: 'item',
      url: '/panel/timing',
      icon: icons.IconClock,
      breadcrumbs: false,
      isAdmin: true
    },
    {
      id: 'downgrade',
      title: '降级监控',
      type: 'item',
      url: '/panel/downgrade',
      icon: icons.IconArrowDown,
      breadcrumbs: false,
      isAdmin: true
    },
    {
      id: 'report',
      title: '用量报表',
      type: 'item',
      url: '/panel/report',
      icon: icons.IconChartBar,
      breadcrumbs: false,
      isAdmin: false
    },
    {
      id: 'user',
      title: '用户',
      type: 'item',
      url: '/panel/user',
      icon: icons.IconUser,
      breadcrumbs: false,
      isAdmin: true
    },
    {
      id: 'profile',
      title: '我的',
      type: 'item',
      url: '/panel/profile',
      icon: icons.IconUserScan,
      breadcrumbs: false,
      isAdmin: false
    },
    {
      id: 'setting',
      title: '设置',
      type: 'item',
      url: '/panel/setting',
      icon: icons.IconAdjustments,
      breadcrumbs: false,
      isAdmin: true
    }
  ]
};

export default panel;
