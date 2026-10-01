import type { App, Plugin } from 'vue'

import MlAlert from './components/MlAlert.vue'
import MlAvatar from './components/MlAvatar.vue'
import MlBadge from './components/MlBadge.vue'
import MlButton from './components/MlButton.vue'
import MlCard from './components/MlCard.vue'
import MlCheckbox from './components/MlCheckbox.vue'
import MlDivider from './components/MlDivider.vue'
import MlDropdown from './components/MlDropdown.vue'
import MlField from './components/MlField.vue'
import MlIcon from './components/MlIcon.vue'
import MlInput from './components/MlInput.vue'
import MlLionMark from './components/MlLionMark.vue'
import MlLoader from './components/MlLoader.vue'
import MlModal from './components/MlModal.vue'
import MlPaw from './components/MlPaw.vue'
import MlProgress from './components/MlProgress.vue'
import MlRadio from './components/MlRadio.vue'
import MlRadioGroup from './components/MlRadioGroup.vue'
import MlSelect from './components/MlSelect.vue'
import MlStat from './components/MlStat.vue'
import MlSwitch from './components/MlSwitch.vue'
import MlTable from './components/MlTable.vue'
import MlTabs from './components/MlTabs.vue'
import MlTextarea from './components/MlTextarea.vue'
import MlToastHost from './components/MlToastHost.vue'
import MlTooltip from './components/MlTooltip.vue'
import { vPawStamp } from './pawStamp'

const components = {
  MlAlert,
  MlAvatar,
  MlBadge,
  MlButton,
  MlCard,
  MlCheckbox,
  MlDivider,
  MlDropdown,
  MlField,
  MlIcon,
  MlInput,
  MlLionMark,
  MlLoader,
  MlModal,
  MlPaw,
  MlProgress,
  MlRadio,
  MlRadioGroup,
  MlSelect,
  MlStat,
  MlSwitch,
  MlTable,
  MlTabs,
  MlTextarea,
  MlToastHost,
  MlTooltip,
}

/** `app.use(MalilionUI)` registers every component and the v-paw-stamp directive. */
export const MalilionUI: Plugin = {
  install(app: App) {
    for (const [name, component] of Object.entries(components)) {
      app.component(name, component)
    }
    app.directive('paw-stamp', vPawStamp)
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
  MlDropdown,
  MlField,
  MlIcon,
  MlInput,
  MlLionMark,
  MlLoader,
  MlModal,
  MlPaw,
  MlProgress,
  MlRadio,
  MlRadioGroup,
  MlSelect,
  MlStat,
  MlSwitch,
  MlTable,
  MlTabs,
  MlTextarea,
  MlToastHost,
  MlTooltip,
}

export { toast, useToast } from './toast'
export type { MlToastItem } from './toast'
export { vPawStamp, pawStamp } from './pawStamp'
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
    MlDropdown: typeof MlDropdown
    MlField: typeof MlField
    MlIcon: typeof MlIcon
    MlInput: typeof MlInput
    MlLionMark: typeof MlLionMark
    MlLoader: typeof MlLoader
    MlModal: typeof MlModal
    MlPaw: typeof MlPaw
    MlProgress: typeof MlProgress
    MlRadio: typeof MlRadio
    MlRadioGroup: typeof MlRadioGroup
    MlSelect: typeof MlSelect
    MlStat: typeof MlStat
    MlSwitch: typeof MlSwitch
    MlTable: typeof MlTable
    MlTabs: typeof MlTabs
    MlTextarea: typeof MlTextarea
    MlToastHost: typeof MlToastHost
    MlTooltip: typeof MlTooltip
  }
  export interface GlobalDirectives {
    vPawStamp: typeof vPawStamp
  }
}
