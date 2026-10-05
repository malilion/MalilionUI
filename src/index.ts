import type { App, Plugin } from 'vue'

import MlAccordion from './components/MlAccordion.vue'
import MlActionSheet from './components/MlActionSheet.vue'
import MlActionSheetHost from './components/MlActionSheetHost.vue'
import MlAffix from './components/MlAffix.vue'
import MlAlert from './components/MlAlert.vue'
import MlAmountInput from './components/MlAmountInput.vue'
import MlAnchor from './components/MlAnchor.vue'
import MlAudioPlayer from './components/MlAudioPlayer.vue'
import MlAurora from './components/MlAurora.vue'
import MlAutocomplete from './components/MlAutocomplete.vue'
import MlAvatar from './components/MlAvatar.vue'
import MlAvatarGroup from './components/MlAvatarGroup.vue'
import MlBackTop from './components/MlBackTop.vue'
import MlBadge from './components/MlBadge.vue'
import MlBankPicker from './components/MlBankPicker.vue'
import MlBanner from './components/MlBanner.vue'
import MlBarChart from './components/MlBarChart.vue'
import MlBarcode from './components/MlBarcode.vue'
import MlBorderBeam from './components/MlBorderBeam.vue'
import MlBottomSheet from './components/MlBottomSheet.vue'
import MlBoxPlot from './components/MlBoxPlot.vue'
import MlBreadcrumb from './components/MlBreadcrumb.vue'
import MlBulletChart from './components/MlBulletChart.vue'
import MlButton from './components/MlButton.vue'
import MlButtonGroup from './components/MlButtonGroup.vue'
import MlCalendar from './components/MlCalendar.vue'
import MlCandlestick from './components/MlCandlestick.vue'
import MlCard from './components/MlCard.vue'
import MlCarousel from './components/MlCarousel.vue'
import MlCascader from './components/MlCascader.vue'
import MlChat from './components/MlChat.vue'
import MlChatInput from './components/MlChatInput.vue'
import MlChatMessage from './components/MlChatMessage.vue'
import MlCheckbox from './components/MlCheckbox.vue'
import MlCheckboxGroup from './components/MlCheckboxGroup.vue'
import MlClock from './components/MlClock.vue'
import MlCodeBlock from './components/MlCodeBlock.vue'
import MlCodeDiff from './components/MlCodeDiff.vue'
import MlColorPicker from './components/MlColorPicker.vue'
import MlCombobox from './components/MlCombobox.vue'
import MlCommandPalette from './components/MlCommandPalette.vue'
import MlComments from './components/MlComments.vue'
import MlConfigProvider from './components/MlConfigProvider.vue'
import MlContextMenu from './components/MlContextMenu.vue'
import MlCopyButton from './components/MlCopyButton.vue'
import MlCountUp from './components/MlCountUp.vue'
import MlCuteIcon from './components/MlCuteIcon.vue'
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
import MlFilterBar from './components/MlFilterBar.vue'
import MlFloatButton from './components/MlFloatButton.vue'
import MlForm from './components/MlForm.vue'
import MlFormItem from './components/MlFormItem.vue'
import MlFunnelChart from './components/MlFunnelChart.vue'
import MlGauge from './components/MlGauge.vue'
import MlGacha from './components/MlGacha.vue'
import MlGantt from './components/MlGantt.vue'
import MlGlobe from './components/MlGlobe.vue'
import MlGridLottery from './components/MlGridLottery.vue'
import MlGrid from './components/MlGrid.vue'
import MlGridItem from './components/MlGridItem.vue'
import MlHeatmap from './components/MlHeatmap.vue'
import MlHighlight from './components/MlHighlight.vue'
import MlIcon from './components/MlIcon.vue'
import MlImage from './components/MlImage.vue'
import MlImageCropper from './components/MlImageCropper.vue'
import MlImagePreview from './components/MlImagePreview.vue'
import MlInbox from './components/MlInbox.vue'
import MlIndexBar from './components/MlIndexBar.vue'
import MlInfiniteScroll from './components/MlInfiniteScroll.vue'
import MlInput from './components/MlInput.vue'
import MlInputMask from './components/MlInputMask.vue'
import MlInvoiceChecker from './components/MlInvoiceChecker.vue'
import MlJsonViewer from './components/MlJsonViewer.vue'
import MlKanban from './components/MlKanban.vue'
import MlKbd from './components/MlKbd.vue'
import MlLayout from './components/MlLayout.vue'
import MlLineChart from './components/MlLineChart.vue'
import MlLink from './components/MlLink.vue'
import MlLionMark from './components/MlLionMark.vue'
import MlList from './components/MlList.vue'
import MlListItem from './components/MlListItem.vue'
import MlLoader from './components/MlLoader.vue'
import MlLuckyWheel from './components/MlLuckyWheel.vue'
import MlLunarCalendar from './components/MlLunarCalendar.vue'
import MlMarkdown from './components/MlMarkdown.vue'
import MlMarquee from './components/MlMarquee.vue'
import MlMascot from './components/MlMascot.vue'
import MlMasonry from './components/MlMasonry.vue'
import MlMention from './components/MlMention.vue'
import MlMenu from './components/MlMenu.vue'
import MlModal from './components/MlModal.vue'
import MlNavBar from './components/MlNavBar.vue'
import MlNumberInput from './components/MlNumberInput.vue'
import MlNumberKeyboard from './components/MlNumberKeyboard.vue'
import MlPagination from './components/MlPagination.vue'
import MlParticles from './components/MlParticles.vue'
import MlPasswordInput from './components/MlPasswordInput.vue'
import MlPaw from './components/MlPaw.vue'
import MlPuzzle from './components/MlPuzzle.vue'
import MlPawBurst from './components/MlPawBurst.vue'
import MlPhone from './components/MlPhone.vue'
import MlPickerView from './components/MlPickerView.vue'
import MlPinInput from './components/MlPinInput.vue'
import MlPopconfirm from './components/MlPopconfirm.vue'
import MlPopover from './components/MlPopover.vue'
import MlProgress from './components/MlProgress.vue'
import MlPullRefresh from './components/MlPullRefresh.vue'
import MlQRCode from './components/MlQRCode.vue'
import MlQueryBuilder from './components/MlQueryBuilder.vue'
import MlRadar from './components/MlRadar.vue'
import MlRadarChart from './components/MlRadarChart.vue'
import MlRadio from './components/MlRadio.vue'
import MlRadioGroup from './components/MlRadioGroup.vue'
import MlRate from './components/MlRate.vue'
import MlResult from './components/MlResult.vue'
import MlReveal from './components/MlReveal.vue'
import MlRing from './components/MlRing.vue'
import MlScheduler from './components/MlScheduler.vue'
import MlScratchCard from './components/MlScratchCard.vue'
import MlSankey from './components/MlSankey.vue'
import MlScatterChart from './components/MlScatterChart.vue'
import MlScrollbar from './components/MlScrollbar.vue'
import MlSegmented from './components/MlSegmented.vue'
import MlSelect from './components/MlSelect.vue'
import MlSignaturePad from './components/MlSignaturePad.vue'
import MlSkeleton from './components/MlSkeleton.vue'
import MlSkeletonItem from './components/MlSkeletonItem.vue'
import MlSliderCaptcha from './components/MlSliderCaptcha.vue'
import MlSlider from './components/MlSlider.vue'
import MlSortable from './components/MlSortable.vue'
import MlSpace from './components/MlSpace.vue'
import MlSparkline from './components/MlSparkline.vue'
import MlSplitter from './components/MlSplitter.vue'
import MlSpotlight from './components/MlSpotlight.vue'
import MlStat from './components/MlStat.vue'
import MlSteps from './components/MlSteps.vue'
import MlStickerPicker from './components/MlStickerPicker.vue'
import MlSwitch from './components/MlSwitch.vue'
import MlSwipeCell from './components/MlSwipeCell.vue'
import MlSwipeStack from './components/MlSwipeStack.vue'
import MlTabBar from './components/MlTabBar.vue'
import MlTable from './components/MlTable.vue'
import MlTabs from './components/MlTabs.vue'
import MlTag from './components/MlTag.vue'
import MlTagInput from './components/MlTagInput.vue'
import MlTaiwanAddress from './components/MlTaiwanAddress.vue'
import MlTaiwanRegion from './components/MlTaiwanRegion.vue'
import MlTaiwanMap from './components/MlTaiwanMap.vue'
import MlTerminal from './components/MlTerminal.vue'
import MlText from './components/MlText.vue'
import MlTextarea from './components/MlTextarea.vue'
import MlThemeToggle from './components/MlThemeToggle.vue'
import MlTilt from './components/MlTilt.vue'
import MlTimePicker from './components/MlTimePicker.vue'
import MlTimeRangePicker from './components/MlTimeRangePicker.vue'
import MlTimeline from './components/MlTimeline.vue'
import MlTitle from './components/MlTitle.vue'
import MlToastHost from './components/MlToastHost.vue'
import MlTooltip from './components/MlTooltip.vue'
import MlToggleGroup from './components/MlToggleGroup.vue'
import MlTour from './components/MlTour.vue'
import MlTransfer from './components/MlTransfer.vue'
import MlTree from './components/MlTree.vue'
import MlTreeSelect from './components/MlTreeSelect.vue'
import MlTreemap from './components/MlTreemap.vue'
import MlUpload from './components/MlUpload.vue'
import MlVideoPlayer from './components/MlVideoPlayer.vue'
import MlVirtualList from './components/MlVirtualList.vue'
import MlWaterfallChart from './components/MlWaterfallChart.vue'
import MlWatermark from './components/MlWatermark.vue'
import MlZhuyin from './components/MlZhuyin.vue'
import { vPawStamp } from './pawStamp'
import { vLoading } from './loading'
import { setLocale, type MlLocaleInput } from './locale'
import { configureTheme, type MlThemeOptions } from './theme'

