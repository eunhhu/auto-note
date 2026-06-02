import { createContext, useContext, type ReactNode } from 'react'

import {
  useWorkspaceController,
  type WorkspaceController,
} from '@/pages/workspace/hooks/useWorkspaceController'

class WorkspaceControllerContextError extends Error {
  constructor() {
    super('WorkspaceControllerProvider is required')
    this.name = 'WorkspaceControllerContextError'
  }
}

const WorkspaceControllerContext = createContext<WorkspaceController | null>(null)

type WorkspaceControllerProviderProps = {
  readonly children: ReactNode
}

export function WorkspaceControllerProvider(props: WorkspaceControllerProviderProps) {
  const controller = useWorkspaceController()

  return (
    <WorkspaceControllerContext.Provider value={controller}>
      {props.children}
    </WorkspaceControllerContext.Provider>
  )
}

export function useWorkspaceControllerContext(): WorkspaceController {
  const controller = useContext(WorkspaceControllerContext)
  if (!controller) {
    throw new WorkspaceControllerContextError()
  }
  return controller
}
