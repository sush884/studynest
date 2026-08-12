import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

interface ClientSocket extends WebSocket {
  userId?: string;
  userName?: string;
  groupIds?: Set<string>;
  isAlive?: boolean;
}

let wss: WebSocketServer | null = null;
const clients = new Set<ClientSocket>();
const userSockets = new Map<string, Set<ClientSocket>>();

function broadcastPresence(groupId: string) {
  const onlineUserIds: string[] = [];
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.groupIds?.has(groupId) && client.userId) {
      if (!onlineUserIds.includes(client.userId)) {
        onlineUserIds.push(client.userId);
      }
    }
  });

  broadcastToGroup(groupId, 'presence_update', { onlineUserIds, count: onlineUserIds.length });
}

export function initWebSocketServer(server: Server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: ClientSocket) => {
    ws.isAlive = true;
    ws.groupIds = new Set();
    clients.add(ws);

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (data: string) => {
      try {
        const payload = JSON.parse(data.toString());

        if (payload.type === 'join_group' && payload.groupId) {
          ws.groupIds?.add(payload.groupId);
          if (payload.userId) {
            ws.userId = payload.userId;
            if (payload.userName) ws.userName = payload.userName;

            if (!userSockets.has(payload.userId)) {
              userSockets.set(payload.userId, new Set());
            }
            userSockets.get(payload.userId)!.add(ws);
          }
          broadcastPresence(payload.groupId);
        }

        if (payload.type === 'leave_group' && payload.groupId) {
          ws.groupIds?.delete(payload.groupId);
          broadcastPresence(payload.groupId);
        }

        if (payload.type === 'typing' && payload.groupId && ws.userId) {
          broadcastToGroupExceptSender(ws, payload.groupId, 'typing_status', {
            userId: ws.userId,
            userName: ws.userName || payload.userName || 'Member',
            isTyping: !!payload.isTyping,
          });
        }
      } catch (err) {
        console.error('WebSocket message parse error:', err);
      }
    });

    const cleanupSocket = () => {
      clients.delete(ws);
      if (ws.userId && userSockets.has(ws.userId)) {
        userSockets.get(ws.userId)!.delete(ws);
        if (userSockets.get(ws.userId)!.size === 0) {
          userSockets.delete(ws.userId);
        }
      }
      ws.groupIds?.forEach((gId) => {
        broadcastPresence(gId);
      });
    };

    ws.on('close', cleanupSocket);
    ws.on('error', (err) => {
      console.error('WebSocket client error:', err);
      cleanupSocket();
    });
  });

  const interval = setInterval(() => {
    wss?.clients.forEach((ws: WebSocket) => {
      const client = ws as ClientSocket;
      if (client.isAlive === false) return client.terminate();
      client.isAlive = false;
      client.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });
}

export function broadcastToGroup(groupId: string, eventType: string, payload: any) {
  const messageData = JSON.stringify({ type: eventType, groupId, ...payload });
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.groupIds?.has(groupId)) {
      client.send(messageData);
    }
  });
}

export function broadcastToGroupExceptSender(senderWs: ClientSocket, groupId: string, eventType: string, payload: any) {
  const messageData = JSON.stringify({ type: eventType, groupId, ...payload });
  clients.forEach((client) => {
    if (client !== senderWs && client.readyState === WebSocket.OPEN && client.groupIds?.has(groupId)) {
      client.send(messageData);
    }
  });
}

export function sendNotificationToUser(userId: string, notification: any) {
  const sockets = userSockets.get(userId);
  if (sockets) {
    const payload = JSON.stringify({ type: 'new_notification', notification });
    sockets.forEach((s) => {
      if (s.readyState === WebSocket.OPEN) {
        s.send(payload);
      }
    });
  }
}
