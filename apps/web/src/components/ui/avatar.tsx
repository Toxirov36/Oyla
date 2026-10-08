import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';
import { PrivateAvatarImage } from './private-avatar-image';

export type AvatarSize = 'xs' | 'sm' | 'default' | 'md' | 'lg' | 'xl' | '2xl';
export type AvatarShape = 'circle' | 'square';

export interface AvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  size?: AvatarSize;
  shape?: AvatarShape;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-xs',
  default: 'size-10 text-sm',
  md: 'size-10 text-sm',
  lg: 'size-11 text-base',
  xl: 'size-14 text-xl',
  '2xl': 'size-20 text-2xl',
};

export const Avatar = React.forwardRef<React.ElementRef<typeof AvatarPrimitive.Root>, AvatarProps>(
  ({ className, size = 'default', shape = 'circle', ...props }, ref) => {
    return (
      <AvatarPrimitive.Root
        ref={ref}
        data-slot="avatar"
        data-size={size}
        className={cn(
          'group/avatar relative inline-flex shrink-0 select-none overflow-hidden transition-all duration-200',
          shape === 'circle' ? 'rounded-full' : 'rounded-2xl',
          sizeClasses[size] || sizeClasses.default,
          'ring-1 ring-black/5 dark:ring-white/10 shadow-xs',
          className,
        )}
        {...props}
      />
    );
  },
);
Avatar.displayName = AvatarPrimitive.Root.displayName;

export const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => {
  if (props.src?.startsWith('/api/v1/profile-photos/'))
    return (
      <PrivateAvatarImage
        {...props}
        ref={ref}
        data-slot="avatar-image"
        className={cn('aspect-square size-full object-cover', className)}
      />
    );
  return (
    <AvatarPrimitive.Image
      ref={ref}
      data-slot="avatar-image"
      className={cn('aspect-square size-full object-cover', className)}
      {...props}
    />
  );
});
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

export interface AvatarFallbackProps extends React.ComponentPropsWithoutRef<
  typeof AvatarPrimitive.Fallback
> {
  variant?: 'gradient' | 'subtle' | 'primary';
}

export const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  AvatarFallbackProps
>(({ className, variant = 'gradient', ...props }, ref) => {
  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      data-slot="avatar-fallback"
      className={cn(
        'flex size-full items-center justify-center font-bold select-none transition-colors',
        variant === 'gradient' &&
          'bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 text-white shadow-inner',
        variant === 'subtle' && 'bg-[var(--blue-soft)] text-[var(--primary)] font-semibold',
        variant === 'primary' && 'bg-[var(--primary)] text-white font-semibold',
        className,
      )}
      {...props}
    />
  );
});
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export interface AvatarBadgeProps extends React.ComponentPropsWithoutRef<'span'> {
  status?: 'online' | 'offline' | 'busy' | 'away';
  pulse?: boolean;
}

export const AvatarBadge = React.forwardRef<HTMLSpanElement, AvatarBadgeProps>(
  ({ className, status = 'online', pulse = false, ...props }, ref) => {
    const statusBg = {
      online: 'bg-emerald-500',
      offline: 'bg-slate-400',
      busy: 'bg-rose-500',
      away: 'bg-amber-500',
    }[status];

    return (
      <span
        ref={ref}
        data-slot="avatar-badge"
        className={cn(
          'absolute bottom-0 right-0 z-10 block rounded-full ring-2 ring-white dark:ring-slate-900 pointer-events-none',
          'size-2.5',
          statusBg,
          className,
        )}
        {...props}
      >
        {pulse && status === 'online' && (
          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
        )}
      </span>
    );
  },
);
AvatarBadge.displayName = 'AvatarBadge';
