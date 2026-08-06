The seal mark on the application's tile, rendered from `icon.svg` by `bun run brand:icons`. Regenerate rather than editing these by hand.

`icon.svg` carries the opaque rounded tile the desktop icon needs, because a dock and a window icon are composited against whatever is behind them and a bare silhouette reads as broken there. The tile is the locked screen's light sand with the seal in the application's light background; these icons are a single static set that cannot follow the system theme, so the light pairing is the one that ships, being the one with real contrast.

The site's `site/public/favicon.svg` draws the same mark **without** the tile, since a browser tab supplies its own background and the tile becomes a dark square sitting in it. It carries both themes through a `prefers-color-scheme` rule, and in each the seal's fill is close to what surrounds it, so a contrasting stroke from the sand's own grain is what keeps the silhouette readable at tab size.

The two files are deliberately separate; a change to the mark belongs in both.
