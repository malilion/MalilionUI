import type { App, Plugin } from 'vue'

import MlAlert from './components/MlAlert.vue'
import MlAvatar from './components/MlAvatar.vue'
import MlBadge from './components/MlBadge.vue'
import MlButton from './components/MlButton.vue'
import MlCard from './components/MlCard.vue'
import MlCheckbox from './components/MlCheckbox.vue'
import MlDivider from './components/MlDivider.vue'
import MlField from './components/MlField.vue'
import MlIcon from './components/MlIcon.vue'
import MlInput from './components/MlInput.vue'
import MlLionMark from './components/MlLionMark.vue'
import MlLoader from './components/MlLoader.vue'
import MlModal from './components/MlModal.vue'
import MlProgress from './components/MlProgress.vue'
import MlSelect from './components/MlSelect.vue'
import MlStat from './components/MlStat.vue'
import MlSwitch from './components/MlSwitch.vue'
import MlTabs from './components/MlTabs.vue'
import MlTextarea from './components/MlTextarea.vue'
import MlTooltip from './components/MlTooltip.vue'

const components = {
  MlAlert,
  MlAvatar,
  MlBadge,
  MlButton,
  MlCard,
  MlCheckbox,
  MlDivider,
  MlField,
  MlIcon,
  MlInput,
  MlLionMark,
  MlLoader,
  MlModal,
  MlProgress,
  MlSelect,
  MlStat,
  MlSwitch,
  MlTabs,
  MlTextarea,
  MlTooltip,
}

/** `app.use(MalilionUI)` registers every component globally. */
export const MalilionUI: Plugin = {
  install(app: App) {
    for (const [name, component] of Object.entries(components)) {
      app.component(name, component)
    }
  },
}

export default MalilionUI

export {
  MlAlert,
  MlAvatar,
  MlBadge,
  MlButton,
  MlCard,
  MlCheckbox,
  MlDivider,
  MlField,
  MlIcon,
  MlInput,
  MlLionMark,
  MlLoader,
  MlModal,
  MlProgress,
  MlSelect,
  MlStat,
  MlSwitch,
  MlTabs,
  MlTextarea,
  MlTooltip,
}

export * from './types'
export type { IconName } from './components/icons'

declare module 'vue' {
  export interface GlobalComponents {
    MlAlert: typeof MlAlert
    MlAvatar: typeof MlAvatar
    MlBadge: typeof MlBadge
    MlButton: typeof MlButton
    MlCard: typeof MlCard
    MlCheckbox: typeof MlCheckbox
    MlDivider: typeof MlDivider
    MlField: typeof MlField
    MlIcon: typeof MlIcon
    MlInput: typeof MlInput
    MlLionMark: typeof MlLionMark
    MlLoader: typeof MlLoader
    MlModal: typeof MlModal
    MlProgress: typeof MlProgress
    MlSelect: typeof MlSelect
    MlStat: typeof MlStat
    MlSwitch: typeof MlSwitch
    MlTabs: typeof MlTabs
    MlTextarea: typeof MlTextarea
    MlTooltip: typeof MlTooltip
  }
}
