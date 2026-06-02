import { Trash2 } from 'lucide-react'

import type { Session } from '@/lib/types'

type Props = {
  readonly selectedSessionId: string | null
  readonly sessions: readonly Session[]
  readonly onDeleteSession: (sessionId: string) => void
  readonly onSelectSession: (session: Session) => void
}

export function SessionList(props: Props) {
  return (
    <div className="section">
      <h2>Sessions</h2>
      <div className="sessions">
        {props.sessions.map((session) => (
          <div key={session.id} className="session-row">
            <button
              type="button"
              className={session.id === props.selectedSessionId ? 'session active' : 'session'}
              onClick={() => props.onSelectSession(session)}
            >
              {session.name}
            </button>
            <button
              type="button"
              aria-label={`Delete ${session.name}`}
              className="session-delete"
              onClick={() => props.onDeleteSession(session.id)}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