const components = {
  MlAccordion,
  MlActionSheet,
  MlActionSheetHost,
  MlAffix,
  MlAlert,
  MlAmountInput,
  MlAnchor,
  MlAudioPlayer,
  MlAurora,
  MlAutocomplete,
  MlAvatar,
  MlAvatarGroup,
  MlBackTop,
  MlBadge,
  MlBankPicker,
  MlBanner,
  MlBarChart,
  MlBarcode,
  MlBorderBeam,
  MlBottomSheet,
  MlBoxPlot,
  MlBreadcrumb,
  MlBulletChart,
  MlButton,
  MlButtonGroup,
  MlCalendar,
  MlCandlestick,
  MlCard,
  MlCarousel,
  MlCascader,
  MlChat,
  MlChatInput,
  MlChatMessage,
  MlCheckbox,
  MlCheckboxGroup,
  MlClock,
  MlCodeBlock,
  MlCodeDiff,
  MlColorPicker,
  MlCombobox,
  MlCommandPalette,
  MlComments,
  MlConfigProvider,
  MlContextMenu,
  MlCopyButton,
  MlCountUp,
  MlCuteIcon,
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
  MlFilterBar,
  MlFloatButton,
  MlForm,
  MlFormItem,
  MlFunnelChart,
  MlGauge,
  MlGacha,
  MlGantt,
  MlGlobe,
  MlGridLottery,
  MlGrid,
  MlGridItem,
  MlHeatmap,
  MlHighlight,
  MlIcon,
  MlImage,
  MlImageCropper,
  MlImagePreview,
  MlInbox,
  MlIndexBar,
  MlInfiniteScroll,
  MlInput,
  MlInputMask,
  MlInvoiceChecker,
  MlJsonViewer,
  MlKanban,
  MlKbd,
  MlLayout,
  MlLineChart,
  MlLink,
  MlLionMark,
  MlList,
  MlListItem,
  MlLoader,
  MlLuckyWheel,
  MlLunarCalendar,
  MlMarkdown,
  MlMarquee,
  MlMascot,
  MlMasonry,
  MlMention,
  MlMenu,
  MlModal,
  MlNavBar,
  MlNumberInput,
  MlNumberKeyboard,
  MlPagination,
  MlParticles,
  MlPasswordInput,
  MlPaw,
  MlPuzzle,
  MlPawBurst,
  MlPhone,
  MlPickerView,
  MlPinInput,
  MlPopconfirm,
  MlPopover,
  MlProgress,
  MlPullRefresh,
  MlQRCode,
  MlQueryBuilder,
  MlRadar,
  MlRadarChart,
  MlRadio,
  MlRadioGroup,
  MlRate,
  MlResult,
  MlReveal,
  MlRing,
  MlScheduler,
  MlScratchCard,
  MlSankey,
  MlScatterChart,
  MlScrollbar,
  MlSegmented,
  MlSelect,
  MlSignaturePad,
  MlSkeleton,
  MlSkeletonItem,
  MlSliderCaptcha,
  MlSlider,
  MlSortable,
  MlSpace,
  MlSparkline,
  MlSplitter,
  MlSpotlight,
  MlStat,
  MlSteps,
  MlStickerPicker,
  MlSwitch,
  MlSwipeCell,
  MlSwipeStack,
  MlTabBar,
  MlTable,
  MlTabs,
  MlTag,
  MlTagInput,
  MlTaiwanAddress,
  MlTaiwanRegion,
  MlTaiwanMap,
  MlTerminal,
  MlText,
  MlTextarea,
  MlThemeToggle,
  MlTilt,
  MlTimePicker,
  MlTimeRangePicker,
  MlTimeline,
  MlTitle,
  MlToastHost,
  MlTooltip,
  MlToggleGroup,
  MlTour,
  MlTransfer,
  MlTree,
  MlTreeSelect,
  MlTreemap,
  MlUpload,
  MlVideoPlayer,
  MlVirtualList,
  MlWaterfallChart,
  MlWatermark,
  MlZhuyin,

}

