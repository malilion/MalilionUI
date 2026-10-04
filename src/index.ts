import type { App, Plugin } from 'vue'

import MlAccordion from './components/MlAccordion.vue'
import MlActionSheet from './components/MlActionSheet.vue'
import MlActionSheetHost from './components/MlActionSheetHost.vue'
import MlAffix from './components/MlAffix.vue'
import MlAlert from './components/MlAlert.vue'
import MlAnchor from './components/MlAnchor.vue'
import MlAutocomplete from './components/MlAutocomplete.vue'
import MlAvatar from './components/MlAvatar.vue'
import MlBackTop from './components/MlBackTop.vue'
import MlBadge from './components/MlBadge.vue'
import MlBanner from './components/MlBanner.vue'
import MlBarChart from './components/MlBarChart.vue'
import MlBorderBeam from './components/MlBorderBeam.vue'
import MlBottomSheet from './components/MlBottomSheet.vue'
import MlBreadcrumb from './components/MlBreadcrumb.vue'
import MlButton from './components/MlButton.vue'
import MlCalendar from './components/MlCalendar.vue'
import MlCard from './components/MlCard.vue'
import MlCarousel from './components/MlCarousel.vue'
import MlCascader from './components/MlCascader.vue'
import MlChat from './components/MlChat.vue'
import MlChatInput from './components/MlChatInput.vue'
import MlChatMessage from './components/MlChatMessage.vue'
import MlCheckbox from './components/MlCheckbox.vue'
import MlCheckboxGroup from './components/MlCheckboxGroup.vue'
import MlCodeBlock from './components/MlCodeBlock.vue'
import MlCodeDiff from './components/MlCodeDiff.vue'
import MlColorPicker from './components/MlColorPicker.vue'
import MlCombobox from './components/MlCombobox.vue'
import MlCommandPalette from './components/MlCommandPalette.vue'
import MlConfigProvider from './components/MlConfigProvider.vue'
import MlContextMenu from './components/MlContextMenu.vue'
import MlCopyButton from './components/MlCopyButton.vue'
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
import MlEllipsis from './components/MlEllipsis.vue'
import MlEmpty from './components/MlEmpty.vue'
import MlField from './components/MlField.vue'
import MlFloatButton from './components/MlFloatButton.vue'
import MlForm from './components/MlForm.vue'
import MlFormItem from './components/MlFormItem.vue'
import MlFunnelChart from './components/MlFunnelChart.vue'
import MlGauge from './components/MlGauge.vue'
import MlGrid from './components/MlGrid.vue'
import MlGridItem from './components/MlGridItem.vue'
import MlHeatmap from './components/MlHeatmap.vue'
import MlIcon from './components/MlIcon.vue'
import MlImage from './components/MlImage.vue'
import MlImageCropper from './components/MlImageCropper.vue'
import MlImagePreview from './components/MlImagePreview.vue'
import MlInfiniteScroll from './components/MlInfiniteScroll.vue'
import MlInput from './components/MlInput.vue'
import MlJsonViewer from './components/MlJsonViewer.vue'
import MlKanban from './components/MlKanban.vue'
import MlKbd from './components/MlKbd.vue'
import MlLayout from './components/MlLayout.vue'
import MlLineChart from './components/MlLineChart.vue'
import MlLionMark from './components/MlLionMark.vue'
import MlList from './components/MlList.vue'
import MlListItem from './components/MlListItem.vue'
import MlLoader from './components/MlLoader.vue'
import MlLuckyWheel from './components/MlLuckyWheel.vue'
import MlMarkdown from './components/MlMarkdown.vue'
import MlMarquee from './components/MlMarquee.vue'
import MlMascot from './components/MlMascot.vue'
import MlMasonry from './components/MlMasonry.vue'
import MlMention from './components/MlMention.vue'
import MlMenu from './components/MlMenu.vue'
import MlModal from './components/MlModal.vue'
import MlNavBar from './components/MlNavBar.vue'
import MlNumberInput from './components/MlNumberInput.vue'
import MlPagination from './components/MlPagination.vue'
import MlPasswordInput from './components/MlPasswordInput.vue'
import MlPaw from './components/MlPaw.vue'
import MlPawBurst from './components/MlPawBurst.vue'
import MlPhone from './components/MlPhone.vue'
import MlPickerView from './components/MlPickerView.vue'
import MlPinInput from './components/MlPinInput.vue'
import MlPopconfirm from './components/MlPopconfirm.vue'
import MlPopover from './components/MlPopover.vue'
import MlProgress from './components/MlProgress.vue'
import MlPullRefresh from './components/MlPullRefresh.vue'
import MlQRCode from './components/MlQRCode.vue'
import MlRadarChart from './components/MlRadarChart.vue'
import MlRadio from './components/MlRadio.vue'
import MlRadioGroup from './components/MlRadioGroup.vue'
import MlRate from './components/MlRate.vue'
import MlResult from './components/MlResult.vue'
import MlReveal from './components/MlReveal.vue'
import MlRing from './components/MlRing.vue'
import MlScatterChart from './components/MlScatterChart.vue'
import MlScrollbar from './components/MlScrollbar.vue'
import MlSegmented from './components/MlSegmented.vue'
import MlSelect from './components/MlSelect.vue'
import MlSignaturePad from './components/MlSignaturePad.vue'
import MlSkeleton from './components/MlSkeleton.vue'
import MlSkeletonItem from './components/MlSkeletonItem.vue'
import MlSlider from './components/MlSlider.vue'
import MlSortable from './components/MlSortable.vue'
import MlSpace from './components/MlSpace.vue'
import MlSparkline from './components/MlSparkline.vue'
import MlSplitter from './components/MlSplitter.vue'
import MlSpotlight from './components/MlSpotlight.vue'
import MlStat from './components/MlStat.vue'
import MlSteps from './components/MlSteps.vue'
import MlSwitch from './components/MlSwitch.vue'
import MlSwipeCell from './components/MlSwipeCell.vue'
import MlTabBar from './components/MlTabBar.vue'
import MlTable from './components/MlTable.vue'
import MlTabs from './components/MlTabs.vue'
import MlTag from './components/MlTag.vue'
import MlTagInput from './components/MlTagInput.vue'
import MlTaiwanRegion from './components/MlTaiwanRegion.vue'
import MlTaiwanMap from './components/MlTaiwanMap.vue'
import MlTerminal from './components/MlTerminal.vue'
import MlTextarea from './components/MlTextarea.vue'
import MlThemeToggle from './components/MlThemeToggle.vue'
import MlTilt from './components/MlTilt.vue'
import MlTimePicker from './components/MlTimePicker.vue'
import MlTimeline from './components/MlTimeline.vue'
import MlToastHost from './components/MlToastHost.vue'
import MlTooltip from './components/MlTooltip.vue'
import MlTour from './components/MlTour.vue'
import MlTransfer from './components/MlTransfer.vue'
import MlTree from './components/MlTree.vue'
import MlTreeSelect from './components/MlTreeSelect.vue'
import MlUpload from './components/MlUpload.vue'
import MlVirtualList from './components/MlVirtualList.vue'
import MlWatermark from './components/MlWatermark.vue'
import { vPawStamp } from './pawStamp'
import { vLoading } from './loading'
import { setLocale, type MlLocale } from './locale'
import { configureTheme, type MlThemeOptions } from './theme'

