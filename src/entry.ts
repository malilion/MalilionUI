// Build entry: pulls the stylesheet into the bundle (emitted as dist/style.css)
// while keeping index.ts — and the published .d.ts — free of CSS imports.
import './styles/index.css'

export * from './index'
export { default } from './index'
