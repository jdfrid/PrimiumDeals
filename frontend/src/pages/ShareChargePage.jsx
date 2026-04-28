import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Calendar,
  Car,
  CheckCircle,
  ChevronLeft,
  Clock,
  CreditCard,
  Filter,
  Gauge,
  Home,
  Lock,
  MapPin,
  Menu,
  Navigation,
  PhoneCall,
  Search,
  Settings,
  Shield,
  Star,
  UserCheck,
  Wallet,
  X,
  Zap,
} from 'lucide-react';

const stations = [
  {
    name: 'עמדת וילה ירוקה',
    area: 'רמת השרון',
    distance: '0.7 ק"מ',
    price: '1.35 ₪ / kWh',
    power: '22kW',
    plugs: 'Type 2',
    rating: 4.9,
    status: 'פנויה עכשיו',
    gradient: 'from-emerald-400 to-cyan-400',
  },
  {
    name: 'חניה פרטית שקטה',
    area: 'תל אביב צפון',
    distance: '1.4 ק"מ',
    price: '18 ₪ / שעה',
    power: '11kW',
    plugs: 'Type 2',
    rating: 4.8,
    status: 'זמינה ב-19:30',
    gradient: 'from-blue-400 to-indigo-500',
  },
  {
    name: 'מטען מהיר בחצר',
    area: 'הרצליה',
    distance: '2.1 ק"מ',
    price: '1.55 ₪ / kWh',
    power: '50kW',
    plugs: 'CCS',
    rating: 4.7,
    status: 'אישור מיידי',
    gradient: 'from-violet-400 to-fuchsia-500',
  },
];

const flowSteps = [
  { title: 'מוצאים עמדה', text: 'GPS, מפה ורשימה חכמה לפי מחיר, מרחק, הספק ודירוג.', icon: Search },
  { title: 'משריינים זמן', text: 'Booking עם מחיר נעול, דמי ביטול וחיווי "אני בדרך".', icon: Calendar },
  { title: 'מאמתים בשטח', text: 'OTP חד-פעמי, אישור ספק ואז אישור נהג לתחילת טעינה.', icon: UserCheck },
  { title: 'משלמים אוטומטית', text: 'Split Payment, חשבונית וארנק דיגיטלי לספק.', icon: Wallet },
];

const roleScreens = {
  driver: {
    label: 'נהג',
    title: 'מוצא טעינה קרובה תוך פחות מדקה',
    subtitle: 'מפה, זמינות, מחיר, ניווט ו-OTP במקום אחד.',
    stats: ['3 עמדות זמינות', '₪14.80 הערכת עלות', '18 דק׳ עד טעינה'],
    bullets: ['פילטר לפי Type 2 / CCS והספק', 'שיחה מוצפנת בלי חשיפת מספרים', 'חשבוניות והיסטוריית טעינות'],
  },
  host: {
    label: 'ספק',
    title: 'מנהל עמדה פרטית כמו נכס מניב',
    subtitle: 'מחירון, זמינות, בקשות הזמנה, OTP ומשיכת כספים.',
    stats: ['₪1,840 החודש', '91% ניצול בשעות ערב', '4.9 דירוג ממוצע'],
    bullets: ['הגדרת מחיר לשעה או kWh', 'אישור/דחייה עם סיבה מוצדקת', 'משיכה עם 2FA לחשבון בנק'],
  },
  admin: {
    label: 'מנהל',
    title: 'שליטה עסקית מלאה בפלטפורמה',
    subtitle: 'עסקאות, מחלוקות, עמלה, KYC וחסימות משתמשים.',
    stats: ['12.5% עמלת מיזם', '98.2% עסקאות תקינות', '24/7 ניטור סיכונים'],
    bullets: ['ניהול מחלוקות וביטולים', 'מעקב רגולטורי ו-KYC', 'Audit trail לכל פעולה רגישה'],
  },
};

