import React, { useRef, useEffect } from 'react';
import { ConversationTurn } from '../types';

export function ChatWindow({ turns }: { turns: ConversationTurn[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  if (turns.length === 0) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#9ca3af',
        fontSize: 14,
        fontStyle: 'italic',
        background: '#f9fafb',
        borderRadius: 10,
        padding: 24,
        minHeight: 200,
      }}>
        Start a conversation to see the transcript here
      </div>
    );
  }

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '12px 4px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      maxHeight: 480,
    }}>
      {turns.map((turn, i) => (
        <div key={i} style={{
          display: 'flex',
          justifyContent: turn.role === 'agent' ? 'flex-start' : 'flex-end',
        }}>
          <div style={{
            maxWidth: '82%',
            padding: '10px 14px',
            borderRadius: turn.role === 'agent' ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
            background: turn.role === 'agent' ? '#1e40af' : '#f3f4f6',
            color: turn.role === 'agent' ? '#fff' : '#1a202c',
            fontSize: 14,
            lineHeight: 1.5,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              opacity: 0.7,
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}>
              {turn.role === 'agent' ? '🤖 Agent (Priya)' : '👤 Customer'}
            </div>
            {turn.text}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
