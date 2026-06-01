import { lazy } from 'react';

// project imports
import MainLayout from 'layout/MainLayout';
import Loadable from 'ui-component/Loadable';

const Channel = Loadable(lazy(() => import('views/Channel')));
const Log = Loadable(lazy(() => import('views/Log')));
const TimingLog = Loadable(lazy(() => import('views/TimingLog')));
const Setting = Loadable(lazy(() => import('views/Setting')));
const Token = Loadable(lazy(() => import('views/Token')));
const User = Loadable(lazy(() => import('views/User')));
const Profile = Loadable(lazy(() => import('views/Profile')));
const ModelMarket = Loadable(lazy(() => import('views/ModelMarket')));
const Report = Loadable(lazy(() => import('views/Report')));
const DowngradeRules = Loadable(lazy(() => import('views/DowngradeRules')));
const SkillMarket = Loadable(lazy(() => import('views/SkillMarket')));
const MCPSetting = Loadable(lazy(() => import('views/MCPSetting')));
const MCPProviders = Loadable(lazy(() => import('views/MCPSetting/Providers')));
const MCPProviderDetail = Loadable(lazy(() => import('views/MCPSetting/ProviderDetail')));
const MCPStats = Loadable(lazy(() => import('views/MCPSetting/Stats')));
const NotFoundView = Loadable(lazy(() => import('views/Error')));

// dashboard routing
const Dashboard = Loadable(lazy(() => import('views/Dashboard')));

// ==============================|| MAIN ROUTING ||============================== //

const MainRoutes = {
  path: '/panel',
  element: <MainLayout />,
  children: [
    {
      path: '',
      element: <Dashboard />
    },
    {
      path: 'dashboard',
      element: <Dashboard />
    },
    {
      path: 'channel',
      element: <Channel />
    },
    {
      path: 'log',
      element: <Log />
    },
    {
      path: 'timing',
      element: <TimingLog />
    },
    {
      path: 'setting',
      element: <Setting />
    },
    {
      path: 'token',
      element: <Token />
    },
    {
      path: 'user',
      element: <User />
    },
    {
      path: 'models',
      element: <ModelMarket />
    },
    {
      path: 'report',
      element: <Report />
    },
    {
      path: 'skills',
      element: <SkillMarket />
    },
    {
      path: 'mcp',
      element: <MCPSetting />
    },
    {
      path: 'mcp/providers',
      element: <MCPProviders />
    },
    {
      path: 'mcp/providers/:id',
      element: <MCPProviderDetail />
    },
    {
      path: 'mcp/stats',
      element: <MCPStats />
    },
    {
      path: 'profile',
      element: <Profile />
    },
    {
      path: 'downgrade',
      element: <DowngradeRules />
    },
    {
      path: '404',
      element: <NotFoundView />
    }
  ]
};

export default MainRoutes;