export interface MalilionUIOptions {
  /** App-wide UI language, e.g. `en`. Defaults to Traditional Chinese (`zhTW`). */
  locale?: MlLocaleInput
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
  MlAmountInput,
  MlAnchor,
  MlAudioPlayer,
  MlAurora,
  MlAutocomplete,
  MlAvatar,
  MlAvatarGroup,
  MlBackTop,
  MlBadge,
  MlBankPicker,
  MlBanner,
  MlBarChart,
  MlBarcode,
  MlBorderBeam,
  MlBottomSheet,
  MlBoxPlot,
  MlBreadcrumb,
  MlBulletChart,
  MlButton,
  MlButtonGroup,
  MlCalendar,
  MlCandlestick,
  MlCard,
  MlCarousel,
  MlCascader,
  MlChat,
  MlChatInput,
  MlChatMessage,
  MlCheckbox,
  MlCheckboxGroup,
  MlClock,
  MlCodeBlock,
  MlCodeDiff,
  MlColorPicker,
  MlCombobox,
  MlCommandPalette,
  MlComments,
  MlConfigProvider,
  MlContextMenu,
  MlCopyButton,
  MlCountUp,
  MlCuteIcon,
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
  MlFilterBar,
  MlFloatButton,
  MlForm,
  MlFormItem,
  MlFunnelChart,
  MlGauge,
  MlGacha,
  MlGantt,
  MlGlobe,
  MlGridLottery,
  MlGrid,
  MlGridItem,
  MlHeatmap,
  MlHighlight,
  MlIcon,
  MlImage,
  MlImageCropper,
  MlImagePreview,
  MlInbox,
  MlIndexBar,
  MlInfiniteScroll,
  MlInput,
  MlInputMask,
  MlInvoiceChecker,
  MlJsonViewer,
  MlKanban,
  MlKbd,
  MlLayout,
  MlLineChart,
  MlLink,
  MlLionMark,
  MlList,
  MlListItem,
  MlLoader,
  MlLuckyWheel,
  MlLunarCalendar,
  MlMarkdown,
  MlMarquee,
  MlMascot,
  MlMasonry,
  MlMention,
  MlMenu,
  MlModal,
  MlNavBar,
  MlNumberInput,
  MlNumberKeyboard,
  MlPagination,
  MlParticles,
  MlPasswordInput,
  MlPaw,
  MlPuzzle,
  MlPawBurst,
  MlPhone,
  MlPickerView,
  MlPinInput,
  MlPopconfirm,
  MlPopover,
  MlProgress,
  MlPullRefresh,
  MlQRCode,
  MlQueryBuilder,
  MlRadar,
  MlRadarChart,
  MlRadio,
  MlRadioGroup,
  MlRate,
  MlResult,
  MlReveal,
  MlRing,
  MlScheduler,
  MlScratchCard,
  MlSankey,
  MlScatterChart,
  MlScrollbar,
  MlSegmented,
  MlSelect,
  MlSignaturePad,
  MlSkeleton,
  MlSkeletonItem,
  MlSliderCaptcha,
  MlSlider,
  MlSortable,
  MlSpace,
  MlSparkline,
  MlSplitter,
  MlSpotlight,
  MlStat,
  MlSteps,
  MlStickerPicker,
  MlSwitch,
  MlSwipeCell,
  MlSwipeStack,
  MlTabBar,
  MlTable,
  MlTabs,
  MlTag,
  MlTagInput,
  MlTaiwanAddress,
  MlTaiwanRegion,
  MlTaiwanMap,
  MlTerminal,
  MlText,
  MlTextarea,
  MlThemeToggle,
  MlTilt,
  MlTimePicker,
  MlTimeRangePicker,
  MlTimeline,
  MlTitle,
  MlToastHost,
  MlTooltip,
  MlToggleGroup,
  MlTour,
  MlTransfer,
  MlTree,
  MlTreeSelect,
  MlTreemap,
  MlUpload,
  MlVideoPlayer,
  MlVirtualList,
  MlWaterfallChart,
  MlWatermark,
  MlZhuyin,

}

