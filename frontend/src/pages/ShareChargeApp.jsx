import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  BatteryCharging,
  Calendar,
  CheckCircle,
  ChevronLeft,
  Clock,
  CreditCard,
  FileText,
  Gauge,
  Home,
  MapPin,
  PlusCircle,
  MessageCircle,
  Navigation,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  TrendingUp,
  UserCheck,
  Wallet,
  XCircle,
  Zap,
} from 'lucide-react';

const STORAGE_KEY = 'sharecharge-app-state-v1';

const initialState = {
  settings: {
    commission: 12.5,
    cancellationFee: 15,
    otpWindowMinutes: 15,
  },
  users: [
    { id: 'driver-1', name: 'דני לוי', role: 'driver', verified: true, blocked: false, spend: 286 },
    { id: 'driver-2', name: 'נועה כהן', role: 'driver', verified: true, blocked: false, spend: 154 },
    { id: 'host-1', name: 'מיכל רוזן', role: 'host', verified: true, blocked: false, revenue: 1840 },
    { id: 'host-2', name: 'אורי שגב', role: 'host', verified: false, blocked: false, revenue: 620 },
  ],
  stations: [
    {
      id: 'station-1',
      hostId: 'host-1',
      name: 'עמדת וילה ירוקה',
      address: 'הפרדס 18, רמת השרון',
      distance: 0.7,
      power: 22,
      plug: 'Type 2',
      pricePerKwh: 1.35,
      available: true,
      rating: 4.9,
      photos: 6,
    },
    {
      id: 'station-2',
      hostId: 'host-1',
      name: 'חניה פרטית שקטה',
      address: 'קהילת ונציה 4, תל אביב',
      distance: 1.4,
      power: 11,
      plug: 'Type 2',
      pricePerKwh: 1.18,
      available: true,
      rating: 4.8,
      photos: 4,
    },
    {
      id: 'station-3',
      hostId: 'host-2',
      name: 'מטען מהיר בחצר',
      address: 'הגליל 9, הרצליה',
      distance: 2.1,
      power: 50,
      plug: 'CCS',
      pricePerKwh: 1.55,
      available: true,
      rating: 4.7,
      photos: 3,
    },
  ],
  bookings: [],
  transactions: [],
  disputes: [],
  events: [
    { id: 'event-1', text: 'מערכת הדמו הופעלה ומוכנה להזמנות', type: 'system', time: Date.now() - 1000 * 60 * 12 },
  ],
};

const statusLabels = {
  pending: 'ממתין לאישור ספק',
  approved: 'אושר על ידי הספק',
  on_way: 'הנהג בדרך',
  otp_verified: 'OTP אומת',
  charging: 'טעינה פעילה',
  completed: 'הסתיים ושולם בדמו',
  rejected: 'נדחה',
  cancelled: 'בוטל',
};

const roleEntryConfig = {
  driver: {
    title: 'כניסת נהג',
    subtitle: 'מצא עמדה, הזמן, אמת OTP והתחל טעינה',
    cta: 'כניסה כאפליקציית נהג',
    icon: Navigation,
    gradient: 'from-emerald-500 via-cyan-500 to-blue-600',
    points: ['עמדות זמינות סביבך', 'ניווט והזמנה מהירה', 'חשבונית ותשלום דמה'],
  },
  host: {
    title: 'כניסת ספק',
    subtitle: 'נהל עמדה, אשר בקשות וסיים טעינה',
    cta: 'כניסה כאפליקציית ספק',
    icon: Home,
    gradient: 'from-blue-600 via-indigo-500 to-emerald-500',
    points: ['אישור/דחיית הזמנות', 'אימות OTP מול הנהג', 'ארנק והכנסות'],
  },
  admin: {
    title: 'כניסת מנהל',
    subtitle: 'שליטה בעמדות, לקוחות, עסקאות ודוחות',
    cta: 'כניסה לסביבת מנהל',
    icon: ShieldCheck,
    gradient: 'from-slate-950 via-blue-800 to-emerald-600',
    points: ['הוספת עמדות', 'היסטוריית לקוחות', 'דוחות הכנסות ומחלוקות'],
  },
};

function currency(value) {
  return `₪${Number(value || 0).toLocaleString('he-IL', { maximumFractionDigits: 2 })}`;
}

function shortTime(time) {
  return new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' }).format(new Date(time));
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
}

function createOtp() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function getInitialState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (error) {
    console.error('Failed to load ShareCharge state', error);
  }
  return initialState;
}

