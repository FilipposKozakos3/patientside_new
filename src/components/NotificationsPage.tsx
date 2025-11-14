import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  ArrowLeft, 
  Bell, 
  FileText, 
  Shield, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Share2,
  UserPlus
} from 'lucide-react';

interface NotificationsPageProps {
  onBack: () => void;
}

interface Notification {
  id: string;
  type: 'record' | 'consent' | 'access' | 'share' | 'provider';
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
}

export function NotificationsPage({ onBack }: NotificationsPageProps) {
  // Mock notifications data
  const notifications: Notification[] = [
    {
      id: '1',
      type: 'record',
      title: 'New health record uploaded',
      description: 'Blood test results from Quest Diagnostics have been added to your records',
      timestamp: '2 hours ago',
      isRead: false,
      priority: 'medium'
    },
    {
      id: '2',
      type: 'consent',
      title: 'Consent request approved',
      description: 'Dr. Sarah Johnson has been granted access to your medical records',
      timestamp: '5 hours ago',
      isRead: false,
      priority: 'high'
    },
    {
      id: '3',
      type: 'access',
      title: 'Provider access expires soon',
      description: 'Dr. Michael Chen\'s access to your records will expire in 7 days',
      timestamp: '1 day ago',
      isRead: true,
      priority: 'medium'
    },
    {
      id: '4',
      type: 'share',
      title: 'Health summary exported',
      description: 'You successfully exported your health summary with QR code',
      timestamp: '2 days ago',
      isRead: true,
      priority: 'low'
    },
    {
      id: '5',
      type: 'provider',
      title: 'New provider added',
      description: 'City Hospital has been added to your trusted providers list',
      timestamp: '3 days ago',
      isRead: true,
      priority: 'low'
    },
    {
      id: '6',
      type: 'record',
      title: 'Prescription uploaded',
      description: 'New prescription for Lisinopril 10mg has been added',
      timestamp: '4 days ago',
      isRead: true,
      priority: 'medium'
    },
    {
      id: '7',
      type: 'consent',
      title: 'Access request pending',
      description: 'Dr. Emily Williams has requested access to your health records',
      timestamp: '5 days ago',
      isRead: true,
      priority: 'high'
    },
    {
      id: '8',
      type: 'access',
      title: 'Record viewed',
      description: 'Dr. Sarah Johnson viewed your lab results',
      timestamp: '1 week ago',
      isRead: true,
      priority: 'low'
    }
  ];

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'record':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'consent':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'access':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'share':
        return <Share2 className="w-5 h-5 text-purple-600" />;
      case 'provider':
        return <UserPlus className="w-5 h-5 text-indigo-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>

      <Card className="bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-6 h-6 text-gray-700" />
              <div>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                  Stay updated with your health records and provider activities
                </CardDescription>
              </div>
            </div>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-auto">
                {unreadCount} new
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notifications.map((notification, index) => (
              <div key={notification.id}>
                <div className={`flex gap-4 p-4 rounded-lg transition-colors ${
                  notification.isRead ? 'bg-white hover:bg-gray-50' : 'bg-blue-50 hover:bg-blue-100'
                }`}>
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className={`text-sm ${notification.isRead ? 'text-gray-900' : 'text-gray-900'}`}>
                        {notification.title}
                      </p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className={`text-xs ${getPriorityColor(notification.priority)}`}>
                          {notification.priority}
                        </Badge>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{notification.description}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{notification.timestamp}</span>
                    </div>
                  </div>
                </div>
                {index < notifications.length - 1 && <Separator className="my-2" />}
              </div>
            ))}
          </div>

          {notifications.length === 0 && (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No notifications yet</p>
              <p className="text-sm text-gray-500 mt-2">
                You'll see updates about your health records and provider activities here
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
