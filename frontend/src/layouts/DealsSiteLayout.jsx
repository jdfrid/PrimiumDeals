import { Outlet } from 'react-router-dom';
import DealQueryModal from '../components/DealQueryModal';

export default function DealsSiteLayout() {
  return (
    <>
      <Outlet />
      <DealQueryModal />
    </>
  );
}
