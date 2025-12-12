import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ConnectPage } from './pages/ConnectPage';
import { HomePage } from './pages/HomePage';
import { MoviesPage } from './pages/MoviesPage';
import { SeriesIndexPage } from './pages/SeriesIndexPage';
import { SeriesPage } from './pages/SeriesPage';
import { DetailPage } from './pages/DetailPage';
import { SearchPage } from './pages/SearchPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { Layout } from './components/Layout';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/home" replace />,
  },
  {
    path: '/connect',
    element: <ConnectPage />,
  },
  {
    path: '/library',
    element: <Navigate to="/home" replace />,
  },
  {
    element: <Layout />,
    children: [
      {
        path: '/home',
        element: <HomePage />,
      },
      {
        path: '/search',
        element: <SearchPage />,
      },
      {
        path: '/movies',
        element: <MoviesPage />,
      },
      {
        path: '/series-index',
        element: <SeriesIndexPage />,
      },
      {
        path: '/series',
        element: <SeriesPage />,
      },
      {
        path: '/item/:id',
        element: <DetailPage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  }
]);
