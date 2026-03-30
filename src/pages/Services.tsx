import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/hooks/useAuth'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageContext'
import ServiceCard from '@/components/ServiceCard'
import CreateOrder from '@/components/CreateOrder'
import { serviceIconFor } from '@/lib/serviceIcons'
import { formatUsd } from '@/lib/formatCurrency'
import { cn } from '@/lib/utils'

type View = 'services' | 'packages' | 'done'

export default function Services() {
  const { user, session } = useAuth()
  const { t, dir } = useLanguage()
  const [view, setView] = useState<View>('services')
  const [selectedService, setSelectedService] = useState<{ id: string; name: string; image_url: string | null } | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<{ id: string; name: string; price: number } | null>(null)

  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase.from('services').select('*').order('name')
      if (error) {
        console.error('Services query failed:', error)
        throw error
      }
      return data ?? []
    },
    enabled: !!session,
  })

  const { data: packages = [], isLoading: packagesLoading } = useQuery({
    queryKey: ['packages', selectedService?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('service_id', selectedService!.id)
        .order('price')
      if (error) {
        console.error('Packages query failed:', error)
        throw error
      }
      return data ?? []
    },
    enabled: !!session && !!selectedService,
  })

  const resetFlow = () => {
    setView('services')
    setSelectedService(null)
    setSelectedPackage(null)
  }

  if (view === 'done') {
    return (
      <div className="max-w-md mx-auto text-center py-16 animate-fade-in space-y-4">
        <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto shadow-lg dark:shadow-primary/25">
          <Check className="w-8 h-8 text-primary-foreground" />
        </div>
        <h2 className="text-2xl font-heading font-bold">{t('orderSubmitted')}</h2>
        <p className="text-muted-foreground">{t('orderReviewMsg')}</p>
        <Button onClick={resetFlow} className="mt-4 gradient-primary font-semibold">
          {t('newRecharge')}
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {view === 'packages' && selectedService && (
        <button
          type="button"
          onClick={() => {
            setView('services')
            setSelectedService(null)
            setSelectedPackage(null)
          }}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <BackIcon className="w-4 h-4" />
          {t('back')}
        </button>
      )}

      {view === 'services' && (
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">{t('selectService')}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t('packagesAvailable')}</p>
          </div>
          {servicesLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : services.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">{t('noServices')}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service: any, index: number) => (
                <ServiceCard
                  key={service.id}
                  title={service.name}
                  subtitle={t('packagesAvailable')}
                  icon={serviceIconFor(service.name, index)}
                  imageUrl={service.image_url}
                  onClick={() => {
                    setSelectedService({
                      id: service.id,
                      name: service.name,
                      image_url: service.image_url,
                    })
                    setView('packages')
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'packages' && selectedService && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            {selectedService.image_url ? (
              <img
                src={selectedService.image_url}
                alt=""
                className="w-11 h-11 rounded-lg object-cover ring-1 ring-border"
              />
            ) : (
              <div className="w-11 h-11 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground font-heading font-bold">
                {selectedService.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-heading font-bold">{selectedService.name}</h1>
              <p className="text-sm text-muted-foreground">{t('choosePackage')}</p>
            </div>
          </div>

          {packagesLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {packages.map((pkg: any) => (
                <Card
                  key={pkg.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedPackage({ id: pkg.id, name: pkg.name, price: pkg.price })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedPackage({ id: pkg.id, name: pkg.name, price: pkg.price })
                    }
                  }}
                  className={cn(
                    'glass cursor-pointer transition-all border-border/50',
                    'hover:border-primary/35 hover:glow hover:-translate-y-0.5',
                    'shadow-md dark:shadow-black/30',
                    selectedPackage?.id === pkg.id && 'border-primary ring-2 ring-primary/20 glow'
                  )}
                >
                  <CardContent className="p-5 flex items-center justify-between gap-3">
                    <p className="font-medium">{pkg.name}</p>
                    <p className="font-heading font-bold text-primary tabular-nums">{formatUsd(pkg.price)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {selectedPackage && user && (
            <CreateOrder
              serviceId={selectedService.id}
              packageId={selectedPackage.id}
              packageName={selectedPackage.name}
              packagePrice={selectedPackage.price}
              onSuccess={() => setView('done')}
            />
          )}
        </div>
      )}
    </div>
  )
}
