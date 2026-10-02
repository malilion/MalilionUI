import type { App, Plugin } from 'vue'

import MlAccordion from './components/MlAccordion.vue'
import MlAffix from './components/MlAffix.vue'
import MlAlert from './components/MlAlert.vue'
import MlAutocomplete from './components/MlAutocomplete.vue'
import MlAvatar from './components/MlAvatar.vue'
import MlBackTop from './components/MlBackTop.vue'
import MlBadge from './components/MlBadge.vue'
import MlBarChart from './components/MlBarChart.vue'
import MlBorderBeam from './components/MlBorderBeam.vue'
import MlBreadcrumb from './components/MlBreadcrumb.vue'
import MlButton from './components/MlButton.vue'
import MlCalendar from './components/MlCalendar.vue'
import MlCard from './components/MlCard.vue'
import MlCarousel from './components/MlCarousel.vue'
import MlCheckbox from './components/MlCheckbox.vue'
import MlColorPicker from './components/MlColorPicker.vue'
import MlCombobox from './components/MlCombobox.vue'
import MlCountUp from './components/MlCountUp.vue'
import MlDatePicker from './components/MlDatePicker.vue'
import MlDateTimePicker from './components/MlDateTimePicker.vue'
import MlDecryptText from './components/MlDecryptText.vue'
import MlDivider from './components/MlDivider.vue'
import MlDonut from './components/MlDonut.vue'
import MlDrawer from './components/MlDrawer.vue'
import MlDropdown from './components/MlDropdown.vue'
import MlEmpty from './components/MlEmpty.vue'
import MlField from './components/MlField.vue'
import MlForm from './components/MlForm.vue'
import MlFormItem from './components/MlFormItem.vue'
import MlIcon from './components/MlIcon.vue'
import MlImage from './components/MlImage.vue'
import MlImagePreview from './components/MlImagePreview.vue'
import MlInput from './components/MlInput.vue'
import MlKbd from './components/MlKbd.vue'
import MlLionMark from './components/MlLionMark.vue'
import MlList from './components/MlList.vue'
import MlListItem from './components/MlListItem.vue'
import MlLoader from './components/MlLoader.vue'
import MlMarquee from './components/MlMarquee.vue'
import MlMascot from './components/MlMascot.vue'
import MlModal from './components/MlModal.vue'
import MlNavBar from './components/MlNavBar.vue'
import MlNumberInput from './components/MlNumberInput.vue'
import MlPagination from './components/MlPagination.vue'
import MlPaw from './components/MlPaw.vue'
import MlPawBurst from './components/MlPawBurst.vue'
import MlPhone from './components/MlPhone.vue'
import MlPopconfirm from './components/MlPopconfirm.vue'
import MlPopover from './components/MlPopover.vue'
import MlProgress from './components/MlProgress.vue'
import MlRadio from './components/MlRadio.vue'
import MlRadioGroup from './components/MlRadioGroup.vue'
import MlRate from './components/MlRate.vue'
import MlReveal from './components/MlReveal.vue'
import MlRing from './components/MlRing.vue'
import MlSegmented from './components/MlSegmented.vue'
import MlSelect from './components/MlSelect.vue'
import MlSkeleton from './components/MlSkeleton.vue'
import MlSkeletonItem from './components/MlSkeletonItem.vue'
import MlSlider from './components/MlSlider.vue'
import MlSparkline from './components/MlSparkline.vue'
import MlSpotlight from './components/MlSpotlight.vue'
import MlStat from './components/MlStat.vue'
import MlSteps from './components/MlSteps.vue'
import MlSwitch from './components/MlSwitch.vue'
import MlTabBar from './components/MlTabBar.vue'
import MlTable from './components/MlTable.vue'
import MlTabs from './components/MlTabs.vue'
import MlTag from './components/MlTag.vue'
import MlTextarea from './components/MlTextarea.vue'
import MlTilt from './components/MlTilt.vue'
import MlTimePicker from './components/MlTimePicker.vue'
import MlTimeline from './components/MlTimeline.vue'
import MlToastHost from './components/MlToastHost.vue'
import MlTooltip from './components/MlTooltip.vue'
import MlTransfer from './components/MlTransfer.vue'
import MlTree from './components/MlTree.vue'
import MlUpload from './components/MlUpload.vue'
import MlWatermark from './components/MlWatermark.vue'
import { vPawStamp } from './pawStamp'

