import type { App, Plugin } from 'vue'

import MlAccordion from './components/MlAccordion.vue'
import MlAffix from './components/MlAffix.vue'
import MlAlert from './components/MlAlert.vue'
import MlAnchor from './components/MlAnchor.vue'
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
import MlCascader from './components/MlCascader.vue'
import MlCheckbox from './components/MlCheckbox.vue'
import MlColorPicker from './components/MlColorPicker.vue'
import MlCombobox from './components/MlCombobox.vue'
import MlCommandPalette from './components/MlCommandPalette.vue'
import MlConfigProvider from './components/MlConfigProvider.vue'
import MlContextMenu from './components/MlContextMenu.vue'
import MlCountUp from './components/MlCountUp.vue'
import MlCountdown from './components/MlCountdown.vue'
import MlDatePicker from './components/MlDatePicker.vue'
import MlDateRangePicker from './components/MlDateRangePicker.vue'
import MlDateTimePicker from './components/MlDateTimePicker.vue'
import MlDecryptText from './components/MlDecryptText.vue'
import MlDescriptions from './components/MlDescriptions.vue'
import MlDialogHost from './components/MlDialogHost.vue'
import MlDivider from './components/MlDivider.vue'
import MlDonut from './components/MlDonut.vue'
import MlDrawer from './components/MlDrawer.vue'
import MlDropdown from './components/MlDropdown.vue'
import MlEmpty from './components/MlEmpty.vue'
import MlField from './components/MlField.vue'
import MlForm from './components/MlForm.vue'
import MlFormItem from './components/MlFormItem.vue'
import MlGrid from './components/MlGrid.vue'
import MlGridItem from './components/MlGridItem.vue'
import MlIcon from './components/MlIcon.vue'
import MlImage from './components/MlImage.vue'
import MlImagePreview from './components/MlImagePreview.vue'
import MlInfiniteScroll from './components/MlInfiniteScroll.vue'
import MlInput from './components/MlInput.vue'
import MlKbd from './components/MlKbd.vue'
import MlLayout from './components/MlLayout.vue'
import MlLineChart from './components/MlLineChart.vue'
import MlLionMark from './components/MlLionMark.vue'
import MlList from './components/MlList.vue'
import MlListItem from './components/MlListItem.vue'
import MlLoader from './components/MlLoader.vue'
import MlMarquee from './components/MlMarquee.vue'
import MlMascot from './components/MlMascot.vue'
import MlMenu from './components/MlMenu.vue'
import MlModal from './components/MlModal.vue'
import MlNavBar from './components/MlNavBar.vue'
import MlNumberInput from './components/MlNumberInput.vue'
import MlPagination from './components/MlPagination.vue'
import MlPaw from './components/MlPaw.vue'
import MlPawBurst from './components/MlPawBurst.vue'
import MlPhone from './components/MlPhone.vue'
import MlPinInput from './components/MlPinInput.vue'
import MlPopconfirm from './components/MlPopconfirm.vue'
import MlPopover from './components/MlPopover.vue'
import MlProgress from './components/MlProgress.vue'
import MlQRCode from './components/MlQRCode.vue'
import MlRadio from './components/MlRadio.vue'
import MlRadioGroup from './components/MlRadioGroup.vue'
import MlRate from './components/MlRate.vue'
import MlResult from './components/MlResult.vue'
import MlReveal from './components/MlReveal.vue'
import MlRing from './components/MlRing.vue'
import MlSegmented from './components/MlSegmented.vue'
import MlSelect from './components/MlSelect.vue'
import MlSkeleton from './components/MlSkeleton.vue'
import MlSkeletonItem from './components/MlSkeletonItem.vue'
import MlSlider from './components/MlSlider.vue'
import MlSpace from './components/MlSpace.vue'
import MlSparkline from './components/MlSparkline.vue'
import MlSplitter from './components/MlSplitter.vue'
import MlSpotlight from './components/MlSpotlight.vue'
import MlStat from './components/MlStat.vue'
import MlSteps from './components/MlSteps.vue'
import MlSwitch from './components/MlSwitch.vue'
import MlTabBar from './components/MlTabBar.vue'
import MlTable from './components/MlTable.vue'
import MlTabs from './components/MlTabs.vue'
import MlTag from './components/MlTag.vue'
import MlTagInput from './components/MlTagInput.vue'
import MlTextarea from './components/MlTextarea.vue'
import MlTilt from './components/MlTilt.vue'
import MlTimePicker from './components/MlTimePicker.vue'
import MlTimeline from './components/MlTimeline.vue'
import MlToastHost from './components/MlToastHost.vue'
import MlTooltip from './components/MlTooltip.vue'
import MlTransfer from './components/MlTransfer.vue'
import MlTree from './components/MlTree.vue'
import MlTreeSelect from './components/MlTreeSelect.vue'
import MlUpload from './components/MlUpload.vue'
import MlVirtualList from './components/MlVirtualList.vue'
import MlWatermark from './components/MlWatermark.vue'
import { vPawStamp } from './pawStamp'
import { setLocale, type MlLocale } from './locale'