const components = {
  MlAccordion,
  MlActionSheet,
  MlActionSheetHost,
  MlAffix,
  MlAlert,
  MlAnchor,
  MlAutocomplete,
  MlAvatar,
  MlBackTop,
  MlBadge,
  MlBanner,
  MlBarChart,
  MlBorderBeam,
  MlBottomSheet,
  MlBreadcrumb,
  MlButton,
  MlCalendar,
  MlCard,
  MlCarousel,
  MlCascader,
  MlChat,
  MlChatInput,
  MlChatMessage,
  MlCheckbox,
  MlCheckboxGroup,
  MlCodeBlock,
  MlCodeDiff,
  MlColorPicker,
  MlCombobox,
  MlCommandPalette,
  MlConfigProvider,
  MlContextMenu,
  MlCopyButton,
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
  MlEllipsis,
  MlEmpty,
  MlField,
  MlFloatButton,
  MlForm,
  MlFormItem,
  MlFunnelChart,
  MlGauge,
  MlGrid,
  MlGridItem,
  MlHeatmap,
  MlIcon,
  MlImage,
  MlImageCropper,
  MlImagePreview,
  MlInfiniteScroll,
  MlInput,
  MlJsonViewer,
  MlKanban,
  MlKbd,
  MlLayout,
  MlLineChart,
  MlLionMark,
  MlList,
  MlListItem,
  MlLoader,
  MlLuckyWheel,
  MlMarkdown,
  MlMarquee,
  MlMascot,
  MlMasonry,
  MlMention,
  MlMenu,
  MlModal,
  MlNavBar,
  MlNumberInput,
  MlPagination,
  MlPasswordInput,
  MlPaw,
  MlPawBurst,
  MlPhone,
  MlPickerView,
  MlPinInput,
  MlPopconfirm,
  MlPopover,
  MlProgress,
  MlPullRefresh,
  MlQRCode,
  MlRadarChart,
  MlRadio,
  MlRadioGroup,
  MlRate,
  MlResult,
  MlReveal,
  MlRing,
  MlScatterChart,
  MlScrollbar,
  MlSegmented,
  MlSelect,
  MlSignaturePad,
  MlSkeleton,
  MlSkeletonItem,
  MlSlider,
  MlSortable,
  MlSpace,
  MlSparkline,
  MlSplitter,
  MlSpotlight,
  MlStat,
  MlSteps,
  MlSwitch,
  MlSwipeCell,
  MlTabBar,
  MlTable,
  MlTabs,
  MlTag,
  MlTagInput,
  MlTaiwanRegion,
  MlTaiwanMap,
  MlTerminal,
  MlTextarea,
  MlThemeToggle,
  MlTilt,
  MlTimePicker,
  MlTimeline,
  MlToastHost,
  MlTooltip,
  MlTour,
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
  /** Theme store options (storage key, default mode…), see `configureTheme`. */
  theme?: MlThemeOptions
}

