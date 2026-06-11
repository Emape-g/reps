import { Link, useLocation } from 'react-router-dom'
import { Home, TrendingUp, User, Dumbbell } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/',         Icon: Home,        label: 'Inicio'   },
  { to: '/progress', Icon: TrendingUp,  label: 'Progreso' },
  { to: '/profile',  Icon: User,        label: 'Perfil'   },
] as const

const MOBILE_VISIBLE_ON = ['/', '/progress', '/profile']
const AUTH_PATHS = ['/login', '/register', '/onboarding']

export default function BottomNav() {
  const { pathname } = useLocation()

  const isAuth = AUTH_PATHS.includes(pathname)
  const showMobileBar = MOBILE_VISIBLE_ON.includes(pathname)

  if (isAuth) return null

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-52 z-20 bg-surface border-r border-border flex-col">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
          <Dumbbell className="w-5 h-5 text-primary shrink-0" />
          <span className="font-display font-bold text-lg text-text">Reps</span>
        </div>

        <div className="flex-1 py-4 px-3 space-y-1">
          {NAV_ITEMS.map(({ to, Icon, label }) => {
            const active = to === '/' ? pathname === '/' : pathname.startsWith(to)
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted hover:text-text hover:bg-surface-hi'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Mobile bottom nav */}
      {showMobileBar && (
        <nav
          className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-surface border-t border-border"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex h-16">
            {NAV_ITEMS.map(({ to, Icon, label }) => {
              const active = to === '/' ? pathname === '/' : pathname.startsWith(to)
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    active ? 'text-primary' : 'text-muted hover:text-text'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </>
  )
}
