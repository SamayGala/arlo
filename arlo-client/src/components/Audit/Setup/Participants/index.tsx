import React from 'react'
import { IAudit } from '../../../../types'

interface IProps {
  audit: IAudit
  nextStage: () => void
  prevStage: () => void
}

const Participants: React.FC<IProps> = () => {
  return <p>Participants</p>
}

export default Participants