/**
 * `app.use(MalilionUI)` registers every component and the v-paw-stamp directive.
 * `app.use(MalilionUI, { locale: en })` also sets the UI language.
 */
export const MalilionUI: Plugin<[MalilionUIOptions?]> = {
  install(app: App, options?: MalilionUIOptions) {
    if (options?.locale) setLocale(options.locale)
    if (options?.theme) configureTheme(options.theme)
    for (const [name, component] of Object.entries(components)) {
      app.component(name, component)
    }
    app.directive('paw-stamp', vPawStamp)
    app.directive('loading', vLoading)
  },
}

export default MalilionUI

export {
  MlAccordion,
  MlActionSheet,
  MlActionSheetHost,
  MlAffix,
  MlAlert,
  MlAnchor,
  MlAutocomplete,
  MlAvatar,
  MlBackTop,
  MlBadge,
  MlBanner,
  MlBarChart,
  MlBorderBeam,
  MlBottomSheet,
  MlBreadcrumb,
  MlButton,
  MlCalendar,
  MlCard,
  MlCarousel,
  MlCascader,
  MlChat,
  MlChatInput,
  MlChatMessage,
  MlCheckbox,
  MlCheckboxGroup,
  MlCodeBlock,
  MlCodeDiff,
  MlColorPicker,
  MlCombobox,
  MlCommandPalette,
  MlConfigProvider,
  MlContextMenu,
  MlCopyButton,
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
  MlEllipsis,
  MlEmpty,
  MlField,
  MlFloatButton,
  MlForm,
  MlFormItem,
  MlFunnelChart,
  MlGauge,
  MlGrid,
  MlGridItem,
  MlHeatmap,
  MlIcon,
  MlImage,
  MlImageCropper,
  MlImagePreview,
  MlInfiniteScroll,
  MlInput,
  MlJsonViewer,
  MlKanban,
  MlKbd,
  MlLayout,
  MlLineChart,
  MlLionMark,
  MlList,
  MlListItem,
  MlLoader,
  MlLuckyWheel,
  MlMarkdown,
  MlMarquee,
  MlMascot,
  MlMasonry,
  MlMention,
  MlMenu,
  MlModal,
  MlNavBar,
  MlNumberInput,
  MlPagination,
  MlPasswordInput,
  MlPaw,
  MlPawBurst,
  MlPhone,
  MlPickerView,
  MlPinInput,
  MlPopconfirm,
  MlPopover,
  MlProgress,
  MlPullRefresh,
  MlQRCode,
  MlRadarChart,
  MlRadio,
  MlRadioGroup,
  MlRate,
  MlResult,
  MlReveal,
  MlRing,
  MlScatterChart,
  MlScrollbar,
  MlSegmented,
  MlSelect,
  MlSignaturePad,
  MlSkeleton,
  MlSkeletonItem,
  MlSlider,
  MlSortable,
  MlSpace,
  MlSparkline,
  MlSplitter,
  MlSpotlight,
  MlStat,
  MlSteps,
  MlSwitch,
  MlSwipeCell,
  MlTabBar,
  MlTable,
  MlTabs,
  MlTag,
  MlTagInput,
  MlTaiwanRegion,
  MlTaiwanMap,
  MlTerminal,
  MlTextarea,
  MlThemeToggle,
  MlTilt,
  MlTimePicker,
  MlTimeline,
  MlToastHost,
  MlTooltip,
  MlTour,
  MlTransfer,
  MlTree,
  MlTreeSelect,
  MlUpload,
  MlVirtualList,
  MlWatermark,

}

