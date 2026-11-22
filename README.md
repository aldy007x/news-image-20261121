# news-image-20261121

![news-image-20261121](https://make.fun/badge/news-image-20261121.svg)
![rank](https://make.fun/badge/news-image-20261121/aldy007x/news-image-20261121/rank.svg)
![reward](https://make.fun/badge/news-image-20261121/aldy007x/news-image-20261121/reward.svg)

## The Daily Globe — Saturday 21 November 2026

A program that draws a newspaper front page summing up the world's news of
Saturday 21 November 2026, in one 1024x1024 PNG.

The front page leads with Wall Street's rout — the Nasdaq down 5.3% in a day,
its worst week since 2020 — and covers the missiles fired at Riyadh, Iran's
strike on US bases in Bahrain, the war spilling into Poland and the Gulf of
Finland, the capture of cartel boss "Chapo Isidro" in Mexico, the end of the
penny, and GTA VI's record first day.

## How it works

`main.ts` (Node 22, standard library only) draws everything itself:

- a small RGB canvas with its own rectangle, line and chart drawing,
- a 5x7 bitmap font designed for this entry,
- a hand-built PNG encoder (zlib from Node's standard library),
- a fixed newspaper layout: masthead, lead story with a falling-market chart,
  a right-hand rail, two middle columns and a bottom strip.

It runs with no network and is deterministic: two runs write byte-identical
files.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

The image is written to `out/entry.png` (1024x1024, under 1 MiB).

## License

MIT — see [LICENSE](LICENSE).
