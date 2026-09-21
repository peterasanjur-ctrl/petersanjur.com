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
  "fitish": "assets/projects/fitish/01.jpg",
  "roadkill": "assets/projects/roadkill/02.jpg",
  "untie": "assets/projects/untie/01.jpg",
  "it-girl-roxylynn": "assets/projects/it-girl-roxylynn/02.jpg",
  "diorcampaign": "assets/projects/diorcampaign/02.jpg",
  "audrey-given": "assets/projects/audrey-given/cover.jpg"
},
  collections: [
    ['moonrocks', 'dream-state-series', 'lodi-studios'],
    ['fitish', 'roadkill', 'untie'],
    ['it-girl-roxylynn', 'diorcampaign', 'audrey-given']
  ]
};