function useShareChargeStore() {
  const [state, setState] = useState(getInitialState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const update = (producer) => {
    setState((current) => {
      const next = structuredClone(current);
      producer(next);
      return next;
    });
  };

  const addEvent = (draft, text, type = 'activity') => {
    draft.events.unshift({ id: createId('event'), text, type, time: Date.now() });
    draft.events = draft.events.slice(0, 20);
  };

  return {
    state,
    reset: () => setState(initialState),
    createBooking: ({ stationId, startTime, durationHours }) => {
      let bookingId = '';
      update((draft) => {
        const station = draft.stations.find((item) => item.id === stationId);
        if (!station) return;
        bookingId = createId('booking');
        draft.bookings.unshift({
          id: bookingId,
          stationId,
          driverId: 'driver-1',
          hostId: station.hostId,
          startTime,
          durationHours,
          status: 'pending',
          createdAt: Date.now(),
          otp: '',
          kwh: 0,
          amount: 0,
          hostShare: 0,
          platformFee: 0,
          driverConfirmedStart: false,
          hostConfirmedConnection: false,
          notes: [],
        });
        addEvent(draft, `נוצרה בקשת הזמנה עבור ${station.name}`);
      });
      return bookingId;
    },
    approveBooking: (bookingId) => update((draft) => {
      const booking = draft.bookings.find((item) => item.id === bookingId);
      if (!booking) return;
      booking.status = 'approved';
      booking.approvedAt = Date.now();
      addEvent(draft, 'הספק אישר בקשת טעינה');
    }),
    rejectBooking: (bookingId) => update((draft) => {
      const booking = draft.bookings.find((item) => item.id === bookingId);
      if (!booking) return;
      booking.status = 'rejected';
      booking.rejectedAt = Date.now();
      addEvent(draft, 'הספק דחה בקשת טעינה', 'warning');
    }),
    markOnWay: (bookingId) => update((draft) => {
      const booking = draft.bookings.find((item) => item.id === bookingId);
      if (!booking) return;
      booking.status = 'on_way';
      booking.otp = createOtp();
      booking.onWayAt = Date.now();
      booking.otpExpiresAt = Date.now() + draft.settings.otpWindowMinutes * 60 * 1000;
      addEvent(draft, `הנהג בדרך. נוצר קוד OTP ${booking.otp}`);
    }),
    verifyOtp: (bookingId, otp) => {
      let ok = false;
      update((draft) => {
        const booking = draft.bookings.find((item) => item.id === bookingId);
        if (!booking || booking.otp !== otp || Date.now() > booking.otpExpiresAt) return;
        booking.status = 'otp_verified';
        booking.hostConfirmedConnection = true;
        booking.otpVerifiedAt = Date.now();
        ok = true;
        addEvent(draft, 'הספק אימת OTP וחיבור העמדה מוכן');
      });
      return ok;
    },
    driverStartCharge: (bookingId) => update((draft) => {
      const booking = draft.bookings.find((item) => item.id === bookingId);
      if (!booking || booking.status !== 'otp_verified') return;
      booking.status = 'charging';
      booking.driverConfirmedStart = true;
      booking.startedAt = Date.now();
      addEvent(draft, 'הנהג אישר התחלת טעינה');
    }),
    finishCharge: (bookingId, kwh) => update((draft) => {
      const booking = draft.bookings.find((item) => item.id === bookingId);
      if (!booking || booking.status !== 'charging') return;
      const station = draft.stations.find((item) => item.id === booking.stationId);
      const amount = Number((kwh * station.pricePerKwh).toFixed(2));
      const platformFee = Number((amount * draft.settings.commission / 100).toFixed(2));
      const hostShare = Number((amount - platformFee).toFixed(2));
      booking.status = 'completed';
      booking.completedAt = Date.now();
      booking.kwh = kwh;
      booking.amount = amount;
      booking.platformFee = platformFee;
      booking.hostShare = hostShare;
      draft.transactions.unshift({
        id: createId('tx'),
        bookingId,
        stationId: station.id,
        driverId: booking.driverId,
        hostId: booking.hostId,
        amount,
        hostShare,
        platformFee,
        kwh,
        status: 'paid_mock',
        createdAt: Date.now(),
      });
      addEvent(draft, `טעינה הסתיימה וחיוב דמה בוצע על סך ${currency(amount)}`);
    }),
    updateStation: (stationId, patch) => update((draft) => {
      const station = draft.stations.find((item) => item.id === stationId);
      if (!station) return;
      Object.assign(station, patch);
      addEvent(draft, 'הספק עדכן פרטי עמדה');
    }),
    addStation: (stationData) => update((draft) => {
      const host = draft.users.find((user) => user.id === stationData.hostId);
      draft.stations.unshift({
        id: createId('station'),
        hostId: stationData.hostId,
        name: stationData.name,
        address: stationData.address,
        distance: Number(stationData.distance || 1),
        power: Number(stationData.power || 11),
        plug: stationData.plug || 'Type 2',
        pricePerKwh: Number(stationData.pricePerKwh || 1.25),
        available: true,
        rating: 5,
        photos: 0,
        createdAt: Date.now(),
      });
      addEvent(draft, `מנהל הוסיף עמדה חדשה${host ? ` עבור ${host.name}` : ''}`);
    }),
    openDispute: (bookingId, reason) => update((draft) => {
      if (draft.disputes.some((item) => item.bookingId === bookingId && item.status === 'open')) return;
      draft.disputes.unshift({ id: createId('dispute'), bookingId, reason, status: 'open', createdAt: Date.now() });
      addEvent(draft, 'נפתחה מחלוקת לטיפול מנהל', 'warning');
    }),
    resolveDispute: (disputeId) => update((draft) => {
      const dispute = draft.disputes.find((item) => item.id === disputeId);
      if (!dispute) return;
      dispute.status = 'resolved';
      dispute.resolvedAt = Date.now();
      addEvent(draft, 'מנהל סגר מחלוקת');
    }),
    toggleBlockUser: (userId) => update((draft) => {
      const user = draft.users.find((item) => item.id === userId);
      if (!user) return;
      user.blocked = !user.blocked;
      addEvent(draft, `${user.name} ${user.blocked ? 'נחסם' : 'שוחרר מחסימה'}`, 'security');
    }),
    setCommission: (commission) => update((draft) => {
      draft.settings.commission = Number(commission);
      addEvent(draft, `עמלת המיזם עודכנה ל-${commission}%`);
    }),
  };
}

function AppFrame({ role, title, subtitle, children, actions, onExit }) {
  const nav = [
    { role: 'driver', label: 'נהג', icon: Navigation },
    { role: 'host', label: 'ספק', icon: Home },
    { role: 'admin', label: 'מנהל', icon: ShieldCheck },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto min-h-screen max-w-md bg-white shadow-2xl shadow-slate-300/60">
        <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-emerald-300" aria-label="בית">
              <Zap size={23} />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-emerald-600">ShareCharge App</p>
              <h1 className="truncate text-xl font-black">{title}</h1>
              <p className="truncate text-xs text-slate-500">{subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              {actions}
              <button onClick={onExit} className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">
                כניסה
              </button>
            </div>
          </div>
          <nav className="mt-3 grid grid-cols-3 gap-2">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = item.role === role;
              return (
                <Link
                  key={item.role}
                  to={`/app/${item.role}`}
                  className={`flex items-center justify-center gap-1 rounded-2xl px-3 py-2 text-sm font-black ${
                    active ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="space-y-4 px-4 py-4 pb-24">{children}</main>
      </div>
    </div>
  );
}

function Card({ children, className = '' }) {
  return <section className={`rounded-3xl border border-slate-100 bg-white p-4 shadow-sm ${className}`}>{children}</section>;
}

function StatusPill({ status }) {
  return (
    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
      {statusLabels[status] || status}
    </span>
  );
}

function RoleEntryScreen({ role, onEnter }) {
  const config = roleEntryConfig[role] || roleEntryConfig.driver;
  const Icon = config.icon;

  return (
    <div dir="rtl" className={`min-h-screen overflow-hidden bg-gradient-to-br ${config.gradient} p-4 text-white`}>
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-between py-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="rounded-2xl bg-white/15 px-4 py-2 text-sm font-black backdrop-blur">
            ShareCharge
          </Link>
          <div className="rounded-full bg-white/15 px-3 py-1 text-xs font-black backdrop-blur">דמו חי</div>
        </div>

        <section className="relative my-8 rounded-[2rem] border border-white/20 bg-white/15 p-5 shadow-2xl shadow-slate-950/20 backdrop-blur-2xl">
          <div className="absolute -left-10 top-12 h-32 w-32 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -right-12 bottom-10 h-40 w-40 rounded-full bg-emerald-300/25 blur-3xl" />

          <div className="relative mx-auto mb-7 flex h-64 w-64 items-center justify-center">
            <div className="sharecharge-orbit absolute inset-2 rounded-full border border-white/25" />
            <div className="sharecharge-orbit-reverse absolute inset-10 rounded-full border border-emerald-200/25" />
            <span className="sharecharge-spark absolute right-7 top-16 h-3 w-3 rounded-full bg-emerald-200 shadow-[0_0_22px_rgba(167,243,208,.9)]" />
            <span className="sharecharge-spark absolute bottom-12 left-10 h-2.5 w-2.5 rounded-full bg-cyan-200 shadow-[0_0_22px_rgba(165,243,252,.9)]" />
            <span className="sharecharge-spark absolute left-12 top-9 h-2 w-2 rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,.9)]" />
            <div className="sharecharge-logo-float sharecharge-logo-card relative z-10 flex h-52 w-52 items-center justify-center overflow-hidden rounded-[2rem] bg-white p-4 shadow-2xl">
              <span className="sharecharge-logo-shine" />
              <span className="sharecharge-energy-ring" />
              <img src="/sharecharge-logo.png" alt="ShareCharge" className="sharecharge-logo-image relative z-10 h-full w-full object-contain" />
              <span className="sharecharge-energy-dot sharecharge-energy-dot-a" />
              <span className="sharecharge-energy-dot sharecharge-energy-dot-b" />
              <span className="sharecharge-energy-dot sharecharge-energy-dot-c" />
            </div>
          </div>

          <div className="relative text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-slate-950 shadow-xl">
              <Icon size={30} />
            </div>
            <p className="text-sm font-black uppercase tracking-[0.28em] text-emerald-100">Welcome</p>
            <h1 className="mt-2 text-4xl font-black">{config.title}</h1>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-7 text-white/80">{config.subtitle}</p>

            <div className="mt-6 grid gap-2">
              {config.points.map((point) => (
                <div key={point} className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold backdrop-blur">
                  <CheckCircle size={17} className="text-emerald-200" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="space-y-3">
          <button onClick={onEnter} className="w-full rounded-3xl bg-white px-6 py-4 text-lg font-black text-slate-950 shadow-2xl shadow-slate-950/20 transition active:scale-[0.98]">
            {config.cta}
          </button>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(roleEntryConfig).map(([key, item]) => (
              <Link
                key={key}
                to={`/app/${key}`}
                className={`rounded-2xl px-3 py-3 text-center text-xs font-black backdrop-blur ${
                  key === role ? 'bg-white text-slate-950' : 'bg-white/15 text-white'
                }`}
              >
                {item.title.replace('כניסת ', '')}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DriverPage({ store, onExit }) {
  const { state, createBooking, markOnWay, driverStartCharge, openDispute } = store;
  const [query, setQuery] = useState('');
  const [durationHours, setDurationHours] = useState(2);
  const [selectedTime, setSelectedTime] = useState('19:30');
  const driverBookings = state.bookings.filter((item) => item.driverId === 'driver-1');
  const activeBooking = driverBookings.find((item) => !['completed', 'rejected', 'cancelled'].includes(item.status));
  const completedBookings = driverBookings.filter((item) => item.status === 'completed');

  const filteredStations = state.stations.filter((station) => {
    const term = query.trim();
    if (!term) return station.available;
    return station.available && `${station.name} ${station.address} ${station.plug}`.includes(term);
  });

  const stationFor = (booking) => state.stations.find((station) => station.id === booking.stationId);

  return (
    <AppFrame role="driver" title="מציאת טעינה" subtitle="חיפוש, הזמנה, OTP ותשלום דמה" onExit={onExit}>
      <Card className="bg-slate-950 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950">
            <BatteryCharging size={24} />
          </div>
          <div>
            <p className="text-sm text-white/60">שלום דני</p>
            <h2 className="text-2xl font-black">איפה נטען היום?</h2>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-3">
          <Search size={19} className="text-white/50" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="חפש לפי עיר, שקע או שם עמדה"
            className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-white/40"
          />
        </div>
      </Card>

      {activeBooking && (
        <Card className="border-emerald-200 bg-emerald-50">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-emerald-700">הזמנה פעילה</p>
              <h3 className="mt-1 text-xl font-black">{stationFor(activeBooking)?.name}</h3>
              <p className="mt-1 text-sm text-slate-600">{stationFor(activeBooking)?.address}</p>
            </div>
            <StatusPill status={activeBooking.status} />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-2xl bg-white p-3">
              <Clock className="mx-auto text-emerald-500" size={18} />
              <p className="mt-1 font-black">{activeBooking.startTime}</p>
              <p className="text-slate-500">שעה</p>
            </div>
            <div className="rounded-2xl bg-white p-3">
              <Calendar className="mx-auto text-emerald-500" size={18} />
              <p className="mt-1 font-black">{activeBooking.durationHours} שעות</p>
              <p className="text-slate-500">משך</p>
            </div>
            <div className="rounded-2xl bg-white p-3">
              <CreditCard className="mx-auto text-emerald-500" size={18} />
              <p className="mt-1 font-black">{currency(activeBooking.amount || activeBooking.durationHours * 12)}</p>
              <p className="text-slate-500">הערכה</p>
            </div>
          </div>

          {activeBooking.status === 'approved' && (
            <button onClick={() => markOnWay(activeBooking.id)} className="mt-4 w-full rounded-2xl bg-slate-950 py-3 font-black text-white">
              אני בדרך, צור OTP
            </button>
          )}

          {activeBooking.status === 'on_way' && (
            <div className="mt-4 rounded-3xl bg-slate-950 p-5 text-center text-white">
              <p className="text-sm text-white/60">הצג לספק את קוד האימות</p>
              <p className="mt-2 font-mono text-5xl font-black tracking-[0.35em] text-emerald-300">{activeBooking.otp}</p>
              <p className="mt-3 text-xs text-white/50">הספק חייב לאמת לפני התחלת טעינה</p>
            </div>
          )}

          {activeBooking.status === 'otp_verified' && (
            <button onClick={() => driverStartCharge(activeBooking.id)} className="mt-4 w-full rounded-2xl bg-emerald-500 py-3 font-black text-white">
              אשר התחלת טעינה
            </button>
          )}

          {activeBooking.status === 'charging' && (
            <div className="mt-4 rounded-3xl bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="font-black">טעינה פעילה</p>
                <p className="text-sm font-black text-emerald-600">הספק יסיים ויחייב בדמו</p>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-2/3 rounded-full bg-emerald-500" />
              </div>
            </div>
          )}

          {['approved', 'on_way', 'otp_verified', 'charging'].includes(activeBooking.status) && (
            <button onClick={() => openDispute(activeBooking.id, 'הנהג מבקש בדיקה')} className="mt-3 w-full rounded-2xl border border-amber-200 bg-white py-3 font-black text-amber-700">
              פתח פנייה למנהל
            </button>
          )}
        </Card>
      )}

      {!activeBooking && (
        <>
          <Card>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-bold text-slate-600">
                שעת התחלה
                <input value={selectedTime} onChange={(event) => setSelectedTime(event.target.value)} className="mt-2 w-full rounded-2xl bg-slate-100 px-3 py-3 font-black outline-none" />
              </label>
              <label className="text-sm font-bold text-slate-600">
                משך
                <select value={durationHours} onChange={(event) => setDurationHours(Number(event.target.value))} className="mt-2 w-full rounded-2xl bg-slate-100 px-3 py-3 font-black outline-none">
                  <option value={1}>שעה</option>
                  <option value={2}>שעתיים</option>
                  <option value={3}>שלוש שעות</option>
                </select>
              </label>
            </div>
          </Card>

          {filteredStations.map((station) => (
            <Card key={station.id}>
              <div className="flex items-start gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <Zap size={25} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-black">{station.name}</h3>
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">פנויה</span>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin size={15} /> {station.address}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
                <div className="rounded-2xl bg-slate-50 p-2"><p className="font-black">{station.distance} ק"מ</p><p className="text-slate-500">מרחק</p></div>
                <div className="rounded-2xl bg-slate-50 p-2"><p className="font-black">{station.power}kW</p><p className="text-slate-500">הספק</p></div>
                <div className="rounded-2xl bg-slate-50 p-2"><p className="font-black">{station.plug}</p><p className="text-slate-500">שקע</p></div>
                <div className="rounded-2xl bg-slate-50 p-2"><p className="font-black">{station.pricePerKwh}</p><p className="text-slate-500">₪/kWh</p></div>
              </div>
              <button
                onClick={() => createBooking({ stationId: station.id, startTime: selectedTime, durationHours })}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-3 font-black text-white"
              >
                הזמן עכשיו
                <ChevronLeft size={18} />
              </button>
            </Card>
          ))}
        </>
      )}

      {completedBookings.length > 0 && (
        <Card>
          <h3 className="mb-3 font-black">היסטוריית טעינות</h3>
          <div className="space-y-2">
            {completedBookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 text-sm">
                <span>{stationFor(booking)?.name}</span>
                <strong>{currency(booking.amount)}</strong>
              </div>
            ))}
          </div>
        </Card>
      )}
    </AppFrame>
  );
}

function HostPage({ store, onExit }) {
  const { state, approveBooking, rejectBooking, verifyOtp, finishCharge, updateStation } = store;
  const [otpInputs, setOtpInputs] = useState({});
  const [finishKwh, setFinishKwh] = useState(18.4);
  const hostStations = state.stations.filter((station) => station.hostId === 'host-1');
  const hostBookings = state.bookings.filter((booking) => booking.hostId === 'host-1');
  const station = hostStations[0];
  const stationBookings = hostBookings.filter((booking) => booking.stationId === station.id);
  const revenue = state.transactions.filter((tx) => tx.hostId === 'host-1').reduce((sum, tx) => sum + tx.hostShare, 0);

  return (
    <AppFrame role="host" title="ניהול ספק" subtitle="בקשות, OTP, טעינה וארנק" onExit={onExit}>
      <Card className="bg-slate-950 text-white">
        <p className="text-sm text-white/60">יתרה זמינה למשיכה</p>
        <div className="mt-2 flex items-end justify-between">
          <p className="text-4xl font-black">{currency(1840 + revenue)}</p>
          <Wallet className="text-emerald-300" size={30} />
        </div>
        <p className="mt-3 text-sm text-white/55">משיכה לבנק מחייבת 2FA בדמו</p>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-emerald-600">העמדה שלי</p>
            <h2 className="text-xl font-black">{station.name}</h2>
          </div>
          <button
            onClick={() => updateStation(station.id, { available: !station.available })}
            className={`rounded-2xl px-4 py-2 text-sm font-black ${station.available ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}
          >
            {station.available ? 'זמינה' : 'לא זמינה'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-bold text-slate-600">
            מחיר לקוט"ש
            <input
              type="number"
              step="0.05"
              value={station.pricePerKwh}
              onChange={(event) => updateStation(station.id, { pricePerKwh: Number(event.target.value) })}
              className="mt-2 w-full rounded-2xl bg-slate-100 px-3 py-3 font-black outline-none"
            />
          </label>
          <label className="text-sm font-bold text-slate-600">
            הספק kW
            <input
              type="number"
              value={station.power}
              onChange={(event) => updateStation(station.id, { power: Number(event.target.value) })}
              className="mt-2 w-full rounded-2xl bg-slate-100 px-3 py-3 font-black outline-none"
            />
          </label>
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 font-black">בקשות והזמנות</h3>
        {stationBookings.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">עדיין אין בקשות. בצע הזמנה מעמוד הנהג כדי לראות אותה כאן.</p>
        ) : (
          <div className="space-y-3">
            {stationBookings.map((booking) => (
              <div key={booking.id} className="rounded-3xl bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black">דני לוי · {booking.startTime}</p>
                    <p className="mt-1 text-sm text-slate-500">{booking.durationHours} שעות · נוצר ב-{shortTime(booking.createdAt)}</p>
                  </div>
                  <StatusPill status={booking.status} />
                </div>

                {booking.status === 'pending' && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button onClick={() => approveBooking(booking.id)} className="rounded-2xl bg-emerald-500 py-3 font-black text-white">אשר</button>
                    <button onClick={() => rejectBooking(booking.id)} className="rounded-2xl bg-white py-3 font-black text-red-600">דחה</button>
                  </div>
                )}

                {booking.status === 'on_way' && (
                  <div className="mt-3">
                    <label className="text-sm font-bold text-slate-600">
                      הזן OTP שהנהג מציג
                      <input
                        value={otpInputs[booking.id] || ''}
                        onChange={(event) => setOtpInputs({ ...otpInputs, [booking.id]: event.target.value })}
                        className="mt-2 w-full rounded-2xl bg-white px-3 py-3 text-center font-mono text-2xl font-black tracking-[0.25em] outline-none"
                        maxLength={4}
                      />
                    </label>
                    <button
                      onClick={() => verifyOtp(booking.id, otpInputs[booking.id] || '')}
                      className="mt-3 w-full rounded-2xl bg-slate-950 py-3 font-black text-white"
                    >
                      אמת קוד וחבר עמדה
                    </button>
                  </div>
                )}

                {booking.status === 'charging' && (
                  <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={finishKwh}
                      onChange={(event) => setFinishKwh(Number(event.target.value))}
                      className="rounded-2xl bg-white px-3 py-3 font-black outline-none"
                    />
                    <button onClick={() => finishCharge(booking.id, finishKwh)} className="rounded-2xl bg-emerald-500 px-4 py-3 font-black text-white">
                      סיים וחייב
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </AppFrame>
  );
}

function AdminPage({ store, onExit }) {
  const { state, addStation, resolveDispute, toggleBlockUser, setCommission, reset } = store;
  const hosts = state.users.filter((user) => user.role === 'host');
  const [stationForm, setStationForm] = useState({
    name: '',
    address: '',
    hostId: hosts[0]?.id || 'host-1',
    plug: 'Type 2',
    power: 22,
    pricePerKwh: 1.35,
    distance: 1,
  });
  const totalVolume = state.transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const platformFees = state.transactions.reduce((sum, tx) => sum + tx.platformFee, 0);
  const hostPayouts = state.transactions.reduce((sum, tx) => sum + tx.hostShare, 0);
  const totalKwh = state.transactions.reduce((sum, tx) => sum + tx.kwh, 0);
  const openDisputes = state.disputes.filter((item) => item.status === 'open');
  const completedBookings = state.bookings.filter((booking) => booking.status === 'completed');
  const customerHistory = state.users
    .filter((user) => user.role === 'driver')
    .map((user) => {
      const userBookings = state.bookings.filter((booking) => booking.driverId === user.id);
      const userTransactions = state.transactions.filter((tx) => tx.driverId === user.id);
      return {
        ...user,
        bookingsCount: userBookings.length,
        completedCount: userBookings.filter((booking) => booking.status === 'completed').length,
        totalSpend: userTransactions.reduce((sum, tx) => sum + tx.amount, 0),
        lastActivity: userBookings[0]?.createdAt,
      };
    });
  const revenueByStation = state.stations.map((station) => {
    const stationTransactions = state.transactions.filter((tx) => tx.stationId === station.id);
    return {
      station,
      volume: stationTransactions.reduce((sum, tx) => sum + tx.amount, 0),
      platformFees: stationTransactions.reduce((sum, tx) => sum + tx.platformFee, 0),
      hostShare: stationTransactions.reduce((sum, tx) => sum + tx.hostShare, 0),
      count: stationTransactions.length,
    };
  }).sort((a, b) => b.volume - a.volume);

  const handleAddStation = (event) => {
    event.preventDefault();
    if (!stationForm.name.trim() || !stationForm.address.trim()) return;
    addStation(stationForm);
    setStationForm({
      name: '',
      address: '',
      hostId: stationForm.hostId,
      plug: 'Type 2',
      power: 22,
      pricePerKwh: 1.35,
      distance: 1,
    });
  };

  return (
    <AppFrame
      role="admin"
      title="ניהול מערכת"
      subtitle="עסקאות, מחלוקות, עמלה ומשתמשים"
      actions={<button onClick={reset} className="rounded-2xl bg-slate-100 p-3" aria-label="איפוס דמו"><RefreshCw size={19} /></button>}
      onExit={onExit}
    >
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-slate-950 text-white">
          <CreditCard className="text-emerald-300" size={23} />
          <p className="mt-3 text-2xl font-black">{currency(totalVolume)}</p>
          <p className="text-xs text-white/55">מחזור עסקאות</p>
        </Card>
        <Card className="bg-emerald-500 text-white">
          <Gauge size={23} />
          <p className="mt-3 text-2xl font-black">{currency(platformFees)}</p>
          <p className="text-xs text-white/80">עמלות מיזם</p>
        </Card>
      </div>

      <Card>
        <h3 className="mb-3 flex items-center gap-2 font-black"><PlusCircle size={19} className="text-emerald-500" /> הוספת עמדה</h3>
        <form onSubmit={handleAddStation} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 text-sm font-bold text-slate-600">
              שם עמדה
              <input
                value={stationForm.name}
                onChange={(event) => setStationForm({ ...stationForm, name: event.target.value })}
                placeholder="לדוגמה: עמדת חניון מרכזי"
                className="mt-2 w-full rounded-2xl bg-slate-100 px-3 py-3 font-black outline-none"
              />
            </label>
            <label className="col-span-2 text-sm font-bold text-slate-600">
              כתובת
              <input
                value={stationForm.address}
                onChange={(event) => setStationForm({ ...stationForm, address: event.target.value })}
                placeholder="רחוב, עיר"
                className="mt-2 w-full rounded-2xl bg-slate-100 px-3 py-3 font-black outline-none"
              />
            </label>
            <label className="text-sm font-bold text-slate-600">
              ספק
              <select
                value={stationForm.hostId}
                onChange={(event) => setStationForm({ ...stationForm, hostId: event.target.value })}
                className="mt-2 w-full rounded-2xl bg-slate-100 px-3 py-3 font-black outline-none"
              >
                {hosts.map((host) => <option key={host.id} value={host.id}>{host.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-bold text-slate-600">
              סוג שקע
              <select
                value={stationForm.plug}
                onChange={(event) => setStationForm({ ...stationForm, plug: event.target.value })}
                className="mt-2 w-full rounded-2xl bg-slate-100 px-3 py-3 font-black outline-none"
              >
                <option>Type 2</option>
                <option>CCS</option>
                <option>CHAdeMO</option>
              </select>
            </label>
            <label className="text-sm font-bold text-slate-600">
              הספק kW
              <input
                type="number"
                value={stationForm.power}
                onChange={(event) => setStationForm({ ...stationForm, power: Number(event.target.value) })}
                className="mt-2 w-full rounded-2xl bg-slate-100 px-3 py-3 font-black outline-none"
              />
            </label>
            <label className="text-sm font-bold text-slate-600">
              מחיר ₪/kWh
              <input
                type="number"
                step="0.05"
                value={stationForm.pricePerKwh}
                onChange={(event) => setStationForm({ ...stationForm, pricePerKwh: Number(event.target.value) })}
                className="mt-2 w-full rounded-2xl bg-slate-100 px-3 py-3 font-black outline-none"
              />
            </label>
          </div>
          <button className="w-full rounded-2xl bg-slate-950 py-3 font-black text-white">
            הוסף עמדה למערכת
          </button>
        </form>
      </Card>

      <Card>
        <h3 className="mb-3 flex items-center gap-2 font-black"><TrendingUp size={19} className="text-emerald-500" /> דוחות הכנסות</h3>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xl font-black">{currency(hostPayouts)}</p>
            <p className="text-xs text-slate-500">תשלומים לספקים</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xl font-black">{totalKwh.toFixed(1)}</p>
            <p className="text-xs text-slate-500">kWh שנצרכו</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xl font-black">{completedBookings.length}</p>
            <p className="text-xs text-slate-500">טעינות שהושלמו</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xl font-black">{state.stations.length}</p>
            <p className="text-xs text-slate-500">עמדות במערכת</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {revenueByStation.slice(0, 5).map(({ station, volume, platformFees: fees, count }) => (
            <div key={station.id} className="rounded-2xl bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-black">{station.name}</p>
                  <p className="text-xs text-slate-500">{count} עסקאות · עמלה {currency(fees)}</p>
                </div>
                <strong>{currency(volume)}</strong>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${Math.min(100, totalVolume ? (volume / totalVolume) * 100 : 0)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <label className="text-sm font-bold text-slate-600">
          עמלת מיזם
          <div className="mt-2 flex items-center gap-3">
            <input
              type="range"
              min={5}
              max={25}
              step={0.5}
              value={state.settings.commission}
              onChange={(event) => setCommission(event.target.value)}
              className="w-full"
            />
            <span className="w-14 rounded-2xl bg-slate-100 py-2 text-center font-black">{state.settings.commission}%</span>
          </div>
        </label>
      </Card>

      <Card>
        <h3 className="mb-3 flex items-center gap-2 font-black"><FileText size={19} className="text-emerald-500" /> היסטוריית לקוחות</h3>
        <div className="space-y-2">
          {customerHistory.map((customer) => (
            <div key={customer.id} className="rounded-2xl bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-black">{customer.name}</p>
                  <p className="text-xs text-slate-500">
                    {customer.bookingsCount} הזמנות · {customer.completedCount} הושלמו · {customer.lastActivity ? `פעילות אחרונה ${shortTime(customer.lastActivity)}` : 'ללא פעילות'}
                  </p>
                </div>
                <div className="text-left">
                  <p className="font-black">{currency(customer.totalSpend)}</p>
                  <p className="text-xs text-slate-500">הוצאה בדמו</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 flex items-center gap-2 font-black"><AlertTriangle size={19} className="text-amber-500" /> מחלוקות</h3>
        {openDisputes.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">אין מחלוקות פתוחות.</p>
        ) : (
          <div className="space-y-2">
            {openDisputes.map((dispute) => (
              <div key={dispute.id} className="rounded-2xl bg-amber-50 p-3">
                <p className="font-black">{dispute.reason}</p>
                <p className="text-xs text-slate-500">Booking: {dispute.bookingId.slice(0, 18)}</p>
                <button onClick={() => resolveDispute(dispute.id)} className="mt-2 w-full rounded-2xl bg-slate-950 py-2 font-black text-white">
                  סגור מחלוקת
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="mb-3 flex items-center gap-2 font-black"><UserCheck size={19} className="text-emerald-500" /> משתמשים</h3>
        <div className="space-y-2">
          {state.users.map((user) => (
            <div key={user.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
              <div>
                <p className="font-black">{user.name}</p>
                <p className="text-xs text-slate-500">{user.role} · {user.verified ? 'KYC מאומת' : 'ממתין KYC'}</p>
              </div>
              <button
                onClick={() => toggleBlockUser(user.id)}
                className={`rounded-2xl px-3 py-2 text-xs font-black ${user.blocked ? 'bg-red-100 text-red-700' : 'bg-white text-slate-600'}`}
              >
                {user.blocked ? <XCircle size={16} /> : <Ban size={16} />}
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 flex items-center gap-2 font-black"><SlidersHorizontal size={19} /> אירועים אחרונים</h3>
        <div className="space-y-2">
          {state.events.map((event) => (
            <div key={event.id} className="rounded-2xl bg-slate-50 p-3 text-sm">
              <p className="font-bold">{event.text}</p>
              <p className="mt-1 text-xs text-slate-400">{shortTime(event.time)}</p>
            </div>
          ))}
        </div>
      </Card>
    </AppFrame>
  );
}

export default function ShareChargeApp() {
  const { role } = useParams();
  const store = useShareChargeStore();
  const normalizedRole = useMemo(() => (['driver', 'host', 'admin'].includes(role) ? role : 'driver'), [role]);
  const [enteredRoles, setEnteredRoles] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('sharecharge-entered-roles') || '{}');
    } catch (error) {
      console.error('Failed to load entry state', error);
      return {};
    }
  });

  const enterRole = () => {
    const next = { ...enteredRoles, [normalizedRole]: true };
    setEnteredRoles(next);
    sessionStorage.setItem('sharecharge-entered-roles', JSON.stringify(next));
  };

  const exitRole = () => {
    const next = { ...enteredRoles, [normalizedRole]: false };
    setEnteredRoles(next);
    sessionStorage.setItem('sharecharge-entered-roles', JSON.stringify(next));
  };

  if (!role) return <Navigate to="/app/driver" replace />;
  if (!enteredRoles[normalizedRole]) return <RoleEntryScreen role={normalizedRole} onEnter={enterRole} />;

  if (normalizedRole === 'host') return <HostPage store={store} onExit={exitRole} />;
  if (normalizedRole === 'admin') return <AdminPage store={store} onExit={exitRole} />;
  return <DriverPage store={store} onExit={exitRole} />;
}
