// Set videoSrc to a local MP4 when the portfolio reel is ready.
// Leave it empty to show the photo montage. Images remain the video fallback.
const heroSettings = {
  videoSrc: '',
  videoPoster: 'assets/projects/moonrocks/cover.jpg',
  interval: 5000,
  images: {
  "moonrocks": "assets/projects/moonrocks/03.jpg",
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
  "audrey-given": "assets/projects/audrey-given/cover.jpg",
  "grunge-girl": "assets/projects/grunge-girl/01.jpg"
},
  // Short silent loops cut from the films. They play in place of a still and
  // fall back to the poster if the clip can't load or motion is paused.
  videos: {
  "susan-shaw": {src: "assets/hero/susan-shaw-on-the-water.mp4", poster: "assets/hero/susan-shaw-on-the-water.jpg"},
  "avara": {src: "assets/hero/avara-fall.mp4", poster: "assets/hero/avara-fall.jpg"}
},
  collections: [
    ['moonrocks', 'dream-state-series', 'lodi-studios'],
    ['julia', 'rebirth', 'america'],
    ['fitish', 'susan-shaw', 'roadkill'],
    ['untie', 'avara', 'it-girl-roxylynn'],
    ['grunge-girl', 'diorcampaign', 'audrey-given']
  ]
};