export { toast, useToast } from './toast'
export { confirm, useConfirm } from './dialog'
export { actionSheet, useActionSheet } from './action-sheet'
export { parseSnapPoint, resolveSnapPoints, rubberBand, sheetPosition, releaseSnap, nearestSnap } from './components/sheet'
export type { SheetSnapPoint, SheetPosition, SheetReleaseOptions } from './components/sheet'
export { zhTW, en, setLocale, getLocale, useLocale, completeLocale } from './locale'
export type { MlLocale, MlLocaleInput } from './locale'
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
export { encodeBarcode, barcodeLayout, ean13CheckDigit } from './barcode'
export {
  timeRangeSeconds,
  formatTimeRangeDuration,
  isOvernight,
  validateTimeRange,
  timeRangeRules,
  setTimeRangeEnd,
} from './components/time-range'
export type { MlTimeRange, MlTimeRangePreset, TimeRangeIssue, TimeRangeOptions } from './components/time-range'
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
export { safeHref } from './url'
export type { MdBlock, MdInline, MdHeading, MdCode, MdList, MdListItem, MdTable, MdAlign, MdParseOptions, MlMarkdownCodeSlot, MlMarkdownLinkSlot, MlMarkdownImageSlot } from './markdown'
export type { QrLevel, QrMatrix } from './qrcode'
export type { MlBarcodeFormat, BarcodeEncoding, BarcodeLayout, BarcodeLayoutOptions } from './barcode'
export type { MlTitleLevel } from './components/typography'
export { splitAvatars } from './components/avatar-group'
export { nextTabAfterClose } from './components/tabs'
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
export * from './roc'
export { MASK_PRESETS, MASK_TOKENS, applyMask, parseMask, resolveMask, maskPlaceholder, formatAmount, formatAmountInput, groupDigits, amountInChinese } from './components/mask'
export type { MlMaskPreset, MlMaskToken, MaskResult, AmountOptions } from './components/mask'
export { keyboardLayout, shuffledDigits } from './components/number-keyboard'
export * from './zhuyin'
export { groupIndexItems, indexOrder } from './components/index-bar'
export type { IndexGroup } from './components/index-bar'
export { allDayBars, layoutColumns, monthLayout, moveEvent, resizeEvent, timedSegments, viewDays } from './components/scheduler'
export type { MlSchedulerEvent, MlSchedulerView, MlSchedulerDate, SchedulerRange, SchedulerSegment, AllDayBar, MonthItem, MonthLayout } from './components/scheduler'
export { PLAYBACK_RATES, formatMediaTime, playerKeyAction } from './components/player'
export type { MlMediaSource, MlMediaTrack, PlayerAction } from './components/player'
export { matchFilters, filterChips, filterText, isEmptyFilter, clearFilter, evaluateQuery, queryToText, createRule, createGroup, countRules, isQueryGroup, isRuleComplete, QUERY_OPERATORS } from './components/filter'
export type { MlFilterField, MlFilterFieldType, MlFilterValue, FilterChip, MlQueryField, MlQueryFieldType, MlQueryOperator, MlQueryRule, MlQueryGroup, MlQueryNode } from './components/filter'
export { waterfallLayout, boxStats, boxLayout, bulletRows, quantile } from './components/charts-stat'
export type { MlWaterfallDatum, WaterfallBar, MlBoxDatum, MlBoxStats, MlBulletDatum, BulletRow } from './components/charts-stat'
export { formatTwAddress, parseTwAddress, formatStreet, twZipStatus, chineseNumeral, isTwAddressComplete, emptyTaiwanAddress } from './components/address'
export type { MlTaiwanAddressValue, ParsedTaiwanAddress, TwZipStatus } from './components/address'
export { splitHighlight, foldWidth } from './components/highlight-text'
export type { HighlightChunk, HighlightOptions } from './components/highlight-text'
export { nextToggleValue, toggleSelection } from './components/toggle-group'
export type { MlNumberKeyboardTheme, NumberKeyboardKey } from './components/number-keyboard'
export {
  getTwBanks,
  getTwBank,
  isKnownTwBankCode,
  matchTwBank,
  searchTwBanks,
  formatTwBank,
  formatTwBankAccount,
  normalizeTwBankAccount,
  registerTwBanks,
  TW_BANK_KINDS_DEFAULT,
} from './tw-banks'
export type { TwBank, TwBankInput, TwBankKind, TwBankOptions } from './tw-banks'
export {
  toLunar,
  fromLunar,
  lunarDayName,
  lunarMonthName,
  lunarLeapMonth,
  lunarMonthDays,
  ganZhiYear,
  zodiacIndex,
  solarTerms,
  solarTermOn,
  twHolidays,
  twOfficialDays,
  TW_OFFICIAL_YEARS,
  TW_HOLIDAY_VERIFIED_FROM,
  SOLAR_TERMS,
  ZODIAC,
  ZODIAC_EN,
  HEAVENLY_STEMS,
  EARTHLY_BRANCHES,
  LUNAR_MIN_YEAR,
  LUNAR_MAX_YEAR,
  TW_HOLIDAY_ACT_DATE,
} from './tw-calendar'
export type { LunarDate, SolarTerm, SolarTermName, TwHoliday, TwHolidayOptions, TwOfficialDay } from './tw-calendar'
export { lunarHolidayMap } from './components/lunar-calendar'
export type { MlLunarHoliday, MlLunarHolidays, LunarCell, LunarDayInfo } from './components/lunar-calendar'
export {
  INVOICE_PRIZES,
  checkInvoice,
  quickCheckInvoice,
  parseInvoiceNumber,
  invoiceDrawNumbers,
  invoiceSuffixMatch,
} from './invoice'
export type {
  MlInvoiceDraw,
  MlInvoiceCloudPrize,
  MlInvoiceResult,
  InvoicePrize,
  InvoicePrizeTier,
  InvoiceCandidate,
  InvoiceCheckStatus,
  ParsedInvoiceNumber,
} from './invoice'
export type { InvoiceMode } from './components/invoice-view'
export type { MlFormRule, MlFormRules, MlFormErrors, MlValidatorResult } from './form'
export type { IconName } from './components/icons'
export { cuteIcons, CUTE_ICON_GROUPS, CUTE_ICON_NAMES } from './components/cute-icons'
export type { CuteIconName, CuteColor, CuteLayer, CuteLayerKind, MlCuteIconAnimation, MlCuteIconVariant } from './components/cute-icons'
export {
  puzzleEdges,
  puzzlePiecePath,
  puzzleRandom,
  puzzleShuffle,
  puzzleSolved,
  puzzleSwap,
} from './components/puzzle'
export type { MlPuzzleResult, MlPuzzleTone, PuzzleEdges, PuzzleDirection } from './components/puzzle'
export {
  GLOBE_HOME,
  globeArcPath,
  globeDistance,
  globeFormatPoint,
  globeProject,
} from './components/globe'
export { lotteryTone, gridSchedule, gachaCapsules } from './components/lottery'
export type { MlLotteryPrize, MlLotteryTone, MlLotteryDecision, GachaPhase } from './components/lottery'
export { captchaHit, captchaPiecePath, captchaTarget } from './components/captcha'
export type { MlCaptchaAttempt, MlCaptchaTarget, MlCaptchaTone, CaptchaState } from './components/captcha'
export type { MlScratchTone } from './components/scratch'
export type { MlGlobeArc, MlGlobeMarker, MlGlobePoint, MlGlobeTone, GlobeView, GlobeProjected } from './components/globe'
export { AURORA_PALETTES } from './components/aurora'
export type { MlAuroraPalette } from './components/aurora'
export { particleBurst, particleCount, particleField, particleLinks, particleStep } from './components/particles'
export type { MlParticlesInteraction, MlParticlesShape, MlParticlesTone, Particle, ParticleField } from './components/particles'
export { radarBearing, radarGlow, radarPolar, radarPosition } from './components/radar'
export type { MlRadarBlip, MlRadarTone } from './components/radar'
export { clockAngles, clockDigital, clockFormatOffset, clockOffset, clockTime } from './components/clock'
export type { ClockAngles, ClockTime, MlClockInput, MlClockMotion, MlClockNumerals, MlClockTone } from './components/clock'
export { squarify, treemapLayout } from './components/treemap'
export type { MlTreemapDatum, TreemapRect, TreemapTile, TreemapGroup, TreemapLayout } from './components/treemap'
export { sankeyLayout, sankeyRibbon } from './components/sankey'
export type { MlSankeyNode, MlSankeyLink, SankeyLayout, SankeyNodeBox, SankeyRibbon } from './components/sankey'
export { ganttDay, ganttDate, ganttFormat, ganttISO, ganttSpans, ganttRange, ganttTicks } from './components/gantt'
export type { MlGanttTask, MlGanttDate, MlGanttScale, GanttSpan, GanttTick } from './components/gantt'
export { movingAverage, candleChange, candleTime, zoomRange, panRange, clampRange } from './components/candlestick'
export type { MlCandle, MlCandleUpColor, CandleRange } from './components/candlestick'
export { relativeTime, daysAgo } from './components/relative-time'
export type { MlTimeInput } from './components/relative-time'
export { STICKER_KEYWORDS, searchStickers, stickerMatches } from './components/stickers'
export type { StickerGroupId } from './components/stickers'
export { commentTree, countComments, sortComments, toggleCommentLike, addComment } from './components/comments'
export type { MlComment, MlCommentAuthor, MlCommentSort, MlCommentNode } from './components/comments'
export { swipeDecision, dragRotation, stampStrength, flyOut } from './components/swipe-stack'
export type { MlSwipeDirection } from './components/swipe-stack'
export { inboxGroups, inboxCounts, inboxFilter } from './components/inbox'
export type { MlInboxItem, MlInboxTab, MlInboxType, MlInboxGroupId } from './components/inbox'

