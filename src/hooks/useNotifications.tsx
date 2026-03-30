import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

export type AppNotification = {
  id: string
  type: 'order' | 'topup'
  message: string
  status: string
  read: boolean
  timestamp: Date
}

export function useNotifications() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const QUERY_KEY = ['notifications', user?.id]

  // ── Load persisted notifications from DB ──────────────────────────────────
  const { data: notifications = [] } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data ?? []).map((n) => ({
        id: n.id,
        type: n.type as 'order' | 'topup',
        message: n.message,
        status: n.status,
        read: n.read,
        timestamp: new Date(n.created_at),
      })) as AppNotification[]
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  })

  // ── Mark all as read ──────────────────────────────────────────────────────
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  // ── Clear all ─────────────────────────────────────────────────────────────
  const clearAllMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })

  // ── Realtime: new notification rows → toast + refresh query ──────────────
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Show toast for the new notification
          toast.info(payload.new.message as string, { duration: 4000 })
          // Refresh the query so the bell count updates immediately
          void queryClient.invalidateQueries({ queryKey: ['notifications', user.id] })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [user?.id, queryClient])

  const unreadCount = notifications.filter((n) => !n.read).length

  return {
    notifications,
    unreadCount,
    markAllRead: () => void markAllReadMutation.mutateAsync(),
    clearAll: () => void clearAllMutation.mutateAsync(),
  }
}
