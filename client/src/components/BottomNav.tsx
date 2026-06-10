import { Link, useLocation } from 'react-router-dom'
import { Home, TrendingUp, User } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/',         Icon: Home,        label: 'Inicio'   },
  { to: '/progress', Icon: TrendingUp,  label: 'Progreso' },
  { to: '/profile',  Icon: User,        label: 'Perfil'   },
] as const

const VISIBLE_ON = ['/', '/progress', '/profile']

export default function BottomNav() {
  const { pathname } = useLocation()

  if (!VISIBLE_ON.includes(pathname)) return null

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-20 bg-surface border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-lg mx-auto flex h-16">
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
  )
}