export { toast, useToast } from './toast'
export { confirm, useConfirm } from './dialog'
export { actionSheet, useActionSheet } from './action-sheet'
export { parseSnapPoint, resolveSnapPoints, rubberBand, sheetPosition, releaseSnap, nearestSnap } from './components/sheet'
export type { SheetSnapPoint, SheetPosition, SheetReleaseOptions } from './components/sheet'
export { zhTW, en, setLocale, getLocale, useLocale } from './locale'
export type { MlLocale } from './locale'
export { configureTheme, getThemeState, setTheme, toggleTheme, subscribeTheme, themeInitScript } from './theme'
export type { MlThemeMode, MlResolvedTheme, MlThemeState, MlThemeOptions, MlThemeOrigin, MlSetThemeOptions } from './theme'
export { useTheme } from './useTheme'
export type { UseThemeReturn } from './useTheme'
export { copyText, copyRich, copySource, isClipboardSupported } from './clipboard'
export type { MlRichClipboard, MlCopySource } from './clipboard'
export { useClipboard } from './useClipboard'
export type { UseClipboardOptions, UseClipboardReturn } from './useClipboard'
export {
  parseJson,
  formatJsonPath,
  searchJson,
  flattenJson,
  stringifyJson,
  jsonSafeUrl,
  jsonIsDate,
} from './components/json'
export type { JsonParseResult, JsonParseError, JsonSegment, JsonRow, JsonNodeRow, JsonSearch } from './components/json'
export { encodeQr } from './qrcode'
export { highlight, highlightLines } from './highlight'
export { highlightTokens } from './highlight'
export type { HighlightToken } from './highlight'
export { diffLines, diffWords, diffFile, parsePatch, splitLines, decorateDiff, layoutDiff, foldRanges, diffFileName, diffLangOf, diffModel } from './diff'
export type {
  DiffLine,
  DiffLineType,
  DiffHunkHeader,
  DiffFile,
  DiffFileStatus,
  DiffOptions,
  DiffWordRanges,
  DiffSegment,
  DiffViewLine,
  DiffRow,
  DiffDecorateOptions,
  DiffLayoutOptions,
  DiffModelInput,
  MlCodeDiffView,
} from './diff'
export { parseMarkdown, parseInline, createMarkdownParser, sanitizeUrl, slugify, headingIds } from './markdown'
export type { MdBlock, MdInline, MdHeading, MdCode, MdList, MdListItem, MdTable, MdAlign, MdParseOptions, MlMarkdownCodeSlot, MlMarkdownLinkSlot, MlMarkdownImageSlot } from './markdown'
export type { QrLevel, QrMatrix } from './qrcode'
export type { SignatureStroke, SignaturePoint } from './components/signature'
export type { MlCropData, MlCropOutput } from './components/cropper'
export type { MlWheelPrize } from './components/wheel'
export { pickWeighted as pickWheelPrize } from './components/wheel'
export {
  datePickerColumns,
  timePickerColumns,
  dateToPickerValue,
  pickerValueToDate,
  daysInMonth,
  isLeapYear,
  resolvePicker as resolvePickerView,
} from './components/picker-wheel'
export type { MlPickerOption, MlPickerValue, MlPickerColumns, PickerDateOptions, PickerTimeOptions } from './components/picker-wheel'
export { parseTerminalMarkup, terminalPlainText, terminalTranscript, normalizeTerminalLines } from './components/terminal'
export type { MlTerminalLine, MlTerminalLineType, MlTerminalTone, MlTerminalScript, MlTerminalStyle, TerminalSegment } from './components/terminal'
export { scorePassword, checkPasswordRules } from './components/password'
export type { MlPasswordScore, MlPasswordRules, MlPasswordRuleKey, MlPasswordRuleResult } from './components/password'
export type { MlToastItem } from './toast'
export { vPawStamp, pawStamp, pawBurst } from './pawStamp'
export { vLoading } from './loading'
export type { MlLoadingOptions } from './loading'
export type { PawBurstOptions } from './pawStamp'
export { lionAvatarUrl, lionFullUrl, mascotImages } from './mascot'
export * from './types'
export { validateValue, isEmptyValue } from './form'
export {
  getTaiwanCounties,
  getTaiwanCounty,
  getTaiwanDistricts,
  findTaiwanDistrict,
  findTaiwanDistrictsByZip,
  searchTaiwanRegions,
  matchTaiwanDistrict,
  formatTaiwanAddress,
  normalizeTaiwanName,
} from './taiwan-regions'
export type { MlTaiwanRegionValue, TaiwanCounty, TaiwanDistrict, TaiwanRegionOptions, TaiwanAddressParts } from './taiwan-regions'
export {
  TAIWAN_MAP_SHAPES,
  TAIWAN_MAP_FRAMES,
  TAIWAN_MAP_SIZE,
  taiwanMapCounty,
  taiwanMapNeighbour,
  taiwanMapScale,
  taiwanMapValues,
} from './components/taiwan-map'
export type {
  MlTaiwanMapData,
  MlTaiwanMapDatum,
  MlTaiwanMapTone,
  MlTaiwanMapScale,
  MlTaiwanMapLang,
  MlTaiwanMapBucket,
  TaiwanMapShape,
  TaiwanMapFrame,
  TaiwanMapDirection,
  TaiwanMapScaleResult,
} from './components/taiwan-map'
export * from './validators-tw'
export type { MlFormRule, MlFormRules, MlFormErrors, MlValidatorResult } from './form'
export type { IconName } from './components/icons'