const components = {
  MlAccordion,
  MlAffix,
  MlAlert,
  MlAutocomplete,
  MlAvatar,
  MlBackTop,
  MlBadge,
  MlBarChart,
  MlBorderBeam,
  MlBreadcrumb,
  MlButton,
  MlCalendar,
  MlCard,
  MlCarousel,
  MlCheckbox,
  MlColorPicker,
  MlCombobox,
  MlCountUp,
  MlDatePicker,
  MlDateTimePicker,
  MlDecryptText,
  MlDivider,
  MlDonut,
  MlDrawer,
  MlDropdown,
  MlEmpty,
  MlField,
  MlForm,
  MlFormItem,
  MlIcon,
  MlImage,
  MlImagePreview,
  MlInput,
  MlKbd,
  MlLionMark,
  MlList,
  MlListItem,
  MlLoader,
  MlMarquee,
  MlMascot,
  MlModal,
  MlNavBar,
  MlNumberInput,
  MlPagination,
  MlPaw,
  MlPawBurst,
  MlPhone,
  MlPopconfirm,
  MlPopover,
  MlProgress,
  MlRadio,
  MlRadioGroup,
  MlRate,
  MlReveal,
  MlRing,
  MlSegmented,
  MlSelect,
  MlSkeleton,
  MlSkeletonItem,
  MlSlider,
  MlSparkline,
  MlSpotlight,
  MlStat,
  MlSteps,
  MlSwitch,
  MlTabBar,
  MlTable,
  MlTabs,
  MlTag,
  MlTextarea,
  MlTilt,
  MlTimePicker,
  MlTimeline,
  MlToastHost,
  MlTooltip,
  MlTransfer,
  MlTree,
  MlUpload,
  MlWatermark,
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
  MlAffix,
  MlAlert,
  MlAutocomplete,
  MlAvatar,
  MlBackTop,
  MlBadge,
  MlBarChart,
  MlBorderBeam,
  MlBreadcrumb,
  MlButton,
  MlCalendar,
  MlCard,
  MlCarousel,
  MlCheckbox,
  MlColorPicker,
  MlCombobox,
  MlCountUp,
  MlDatePicker,
  MlDateTimePicker,
  MlDecryptText,
  MlDivider,
  MlDonut,
  MlDrawer,
  MlDropdown,
  MlEmpty,
  MlField,
  MlForm,
  MlFormItem,
  MlIcon,
  MlImage,
  MlImagePreview,
  MlInput,
  MlKbd,
  MlLionMark,
  MlList,
  MlListItem,
  MlLoader,
  MlMarquee,
  MlMascot,
  MlModal,
  MlNavBar,
  MlNumberInput,
  MlPagination,
  MlPaw,
  MlPawBurst,
  MlPhone,
  MlPopconfirm,
  MlPopover,
  MlProgress,
  MlRadio,
  MlRadioGroup,
  MlRate,
  MlReveal,
  MlRing,
  MlSegmented,
  MlSelect,
  MlSkeleton,
  MlSkeletonItem,
  MlSlider,
  MlSparkline,
  MlSpotlight,
  MlStat,
  MlSteps,
  MlSwitch,
  MlTabBar,
  MlTable,
  MlTabs,
  MlTag,
  MlTextarea,
  MlTilt,
  MlTimePicker,
  MlTimeline,
  MlToastHost,
  MlTooltip,
  MlTransfer,
  MlTree,
  MlUpload,
  MlWatermark,
}