const investorMetrics = [
  { value: '38K+', label: 'עמדות פרטיות פוטנציאליות בישראל' },
  { value: '15 דק׳', label: 'חלון שמירת הזמנה לאחר "אני בדרך"' },
  { value: '2 צדדים', label: 'שוק דו-צדדי: נהגים ובעלי עמדות' },
  { value: '12.5%', label: 'מודל הכנסה מעמלת עסקה' },
];

function AppShellMockup({ selectedRole, onRoleChange }) {
  const screen = roleScreens[selectedRole];

  return (
    <div className="relative mx-auto w-full max-w-[390px] rounded-[2.5rem] border border-slate-900/10 bg-slate-950 p-3 shadow-2xl shadow-emerald-900/20">
      <div className="overflow-hidden rounded-[2rem] bg-[#071817] text-white">
        <div className="flex items-center justify-between px-5 py-4 text-xs text-white/70">
          <span>12:27</span>
          <div className="h-5 w-24 rounded-full bg-black/40" />
          <span>5G</span>
        </div>

        <div className="px-5 pb-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-emerald-200">ShareCharge</p>
              <h3 className="text-2xl font-bold">טעינה לידך</h3>
            </div>
            <button className="rounded-2xl bg-white/10 p-3 backdrop-blur" aria-label="פתיחת תפריט">
              <Menu size={20} />
            </button>
          </div>

          <div className="rounded-3xl bg-white p-3 text-slate-950 shadow-xl">
            <div className="relative mb-3 h-44 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-100 via-cyan-50 to-blue-100">
              <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(90deg,rgba(15,23,42,.08)_1px,transparent_1px),linear-gradient(0deg,rgba(15,23,42,.08)_1px,transparent_1px)] [background-size:34px_34px]" />
              <div className="absolute right-6 top-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg">
                <Zap size={24} />
              </div>
              <div className="absolute left-10 top-16 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg">
                <Home size={19} />
              </div>
              <div className="absolute bottom-6 right-24 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
                <Car size={20} />
              </div>
              <div className="absolute bottom-4 left-4 rounded-2xl bg-white/90 px-3 py-2 text-xs font-bold shadow">
                3 עמדות ברדיוס 2 ק"מ
              </div>
            </div>

            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {Object.entries(roleScreens).map(([key, role]) => (
                <button
                  key={key}
                  onClick={() => onRoleChange(key)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    selectedRole === key ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {role.label}
                </button>
              ))}
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold text-emerald-600">מסך {screen.label}</p>
              <h4 className="mt-1 text-lg font-black leading-tight">{screen.title}</h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">{screen.subtitle}</p>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {screen.stats.map((stat) => (
                  <div key={stat} className="rounded-2xl bg-white p-3 text-center shadow-sm">
                    <p className="text-[11px] font-bold leading-4 text-slate-700">{stat}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2">
                {screen.bullets.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle className="text-emerald-500" size={16} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 border-t border-white/10 bg-black/20 px-4 py-3 text-center text-[11px] text-white/55">
          {[
            ['מפה', MapPin],
            ['הזמנות', Calendar],
            ['ארנק', Wallet],
            ['פרופיל', Settings],
          ].map(([label, Icon]) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <Icon size={18} className={label === 'מפה' ? 'text-emerald-300' : ''} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StationCard({ station, index }) {
  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="flex items-start gap-3">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${station.gradient} text-white shadow-lg`}>
          <Zap size={25} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-black text-slate-950">{station.name}</h3>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{station.status}</span>
          </div>
          <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
            <MapPin size={15} />
            {station.area} · {station.distance}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
        <div className="rounded-2xl bg-slate-50 p-2">
          <p className="font-black text-slate-950">{station.power}</p>
          <p className="text-slate-500">הספק</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-2">
          <p className="font-black text-slate-950">{station.plugs}</p>
          <p className="text-slate-500">שקע</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-2">
          <p className="font-black text-slate-950">{station.price}</p>
          <p className="text-slate-500">מחיר</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-2">
          <p className="flex items-center justify-center gap-1 font-black text-slate-950">
            <Star className="fill-amber-400 text-amber-400" size={14} />
            {station.rating}
          </p>
          <p className="text-slate-500">דירוג</p>
        </div>
      </div>

      <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white transition hover:bg-emerald-600">
        הזמן עמדה
        <ChevronLeft size={18} />
      </button>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>#{index + 1} בתוצאות לפי התאמה</span>
        <span>ביטול חינם עד שעה לפני</span>
      </div>
    </article>
  );
}

function SectionTitle({ eyebrow, title, text }) {
  return (
    <div className="mx-auto mb-8 max-w-3xl text-center">
      <p className="mb-3 text-sm font-black uppercase tracking-[0.25em] text-emerald-500">{eyebrow}</p>
      <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">{title}</h2>
      <p className="mt-4 text-base leading-8 text-slate-600 md:text-lg">{text}</p>
    </div>
  );
}

export default function ShareChargePage() {
  const [selectedRole, setSelectedRole] = useState('driver');
  const [menuOpen, setMenuOpen] = useState(false);

  const currentDate = useMemo(
    () => new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()),
    []
  );

  return (
    <div dir="rtl" className="min-h-screen overflow-x-hidden bg-[#f5f8f7] text-slate-950">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/40 bg-white/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <a href="#top" className="flex items-center gap-3" aria-label="ShareCharge">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-emerald-300 shadow-lg shadow-emerald-900/20">
              <Zap size={24} />
            </div>
            <div>
              <p className="text-lg font-black leading-none">ShareCharge</p>
              <p className="text-xs font-bold text-slate-500">טעינה שיתופית חכמה</p>
            </div>
          </a>

          <nav className="hidden items-center gap-7 text-sm font-bold text-slate-600 md:flex">
            <a href="#app" className="hover:text-emerald-600">האפליקציה</a>
            <a href="#flow" className="hover:text-emerald-600">איך זה עובד</a>
            <a href="#hosts" className="hover:text-emerald-600">לספקים</a>
            <a href="#security" className="hover:text-emerald-600">אבטחה</a>
            <a href="#investors" className="hover:text-emerald-600">למשקיעים</a>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <a href="/app/host" className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:border-emerald-300">
              אפליקציית ספק
            </a>
            <a href="/app/driver" className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-950/15 hover:bg-emerald-600">
              פתח אפליקציה
            </a>
          </div>

          <button
            onClick={() => setMenuOpen((value) => !value)}
            className="rounded-2xl border border-slate-200 bg-white p-3 md:hidden"
            aria-label="פתיחת תפריט"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-slate-100 bg-white px-4 py-4 md:hidden">
            {['האפליקציה', 'איך זה עובד', 'לספקים', 'אבטחה', 'למשקיעים'].map((item, index) => (
              <a
                key={item}
                href={['#app', '#flow', '#hosts', '#security', '#investors'][index]}
                onClick={() => setMenuOpen(false)}
                className="block rounded-2xl px-4 py-3 font-bold text-slate-700 hover:bg-slate-50"
              >
                {item}
              </a>
            ))}
          </div>
        )}
      </header>

      <main id="top" className="pt-20">
        <section className="relative overflow-hidden px-4 py-10 md:px-6 md:py-20">
          <div className="absolute left-[-10rem] top-20 h-80 w-80 rounded-full bg-emerald-300/30 blur-3xl" />
          <div className="absolute right-[-8rem] top-44 h-96 w-96 rounded-full bg-cyan-300/30 blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
            <div className="text-center lg:text-right">
              <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-4 py-2 text-sm font-bold text-emerald-700 shadow-sm lg:mx-0">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,.15)]" />
                דמו משקיעים · מעודכן ל-{currentDate}
              </div>

              <h1 className="text-4xl font-black leading-tight tracking-tight text-slate-950 md:text-6xl lg:text-7xl">
                הופכים כל חניה פרטית
                <span className="block bg-gradient-to-l from-emerald-500 via-cyan-500 to-blue-600 bg-clip-text text-transparent">
                  לעמדת טעינה זמינה
                </span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-lg leading-9 text-slate-600 lg:mx-0">
                ShareCharge מחברת בין נהגים שצריכים טעינה לבין בעלי עמדות פרטיות שרוצים לייצר הכנסה. Booking, OTP, תשלום מפוצל, ארנק, KYC ואבטחה - הכל בחוויה מובייל-פירסט פשוטה ומדויקת.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <a href="/app/driver" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-7 py-4 font-black text-white shadow-xl shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-emerald-600">
                  לפתוח את אפליקציית הנהג
                  <ArrowLeft size={20} />
                </a>
                <a href="#investors" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-7 py-4 font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300">
                  מודל עסקי למשקיע
                  <BarChart3 size={20} />
                </a>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-3">
                {[
                  ['GPS', 'איתור קרוב'],
                  ['OTP', 'אימות בשטח'],
                  ['Split', 'חלוקת תשלום'],
                ].map(([value, label]) => (
                  <div key={value} className="rounded-3xl border border-white bg-white/75 p-4 text-center shadow-sm backdrop-blur">
                    <p className="text-2xl font-black text-slate-950">{value}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div id="app" className="relative">
              <div className="absolute inset-x-10 top-8 h-72 rounded-full bg-emerald-400/20 blur-3xl" />
              <AppShellMockup selectedRole={selectedRole} onRoleChange={setSelectedRole} />
            </div>
          </div>
        </section>

        <section id="booking" className="px-4 py-12 md:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.25em] text-emerald-500">Discovery</p>
                <h2 className="mt-2 text-3xl font-black md:text-5xl">עמדות זמינות לידך</h2>
                <p className="mt-3 max-w-2xl leading-8 text-slate-600">
                  תצוגה שמדגימה את המפה והרשימה מהאפיון: מרחק, מחיר, הספק, סוג שקע, זמינות ודירוג.
                </p>
              </div>
              <div className="flex gap-2 overflow-x-auto">
                {['Type 2', 'CCS', 'עד 2 ק"מ', '22kW+', 'דירוג 4.7+'].map((filter) => (
                  <button key={filter} className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm">
                    <Filter className="ml-1 inline" size={14} />
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {stations.map((station, index) => (
                <StationCard key={station.name} station={station} index={index} />
              ))}
            </div>
          </div>
        </section>

        <section id="flow" className="px-4 py-16 md:px-6">
          <div className="mx-auto max-w-7xl rounded-[2.5rem] bg-slate-950 px-5 py-10 text-white shadow-2xl shadow-slate-950/20 md:px-10">
            <SectionTitle
              eyebrow="Flow"
              title="תהליך קצר, שקוף ובטוח"
              text="מהחיפוש ועד התשלום: כל שלב נבנה כדי למנוע אי-הבנות בין הנהג לספק וליצור אמון מול המשקיע."
            />

            <div className="grid gap-4 md:grid-cols-4">
              {flowSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="relative rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
                    <div className="mb-5 flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950">
                        <Icon size={23} />
                      </div>
                      <span className="text-5xl font-black text-white/10">0{index + 1}</span>
                    </div>
                    <h3 className="text-xl font-black">{step.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-white/65">{step.text}</p>
                  </div>
                );
              })}
            </div>

            <div id="demo" className="mt-8 grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
              <div className="rounded-3xl bg-white p-5 text-slate-950">
                <p className="text-sm font-black text-emerald-600">Handshake חי</p>
                <h3 className="mt-2 text-2xl font-black">OTP שמונע טעינה לא מורשית</h3>
                <div className="my-5 rounded-3xl bg-slate-950 p-5 text-center text-white">
                  <p className="text-sm text-white/60">קוד חד-פעמי לנהג</p>
                  <p className="mt-2 font-mono text-5xl font-black tracking-[0.28em] text-emerald-300">4829</p>
                  <p className="mt-3 text-xs text-white/50">תקף ל-04:58 דקות</p>
                </div>
                <div className="space-y-3 text-sm text-slate-600">
                  <p className="flex items-center gap-2"><CheckCircle className="text-emerald-500" size={18} /> ספק מאשר את הקוד באפליקציה.</p>
                  <p className="flex items-center gap-2"><CheckCircle className="text-emerald-500" size={18} /> נהג מאשר תחילת טעינה.</p>
                  <p className="flex items-center gap-2"><CheckCircle className="text-emerald-500" size={18} /> החיוב מתחיל רק אחרי אישור דו-צדדי.</p>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                <p className="text-sm font-black text-emerald-300">Live charging</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  {[
                    ['18.4kWh', 'אנרגיה נטענת', Gauge],
                    ['₪24.84', 'עלות נוכחית', CreditCard],
                    ['42 דק׳', 'זמן שימוש', Clock],
                  ].map(([value, label, Icon]) => (
                    <div key={label} className="rounded-3xl bg-black/20 p-5">
                      <Icon className="text-emerald-300" size={24} />
                      <p className="mt-4 text-3xl font-black">{value}</p>
                      <p className="mt-1 text-sm text-white/55">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 h-4 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[72%] rounded-full bg-gradient-to-l from-emerald-300 to-cyan-300" />
                </div>
                <div className="mt-5 rounded-3xl bg-black/20 p-5">
                  <div className="flex items-center justify-between text-sm text-white/60">
                    <span>חלוקת תשלום</span>
                    <span>Split Payment</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white/10 p-4">
                      <p className="text-2xl font-black">₪21.73</p>
                      <p className="text-xs text-white/55">לספק העמדה</p>
                    </div>
                    <div className="rounded-2xl bg-emerald-400 p-4 text-slate-950">
                      <p className="text-2xl font-black">₪3.11</p>
                      <p className="text-xs font-bold text-slate-700">עמלת מיזם</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="hosts" className="px-4 py-16 md:px-6">
          <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-2">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-emerald-500">Host App</p>
              <h2 className="mt-3 text-3xl font-black md:text-5xl">בעלי עמדות מקבלים כלי ניהול אמיתי</h2>
              <p className="mt-4 text-lg leading-9 text-slate-600">
                הספק מגדיר עמדה, מחירון, זמינות ותמונות, מקבל בקשות בזמן אמת, מבצע OTP ומנהל הכנסות מהארנק.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  ['ניהול זמינות', 'לוחות זמן לפי יום ושעה', Calendar],
                  ['התראות חכמות', 'אישור או דחייה עם סיבה', Bell],
                  ['שיחה מוצפנת', 'VoIP בלי חשיפת מספרים', PhoneCall],
                  ['משיכות מאובטחות', '2FA לפני העברה לבנק', Lock],
                ].map(([title, text, Icon]) => (
                  <div key={title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <Icon className="text-emerald-500" size={24} />
                    <h3 className="mt-4 font-black">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] bg-white p-5 shadow-2xl shadow-emerald-900/10">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-emerald-600">ארנק ספק</p>
                  <h3 className="text-2xl font-black">דשבורד הכנסות</h3>
                </div>
                <div className="rounded-2xl bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">פעיל</div>
              </div>
              <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-emerald-950 p-6 text-white">
                <p className="text-sm text-white/60">יתרה זמינה למשיכה</p>
                <p className="mt-2 text-5xl font-black">₪4,280</p>
                <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                  {['יומי', 'שבועי', 'חודשי'].map((period, index) => (
                    <div key={period} className="rounded-2xl bg-white/10 p-3">
                      <p className="text-xl font-black">₪{[420, 1380, 5840][index].toLocaleString('he-IL')}</p>
                      <p className="text-xs text-white/55">{period}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {[
                  ['הזמנה מאושרת', 'דני · היום 19:30 · ₪38 צפוי'],
                  ['טעינה הסתיימה', 'נועה · 18.4kWh · חשבונית נשלחה'],
                  ['משיכה בבדיקה', 'אימות דו-שלבי הושלם'],
                ].map(([title, text]) => (
                  <div key={title} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                    <div className="h-3 w-3 rounded-full bg-emerald-500" />
                    <div>
                      <p className="font-black">{title}</p>
                      <p className="text-sm text-slate-500">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="security" className="px-4 py-16 md:px-6">
          <div className="mx-auto max-w-7xl">
            <SectionTitle
              eyebrow="Trust & Compliance"
              title="בנוי לאמון, לא רק ליופי"
              text="האפיון מדגיש אבטחה וציות. הדמו מציג אותם כשכבת מוצר ברורה: תשלום, פרטיות, OCPP וניהול הרשאות."
            />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[
                ['TLS 1.3 + AES-256', 'הצפנת תעבורה ונתונים רגישים.', Shield],
                ['PCI DSS', 'פרטי אשראי עוברים לספק סליקה ולא נשמרים במערכת.', CreditCard],
                ['OCPP 1.6/2.0.1', 'בסיס לאינטגרציה עם מטענים חכמים.', Zap],
                ['KYC + Audit', 'אימות משתמשים ותיעוד מלא לפעולות רגישות.', UserCheck],
              ].map(([title, text, Icon]) => (
                <div key={title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 p-3 text-emerald-300">
                    <Icon size={24} />
                  </div>
                  <h3 className="mt-5 text-xl font-black">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="investors" className="px-4 py-16 md:px-6">
          <div className="mx-auto max-w-7xl rounded-[2.5rem] bg-white p-5 shadow-2xl shadow-slate-200/80 md:p-10">
            <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr]">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.25em] text-emerald-500">Investor Story</p>
                <h2 className="mt-3 text-3xl font-black md:text-5xl">הזדמנות תשתית בלי לבנות תשתית</h2>
                <p className="mt-5 text-lg leading-9 text-slate-600">
                  במקום להקים עמדות מאפס, ShareCharge מנצלת עמדות פרטיות קיימות ומכניסה אותן לשוק מסודר עם אמון, סליקה, זמינות ואחריות תפעולית.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <a href="#top" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-4 font-black text-white hover:bg-emerald-600">
                    חזרה למצגת
                    <ArrowLeft size={19} />
                  </a>
                  <a href="mailto:invest@sharecharge.app" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-6 py-4 font-black text-slate-800 hover:border-emerald-300">
                    יצירת קשר
                    <PhoneCall size={19} />
                  </a>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {investorMetrics.map((metric) => (
                  <div key={metric.label} className="rounded-3xl bg-slate-50 p-6">
                    <p className="text-4xl font-black text-slate-950">{metric.value}</p>
                    <p className="mt-3 leading-7 text-slate-600">{metric.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {[
                ['בעיה ברורה', 'נהגים לא תמיד מוצאים טעינה זמינה, ובעלי עמדות פרטיות מחזיקים נכס לא מנוצל.'],
                ['פתרון מדיד', 'כל הזמנה כוללת זמן, מחיר, OTP, חיוב, חשבונית ומשוב - תהליך שניתן לאופטימיזציה.'],
                ['מודל צמיחה', 'עמלה מכל עסקה, שירותים לספקים, הרחבה ל-OCPP ושותפויות נדל"ן/חניונים.'],
              ].map(([title, text]) => (
                <div key={title} className="rounded-3xl border border-slate-200 p-6">
                  <h3 className="text-xl font-black">{title}</h3>
                  <p className="mt-3 leading-7 text-slate-600">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="px-4 py-10 md:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 text-center text-sm text-slate-500 md:flex-row">
          <p>© {new Date().getFullYear()} ShareCharge. דמו מוצר למשקיעים.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><Navigation size={15} /> מובייל-פירסט</span>
            <span className="flex items-center gap-1"><Shield size={15} /> מאובטח</span>
            <span className="flex items-center gap-1"><Zap size={15} /> EV ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
