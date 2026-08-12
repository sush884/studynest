import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, Flame, Users, Trophy, MessageSquare, Clock, X } from 'lucide-react';
import { AppNotification } from '../types';
import { api } from '../services/api';

interface NotificationCenterProps {
  onSelectGroup?: (groupId: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onSelectGroup }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    loadNotifications();

    // Setup real-time listener for WebSocket notifications
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'new_notification') {
          setNotifications((prev) => [data.notification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      } catch (err) {
        console.error('WS notification parse error:', err);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id: string, relatedGroupId?: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (relatedGroupId && onSelectGroup) {
        onSelectGroup(relatedGroupId);
        setIsOpen(false);
      }
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const filteredNotifications =
    activeFilter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'mention':
        return <MessageSquare className="w-4 h-4 text-pink-500" />;
      case 'group_join':
      case 'invitation':
        return <Users className="w-4 h-4 text-purple-500" />;
      case 'group_streak':
      case 'goal_completed':
        return <Flame className="w-4 h-4 text-amber-500" />;
      case 'achievement':
        return <Trophy className="w-4 h-4 text-amber-500" />;
      default:
        return <Clock className="w-4 h-4 text-pink-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) loadNotifications();
        }}
        className="relative p-2 text-slate-600 hover:text-pink-600 hover:bg-pink-50 rounded-xl transition-all"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[10px] font-extrabold bg-pink-500 text-white rounded-full min-w-[18px] text-center shadow-xs animate-bounce">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-pink-200 shadow-xl z-50 overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="px-4 py-3 bg-pink-50/80 border-b border-pink-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-800">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-pink-500 text-white rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] font-bold text-pink-600 hover:text-pink-800 flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" /> Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-pink-100 text-xs bg-slate-50/50">
            <button
              onClick={() => setActiveFilter('all')}
              className={`flex-1 py-2 font-bold text-center border-b-2 transition-all ${
                activeFilter === 'all'
                  ? 'border-pink-500 text-pink-600 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveFilter('unread')}
              className={`flex-1 py-2 font-bold text-center border-b-2 transition-all ${
                activeFilter === 'unread'
                  ? 'border-pink-500 text-pink-600 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-pink-50">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Bell className="w-8 h-8 text-pink-200 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">No notifications</p>
                <p className="text-[11px] text-slate-400">You're all caught up!</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleMarkRead(notif.id, notif.relatedGroupId)}
                  className={`p-3 text-xs transition-colors cursor-pointer flex gap-3 ${
                    notif.isRead ? 'bg-white hover:bg-pink-50/50' : 'bg-pink-50/40 hover:bg-pink-50'
                  }`}
                >
                  <div className="mt-0.5 shrink-0 p-1.5 bg-white border border-pink-100 rounded-xl shadow-2xs">
                    {getNotifIcon(notif.type)}
                  </div>

                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <h4
                        className={`text-xs ${
                          notif.isRead ? 'font-semibold text-slate-700' : 'font-extrabold text-slate-900'
                        }`}
                      >
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-slate-400">
                        {new Date(notif.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">{notif.message}</p>
                  </div>

                  {!notif.isRead && (
                    <span className="w-2 h-2 rounded-full bg-pink-500 shrink-0 self-center" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