declare module 'vue' {
  export interface GlobalComponents {
    MlAccordion: typeof MlAccordion
    MlActionSheet: typeof MlActionSheet
    MlActionSheetHost: typeof MlActionSheetHost
    MlAffix: typeof MlAffix
    MlAlert: typeof MlAlert
    MlAnchor: typeof MlAnchor
    MlAutocomplete: typeof MlAutocomplete
    MlAvatar: typeof MlAvatar
    MlBackTop: typeof MlBackTop
    MlBadge: typeof MlBadge
    MlBanner: typeof MlBanner
    MlBarChart: typeof MlBarChart
    MlBorderBeam: typeof MlBorderBeam
    MlBottomSheet: typeof MlBottomSheet
    MlBreadcrumb: typeof MlBreadcrumb
    MlButton: typeof MlButton
    MlCalendar: typeof MlCalendar
    MlCard: typeof MlCard
    MlCarousel: typeof MlCarousel
    MlCascader: typeof MlCascader
    MlChat: typeof MlChat
    MlChatInput: typeof MlChatInput
    MlChatMessage: typeof MlChatMessage
    MlCheckbox: typeof MlCheckbox
    MlCheckboxGroup: typeof MlCheckboxGroup
    MlCodeBlock: typeof MlCodeBlock
    MlCodeDiff: typeof MlCodeDiff
    MlColorPicker: typeof MlColorPicker
    MlCombobox: typeof MlCombobox
    MlCommandPalette: typeof MlCommandPalette
    MlConfigProvider: typeof MlConfigProvider
    MlContextMenu: typeof MlContextMenu
    MlCopyButton: typeof MlCopyButton
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
    MlEllipsis: typeof MlEllipsis
    MlEmpty: typeof MlEmpty
    MlField: typeof MlField
    MlFloatButton: typeof MlFloatButton
    MlForm: typeof MlForm
    MlFormItem: typeof MlFormItem
    MlFunnelChart: typeof MlFunnelChart
    MlGauge: typeof MlGauge
    MlGrid: typeof MlGrid
    MlGridItem: typeof MlGridItem
    MlHeatmap: typeof MlHeatmap
    MlIcon: typeof MlIcon
    MlImage: typeof MlImage
    MlImageCropper: typeof MlImageCropper
    MlImagePreview: typeof MlImagePreview
    MlInfiniteScroll: typeof MlInfiniteScroll
    MlInput: typeof MlInput
    MlJsonViewer: typeof MlJsonViewer
    MlKanban: typeof MlKanban
    MlKbd: typeof MlKbd
    MlLayout: typeof MlLayout
    MlLineChart: typeof MlLineChart
    MlLionMark: typeof MlLionMark
    MlList: typeof MlList
    MlListItem: typeof MlListItem
    MlLoader: typeof MlLoader
    MlLuckyWheel: typeof MlLuckyWheel
    MlMarkdown: typeof MlMarkdown
    MlMarquee: typeof MlMarquee
    MlMascot: typeof MlMascot
    MlMasonry: typeof MlMasonry
    MlMention: typeof MlMention
    MlMenu: typeof MlMenu
    MlModal: typeof MlModal
    MlNavBar: typeof MlNavBar
    MlNumberInput: typeof MlNumberInput
    MlPagination: typeof MlPagination
    MlPasswordInput: typeof MlPasswordInput
    MlPaw: typeof MlPaw
    MlPawBurst: typeof MlPawBurst
    MlPhone: typeof MlPhone
    MlPickerView: typeof MlPickerView
    MlPinInput: typeof MlPinInput
    MlPopconfirm: typeof MlPopconfirm
    MlPopover: typeof MlPopover
    MlProgress: typeof MlProgress
    MlPullRefresh: typeof MlPullRefresh
    MlQRCode: typeof MlQRCode
    MlRadarChart: typeof MlRadarChart
    MlRadio: typeof MlRadio
    MlRadioGroup: typeof MlRadioGroup
    MlRate: typeof MlRate
    MlResult: typeof MlResult
    MlReveal: typeof MlReveal
    MlRing: typeof MlRing
    MlScatterChart: typeof MlScatterChart
    MlScrollbar: typeof MlScrollbar
    MlSegmented: typeof MlSegmented
    MlSelect: typeof MlSelect
    MlSignaturePad: typeof MlSignaturePad
    MlSkeleton: typeof MlSkeleton
    MlSkeletonItem: typeof MlSkeletonItem
    MlSlider: typeof MlSlider
    MlSortable: typeof MlSortable
    MlSpace: typeof MlSpace
    MlSparkline: typeof MlSparkline
    MlSplitter: typeof MlSplitter
    MlSpotlight: typeof MlSpotlight
    MlStat: typeof MlStat
    MlSteps: typeof MlSteps
    MlSwitch: typeof MlSwitch
    MlSwipeCell: typeof MlSwipeCell
    MlTabBar: typeof MlTabBar
    MlTable: typeof MlTable
    MlTabs: typeof MlTabs
    MlTag: typeof MlTag
    MlTagInput: typeof MlTagInput
    MlTaiwanRegion: typeof MlTaiwanRegion
    MlTaiwanMap: typeof MlTaiwanMap
    MlTerminal: typeof MlTerminal
    MlTextarea: typeof MlTextarea
    MlThemeToggle: typeof MlThemeToggle
    MlTilt: typeof MlTilt
    MlTimePicker: typeof MlTimePicker
    MlTimeline: typeof MlTimeline
    MlToastHost: typeof MlToastHost
    MlTooltip: typeof MlTooltip
    MlTour: typeof MlTour
    MlTransfer: typeof MlTransfer
    MlTree: typeof MlTree
    MlTreeSelect: typeof MlTreeSelect
    MlUpload: typeof MlUpload
    MlVirtualList: typeof MlVirtualList
    MlWatermark: typeof MlWatermark

  }
  export interface GlobalDirectives {
    vPawStamp: typeof vPawStamp
    vLoading: typeof vLoading
  }
}