const components = {
  MlAccordion,
  MlAffix,
  MlAlert,
  MlAnchor,
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
  MlCascader,
  MlCheckbox,
  MlColorPicker,
  MlCombobox,
  MlCommandPalette,
  MlConfigProvider,
  MlContextMenu,
  MlCountUp,
  MlCountdown,
  MlDatePicker,
  MlDateRangePicker,
  MlDateTimePicker,
  MlDecryptText,
  MlDescriptions,
  MlDialogHost,
  MlDivider,
  MlDonut,
  MlDrawer,
  MlDropdown,
  MlEmpty,
  MlField,
  MlForm,
  MlFormItem,
  MlGrid,
  MlGridItem,
  MlIcon,
  MlImage,
  MlImagePreview,
  MlInfiniteScroll,
  MlInput,
  MlKbd,
  MlLayout,
  MlLineChart,
  MlLionMark,
  MlList,
  MlListItem,
  MlLoader,
  MlMarquee,
  MlMascot,
  MlMenu,
  MlModal,
  MlNavBar,
  MlNumberInput,
  MlPagination,
  MlPaw,
  MlPawBurst,
  MlPhone,
  MlPinInput,
  MlPopconfirm,
  MlPopover,
  MlProgress,
  MlQRCode,
  MlRadio,
  MlRadioGroup,
  MlRate,
  MlResult,
  MlReveal,
  MlRing,
  MlSegmented,
  MlSelect,
  MlSkeleton,
  MlSkeletonItem,
  MlSlider,
  MlSpace,
  MlSparkline,
  MlSplitter,
  MlSpotlight,
  MlStat,
  MlSteps,
  MlSwitch,
  MlTabBar,
  MlTable,
  MlTabs,
  MlTag,
  MlTagInput,
  MlTextarea,
  MlTilt,
  MlTimePicker,
  MlTimeline,
  MlToastHost,
  MlTooltip,
  MlTransfer,
  MlTree,
  MlTreeSelect,
  MlUpload,
  MlVirtualList,
  MlWatermark,

}

export interface MalilionUIOptions {
  /** App-wide UI language, e.g. `en`. Defaults to Traditional Chinese (`zhTW`). */
  locale?: MlLocale
}

/**
 * `app.use(MalilionUI)` registers every component and the v-paw-stamp directive.
 * `app.use(MalilionUI, { locale: en })` also sets the UI language.
 */