export { toast, useToast } from './toast'
export type { MlToastItem } from './toast'
export { vPawStamp, pawStamp, pawBurst } from './pawStamp'
export type { PawBurstOptions } from './pawStamp'
export { lionAvatarUrl, lionFullUrl, mascotImages } from './mascot'
export * from './types'
export { validateValue, isEmptyValue } from './form'
export type { MlFormRule, MlFormRules, MlFormErrors, MlValidatorResult } from './form'
export type { IconName } from './components/icons'

declare module 'vue' {
  export interface GlobalComponents {
    MlAccordion: typeof MlAccordion
    MlAffix: typeof MlAffix
    MlAlert: typeof MlAlert
    MlAutocomplete: typeof MlAutocomplete
    MlAvatar: typeof MlAvatar
    MlBackTop: typeof MlBackTop
    MlBadge: typeof MlBadge
    MlBarChart: typeof MlBarChart
    MlBorderBeam: typeof MlBorderBeam
    MlBreadcrumb: typeof MlBreadcrumb
    MlButton: typeof MlButton
    MlCalendar: typeof MlCalendar
    MlCard: typeof MlCard
    MlCarousel: typeof MlCarousel
    MlCheckbox: typeof MlCheckbox
    MlColorPicker: typeof MlColorPicker
    MlCombobox: typeof MlCombobox
    MlCountUp: typeof MlCountUp
    MlDatePicker: typeof MlDatePicker
    MlDateTimePicker: typeof MlDateTimePicker
    MlDecryptText: typeof MlDecryptText
    MlDivider: typeof MlDivider
    MlDonut: typeof MlDonut
    MlDrawer: typeof MlDrawer
    MlDropdown: typeof MlDropdown
    MlEmpty: typeof MlEmpty
    MlField: typeof MlField
    MlForm: typeof MlForm
    MlFormItem: typeof MlFormItem
    MlIcon: typeof MlIcon
    MlImage: typeof MlImage
    MlImagePreview: typeof MlImagePreview
    MlInput: typeof MlInput
    MlKbd: typeof MlKbd
    MlLionMark: typeof MlLionMark
    MlList: typeof MlList
    MlListItem: typeof MlListItem
    MlLoader: typeof MlLoader
    MlMarquee: typeof MlMarquee
    MlMascot: typeof MlMascot
    MlModal: typeof MlModal
    MlNavBar: typeof MlNavBar
    MlNumberInput: typeof MlNumberInput
    MlPagination: typeof MlPagination
    MlPaw: typeof MlPaw
    MlPawBurst: typeof MlPawBurst
    MlPhone: typeof MlPhone
    MlPopconfirm: typeof MlPopconfirm
    MlPopover: typeof MlPopover
    MlProgress: typeof MlProgress
    MlRadio: typeof MlRadio
    MlRadioGroup: typeof MlRadioGroup
    MlRate: typeof MlRate
    MlReveal: typeof MlReveal
    MlRing: typeof MlRing
    MlSegmented: typeof MlSegmented
    MlSelect: typeof MlSelect
    MlSkeleton: typeof MlSkeleton
    MlSkeletonItem: typeof MlSkeletonItem
    MlSlider: typeof MlSlider
    MlSparkline: typeof MlSparkline
    MlSpotlight: typeof MlSpotlight
    MlStat: typeof MlStat
    MlSteps: typeof MlSteps
    MlSwitch: typeof MlSwitch
    MlTabBar: typeof MlTabBar
    MlTable: typeof MlTable
    MlTabs: typeof MlTabs
    MlTag: typeof MlTag
    MlTextarea: typeof MlTextarea
    MlTilt: typeof MlTilt
    MlTimePicker: typeof MlTimePicker
    MlTimeline: typeof MlTimeline
    MlToastHost: typeof MlToastHost
    MlTooltip: typeof MlTooltip
    MlTransfer: typeof MlTransfer
    MlTree: typeof MlTree
    MlUpload: typeof MlUpload
    MlWatermark: typeof MlWatermark
  }
  export interface GlobalDirectives {
    vPawStamp: typeof vPawStamp
  }
}
