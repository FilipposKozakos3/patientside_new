import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { ArrowLeft, Bell, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { toast } from 'sonner@2.0.3';

interface Notification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
}

interface NotificationsPageProps {
  onBack: () => void;
  alerts: Notification[];
}

const DISMISSED_KEY = 'notificationsDismissedIds';

export function NotificationsPage({ onBack, alerts }: NotificationsPageProps) {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Load dismissed IDs from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = window.localStorage.getItem(DISMISSED_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as string[];
        setDismissedIds(parsed);
      } catch {
        // if parsing fails, just ignore and start fresh
      }
    }
  }, []);

  // Compute what to display: all alerts except dismissed ones
  const displayAlerts = alerts.filter(alert => !dismissedIds.includes(alert.id));

  const handleNotificationClick = (alert: Notification) => {
    setSelectedNotification(alert);
    setDetailOpen(true);
  };

  const handleDeleteNotification = () => {
    if (!selectedNotification) return;

    setDismissedIds(prev => {
      const next = prev.includes(selectedNotification.id)
        ? prev
        : [...prev, selectedNotification.id];

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
      }

      return next;
    });

    toast.success('Notification deleted');
    setDetailOpen(false);
  };

  return (
    <div className="max-w-xl space-y-6">
      {/* Back Button */}
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

      {/* Notifications Card */}
      <Card className="bg-white shadow-sm rounded-2xl">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-gray-800" />
            <CardTitle className="text-xl text-gray-900">Alerts</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {displayAlerts.map((alert, index) => (
            <div key={alert.id} className="space-y-3">
              <button
                type="button"
                onClick={() => handleNotificationClick(alert)}
                className="w-full bg-gray-100 p-4 rounded-xl text-left hover:bg-gray-200 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <p className="font-medium text-gray-900 text-sm">{alert.title}</p>
                  <p className="text-xs text-gray-500 whitespace-nowrap">{alert.timestamp}</p>
                </div>

                <p className="text-sm text-gray-600 mt-1">
                  {alert.description}
                </p>
              </button>

              {index < displayAlerts.length - 1 && (
                <Separator className="opacity-40" />
              )}
            </div>
          ))}

          {displayAlerts.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              No notifications yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedNotification?.title}</DialogTitle>
            <DialogDescription>
              {selectedNotification?.timestamp}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {selectedNotification?.description}
            </p>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDetailOpen(false)}
              >
                Close
              </Button>
              {selectedNotification && (
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDeleteNotification}
                >
                  <X className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
