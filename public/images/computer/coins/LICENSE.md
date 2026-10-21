# Coin photographs

Both photographers released their own photographs under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
The photo licences require neither attribution nor share-alike. Sources checked 21 October 2026.

| Runtime file | Photograph | Photographer | Source |
| --- | --- | --- | --- |
| `nickel-2005.webp` | 2005 US nickel, obverse | 910doitagain | [Commons source and CC0 dedication](https://commons.wikimedia.org/wiki/File:2005_nickel_obverse.jpg) |
| `euro-2003.webp` | 2003 German €1 coin, national side | Renhour48 | [Commons source and CC0 dedication](https://commons.wikimedia.org/wiki/File:Allemagne_-_Pi%C3%A8ce_de_1_euro_-_2003.jpg) |

## Reproducing the runtime assets

Original JPEGs:

- <https://upload.wikimedia.org/wikipedia/commons/9/90/2005_nickel_obverse.jpg>
- <https://upload.wikimedia.org/wikipedia/commons/0/00/Allemagne_-_Pi%C3%A8ce_de_1_euro_-_2003.jpg>

With Sharp, crop the euro to `{ left: 84, top: 74, width: 530, height: 534 }`.
Use the full nickel image. Resize each image to 1024 × 1024 pixels, add an alpha
channel, and composite a white circle of radius 512 pixels centred at (512, 512)
with `blend: "dest-in"`. Encode WebP at quality 90. The circular crop removes the
photograph's background so the visible coin diameter matches the scale model.

The site displays the nickel at 21.21 mm and the euro at 23.25 mm.
