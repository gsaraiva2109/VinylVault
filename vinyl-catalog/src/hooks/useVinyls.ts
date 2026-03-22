import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type Vinyl } from '../api/client'

export function useVinyls() {
  return useQuery({
    queryKey: ['vinyls'],
    queryFn: api.vinyls.list,
    staleTime: 1000 * 60,
    // Serve cached data when offline
    placeholderData: (prev) => prev
  })
}

export function useCreateVinyl() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.vinyls.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vinyls'] })
  })
}

export function useUpdateVinyl() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Vinyl> }) =>
      api.vinyls.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vinyls'] })
  })
}

export function useDeleteVinyl() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.vinyls.delete,
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ['vinyls'] })
      const prev = queryClient.getQueryData<Vinyl[]>(['vinyls'])
      queryClient.setQueryData<Vinyl[]>(
        ['vinyls'],
        (old) => old?.filter((v) => v.id !== id) ?? []
      )
      return { prev }
    },
    onError: (_err, _id, context) => {
      if (context?.prev) queryClient.setQueryData(['vinyls'], context.prev)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['vinyls'] })
  })
}
