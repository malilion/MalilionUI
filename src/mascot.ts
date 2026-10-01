// The Malilion mascot — the little lion in a black hoodie — as bundled images.
// Imported assets are inlined by the library build, so they work with no extra
// setup. They live on one object so the minifier keeps a single copy of each
// data URI instead of inlining it into every component that uses it.
import avatar from './assets/lion-avatar.webp'
import full from './assets/lion-full.webp'

export const mascotImages: { readonly avatar: string; readonly full: string } = Object.freeze({ avatar, full })

/** Head-and-shoulders portrait, 256 × 256 webp. */
export const lionAvatarUrl = mascotImages.avatar
/** Full-body art, 400 × 421 webp. */
export const lionFullUrl = mascotImages.full
