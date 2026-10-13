/* >>> file: src/js/20h-library-audio.js */
/* 资料库授权录音清单。由 tools/fetch_library_audio.py 生成，勿手改字段名。
   ⚠️ 加载顺序：必须排在 20g-library-navigation.js 之前。
   20g 在初始化时会读 LIBRARY_AUDIO 决定按钮文案（有录音 → 「试听授权录音」），
   若排在其后会读不到，按钮文案会被错判成「试听曲式示例」。 */
const LIBRARY_AUDIO = Object.freeze({
  "mozart-sonata": {
    "title": "File:Mozart - Piano Sonata No. 14.ogg",
    "url": "https://upload.wikimedia.org/wikipedia/commons/8/86/Mozart_-_Piano_Sonata_No._14.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
    "extension": ".ogg",
    "size": 4311313,
    "duration": 254.38040816326532,
    "source_url": "https://commons.wikimedia.org/wiki/File:Mozart_-_Piano_Sonata_No._14.ogg",
    "artist": "Wolfgang Amadeus Mozart",
    "description": "Piano Sonata No. 14 in C Minor, K. 457",
    "license": "Public domain",
    "license_url": "https://commons.wikimedia.org/wiki/Commons:Licensing",
    "src": "assets/audio/library/mozart-sonata.ogg"
  },
  "bach-passacaglia": {
    "title": "File:Bach C minor Passacaglia Variation 1.wav",
    "url": "https://upload.wikimedia.org/wikipedia/commons/6/60/Bach_C_minor_Passacaglia_Variation_1.wav?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
    "extension": ".wav",
    "size": 5242924,
    "duration": 29.72154195011338,
    "source_url": "https://commons.wikimedia.org/wiki/File:Bach_C_minor_Passacaglia_Variation_1.wav",
    "artist": "Johann Sebastian Bach",
    "description": "Bach C minor Passacaglia Variation 1",
    "license": "Public domain",
    "license_url": "https://commons.wikimedia.org/wiki/Commons:Licensing",
    "src": "assets/audio/library/bach-passacaglia.wav"
  },
  "blues-scale": {
    "title": "File:C-Blues-Scale.ogg",
    "url": "https://upload.wikimedia.org/wikipedia/commons/2/2f/C-Blues-Scale.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
    "extension": ".ogg",
    "size": 201347,
    "duration": 17.38013605442177,
    "source_url": "https://commons.wikimedia.org/wiki/File:C-Blues-Scale.ogg",
    "artist": "Michael Lenz",
    "description": "Blues scale over C",
    "license": "CC0",
    "license_url": "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
    "src": "assets/audio/library/blues-scale.ogg"
  }
});
