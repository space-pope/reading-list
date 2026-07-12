import { build } from 'esbuild'

await build({
  entryPoints: ['static/app.ts'],
  bundle: true,
  outfile: 'static/app.js',
  format: 'iife',
  target: 'es2020',
  minify: true,
  sourcemap: false,
})

console.log('Built static/app.js')
