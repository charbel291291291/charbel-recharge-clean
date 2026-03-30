import { useState } from 'react'
import { Bell, Package, Wallet, X, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import StatusBadge from '@/components/StatusBadge'
import type { AppNotification } from '@/hooks/useNotifications'
import { useLanguage } from '@/i18n/LanguageContext'

interface Props {
  notifications: AppNotification[]
  unreadCount: number
  onMarkAllRead: () => void
  onClear: () => void
}

export default function NotificationBell({ notifications, unreadCount, onMarkAllRead, onClear }: Props) {
  const [open, setOpen] = useState(false)
  const { t } = useLanguage()

  const handleOpen = () => {
    if (open) {
      setOpen(false)
      return
    }
    setOpen(true)
    if (unreadCount > 0) onMarkAllRead()
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Notifications"
        className="relative flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground transition-colors hover:bg-accent"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full ring-2 ring-background" />
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="absolute end-0 top-full mt-2 w-80 glass rounded-xl border border-border/60 shadow-2xl dark:shadow-black/50 z-50 overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <p className="text-sm font-semibold">{t('notifications')}</p>
              <div className="flex items-center gap-1">
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { onClear(); setOpen(false) }}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                    title="Clear all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Notification list */}
            <div className="max-h-96 overflow-y-auto divide-y divide-border/40">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
                  <Bell className="w-8 h-8 opacity-30" />
                  <p className="text-sm">{t('noNotifications')}</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`flex gap-3 p-3.5 transition-colors ${!n.read ? 'bg-primary/5' : ''}`}
                  >
                    {/* Icon */}
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                      {n.type === 'order' ? (
                        <Package className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <Wallet className="w-3.5 h-3.5 text-primary" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">{n.message}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <StatusBadge status={n.status} />
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatDistanceToNow(n.timestamp, { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
