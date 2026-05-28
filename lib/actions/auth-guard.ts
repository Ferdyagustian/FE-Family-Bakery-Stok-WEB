import { getSession } from '@/lib/session'

export async function assertStoreAccess(storeId: string) {
  const session = await getSession()
  if (!session || !session.user) {
    throw new Error('UNAUTHORIZED')
  }

  const user = session.user
  if (user.role !== 'ADMIN' && user.storeId !== storeId) {
    throw new Error('FORBIDDEN')
  }

  return user
}
