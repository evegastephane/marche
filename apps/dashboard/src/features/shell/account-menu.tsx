import { useClerk, useUser } from '@clerk/react';
import { LogOut, UserRound } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { Avatar } from '@/shared/ui/avatar';
import { Menu, MenuHeader, MenuItem, MenuSeparator } from '@/shared/ui/menu';

/**
 * Menu du compte (remplace le UserButton de Clerk) : identité en tête, gestion du compte
 * (fenêtre Clerk habillée au thème : profil, e-mails, sécurité), déconnexion.
 */
export function AccountMenu({
  showName = false,
  side = 'bottom',
  align = 'end',
}: {
  showName?: boolean;
  side?: 'top' | 'bottom';
  align?: 'start' | 'end';
}) {
  const clerk = useClerk();
  const { user } = useUser();
  const [leaving, setLeaving] = useState(false);
  if (!user) return <span className="size-9 shrink-0" aria-hidden />;

  const name = user.fullName || user.username || user.primaryEmailAddress?.emailAddress || 'Mon compte';
  const email = user.primaryEmailAddress?.emailAddress;
  const photo = user.hasImage ? user.imageUrl : null;

  return (
    <Menu
      label="Compte"
      side={side}
      align={align}
      trigger={
        <button
          type="button"
          aria-label={showName ? undefined : `Compte de ${name}`}
          className={cn(
            'group flex min-w-0 items-center gap-2.5 rounded-[0.7rem] text-left transition-colors duration-200 hover:bg-surface-2 data-[state=open]:bg-surface-2',
            showName ? 'h-12 w-full px-2' : 'size-10 justify-center',
          )}
        >
          <Avatar name={name} src={photo} className={showName ? undefined : 'size-8'} />
          {showName && (
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-[0.875rem] font-[600] text-ink">{name}</span>
              {email && <span className="truncate text-[0.75rem] text-ink-3">{email}</span>}
            </span>
          )}
        </button>
      }
    >
      <MenuHeader>
        <Avatar name={name} src={photo} className="size-10" />
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate font-[600] text-ink">{name}</span>
          {email && <span className="truncate text-[0.8125rem] text-ink-3">{email}</span>}
        </span>
      </MenuHeader>
      <MenuSeparator />
      <MenuItem icon={UserRound} hint="Profil, e-mails, sécurité" onSelect={() => clerk.openUserProfile()}>
        Gérer mon compte
      </MenuItem>
      <MenuItem
        icon={LogOut}
        danger
        loading={leaving}
        onSelect={() => {
          setLeaving(true);
          void clerk.signOut({ redirectUrl: '/sign-in' });
        }}
      >
        Se déconnecter
      </MenuItem>
    </Menu>
  );
}
