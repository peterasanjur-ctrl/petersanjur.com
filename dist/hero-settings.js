// Set videoSrc to a local MP4 when the portfolio reel is ready.
// Leave it empty to show the photo montage. Images remain the video fallback.
const heroSettings = {
  videoSrc: '',
  videoPoster: 'assets/projects/moonrocks/cover.jpg',
  interval: 3000,
  images: {
  "rosama-my-forte": "assets/projects/rosama-my-forte/12.jpg",
  "dream-state-series": "assets/projects/dream-state-series/03.jpg",
  "lodi-studios": "assets/projects/lodi-studios/01.jpg",
  "julia": "assets/projects/julia/cover.jpg",
  "rebirth": "assets/projects/rebirth/cover-24.jpg",
  "america": "assets/projects/america/cover.jpg",
  "fitish": "assets/projects/fitish/01.jpg",
  "roadkill": "assets/projects/roadkill/02.jpg",
  "untie": "assets/projects/untie/01.jpg",
  "it-girl-roxylynn": "assets/projects/it-girl-roxylynn/02.jpg",
  "diorcampaign": "assets/projects/diorcampaign/04.jpg",
  "chevy-girl": "assets/projects/chevy-girl/10.jpg",
  "grunge-girl": "assets/projects/grunge-girl/01.jpg"
},
  // Optional framing (CSS object-position) for stills whose subject sits off-center.
  positions: {
  "roadkill": "35% center"
},
  // Short silent loops cut from the films. They play in place of a still, hold
  // their slide until the clip ends, and fall back to the poster if they can't load.
  videos: {
  "susan-shaw": {src: "assets/hero/susan-shaw-al-fresco-lunch.mp4", poster: "assets/hero/susan-shaw-al-fresco-lunch.jpg"},
  "avara": {src: "assets/hero/avara-fall.mp4", poster: "assets/hero/avara-fall.jpg"}
},
  collections: [
    ['rosama-my-forte', 'dream-state-series', 'lodi-studios'],
    ['julia', 'rebirth', 'america'],
    ['fitish', 'susan-shaw', 'roadkill'],
    ['untie', 'avara', 'it-girl-roxylynn'],
    ['grunge-girl', 'diorcampaign', 'chevy-girl']
  ]
};
