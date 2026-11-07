import { PasswordRecovery } from './pages/PasswordRecovery';
import { PaymentCallback } from './pages/PaymentCallback';
import { BrowserRouter,Link,Navigate,Outlet,Route,Routes } from 'react-router-dom';
import { AdminLayout } from './components/admin/AdminLayout';
import { BottomNav } from './components/guest/BottomNav';
import { GuestFooter } from './components/guest/GuestFooter';
import { GuestNavbar } from './components/guest/GuestNavbar';
import { Protected } from './components/shared/Protected';
import { RouteReset } from './components/shared/RouteReset';
import { Heading } from './components/shared/Shared';
import { AppProvider } from './context/AppContext';
import { AdminHotels,Dashboard,HotelEditor,ModifyReservation,Promotions,Reservation,Reservations,Rooms } from './pages/AdminPages';
import GoogleCallback from './pages/GoogleCallback';
import { AuthSuccess,BookStay,BookingPage,Favourites,Home,HotelPage,Hotels,MyBookings,Notifications,Photos,Profile } from './pages/GuestPages';
import { Login } from './pages/Login';

/** Guest screens share the same navigation, footer, and mobile account shortcuts. */
function GuestLayout() {
  return <><GuestNavbar /><Outlet /><GuestFooter /><BottomNav /></>;
}

/** Preserve a helpful recovery route when a shared or bookmarked page no longer exists. */
function NotFound() {
  return <main className="section form-page" id="main" tabIndex={-1}>
    <Heading eyebrow="PAGE NOT FOUND">Let's find your way home.</Heading>
    <Link className="button" to="/hotels">Explore our locations</Link>
  </main>;
}

/** Route composition follows the guest/admin page groups and shared role guard. */
export function ApplicationRoutes() {
  return <><a className="skip-link" href="#main">Skip to content</a><RouteReset />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route element={<GuestLayout />}>
        <Route path="/hotels" element={<Hotels />} />
        <Route path="/hotels/:id" element={<HotelPage />} />
        <Route path="/hotels/:id/photos" element={<Photos />} />
        <Route path="/signin" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Login />} />
        <Route path="/forgot-password" element={<PasswordRecovery key="forgot" />} />
        <Route path="/reset-password" element={<PasswordRecovery key="reset" reset />} />
        <Route path="/admin/signin" element={<Navigate to="/signin" replace />} />
        <Route path="/auth/callback" element={<GoogleCallback />} />
        <Route path="/signed-out" element={<AuthSuccess signedOut />} />
        <Route element={<Protected />}>
          <Route path="/payments/callback" element={<PaymentCallback />} />
          <Route path="/signin-success" element={<AuthSuccess />} />
          <Route path="/hotels/:id/book" element={<BookStay />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/bookings" element={<MyBookings />} />
          <Route path="/favourites" element={<Favourites />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/bookings/:id" element={<BookingPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route element={<Protected admin />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/hotels" element={<AdminHotels />} />
          <Route path="/admin/hotels/new" element={<HotelEditor />} />
          <Route path="/admin/hotels/:id/edit" element={<HotelEditor />} />
          <Route path="/admin/rooms" element={<Rooms />} />
          <Route path="/admin/bookings" element={<Reservations />} />
          <Route path="/admin/bookings/:id" element={<Reservation />} />
          <Route path="/admin/bookings/:id/modify" element={<ModifyReservation />} />
          <Route path="/admin/notifications" element={<Promotions />} />
        </Route>
      </Route>
    </Routes>
  </>;
}

/** Redux supplies server data while AppProvider supplies the shared session and UI feedback. */
export default function App() {
  return <BrowserRouter><AppProvider><ApplicationRoutes /></AppProvider></BrowserRouter>;
}