declare module 'vue' {
  export interface GlobalComponents {
    MlAccordion: typeof MlAccordion
    MlActionSheet: typeof MlActionSheet
    MlActionSheetHost: typeof MlActionSheetHost
    MlAffix: typeof MlAffix
    MlAlert: typeof MlAlert
    MlAmountInput: typeof MlAmountInput
    MlAnchor: typeof MlAnchor
    MlAudioPlayer: typeof MlAudioPlayer
    MlAurora: typeof MlAurora
    MlAutocomplete: typeof MlAutocomplete
    MlAvatar: typeof MlAvatar
    MlAvatarGroup: typeof MlAvatarGroup
    MlBackTop: typeof MlBackTop
    MlBadge: typeof MlBadge
    MlBankPicker: typeof MlBankPicker
    MlBanner: typeof MlBanner
    MlBarChart: typeof MlBarChart
    MlBarcode: typeof MlBarcode
    MlBorderBeam: typeof MlBorderBeam
    MlBottomSheet: typeof MlBottomSheet
    MlBoxPlot: typeof MlBoxPlot
    MlBreadcrumb: typeof MlBreadcrumb
    MlBulletChart: typeof MlBulletChart
    MlButton: typeof MlButton
    MlButtonGroup: typeof MlButtonGroup
    MlCalendar: typeof MlCalendar
    MlCandlestick: typeof MlCandlestick
    MlCard: typeof MlCard
    MlCarousel: typeof MlCarousel
    MlCascader: typeof MlCascader
    MlChat: typeof MlChat
    MlChatInput: typeof MlChatInput
    MlChatMessage: typeof MlChatMessage
    MlCheckbox: typeof MlCheckbox
    MlCheckboxGroup: typeof MlCheckboxGroup
    MlClock: typeof MlClock
    MlCodeBlock: typeof MlCodeBlock
    MlCodeDiff: typeof MlCodeDiff
    MlColorPicker: typeof MlColorPicker
    MlCombobox: typeof MlCombobox
    MlCommandPalette: typeof MlCommandPalette
    MlComments: typeof MlComments
    MlConfigProvider: typeof MlConfigProvider
    MlContextMenu: typeof MlContextMenu
    MlCopyButton: typeof MlCopyButton
    MlCountUp: typeof MlCountUp
    MlCuteIcon: typeof MlCuteIcon
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
    MlFilterBar: typeof MlFilterBar
    MlFloatButton: typeof MlFloatButton
    MlForm: typeof MlForm
    MlFormItem: typeof MlFormItem
    MlFunnelChart: typeof MlFunnelChart
    MlGauge: typeof MlGauge
    MlGacha: typeof MlGacha
    MlGantt: typeof MlGantt
    MlGlobe: typeof MlGlobe
    MlGridLottery: typeof MlGridLottery
    MlGrid: typeof MlGrid
    MlGridItem: typeof MlGridItem
    MlHeatmap: typeof MlHeatmap
    MlHighlight: typeof MlHighlight
    MlIcon: typeof MlIcon
    MlImage: typeof MlImage
    MlImageCropper: typeof MlImageCropper
    MlImagePreview: typeof MlImagePreview
    MlInbox: typeof MlInbox
    MlIndexBar: typeof MlIndexBar
    MlInfiniteScroll: typeof MlInfiniteScroll
    MlInput: typeof MlInput
    MlInputMask: typeof MlInputMask
    MlInvoiceChecker: typeof MlInvoiceChecker
    MlJsonViewer: typeof MlJsonViewer
    MlKanban: typeof MlKanban
    MlKbd: typeof MlKbd
    MlLayout: typeof MlLayout
    MlLineChart: typeof MlLineChart
    MlLink: typeof MlLink
    MlLionMark: typeof MlLionMark
    MlList: typeof MlList
    MlListItem: typeof MlListItem
    MlLoader: typeof MlLoader
    MlLuckyWheel: typeof MlLuckyWheel
    MlLunarCalendar: typeof MlLunarCalendar
    MlMarkdown: typeof MlMarkdown
    MlMarquee: typeof MlMarquee
    MlMascot: typeof MlMascot
    MlMasonry: typeof MlMasonry
    MlMention: typeof MlMention
    MlMenu: typeof MlMenu
    MlModal: typeof MlModal
    MlNavBar: typeof MlNavBar
    MlNumberInput: typeof MlNumberInput
    MlNumberKeyboard: typeof MlNumberKeyboard
    MlPagination: typeof MlPagination
    MlParticles: typeof MlParticles
    MlPasswordInput: typeof MlPasswordInput
    MlPaw: typeof MlPaw
    MlPuzzle: typeof MlPuzzle
    MlPawBurst: typeof MlPawBurst
    MlPhone: typeof MlPhone
    MlPickerView: typeof MlPickerView
    MlPinInput: typeof MlPinInput
    MlPopconfirm: typeof MlPopconfirm
    MlPopover: typeof MlPopover
    MlProgress: typeof MlProgress
    MlPullRefresh: typeof MlPullRefresh
    MlQRCode: typeof MlQRCode
    MlQueryBuilder: typeof MlQueryBuilder
    MlRadar: typeof MlRadar
    MlRadarChart: typeof MlRadarChart
    MlRadio: typeof MlRadio
    MlRadioGroup: typeof MlRadioGroup
    MlRate: typeof MlRate
    MlResult: typeof MlResult
    MlReveal: typeof MlReveal
    MlRing: typeof MlRing
    MlScheduler: typeof MlScheduler
    MlScratchCard: typeof MlScratchCard
    MlSankey: typeof MlSankey
    MlScatterChart: typeof MlScatterChart
    MlScrollbar: typeof MlScrollbar
    MlSegmented: typeof MlSegmented
    MlSelect: typeof MlSelect
    MlSignaturePad: typeof MlSignaturePad
    MlSkeleton: typeof MlSkeleton
    MlSkeletonItem: typeof MlSkeletonItem
    MlSliderCaptcha: typeof MlSliderCaptcha
    MlSlider: typeof MlSlider
    MlSortable: typeof MlSortable
    MlSpace: typeof MlSpace
    MlSparkline: typeof MlSparkline
    MlSplitter: typeof MlSplitter
    MlSpotlight: typeof MlSpotlight
    MlStat: typeof MlStat
    MlSteps: typeof MlSteps
    MlStickerPicker: typeof MlStickerPicker
    MlSwitch: typeof MlSwitch
    MlSwipeCell: typeof MlSwipeCell
    MlSwipeStack: typeof MlSwipeStack
    MlTabBar: typeof MlTabBar
    MlTable: typeof MlTable
    MlTabs: typeof MlTabs
    MlTag: typeof MlTag
    MlTagInput: typeof MlTagInput
    MlTaiwanAddress: typeof MlTaiwanAddress
    MlTaiwanRegion: typeof MlTaiwanRegion
    MlTaiwanMap: typeof MlTaiwanMap
    MlTerminal: typeof MlTerminal
    MlText: typeof MlText
    MlTextarea: typeof MlTextarea
    MlThemeToggle: typeof MlThemeToggle
    MlTilt: typeof MlTilt
    MlTimePicker: typeof MlTimePicker
    MlTimeRangePicker: typeof MlTimeRangePicker
    MlTimeline: typeof MlTimeline
    MlTitle: typeof MlTitle
    MlToastHost: typeof MlToastHost
    MlTooltip: typeof MlTooltip
    MlToggleGroup: typeof MlToggleGroup
    MlTour: typeof MlTour
    MlTransfer: typeof MlTransfer
    MlTree: typeof MlTree
    MlTreeSelect: typeof MlTreeSelect
    MlTreemap: typeof MlTreemap
    MlUpload: typeof MlUpload
    MlVideoPlayer: typeof MlVideoPlayer
    MlVirtualList: typeof MlVirtualList
    MlWaterfallChart: typeof MlWaterfallChart
    MlWatermark: typeof MlWatermark
    MlZhuyin: typeof MlZhuyin

  }
  export interface GlobalDirectives {
    vPawStamp: typeof vPawStamp
    vLoading: typeof vLoading
  }
}
