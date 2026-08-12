import React, { useState, useEffect, useRef } from 'react';
import { Send, Search, Reply, Edit2, Trash2, X, AlertCircle, Users, WifiOff } from 'lucide-react';
import { ChatMessage, GroupMemberProgress } from '../../types';
import { api } from '../../services/api';

interface GroupChatRoomProps {
  groupId: string;
  currentUserId: string;
  groupMembers?: GroupMemberProgress[];
  groupOwnerId?: string;
}

const EMOJI_LIST = ['👍', '❤️', '😂', '🔥', '👏', '❓'];

export const GroupChatRoom: React.FC<GroupChatRoomProps> = ({
  groupId,
  currentUserId,
  groupMembers = [],
  groupOwnerId,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);
  const [editInput, setEditInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [wsStatus, setWsStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('connected');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial chat messages & mark read
  const loadMessages = async () => {
    try {
      const msgs = await api.getGroupMessages(groupId);
      setMessages(msgs);
      scrollToBottom();
      if (msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1];
        await api.markChatRead(groupId, lastMsg.id);
      }
    } catch (err) {
      console.error('Failed to load group chat:', err);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    loadMessages();

    // Setup WebSocket connection
    let isSubscribed = true;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isSubscribed) return;
      setWsStatus('connected');
      const currentUser = groupMembers.find((m) => m.userId === currentUserId);
      ws.send(
        JSON.stringify({
          type: 'join_group',
          groupId,
          userId: currentUserId,
          userName: currentUser?.userName || 'User',
        })
      );
    };

    ws.onmessage = (event) => {
      if (!isSubscribed) return;
      try {
        const data = JSON.parse(event.data);
        if (data.groupId !== groupId) return;

        if (data.type === 'new_message') {
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === data.message.id);
            if (exists) return prev;
            return [...prev, data.message];
          });
          scrollToBottom();
          api.markChatRead(groupId, data.message.id).catch(() => {});
        } else if (data.type === 'message_reaction_updated') {
          loadMessages();
        } else if (data.type === 'message_updated') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === data.msgId ? { ...m, message: data.message, updatedAt: data.updatedAt } : m
            )
          );
        } else if (data.type === 'message_deleted') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === data.msgId
                ? { ...m, message: 'Message deleted', deletedAt: data.deletedAt }
                : m
            )
          );
        } else if (data.type === 'presence_update') {
          setOnlineUserIds(data.onlineUserIds || []);
        } else if (data.type === 'typing_status') {
          setTypingUsers((prev) => ({
            ...prev,
            [data.userName || data.userId]: data.isTyping,
          }));
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };

    ws.onclose = () => {
      if (isSubscribed) setWsStatus('disconnected');
    };

    ws.onerror = () => {
      if (isSubscribed) setWsStatus('disconnected');
    };

    return () => {
      isSubscribed = false;
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'leave_group', groupId }));
      }
      ws.close();
    };
  }, [groupId, currentUserId]);

  // Handle typing indicator dispatch
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputMsg(val);

    // Detect @ mentions
    const lastWord = val.split(' ').pop() || '';
    if (lastWord.startsWith('@')) {
      setMentionQuery(lastWord.substring(1).toLowerCase());
    } else {
      setMentionQuery(null);
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing', groupId, isTyping: true }));

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'typing', groupId, isTyping: false }));
        }
      }, 2500);
    }
  };

  const selectMentionMember = (userName: string) => {
    const words = inputMsg.split(' ');
    words.pop();
    words.push(`@${userName} `);
    setInputMsg(words.join(' '));
    setMentionQuery(null);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const textToSend = inputMsg.trim();
    setInputMsg('');
    setMentionQuery(null);
    const replyId = replyTo?.id;
    setReplyTo(null);

    try {
      const newMsg = await api.sendGroupMessage(groupId, textToSend, 'general', replyId);
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      scrollToBottom();
    } catch (err) {
      console.error('Failed to send message:', err);
      // Show optimistic failed message
      const failedMsg: ChatMessage = {
        id: `temp_${Date.now()}`,
        groupId,
        senderId: currentUserId,
        senderName: 'You',
        message: textToSend,
        timestamp: 'Just now',
        failed: true,
      };
      setMessages((prev) => [...prev, failedMsg]);
      scrollToBottom();
    }
  };

  const handleEditSubmit = async (msgId: string) => {
    if (!editInput.trim()) return;
    try {
      await api.editGroupMessage(groupId, msgId, editInput.trim());
      setEditingMsg(null);
      setEditInput('');
      loadMessages();
    } catch (err) {
      console.error('Failed to edit message:', err);
    }
  };

  const handleDeleteMsg = async (msgId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
      await api.deleteGroupMessage(groupId, msgId);
      loadMessages();
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  const handleReact = async (msgId: string, emoji: string) => {
    try {
      await api.reactToMessage(groupId, msgId, emoji);
      loadMessages();
    } catch (err) {
      console.error('Failed to react:', err);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await api.searchGroupMessages(groupId, searchQuery.trim());
      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const activeTypingNames = Object.entries(typingUsers)
    .filter(([_, isTyping]) => isTyping)
    .map(([name]) => name);

  const filteredMembers = mentionQuery !== null
    ? groupMembers.filter((m) => m.userName.toLowerCase().includes(mentionQuery))
    : [];

  return (
    <div className="flex flex-col h-[520px] bg-white rounded-2xl border border-pink-200 overflow-hidden shadow-xs">
      {/* Header */}
      <div className="px-4 py-3 bg-pink-50/80 border-b border-pink-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              wsStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          ></span>
          <div>
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              Live Group Chat
              <span className="text-[10px] bg-pink-100 text-pink-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Users className="w-3 h-3" /> {onlineUserIds.length} Online
              </span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSearching(!isSearching)}
            className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
              isSearching
                ? 'bg-pink-500 text-white'
                : 'bg-white border border-pink-200 text-slate-600 hover:bg-pink-50'
            }`}
            title="Search Chat Messages"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Disconnection Banner */}
      {wsStatus === 'disconnected' && (
        <div className="bg-amber-500 text-white text-[11px] font-semibold px-4 py-1.5 flex items-center justify-between animate-fadeIn">
          <span className="flex items-center gap-1.5">
            <WifiOff className="w-3.5 h-3.5" /> Reconnecting to chat server...
          </span>
          <button
            onClick={loadMessages}
            className="underline text-[10px] hover:text-amber-100 font-bold"
          >
            Refresh Messages
          </button>
        </div>
      )}

      {/* Search Bar Overlay */}
      {isSearching && (
        <div className="p-3 bg-pink-50 border-b border-pink-100">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chat history..."
              className="flex-1 px-3 py-1.5 bg-white border border-pink-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-pink-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-pink-500 hover:bg-pink-600 text-white rounded-lg text-xs font-bold"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSearching(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="p-1.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="mt-2 max-h-32 overflow-y-auto space-y-1 bg-white p-2 rounded-lg border border-pink-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                Found {searchResults.length} matching messages:
              </p>
              {searchResults.map((res) => (
                <div
                  key={res.id}
                  className="text-xs p-1.5 hover:bg-pink-50 rounded border border-transparent hover:border-pink-200 cursor-pointer flex justify-between"
                >
                  <span className="font-bold text-slate-700">{res.senderName}:</span>
                  <span className="text-slate-600 truncate max-w-[200px]">{res.message}</span>
                  <span className="text-[10px] text-slate-400">{res.timestamp}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages Feed */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/40">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-12 h-12 rounded-full bg-pink-100 text-pink-500 flex items-center justify-center mb-2">
              💬
            </div>
            <p className="text-xs font-bold text-slate-700 mb-1">No messages yet</p>
            <p className="text-[11px] text-slate-500 max-w-xs">
              Be the first to start the conversation! Say hello to your group members. 👋
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            const isOwner = currentUserId === groupOwnerId;
            const isDeleted = Boolean(msg.deletedAt);
            const isEditing = editingMsg?.id === msg.id;

            return (
              <div
                key={msg.id}
                className={`group relative flex gap-2.5 max-w-[85%] ${
                  isMe ? 'ml-auto flex-row-reverse' : ''
                }`}
              >
                {!isMe && (
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                      {msg.senderAvatar ? (
                        <img
                          src={msg.senderAvatar}
                          alt={msg.senderName}
                          className="w-full h-full rounded-xl object-cover"
                        />
                      ) : (
                        msg.senderName.charAt(0).toUpperCase()
                      )}
                    </div>
                    {onlineUserIds.includes(msg.senderId) && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                    )}
                  </div>
                )}

                <div className={`space-y-1 ${isMe ? 'text-right' : ''}`}>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span className="font-bold text-slate-700">{msg.senderName}</span>
                    <span>{msg.timestamp}</span>
                    {msg.updatedAt && !isDeleted && (
                      <span className="italic text-slate-400">(edited)</span>
                    )}
                  </div>

                  {/* Quoted reply message */}
                  {msg.replyToMessage && !isDeleted && (
                    <div
                      className={`text-[10px] p-2 rounded-lg border-l-2 mb-1 text-slate-600 bg-pink-50/80 border-pink-400 text-left`}
                    >
                      <span className="font-bold text-pink-700 block">
                        ↳ Replying to {msg.replyToMessage.senderName}
                      </span>
                      <span className="truncate block opacity-80">{msg.replyToMessage.message}</span>
                    </div>
                  )}

                  {/* Message bubble */}
                  {isEditing ? (
                    <div className="p-2 bg-white rounded-xl border border-pink-300 shadow-xs">
                      <input
                        type="text"
                        value={editInput}
                        onChange={(e) => setEditInput(e.target.value)}
                        className="w-full text-xs p-1.5 border border-slate-200 rounded focus:outline-none focus:border-pink-500"
                        autoFocus
                      />
                      <div className="flex justify-end gap-1.5 mt-2">
                        <button
                          onClick={() => setEditingMsg(null)}
                          className="px-2 py-0.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-100 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleEditSubmit(msg.id)}
                          className="px-2.5 py-0.5 text-[10px] font-bold bg-pink-500 text-white rounded"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        isDeleted
                          ? 'bg-slate-100 text-slate-400 italic border border-slate-200'
                          : msg.failed
                          ? 'bg-rose-50 border border-rose-200 text-rose-700'
                          : isMe
                          ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-xs rounded-tr-none'
                          : 'bg-white border border-pink-100 text-slate-800 shadow-2xs rounded-tl-none'
                      }`}
                    >
                      {msg.failed && (
                        <span className="flex items-center gap-1 font-bold text-[10px] text-rose-600 mb-1">
                          <AlertCircle className="w-3 h-3" /> Failed to send
                        </span>
                      )}
                      {msg.message}
                    </div>
                  )}

                  {/* Reaction Pill Buttons */}
                  {!isDeleted && (
                    <div
                      className={`flex flex-wrap items-center gap-1 text-[10px] pt-0.5 ${
                        isMe ? 'justify-end' : ''
                      }`}
                    >
                      {EMOJI_LIST.map((emoji) => {
                        const reaction = msg.reactions?.find((r) => r.emoji === emoji);
                        const hasReacted = reaction?.userIds?.includes(currentUserId);
                        if (!reaction && !isMe) return null; // show active or on hover
                        return (
                          <button
                            key={emoji}
                            onClick={() => handleReact(msg.id, emoji)}
                            className={`px-1.5 py-0.5 rounded-full border text-[10px] transition-all flex items-center gap-0.5 ${
                              hasReacted
                                ? 'bg-pink-100 border-pink-300 text-pink-700 font-bold shadow-2xs'
                                : 'bg-white border-slate-200 text-slate-500 hover:bg-pink-50 hover:border-pink-200'
                            }`}
                          >
                            <span>{emoji}</span>
                            {reaction && reaction.count > 0 && <span>{reaction.count}</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Message Action Controls (Hover Menu) */}
                  {!isDeleted && !isEditing && (
                    <div
                      className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-0.5 ${
                        isMe ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <button
                        onClick={() => setReplyTo(msg)}
                        className="p-1 text-slate-400 hover:text-pink-600 hover:bg-pink-50 rounded"
                        title="Reply"
                      >
                        <Reply className="w-3 h-3" />
                      </button>

                      {isMe && (
                        <button
                          onClick={() => {
                            setEditingMsg(msg);
                            setEditInput(msg.message);
                          }}
                          className="p-1 text-slate-400 hover:text-pink-600 hover:bg-pink-50 rounded"
                          title="Edit"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}

                      {(isMe || isOwner) && (
                        <button
                          onClick={() => handleDeleteMsg(msg.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Users Bar */}
      {activeTypingNames.length > 0 && (
        <div className="px-4 py-1 bg-pink-50/50 text-[11px] font-semibold text-pink-600 flex items-center gap-1.5 border-t border-pink-100">
          <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-ping" />
          {activeTypingNames.join(', ')} {activeTypingNames.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      {/* Reply Preview Bar */}
      {replyTo && (
        <div className="px-4 py-2 bg-pink-50 border-t border-pink-200 flex items-center justify-between text-xs text-pink-800">
          <div className="truncate flex items-center gap-1.5">
            <Reply className="w-3.5 h-3.5 text-pink-500 shrink-0" />
            <span>
              Replying to <strong className="font-bold">{replyTo.senderName}</strong>: "{replyTo.message}"
            </span>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="text-pink-500 hover:text-pink-700 shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mention Autocomplete Popup */}
      {mentionQuery !== null && filteredMembers.length > 0 && (
        <div className="bg-white border border-pink-200 shadow-md max-h-32 overflow-y-auto p-1 border-t border-b text-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1">Mention member:</p>
          {filteredMembers.map((m) => (
            <button
              key={m.userId}
              type="button"
              onClick={() => selectMentionMember(m.userName)}
              className="w-full text-left px-2 py-1.5 hover:bg-pink-50 rounded font-semibold text-slate-700 flex items-center gap-2"
            >
              <div className="w-5 h-5 rounded-full bg-pink-500 text-white font-bold text-[10px] flex items-center justify-center">
                {m.userName.charAt(0)}
              </div>
              {m.userName}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-pink-100 flex items-center gap-2">
        <input
          type="text"
          value={inputMsg}
          onChange={handleInputChange}
          placeholder="Type a message (use @ to mention)..."
          className="flex-1 px-3.5 py-2.5 bg-pink-50/50 border border-pink-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-pink-500 focus:bg-white"
        />
        <button
          type="submit"
          disabled={!inputMsg.trim()}
          className="p-2.5 bg-pink-500 hover:bg-pink-600 disabled:opacity-40 text-white rounded-xl shadow-xs transition-all shrink-0 flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
