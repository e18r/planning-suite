import { SidePanel } from '@aragon/ui'
import PropTypes from 'prop-types'
import React, { Suspense } from 'react'

const camel2title = camelCase =>
  camelCase
    .replace(/([A-Z])/g, match => ` ${match}`)
    .replace(/^./, match => match.toUpperCase())

const dynamicImport = Object.freeze({
  NewReward: () => import('./NewReward'),
  MyReward: () => import('./MyReward'),
  ViewReward: () => import('./ViewReward'),
})

const PANELS = Object.keys(dynamicImport).reduce((obj, item) => {
  obj[item] = item
  return obj
}, {})

const PanelManager = ({ activePanel = null, onClose, ...panelProps }) => {
  let panelTitle = activePanel && camel2title(activePanel)
  const PanelComponent = activePanel && React.lazy(dynamicImport[activePanel])
  if (panelProps.reward) {
    panelTitle += ' #' + panelProps.reward.rewardId
  }
  return (
    <SidePanel
      title={panelTitle || ''}
      opened={!!activePanel}
      onClose={onClose}
    >
      <Suspense fallback={<div>Loading Panel...</div>}>
        {PanelComponent && <PanelComponent {...panelProps} />}
      </Suspense>
    </SidePanel>
  )
}

PanelManager.propTypes = {
  activePanel: PropTypes.string,
  onClose: PropTypes.func,
}

export default PanelManager
export { PANELS }