export const MalilionUI: Plugin<[MalilionUIOptions?]> = {
  install(app: App, options?: MalilionUIOptions) {
    if (options?.locale) setLocale(options.locale)
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
  MlAnchor,
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
  MlCascader,
  MlCheckbox,
  MlColorPicker,
  MlCombobox,
  MlCommandPalette,
  MlConfigProvider,
  MlContextMenu,
  MlCountUp,
  MlCountdown,
  MlDatePicker,
  MlDateRangePicker,
  MlDateTimePicker,
  MlDecryptText,
  MlDescriptions,
  MlDialogHost,
  MlDivider,
  MlDonut,
  MlDrawer,
  MlDropdown,
  MlEmpty,
  MlField,
  MlForm,
  MlFormItem,
  MlGrid,
  MlGridItem,
  MlIcon,
  MlImage,
  MlImagePreview,
  MlInfiniteScroll,
  MlInput,
  MlKbd,
  MlLayout,
  MlLineChart,
  MlLionMark,
  MlList,
  MlListItem,
  MlLoader,
  MlMarquee,
  MlMascot,
  MlMenu,
  MlModal,
  MlNavBar,
  MlNumberInput,
  MlPagination,
  MlPaw,
  MlPawBurst,
  MlPhone,
  MlPinInput,
  MlPopconfirm,
  MlPopover,
  MlProgress,
  MlQRCode,
  MlRadio,
  MlRadioGroup,
  MlRate,
  MlResult,
  MlReveal,
  MlRing,
  MlSegmented,
  MlSelect,
  MlSkeleton,
  MlSkeletonItem,
  MlSlider,
  MlSpace,
  MlSparkline,
  MlSplitter,
  MlSpotlight,
  MlStat,
  MlSteps,
  MlSwitch,
  MlTabBar,
  MlTable,
  MlTabs,
  MlTag,
  MlTagInput,
  MlTextarea,
  MlTilt,
  MlTimePicker,
  MlTimeline,
  MlToastHost,
  MlTooltip,
  MlTransfer,
  MlTree,
  MlTreeSelect,
  MlUpload,
  MlVirtualList,
  MlWatermark,

}

export { toast, useToast } from './toast'
export { confirm, useConfirm } from './dialog'
export { zhTW, en, setLocale, getLocale, useLocale } from './locale'
export type { MlLocale } from './locale'
export { encodeQr } from './qrcode'
export type { QrLevel, QrMatrix } from './qrcode'
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
    MlAnchor: typeof MlAnchor
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
    MlCascader: typeof MlCascader
    MlCheckbox: typeof MlCheckbox
    MlColorPicker: typeof MlColorPicker
    MlCombobox: typeof MlCombobox
    MlCommandPalette: typeof MlCommandPalette
    MlConfigProvider: typeof MlConfigProvider
    MlContextMenu: typeof MlContextMenu
    MlCountUp: typeof MlCountUp
    MlCountdown: typeof MlCountdown
    MlDatePicker: typeof MlDatePicker
    MlDateRangePicker: typeof MlDateRangePicker
    MlDateTimePicker: typeof MlDateTimePicker
    MlDecryptText: typeof MlDecryptText
    MlDescriptions: typeof MlDescriptions
    MlDialogHost: typeof MlDialogHost
    MlDivider: typeof MlDivider
    MlDonut: typeof MlDonut
    MlDrawer: typeof MlDrawer
    MlDropdown: typeof MlDropdown
    MlEmpty: typeof MlEmpty
    MlField: typeof MlField
    MlForm: typeof MlForm
    MlFormItem: typeof MlFormItem
    MlGrid: typeof MlGrid
    MlGridItem: typeof MlGridItem
    MlIcon: typeof MlIcon
    MlImage: typeof MlImage
    MlImagePreview: typeof MlImagePreview
    MlInfiniteScroll: typeof MlInfiniteScroll
    MlInput: typeof MlInput
    MlKbd: typeof MlKbd
    MlLayout: typeof MlLayout
    MlLineChart: typeof MlLineChart
    MlLionMark: typeof MlLionMark
    MlList: typeof MlList
    MlListItem: typeof MlListItem
    MlLoader: typeof MlLoader
    MlMarquee: typeof MlMarquee
    MlMascot: typeof MlMascot
    MlMenu: typeof MlMenu
    MlModal: typeof MlModal
    MlNavBar: typeof MlNavBar
    MlNumberInput: typeof MlNumberInput
    MlPagination: typeof MlPagination
    MlPaw: typeof MlPaw
    MlPawBurst: typeof MlPawBurst
    MlPhone: typeof MlPhone
    MlPinInput: typeof MlPinInput
    MlPopconfirm: typeof MlPopconfirm
    MlPopover: typeof MlPopover
    MlProgress: typeof MlProgress
    MlQRCode: typeof MlQRCode
    MlRadio: typeof MlRadio
    MlRadioGroup: typeof MlRadioGroup
    MlRate: typeof MlRate
    MlResult: typeof MlResult
    MlReveal: typeof MlReveal
    MlRing: typeof MlRing
    MlSegmented: typeof MlSegmented
    MlSelect: typeof MlSelect
    MlSkeleton: typeof MlSkeleton
    MlSkeletonItem: typeof MlSkeletonItem
    MlSlider: typeof MlSlider
    MlSpace: typeof MlSpace
    MlSparkline: typeof MlSparkline
    MlSplitter: typeof MlSplitter
    MlSpotlight: typeof MlSpotlight
    MlStat: typeof MlStat
    MlSteps: typeof MlSteps
    MlSwitch: typeof MlSwitch
    MlTabBar: typeof MlTabBar
    MlTable: typeof MlTable
    MlTabs: typeof MlTabs
    MlTag: typeof MlTag
    MlTagInput: typeof MlTagInput
    MlTextarea: typeof MlTextarea
    MlTilt: typeof MlTilt
    MlTimePicker: typeof MlTimePicker
    MlTimeline: typeof MlTimeline
    MlToastHost: typeof MlToastHost
    MlTooltip: typeof MlTooltip
    MlTransfer: typeof MlTransfer
    MlTree: typeof MlTree
    MlTreeSelect: typeof MlTreeSelect
    MlUpload: typeof MlUpload
    MlVirtualList: typeof MlVirtualList
    MlWatermark: typeof MlWatermark

  }
  export interface GlobalDirectives {
    vPawStamp: typeof vPawStamp
  }
}
