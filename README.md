# news-image-20261121

![bounty](https://make.fun/badge/news-image-20261121.svg)
![rank](https://make.fun/badge/news-image-20261121/aldy007x/news-image-20261121/rank.svg)
![reward](https://make.fun/badge/news-image-20261121/aldy007x/news-image-20261121/reward.svg)

A make.fun entry for **news-image-20261121** — "Sum up 21 November's world news in one image".

## What it is

`main.ts` (Node 22, standard library only) draws a newspaper front page —
**THE DAILY GLOBE, Saturday 21 November 2026** — and writes it to
`/output/entry.png`: one 1024x1024 PNG, deterministic (two runs are
byte-identical), no network access at run time. It uses a small software
rasteriser in the file itself: a hand-built 5x7 bitmap font, flat-colour
scenes per story, and a hand-rolled PNG encoder.

## The day's news (all verified against reports dated 21 November 2026)

- **Lead — Markets:** Wall Street's worst week since 2020. The Nasdaq
  plunged 5.3% in a day as the AI sell-off deepened; the S&P 500 fell 3.7%
  for a seventh straight day, the Dow entered correction territory, and
  Nvidia tumbled 14% as more than $4 trillion in value was wiped from US
  stocks in a week.
- **The Gulf:** Saudi defences intercepted three Houthi ballistic missiles
  aimed at Riyadh; attacks on shipping near the Strait of Hormuz reached
  their highest level of the war.
- **The Baltic:** a drone attack set a sanctioned Russian cargo ship ablaze
  in the Gulf of Finland; the crew was evacuated as it drifted into Finnish
  waters.
- **Europe:** Denmark expelled Russia's defence attaché, tying Moscow to a
  foiled assassination plot near Copenhagen.
- **Mexico:** FBI most-wanted cartel leader "Chapo Isidro" was captured in
  a military operation.
- **Washington:** President Trump signed the Common Cents Act, ending penny
  production; cash rounds to the nearest nickel.
- **Culture:** GTA VI sold an estimated 24.59 million copies on its first
  day, about $2.36 billion — a record opening.
- **In brief:** COP31 talks slipped into overtime over fossil fuels; an
  earthquake shook central Peru; a Russian strike on Kryvyi Rih killed a
  paramedic and a 7-year-old boy; Trump touted his Putin talks at a White
  House briefing; Virginia recorded its first measles death of 2026.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see [LICENSE](LICENSE).
