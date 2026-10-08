import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export const PrivateAvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ src, ...props }, ref) => {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['private-photo', user?.id, src],
    queryFn: () => api<Blob>(src!.slice('/api/v1'.length), { responseType: 'blob' }),
    enabled: !!user && !!src,
    staleTime: Infinity,
    retry: false,
  });
  const [url, setUrl] = React.useState<string>();
  React.useEffect(() => {
    if (!query.data) {
      setUrl(undefined);
      return;
    }
    const next = URL.createObjectURL(query.data);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [query.data]);
  return <AvatarPrimitive.Image {...props} ref={ref} src={url} />;
});
PrivateAvatarImage.displayName = 'PrivateAvatarImage';
