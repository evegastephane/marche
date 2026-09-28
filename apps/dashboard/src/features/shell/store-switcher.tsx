import { useClerk, useOrganization, useOrganizationList } from '@clerk/react';
import { useNavigate } from '@tanstack/react-router';
import { Check, ChevronsUpDown, LoaderCircle, Plus, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/shared/lib/cn';
import { Avatar } from '@/shared/ui/avatar';
import { Menu, MenuItem, MenuLabel, MenuSeparator } from '@/shared/ui/menu';

const ROLES: Record<string, string> = {
  'org:admin': 'Administrateur',
  'org:member': 'Membre',
};

/**
 * Sélecteur de boutique (remplace l'OrganizationSwitcher de Clerk) : une ligne à plat,
 * dans la famille des touches de navigation ; le panneau sort d'elle, à sa largeur.
 * La boutique active est cochée ; en choisir une autre bascule l'organisation Clerk et revient à l'accueil.
 * « Gérer la boutique » ouvre la fenêtre de Clerk habillée au thème.
 */
export function StoreSwitcher({ compact = false }: { compact?: boolean }) {
  const clerk = useClerk();
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const { isLoaded, setActive, userMemberships } = useOrganizationList({
    userMemberships: { infinite: true, pageSize: 20 },
  });
  const [switching, setSwitching] = useState<string | null>(null);

  const name = organization?.name ?? 'Boutique';
  const activeImage = organization?.hasImage ? organization.imageUrl : null;
  const memberships = userMemberships.data ?? [];

  const choose = async (id: string) => {
    if (!setActive || id === organization?.id) return;
    setSwitching(id);
    try {
      await setActive({ organization: id });
      await navigate({ to: '/' });
    } catch {
      toast.error('Impossible de changer de boutique. Réessayez.');
    } finally {
      setSwitching(null);
    }
  };

  return (
    <Menu
      label="Boutiques"
      side="bottom"
      align="start"
      matchTriggerWidth={!compact}
      trigger={
        <button
          type="button"
          aria-label={`Boutique : ${name}. Changer de boutique`}
          className={cn(
            'group flex h-11 min-w-0 items-center gap-2.5 rounded-[0.7rem] px-2 text-left text-ink transition-colors duration-200 hover:bg-surface-2 data-[state=open]:bg-surface-2',
            compact ? 'max-w-full' : 'w-full',
          )}
        >
          <Avatar name={name} src={activeImage} shape="square" className="size-7 text-[0.6875rem]" />
          <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-[600]">{name}</span>
          <ChevronsUpDown
            className="size-4 shrink-0 text-ink-3 transition-colors group-hover:text-ink"
            strokeWidth={1.8}
            aria-hidden
          />
        </button>
      }
    >
      <MenuLabel>Vos boutiques</MenuLabel>
      {!isLoaded && <p className="px-2.5 py-2 text-[0.8125rem] text-ink-3">Chargement…</p>}
      {memberships.map((membership) => {
        const org = membership.organization;
        const active = org.id === organization?.id;
        // La boutique active prend l'image à jour (celle du bouton) : le bouton et la liste disent la même chose.
        const image = active ? activeImage : org.hasImage ? org.imageUrl : null;
        return (
          <MenuItem
            key={org.id}
            leading={<Avatar name={org.name} src={image} shape="square" className="relative size-7 text-[0.6875rem]" />}
            hint={ROLES[membership.role] ?? membership.roleName}
            disabled={switching !== null}
            trailing={
              switching === org.id ? (
                <LoaderCircle className="size-4 animate-spin text-ink-3" aria-hidden />
              ) : active ? (
                <>
                  <Check className="size-4 text-ink" strokeWidth={2.2} aria-hidden />
                  <span className="sr-only">(boutique active)</span>
                </>
              ) : undefined
            }
            onSelect={() => void choose(org.id)}
          >
            {org.name}
          </MenuItem>
        );
      })}
      {userMemberships.hasNextPage && (
        <MenuItem icon={ChevronsUpDown} onSelect={() => userMemberships.fetchNext?.()}>
          Voir plus de boutiques
        </MenuItem>
      )}
      <MenuSeparator />
      {organization && (
        <MenuItem
          icon={Settings2}
          onSelect={() => clerk.openOrganizationProfile({ afterLeaveOrganizationUrl: '/onboarding' })}
        >
          Gérer la boutique
        </MenuItem>
      )}
      <MenuItem icon={Plus} onSelect={() => void navigate({ to: '/onboarding' })}>
        Ouvrir une nouvelle boutique
      </MenuItem>
    </Menu>
  );
}
