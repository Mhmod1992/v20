import React from 'react';
import { useAppContext } from '../context/AppContext';
import Notification from './Notification';

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useAppContext();

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3 w-full max-w-md px-4">
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          notification={notification}
          onDismiss={removeNotification}
        />
      ))}
    </div>
  );
};

export default NotificationContainer;