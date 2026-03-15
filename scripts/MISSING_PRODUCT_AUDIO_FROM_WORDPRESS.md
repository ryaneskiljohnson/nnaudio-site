# Missing product audio – locations in old nnaudio WordPress backup

**Backup root:**  
`/Users/rjmacbookpro/Downloads/d227218b-873a-4766-94ed-5f02e04dd709_full_2026-03-15T22_14_00Z/wp-content`

Paths below are under that root (e.g. `uploads/2023/06/...`).

---

## Products with dead links → files found in backup

| Product (slug) | Demo name / storage path | File in WordPress backup |
|----------------|--------------------------|---------------------------|
| **apache-free-midi** | Apache MIDI Audio Demo | `uploads/2023/06/Apache-MIDI-Demo.mp3` |
| **freelay-free-delay-module-plugin** | Freelay-Audio-Demo-1.mp3 | `uploads/2023/06/Freelay-Audio-Demo-1.mp3` |
| **freeq-free-eq-module-plugin** | FreeQ-Audio-Demo.mp3 | `uploads/2023/06/FreeQ-Audio-Demo.mp3` |
| **freeverb-free-reverb-module-plugin** | Freeverb-Audio-Demo.mp3 | `uploads/2023/06/Freeverb-Audio-Demo.mp3` |
| **midi-mob-midi-bundle** | MIDI-Mob-Bundle-2000-MIDI-File-Loops.mp3 | `uploads/2023/07/MIDI-Mob-Bundle-2000-MIDI-File-Loops.mp3` |
| **midi-nerds-free-midi** | MIDI Nerds Audio Demo | `uploads/2023/06/MIDI-Nerds-Demo-Beat.mp3` |
| **ooze-midi** | Ooze MIDI Audio Demo | `uploads/2023/05/Ooze-Audio-Demo-New-Nation.mp3` |
| **primal-cthulhu** | Primal-Cthulhu-Demo.mp3, Modern-Cthulhu-Demo.mp3 | `uploads/2023/05/Primal-Cthulhu-Demo.mp3`, `uploads/2023/05/Modern-Cthulhu-Demo.mp3` |
| **rabbit-hole-free-midi** | Rabbit Hole MIDI Audio Demo | `uploads/2023/06/Rabbit-Hole-Demo.mp3` |
| **reflection-cthulhu** | Reflection-Cthulhu-Demo, Yonkers-Cthulhu-Demo | `uploads/2023/05/Reflection-Cthulhu-Demo-Audio-New-Nation.mp3`, `uploads/2023/05/Yonkers-Cthulhu-Demo-Beat-New-Nation.mp3` |
| **ride-away-modern-song-constructions** | Ride Away Audio Demo | `uploads/2024/02/Ride-Away-Modern-Song-Constructions-Demo.mp3` |
| **royal-family-midi** | Royal Family MIDI Audio Demo | `uploads/2023/05/Royal-Family-Bundle-Demo.mp3` |
| **so-far-gone-midi** | So Far Gone MIDI Audio Demo | `uploads/2023/05/So-Far-Gone-MIDI-Collection-Audio-Demo.mp3` |
| **sterfreeo-free-stereo-module-plugin** | Sterfreeo-Audio-Demo-1.mp3 | `uploads/2023/06/Sterfreeo-Audio-Demo-1.mp3` |
| **strange-tingz-free-80s-plugin** | Strange-Tingz-Demo-Audio.mp3 | `uploads/2023/05/Strange-Tingz-Demo-Audio.mp3` |
| **sun-goes-down-midi** | Sun Goes Down MIDI Audio Demo | `uploads/2023/05/Sun-Goes-Down-Demo-Audio.mp3` |
| **swiper-midi-free** | Swiper MIDI Audio Demo | `uploads/2023/06/Swiper-MIDI-Demo.mp3` |
| **the-code-modern-song-constructions** | The Code Audio Demo | `uploads/2024/02/The-Code-Modern-Song-Constructions-Demo.mp3` |
| **time-zones-midi** | Time Zones MIDI Audio Demo | `uploads/2023/05/Time-Zones-Demo-Audio.mp3` |
| **trapsoul-midi** | Trapsoul MIDI Audio Demo | `uploads/2023/05/TrapsoulMIDI_DemoAudio.mp3` |
| **ultimate-drums-percs-1** | Ultimate Drums & Percs 1 Audio Demo | `uploads/2023/05/Ultimate-Drums-Percs-Demo.mp3` |
| **ultimate-drums-percs-2** | Ultimate Drums & Percs 2 Audio Demo | `uploads/2023/05/Ultimate-Drums-Percs-2-Demo.mp3` |
| **ultimate-midi-collection-2** | 2 demos | `uploads/2023/05/Ultimate-MIDI-Collection-2-Audio-Demo.mp3`, `uploads/2023/05/Ultimate-Drums-Percs-Demo.mp3` |
| **umc6-midi** | 5 demos (Element, Flower, Life-Death, UMC6, Yonkers) | `uploads/2023/05/Element-Cthulhu-Demo-New-Nation.mp3`, `uploads/2023/05/Flower-Cthulhu-Demo-Beat.mp3`, `uploads/2023/05/Life-Death-MIDI-Collection-Audio-Demo.mp3`, `uploads/2023/05/Ultimate-MIDI-Collection-6-Audio-Demo.mp3`, `uploads/2023/05/Yonkers-Cthulhu-Demo-Beat-New-Nation.mp3` |
| **weaknd-cthulhu** | 4 demos | `uploads/2023/05/Weaknd-Cthulhu-Demo-Audio-New-Nation.mp3`, `uploads/2023/05/Reflection-Cthulhu-Demo-Audio-New-Nation.mp3`, `uploads/2023/05/Modern-Cthulhu-Demo.mp3`, `uploads/2023/05/Modern-Cthulhu-2-Demo.mp3` |
| **yonkers-cthulhu** | 2 demos | `uploads/2023/05/Yonkers-Cthulhu-Demo-Beat-New-Nation.mp3`, `uploads/2023/05/Weaknd-Cthulhu-Demo-Audio-New-Nation.mp3` |

---

## Upload convention

- Bucket: `product-audio`
- Path: `{product-slug}/{filename}` (e.g. `apache-free-midi/Apache-MIDI-Demo.mp3`)
- Then set `products.audio_samples` for that product to the new public URLs.
