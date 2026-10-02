import type { App, Plugin } from 'vue'

import MlAccordion from './components/MlAccordion.vue'
import MlAlert from './components/MlAlert.vue'
import MlAvatar from './components/MlAvatar.vue'
import MlBadge from './components/MlBadge.vue'
import MlBarChart from './components/MlBarChart.vue'
import MlBreadcrumb from './components/MlBreadcrumb.vue'
import MlButton from './components/MlButton.vue'
import MlCalendar from './components/MlCalendar.vue'
import MlCard from './components/MlCard.vue'
import MlCheckbox from './components/MlCheckbox.vue'
import MlDatePicker from './components/MlDatePicker.vue'
import MlDivider from './components/MlDivider.vue'
import MlDonut from './components/MlDonut.vue'
import MlDropdown from './components/MlDropdown.vue'
import MlEmpty from './components/MlEmpty.vue'
import MlField from './components/MlField.vue'
import MlIcon from './components/MlIcon.vue'
import MlInput from './components/MlInput.vue'
import MlKbd from './components/MlKbd.vue'
import MlLionMark from './components/MlLionMark.vue'
import MlList from './components/MlList.vue'
import MlListItem from './components/MlListItem.vue'
import MlLoader from './components/MlLoader.vue'
import MlMascot from './components/MlMascot.vue'
import MlModal from './components/MlModal.vue'
import MlNavBar from './components/MlNavBar.vue'
import MlNumberInput from './components/MlNumberInput.vue'
import MlPagination from './components/MlPagination.vue'
import MlPaw from './components/MlPaw.vue'
import MlPhone from './components/MlPhone.vue'
import MlProgress from './components/MlProgress.vue'
import MlRadio from './components/MlRadio.vue'
import MlRadioGroup from './components/MlRadioGroup.vue'
import MlRing from './components/MlRing.vue'
import MlSelect from './components/MlSelect.vue'
import MlSlider from './components/MlSlider.vue'
import MlSparkline from './components/MlSparkline.vue'
import MlStat from './components/MlStat.vue'
import MlSteps from './components/MlSteps.vue'
import MlSwitch from './components/MlSwitch.vue'
import MlTabBar from './components/MlTabBar.vue'
import MlTable from './components/MlTable.vue'
import MlTabs from './components/MlTabs.vue'
import MlTag from './components/MlTag.vue'
import MlTextarea from './components/MlTextarea.vue'
import MlToastHost from './components/MlToastHost.vue'
import MlTooltip from './components/MlTooltip.vue'
import MlUpload from './components/MlUpload.vue'
import { vPawStamp } from './pawStamp'

const components = {
  MlAccordion,
  MlAlert,
  MlAvatar,
  MlBadge,
  MlBarChart,
  MlBreadcrumb,
  MlButton,
  MlCalendar,
  MlCard,
  MlCheckbox,
  MlDatePicker,
  MlDivider,
  MlDonut,
  MlDropdown,
  MlEmpty,
  MlField,
  MlIcon,
  MlInput,
  MlKbd,
  MlLionMark,
  MlList,
  MlListItem,
  MlLoader,
  MlMascot,
  MlModal,
  MlNavBar,
  MlNumberInput,
  MlPagination,
  MlPaw,
  MlPhone,
  MlProgress,
  MlRadio,
  MlRadioGroup,
  MlRing,
  MlSelect,
  MlSlider,
  MlSparkline,
  MlStat,
  MlSteps,
  MlSwitch,
  MlTabBar,
  MlTable,
  MlTabs,
  MlTag,
  MlTextarea,
  MlToastHost,
  MlTooltip,
  MlUpload,
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
  MlAccordion,
  MlAlert,
  MlAvatar,
  MlBadge,
  MlBarChart,
  MlBreadcrumb,
  MlButton,
  MlCalendar,
  MlCard,
  MlCheckbox,
  MlDatePicker,
  MlDivider,
  MlDonut,
  MlDropdown,
  MlEmpty,
  MlField,
  MlIcon,
  MlInput,
  MlKbd,
  MlLionMark,
  MlList,
  MlListItem,
  MlLoader,
  MlMascot,
  MlModal,
  MlNavBar,
  MlNumberInput,
  MlPagination,
  MlPaw,
  MlPhone,
  MlProgress,
  MlRadio,
  MlRadioGroup,
  MlRing,
  MlSelect,
  MlSlider,
  MlSparkline,
  MlStat,
  MlSteps,
  MlSwitch,
  MlTabBar,
  MlTable,
  MlTabs,
  MlTag,
  MlTextarea,
  MlToastHost,
  MlTooltip,
  MlUpload,
}

export { toast, useToast } from './toast'
export type { MlToastItem } from './toast'
export { vPawStamp, pawStamp } from './pawStamp'
export { lionAvatarUrl, lionFullUrl, mascotImages } from './mascot'
export * from './types'
export type { IconName } from './components/icons'

declare module 'vue' {
  export interface GlobalComponents {
    MlAccordion: typeof MlAccordion
    MlAlert: typeof MlAlert
    MlAvatar: typeof MlAvatar
    MlBadge: typeof MlBadge
    MlBarChart: typeof MlBarChart
    MlBreadcrumb: typeof MlBreadcrumb
    MlButton: typeof MlButton
    MlCalendar: typeof MlCalendar
    MlCard: typeof MlCard
    MlCheckbox: typeof MlCheckbox
    MlDatePicker: typeof MlDatePicker
    MlDivider: typeof MlDivider
    MlDonut: typeof MlDonut
    MlDropdown: typeof MlDropdown
    MlEmpty: typeof MlEmpty
    MlField: typeof MlField
    MlIcon: typeof MlIcon
    MlInput: typeof MlInput
    MlKbd: typeof MlKbd
    MlLionMark: typeof MlLionMark
    MlList: typeof MlList
    MlListItem: typeof MlListItem
    MlLoader: typeof MlLoader
    MlMascot: typeof MlMascot
    MlModal: typeof MlModal
    MlNavBar: typeof MlNavBar
    MlNumberInput: typeof MlNumberInput
    MlPagination: typeof MlPagination
    MlPaw: typeof MlPaw
    MlPhone: typeof MlPhone
    MlProgress: typeof MlProgress
    MlRadio: typeof MlRadio
    MlRadioGroup: typeof MlRadioGroup
    MlRing: typeof MlRing
    MlSelect: typeof MlSelect
    MlSlider: typeof MlSlider
    MlSparkline: typeof MlSparkline
    MlStat: typeof MlStat
    MlSteps: typeof MlSteps
    MlSwitch: typeof MlSwitch
    MlTabBar: typeof MlTabBar
    MlTable: typeof MlTable
    MlTabs: typeof MlTabs
    MlTag: typeof MlTag
    MlTextarea: typeof MlTextarea
    MlToastHost: typeof MlToastHost
    MlTooltip: typeof MlTooltip
    MlUpload: typeof MlUpload
  }
  export interface GlobalDirectives {
    vPawStamp: typeof vPawStamp
  }
}
