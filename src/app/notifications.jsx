import React from 'react'
import { useRouter } from 'expo-router'
import Notification from '../components/Notification'
function NotificationPage() {
  const router = useRouter()

  return (
    <>
      <Notification
        onOpenRequest={(data) =>
          router.push({
            pathname: '/new-request',
            params: {
              requestId: data?.requestId ? String(data.requestId) : '',
              requestType: data?.requestType || '',
              serviceName: data?.serviceName || '',
            },
          })
        }
      />
    </>
  )
}

export default NotificationPage
