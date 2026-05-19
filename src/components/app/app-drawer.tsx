'use client'

import {
  DrawerBackdrop,
  DrawerBody,
  DrawerCloseTrigger,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerRoot,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/chakra-drawer'
import { useModifyQuery } from '@/hooks/use-modify-query'
import { useQuery } from '@/hooks/use-query'
import { APP_DEFAULT_PAGE } from '@/lib/routes'
import { Button, DrawerBodyProps } from '@chakra-ui/react'
import { useParams, usePathname } from 'next/navigation'
import AppDialog from './app-dialog'
import { useState } from 'react'

interface IAppDrawer extends DrawerBodyProps {
  trigger?: React.ReactNode
  title?: string
  body?: React.ReactNode
  size: 'sm' | 'md' | 'lg' | 'xl' | 'xs' | 'full' | undefined
  placement?: 'bottom' | 'top' | 'start' | 'end' | undefined
  rounded?: string
  onSubmit?: (e?: React.BaseSyntheticEvent) => Promise<void>
  open?: boolean
  setOpen?: (value: boolean) => void
  redirectUri?: string
  hasFooter?: boolean
  submitLabel?: string
  cancelQueryKey: string // still used for drawer visibility (e.g. APP_MISC_FEES_DIALOG)
  onDiscardChange?: () => void
}

const DISCARD_DIALOG_KEY = 'discard'

function AppDrawer({
  trigger,
  title,
  body,
  size = 'sm',
  children,
  placement,
  rounded,
  onSubmit,
  open,
  redirectUri,
  hasFooter,
  submitLabel = 'Save Changes',
  cancelQueryKey, // key to control drawer visibility (e.g. APP_MISC_FEES_DIALOG)
  onDiscardChange,
  ...rest
}: IAppDrawer) {
  const { user_id } = useParams()
  const pathName = usePathname()

  // Drawer visibility state from the main query param
  const { router, searchParams } = useQuery(cancelQueryKey, 'true')

  // Discard dialog visibility via a separate query param
  const discardQuery = useQuery(DISCARD_DIALOG_KEY, 'true')
  const cancelDialogUrl = useModifyQuery(null, searchParams, [{ key: DISCARD_DIALOG_KEY, value: 'true' }], 'set')
  const cancelRedirectUrl = useModifyQuery(null, searchParams, [{ key: DISCARD_DIALOG_KEY }])

  const handleClose = (e?: { open: boolean }) => {
    if (!e || !e.open) {
      router.push(redirectUri ?? APP_DEFAULT_PAGE())
    }
  }

  const discardChange = () => {
    router.push(pathName.split('?')[0])
  }

  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <DrawerRoot open={open} onOpenChange={handleClose} key={size} size={size} placement={placement}>
      <DrawerBackdrop />
      {trigger && (
        <DrawerTrigger asChild>
          {trigger ?? <Button>Open</Button>}
        </DrawerTrigger>
      )}
      <DrawerContent offset={rounded && '4'} rounded={rounded && 'md'}>
        {title && (
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>
        )}
        <DrawerBody {...rest}>
          {body ?? children}
        </DrawerBody>

        {hasFooter && (
          <DrawerFooter>
            <Button onClick={() => router.push(cancelDialogUrl)} variant="outline" disabled={isSubmitting}>
              Cancel
            </Button>

            <AppDialog
              title="Are you sure you want to leave the page?"
              body="You can save your changes, discard your changes, or cancel to continue editing."
              onSubmit={onSubmit}
              open={discardQuery.open}
              isDiscardChange
              onDiscardChange={() => onDiscardChange ? onDiscardChange() : discardChange()}
              placement="center"
              redirectUri={cancelRedirectUrl}
              asCancel={false}
              cancelQueries={[]}
            />

            <Button
              type="submit"
              bg="fg.success"
              color="fg.inverted"
              loading={isSubmitting}
              onClick={(e) => {
                if (onSubmit) {
                  setIsSubmitting(true)
                  onSubmit(e)
                    .then(() => {
                      if (onDiscardChange) onDiscardChange()
                    })
                    .finally(() => {
                      setIsSubmitting(false)
                    })
                }
              }}
            >
              {submitLabel}
            </Button>
          </DrawerFooter>
        )}

        <DrawerCloseTrigger />
      </DrawerContent>
    </DrawerRoot>
  )
}

export default AppDrawer
